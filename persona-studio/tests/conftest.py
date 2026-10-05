import shutil
from pathlib import Path

import pytest

from studio.config import ROOT, Settings
from studio.store import Store


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    personas = tmp_path / "personas"
    shutil.copytree(ROOT / "personas", personas)
    return Settings(
        root=tmp_path, personas_dir=personas, media_dir=tmp_path / "media",
        reports_dir=tmp_path / "reports", case_studies_file=ROOT / "research" / "case_studies.yaml",
        db_path=tmp_path / "t.db",
    )


@pytest.fixture
def store(settings: Settings):
    s = Store(settings.db_path)
    yield s
    s.close()
