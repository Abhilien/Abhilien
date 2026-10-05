"""The persona "bible": everything that keeps a channel consistent, as one YAML file.

A persona is either
  * an ``ai_character``: a fictional, recurring AI person with a locked face (the "AI celeb"), or
  * ``faceless``: a channel with no recurring face (aesthetics, places, objects, POV hands, quotes).

The rules enforced here are the ones that keep the business alive: every character is a
fictional adult, never a real person's likeness, and always discloses that it is AI.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Literal

import yaml
from pydantic import BaseModel, Field, field_validator, model_validator

SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")

# A tripwire, not a database: the agent's instructions forbid real likenesses, and this
# catches the obvious slips. Extend it for your market.
REAL_PEOPLE_TRIPWIRE = {
    "taylor swift", "kim kardashian", "kylie jenner", "selena gomez", "ariana grande",
    "beyonce", "rihanna", "cristiano ronaldo", "lionel messi", "virat kohli",
    "priyanka chopra", "deepika padukone", "shah rukh khan", "alia bhatt", "zendaya",
    "dua lipa", "billie eilish", "elon musk", "mrbeast", "bad bunny", "kendall jenner",
}


class IdentityLock(BaseModel):
    """What must never drift between images. Copied verbatim into every image prompt."""

    face: str = Field(description="Face shape, eyes, nose, lips, skin tone, any marks")
    hair: str = ""
    build: str = ""
    signature_details: list[str] = Field(default_factory=list, description="Moles, freckles, a ring, a tattoo")
    wardrobe_signature: str = ""
    reference_images: list[str] = Field(default_factory=list, description="URLs/paths of approved face references")
    lora_trigger: str = Field("", description="Trigger word if you trained a LoRA for this face")
    seed: int | None = None

    def prompt_fragment(self) -> str:
        parts = [self.lora_trigger, self.face, self.hair, self.build, *self.signature_details]
        return ", ".join(p.strip() for p in parts if p and p.strip())


class VisualStyle(BaseModel):
    palette: str = ""
    lighting: str = ""
    camera: str = "shot on 35mm, natural depth of field"
    look: str = Field("", description="Film stock / grade / overall aesthetic")
    negative: str = "deformed hands, extra fingers, text artifacts, watermark, plastic skin, uncanny eyes"

    def prompt_fragment(self) -> str:
        return ", ".join(p for p in (self.palette, self.lighting, self.camera, self.look) if p)


class Voice(BaseModel):
    tone: str = "warm, witty, concise"
    language: str = "English"
    emoji_use: Literal["none", "light", "heavy"] = "light"
    caption_length: Literal["short", "medium", "long"] = "medium"
    signature_phrases: list[str] = Field(default_factory=list)


class Pillar(BaseModel):
    name: str
    share: float = Field(ge=0, le=1, description="Fraction of posts in this pillar")
    ideas: list[str] = Field(default_factory=list)


class Cadence(BaseModel):
    feed_per_week: int = Field(4, ge=0, le=21)
    carousel_share: float = Field(0.4, ge=0, le=1, description="Fraction of feed posts that are carousels")
    stories_per_day: int = Field(1, ge=0, le=6, description="Story *sequences* per day")
    frames_per_story: int = Field(3, ge=1, le=10)
    post_hours: list[int] = Field(default_factory=lambda: [9, 13, 19])
    timezone: str = "UTC"

    @field_validator("post_hours")
    @classmethod
    def _hours(cls, v: list[int]) -> list[int]:
        if not v or any(h < 0 or h > 23 for h in v):
            raise ValueError("post_hours must be a non-empty list of hours 0-23")
        return sorted(set(v))


class Hashtags(BaseModel):
    core: list[str] = Field(default_factory=list, description="Used on every post")
    rotating: list[str] = Field(default_factory=list, description="Sampled per post")
    per_post: int = Field(8, ge=0, le=30)


class Persona(BaseModel):
    slug: str
    name: str
    handle: str = ""
    persona_type: Literal["ai_character", "faceless"] = "ai_character"
    genre: str
    niche: str = ""
    tagline: str = ""
    age: int | None = None
    home_base: str = ""
    backstory: str = ""
    values: list[str] = Field(default_factory=list)
    audience: str = ""
    identity: IdentityLock | None = None
    style: VisualStyle = Field(default_factory=VisualStyle)
    voice: Voice = Field(default_factory=Voice)
    pillars: list[Pillar] = Field(default_factory=list)
    cadence: Cadence = Field(default_factory=Cadence)
    hashtags: Hashtags = Field(default_factory=Hashtags)
    monetization: list[str] = Field(default_factory=list)
    boundaries: list[str] = Field(default_factory=list, description="Topics this persona never touches")
    bio: str = ""
    disclosure: str = "AI-generated character"
    based_on_real_person: bool = False

    @field_validator("slug")
    @classmethod
    def _slug(cls, v: str) -> str:
        if not SLUG_RE.match(v):
            raise ValueError("slug must be lowercase words joined by hyphens, e.g. 'luna-voss'")
        return v

    @model_validator(mode="after")
    def _rules(self) -> "Persona":
        if self.based_on_real_person:
            raise ValueError("Personas must be original. Do not copy a real person's face, name or identity.")
        if self.name.strip().lower() in REAL_PEOPLE_TRIPWIRE:
            raise ValueError(f"'{self.name}' is a real public figure. Create an original character.")
        if not self.disclosure.strip():
            raise ValueError("A disclosure line is required: audiences and Meta expect AI content to be labelled.")
        if self.persona_type == "ai_character":
            if self.age is None or self.age < 18:
                raise ValueError("AI characters must be explicitly adult (age >= 18).")
            if self.identity is None:
                raise ValueError("AI characters need an identity lock so the face stays consistent.")
        if self.pillars:
            total = sum(p.share for p in self.pillars)
            if not 0.95 <= total <= 1.05:
                raise ValueError(f"Pillar shares must add up to 1.0 (got {total:.2f})")
        return self

    def bio_with_disclosure(self) -> str:
        if self.disclosure.lower() in self.bio.lower():
            return self.bio
        return f"{self.bio}\n{self.disclosure}".strip()


def persona_path(personas_dir: Path, slug: str) -> Path:
    return personas_dir / f"{slug}.yaml"


def load_persona(personas_dir: Path, slug: str) -> Persona:
    path = persona_path(personas_dir, slug)
    if not path.exists():
        raise FileNotFoundError(f"No persona '{slug}' in {personas_dir}")
    return Persona.model_validate(yaml.safe_load(path.read_text()))


def load_all(personas_dir: Path) -> list[Persona]:
    return [Persona.model_validate(yaml.safe_load(p.read_text())) for p in sorted(personas_dir.glob("*.yaml"))]


def save_persona(personas_dir: Path, persona: Persona) -> Path:
    personas_dir.mkdir(parents=True, exist_ok=True)
    path = persona_path(personas_dir, persona.slug)
    data = persona.model_dump(mode="json", exclude_none=True)
    path.write_text(yaml.safe_dump(data, sort_keys=False, allow_unicode=True, width=100))
    return path
