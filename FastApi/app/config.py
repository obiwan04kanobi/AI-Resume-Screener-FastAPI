# app/config.py
import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    """Loads and validates all environment variables for the application."""
    DATABASE_URL: str = os.getenv("DATABASE_URL")
    AWS_ACCESS_KEY_ID: str = os.getenv("AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY: str = os.getenv("AWS_SECRET_ACCESS_KEY")
    LOCAL_UPLOAD_DIR: str = os.getenv("LOCAL_UPLOAD_DIR")
    AWS_REGION: str = os.getenv("AWS_REGION", "ap-south-1")
    BUCKET_NAME: str = os.getenv("BUCKET_NAME")

    SMTP_EMAIL: str = os.getenv("SMTP_EMAIL")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD")
    SMTP_SERVER: str = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", 587))

    JWT_SECRET: str = os.getenv("JWT_SECRET")
    FRONTEND_REVIEW_URL: str = os.getenv("FRONTEND_REVIEW_URL")
    JOB_LISTINGS_URL: str = os.getenv("JOB_LISTINGS_URL")

    class Config:
        case_sensitive = True

settings = Settings()