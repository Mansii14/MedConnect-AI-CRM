import os
from pydantic_settings import BaseSettings, SettingsConfigDict

# On Vercel, serverless function environment is read-only except for /tmp
default_db_url = "sqlite:////tmp/hcp_crm.db" if (os.environ.get("VERCEL") or os.environ.get("VERCEL_ENV") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME")) else "sqlite:///./hcp_crm.db"

class Settings(BaseSettings):
    DATABASE_URL: str = default_db_url
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
