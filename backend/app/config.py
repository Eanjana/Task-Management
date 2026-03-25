"""
Application configuration loaded from environment variables.

@description Pydantic Settings for FastAPI application configuration
@author Developer
@date 24-03-2026
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from .env file."""

    DATABASE_URL: str = "sqlite:///./taskmanager.db"
    SECRET_KEY: str = "super-secret-key-change-in-production-abc123xyz"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    UPLOAD_DIR: str = "uploads"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
