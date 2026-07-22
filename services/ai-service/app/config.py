from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    port: int = 8000
    environment: str = "development"
    firebase_project_id: str | None = None
    firebase_client_email: str | None = None
    firebase_private_key: str | None = None
    ai_service_api_key: str | None = None
    log_level: str = "info"

    @property
    def firebase_configured(self) -> bool:
        return bool(self.firebase_project_id and self.firebase_client_email and self.firebase_private_key)


settings = Settings()
