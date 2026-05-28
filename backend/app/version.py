from pathlib import Path

_APP_DIR = Path(__file__).resolve().parent.parent
_REPO_ROOT = _APP_DIR.parent


def _version_file() -> Path | None:
    for candidate in (_APP_DIR / "VERSION", _REPO_ROOT / "VERSION"):
        if candidate.is_file():
            return candidate
    return None


def get_version() -> str:
    path = _version_file()
    if path is not None:
        return path.read_text(encoding="utf-8").strip()
    return "0.0.0-dev"
