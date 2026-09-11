from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "SignalPilot AI API"
    environment: str = "development"

    market_data_api_key: str = ""

    market_data_provider: str = "twelvedata"
    market_data_base_url: str = "https://api.twelvedata.com"

    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-20b"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()