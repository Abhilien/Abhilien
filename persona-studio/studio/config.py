"""Settings, read from the environment (and an optional .env file)."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

MODEL = "claude-opus-5-5"


def load_dotenv(path: Path = ROOT / ".env") -> None:
    """Minimal .env loader: KEY=VALUE lines, existing env vars win."""
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


@dataclass
class Settings:
    root: Path = ROOT
    personas_dir: Path = ROOT / "personas"
    media_dir: Path = ROOT / "media"
    reports_dir: Path = ROOT / "research" / "reports"
    case_studies_file: Path = ROOT / "research" / "case_studies.yaml"
    db_path: Path = ROOT / "studio.db"

    image_provider: str = "mock"
    replicate_token: str = ""
    replicate_model: str = "black-forest-labs/flux-1.1-pro"
    replicate_reference_field: str = ""

    graph_host: str = "https://graph.facebook.com"
    graph_version: str = "v21.0"
    media_public_base_url: str = ""
    allow_live_publish: bool = False

    extra: dict = field(default_factory=dict)

    @classmethod
    def from_env(cls) -> "Settings":
        load_dotenv()
        env = os.environ.get
        s = cls(
            image_provider=env("IMAGE_PROVIDER", "mock").lower(),
            replicate_token=env("REPLICATE_API_TOKEN", ""),
            replicate_model=env("REPLICATE_MODEL", "black-forest-labs/flux-1.1-pro"),
            replicate_reference_field=env("REPLICATE_REFERENCE_FIELD", ""),
            graph_host=env("GRAPH_API_HOST", "https://graph.facebook.com").rstrip("/"),
            graph_version=env("GRAPH_API_VERSION", "v21.0"),
            media_public_base_url=env("MEDIA_PUBLIC_BASE_URL", "").rstrip("/"),
            allow_live_publish=env("ALLOW_LIVE_PUBLISH", "false").lower() == "true",
        )
        if env("STUDIO_DB"):
            s.db_path = Path(env("STUDIO_DB"))
        return s

    def ig_credentials(self, slug: str) -> tuple[str, str]:
        """(access_token, ig_user_id) for a persona, from IG_TOKEN_<SLUG> / IG_USER_ID_<SLUG>."""
        key = slug.upper().replace("-", "_")
        return os.environ.get(f"IG_TOKEN_{key}", ""), os.environ.get(f"IG_USER_ID_{key}", "")
