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

    # Public production limits.
    MAX_FILE_SIZE_MB: int = Field(default=25, gt=0)
    MAX_BATCH_BYTES: int = Field(default=100 * 1024 * 1024, gt=0)
    MAX_ARCHIVE_EXTRACTED_BYTES: int = Field(default=100 * 1024 * 1024, gt=0)
    MAX_ARCHIVE_FILES: int = Field(default=200, gt=0)

    # File retention (in hours).
    FILE_RETENTION_HOURS: int = Field(default=24, gt=0)

    # CORS: list of explicit origins. Wildcards are rejected at runtime.
    ALLOWED_ORIGINS: list[str] = Field(
        default_factory=lambda: ["https://tools.wellfriend.online"]
    )

    # Rate limiting (Redis-backed).
    RATE_LIMIT_ENABLED: bool = Field(default=True)
    RATE_LIMIT_GLOBAL_PER_HOUR: int = Field(default=200, gt=0)
    RATE_LIMIT_JOBS_PER_HOUR: int = Field(default=40, gt=0)
    RATE_LIMIT_UPLOADS_PER_HOUR: int = Field(default=60, gt=0)
    RATE_LIMIT_STATUS_PER_HOUR: int = Field(default=1000, gt=0)
    RATE_LIMIT_DOWNLOADS_PER_HOUR: int = Field(default=200, gt=0)
    RATE_LIMIT_REDIS_URL: str = Field(default="")
    # Trust X-Forwarded-For only when behind a known reverse proxy.
    RATE_LIMIT_TRUST_PROXY: bool = Field(default=True)

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, value: Any) -> list[str]:
        if isinstance(value, str):
            origins = [origin.strip() for origin in value.split(",") if origin.strip()]
        elif isinstance(value, list):
            origins = [str(origin).strip() for origin in value if str(origin).strip()]
        else:
            raise ValueError("ALLOWED_ORIGINS must be a comma-separated string or list")

        if not origins:
            raise ValueError("ALLOWED_ORIGINS must include at least one explicit origin")
        if "*" in origins:
            raise ValueError("ALLOWED_ORIGINS cannot contain '*' in production-safe configuration")
        return origins

    @property
    def max_upload_bytes(self) -> int:
        return self.MAX_FILE_SIZE_MB * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()
