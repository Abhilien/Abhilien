"""Image providers.

* ``mock``      — offline placeholder cards (free; for testing the whole pipeline).
* ``replicate`` — any Replicate text-to-image model, optionally with a reference image for
                  face consistency (see docs/CONSISTENT_FACES.md).

Story frames can carry overlay text; it is burned into the image with Pillow, because the
publishing API cannot add stickers or text itself.
"""

from __future__ import annotations

import hashlib
import json
import textwrap
import time
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from .config import Settings
from .prompts import SIZE


class ImageResult:
    def __init__(self, path: Path, url: str = ""):
        self.path, self.url = path, url


def _font(size: int) -> ImageFont.ImageFont:
    for name in ("DejaVuSans-Bold.ttf", "Arial Bold.ttf", "Arial.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def add_overlay(path: Path, text: str) -> None:
    """Burn story text into the lower third with a soft backing panel."""
    if not text.strip():
        return
    img = Image.open(path).convert("RGB")
    w, h = img.size
    draw = ImageDraw.Draw(img, "RGBA")
    font = _font(max(28, w // 18))
    lines = textwrap.wrap(text, width=22)[:5]
    line_h = int(font.size * 1.3) if hasattr(font, "size") else 24
    block_h = line_h * len(lines) + 40
    top = int(h * 0.68)
    draw.rounded_rectangle((60, top, w - 60, top + block_h), radius=28, fill=(0, 0, 0, 140))
    for i, line in enumerate(lines):
        tw = draw.textlength(line, font=font)
        draw.text(((w - tw) / 2, top + 20 + i * line_h), line, font=font, fill=(255, 255, 255, 255))
    img.save(path, "JPEG", quality=92)


class MockProvider:
    """Deterministic gradient card showing the prompt. Lets you dry-run everything for free."""

    def generate(self, spec: dict, out: Path) -> ImageResult:
        w, h = SIZE.get(spec["aspect_ratio"], (1080, 1350))
        digest = hashlib.sha256(spec["prompt"].encode()).digest()
        c1, c2 = digest[:3], digest[3:6]
        column = Image.new("RGB", (1, h))
        column.putdata([tuple(int(c1[k] * (1 - y / h) + c2[k] * y / h) for k in range(3)) for y in range(h)])
        img = column.resize((w, h))
        draw = ImageDraw.Draw(img)
        font = _font(30)
        y = 80
        for line in textwrap.wrap(spec["prompt"], width=48)[:28]:
            draw.text((60, y), line, font=font, fill=(255, 255, 255))
            y += 40
        draw.text((60, h - 90), "MOCK RENDER", font=_font(44), fill=(255, 255, 255))
        out.parent.mkdir(parents=True, exist_ok=True)
        img.save(out, "JPEG", quality=90)
        return ImageResult(out)


class ReplicateProvider:
    API = "https://api.replicate.com/v1"

    def __init__(self, token: str, model: str, reference_field: str = ""):
        if not token:
            raise RuntimeError("REPLICATE_API_TOKEN is not set")
        self.token, self.model, self.reference_field = token, model, reference_field

    def _req(self, url: str, body: dict | None = None) -> dict:
        req = urllib.request.Request(
            url, data=json.dumps(body).encode() if body is not None else None,
            headers={"Authorization": f"Bearer {self.token}", "Content-Type": "application/json",
                     "Prefer": "wait"},
            method="POST" if body is not None else "GET",
        )
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.loads(r.read())

    def generate(self, spec: dict, out: Path) -> ImageResult:
        inp: dict = {"prompt": spec["prompt"], "aspect_ratio": spec["aspect_ratio"],
                     "output_format": "jpg"}
        if spec.get("seed") is not None:
            inp["seed"] = spec["seed"]
        if self.reference_field and spec.get("references"):
            inp[self.reference_field] = spec["references"][0]
        pred = self._req(f"{self.API}/models/{self.model}/predictions", {"input": inp})
        deadline = time.time() + 300
        while pred.get("status") not in ("succeeded", "failed", "canceled"):
            if time.time() > deadline:
                raise TimeoutError("Replicate prediction timed out")
            time.sleep(2)
            pred = self._req(pred["urls"]["get"])
        if pred["status"] != "succeeded":
            raise RuntimeError(f"Replicate failed: {pred.get('error')}")
        output = pred["output"]
        url = output[0] if isinstance(output, list) else output
        out.parent.mkdir(parents=True, exist_ok=True)
        with urllib.request.urlopen(url, timeout=120) as r:
            out.write_bytes(r.read())
        # normalise to JPEG (Instagram's publishing API only accepts JPEG images)
        Image.open(out).convert("RGB").save(out, "JPEG", quality=92)
        return ImageResult(out, url)


def get_provider(settings: Settings):
    if settings.image_provider == "replicate":
        return ReplicateProvider(settings.replicate_token, settings.replicate_model,
                                 settings.replicate_reference_field)
    return MockProvider()
