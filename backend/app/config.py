from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.1-flash-image-preview"
    GEMINI_TEXT_MODEL: str = "gemini-2.5-flash"

    FAL_API_KEY: str = ""
    FAL_IMAGE_EDIT_MODEL: str = "fal-ai/flux-pro/kontext"

    DATABASE_URL: str = f"sqlite:///{(BACKEND_DIR / 'catalog.db').as_posix()}"

    STORAGE_DIR: Path = BACKEND_DIR / "storage"
    ORIGINAL_DIR: Path = BACKEND_DIR / "storage" / "original"
    STYLED_DIR: Path = BACKEND_DIR / "storage" / "styled"

    VISUAL_IDENTITY_PATH: Path = BACKEND_DIR / "config" / "visual_identity.txt"

    DEFAULT_N_IMAGES: int = 4
    MAX_N_IMAGES: int = 10

    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ]


settings = Settings()


def load_visual_identity_prompt() -> str:
    return settings.VISUAL_IDENTITY_PATH.read_text(encoding="utf-8").strip()
