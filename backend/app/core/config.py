from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./bar_management.db"
    SECRET_KEY: str = "90iu2m_N4-_YWDPcjURAjOPw9knJuuDirRZEgTndlXcv6D1Odnm2SE2ZNgyPPII1R4Pf3sQOl6TMWBZ9PT17Xw"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()