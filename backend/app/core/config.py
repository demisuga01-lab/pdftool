from functools import lru_cache
from pathlib import Path
from typing import Any

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Application settings loaded from environment variables and .env."""

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        enable_decoding=False,
        extra="ignore",
    )

    REDIS_URL: str = Field(default="redis://localhost:6379/0")
    DATA_DIR: Path = Field(default=Path("/opt/pdftool/data"))
    UPLOAD_DIR: Path = Field(default=Path("/opt/pdftool/data/uploads"))
    OUTPUT_DIR: Path = Field(default=Path("/opt/pdftool/data/outputs"))
    TEMP_DIR: Path = Field(default=Path("/opt/pdftool/data/temp"))
    MAX_FILE_SIZE_MB: int = Field(default=100, gt=0)
    ALLOWED_ORIGINS: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, value: Any) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        if isinstance(value, list):
            return value
        raise ValueError("ALLOWED_ORIGINS must be a comma-separated string or list")


@lru_cache
def get_settings() -> Settings:
    return Settings()
