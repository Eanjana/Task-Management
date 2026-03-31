"""
Application configuration loaded from environment variables.

@description Pydantic Settings for FastAPI application configuration
@author Anjana E
@date 24-03-2026
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    UPLOAD_DIR: str = "uploads"
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

# Global Supabase client
supabase = None
if settings.SUPABASE_URL and settings.SUPABASE_KEY:
    try:
        from supabase import create_client
        supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    except ImportError:
        pass
