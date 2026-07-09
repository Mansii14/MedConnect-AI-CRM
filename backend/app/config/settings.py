import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./hcp_crm.db"
    GROQ_API_KEY: str = ""
    SECRET_KEY: str = "supersecret_ai_first_crm_key_for_development"
    MODEL_NAME: str = "gemma2-9b-it"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
