from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "GrantHub.AI"
    JWT_SECRET: str
    JWT_ALGORITHM: str
    VERSION: str = "0.1.0"
    DATABASE_URL: str
    UPSTASH_REDIS_REST_URL: str
    UPSTASH_REDIS_REST_TOKEN: str
    
    CELERY_BROKER_URL: str
    CELERY_RESULT_BACKEND: str

    MAIL_USERNAME : str
    MAIL_PASSWORD : str
    MAIL_FROM : str
    MAIL_PORT: int
    MAIL_SERVER : str
    MAIL_FROM_NAME : str

    DOMAIN: str

    SENTRY_DSN: str = ""
    ENVIRONMENT: str = "development"

    # Через запятую. В проде заменить на реальные домены фронтенда.
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    ALLOWED_HOSTS: str = "localhost,127.0.0.1"

    # https://developer.usajobs.gov/APIRequest/Index — бесплатный ключ по email
    USAJOBS_API_KEY: str = ""
    USAJOBS_USER_AGENT: str = ""

    model_config = SettingsConfigDict(
        env_file = ".env",
        extra = "ignore"
    ) 

settings = Settings()
