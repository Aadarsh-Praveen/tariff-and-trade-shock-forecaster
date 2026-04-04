import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # ── API Keys ──────────────────────────────────────────────
    FRED_API_KEY: str           = os.getenv("FRED_API_KEY", "")
    ALPHA_VANTAGE_API_KEY: str  = os.getenv("ALPHA_VANTAGE_API_KEY", "")
    NOAA_API_KEY: str           = os.getenv("NOAA_API_KEY", "")
    NEWSAPI_KEY: str            = os.getenv("NEWSAPI_KEY", "")
    # Reddit removed — replaced with NewsAPI + GDELT + SEC EDGAR

    # ── Supabase ──────────────────────────────────────────────
    SUPABASE_URL: str  = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str  = os.getenv("SUPABASE_KEY", "")
    SUPABASE_TABLE_MACRO:   str = "macro_signals"
    SUPABASE_TABLE_MARKET:  str = "market_prices"
    SUPABASE_TABLE_FEAR:    str = "fear_index"
    SUPABASE_TABLE_NEWS:    str = "news_sentiment"

    # ── App Settings ──────────────────────────────────────────
    LOG_LEVEL: str   = os.getenv("LOG_LEVEL", "INFO")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    API_HOST: str    = os.getenv("API_HOST", "0.0.0.0")
    API_PORT: int    = int(os.getenv("API_PORT", "8000"))

    # ── Data Settings ─────────────────────────────────────────
    START_DATE: str             = "2019-01-01"
    FORECAST_HORIZON_WEEKS: int = 3
    LOOKBACK_WEEKS: int         = 4   # How many weeks of signals the model reads

    def validate(self) -> bool:
        """Check all required env vars are present. Call on startup."""
        required = {
            "FRED_API_KEY":          self.FRED_API_KEY,
            "ALPHA_VANTAGE_API_KEY": self.ALPHA_VANTAGE_API_KEY,
            "NEWSAPI_KEY":            self.NEWSAPI_KEY,
            "SUPABASE_URL":          self.SUPABASE_URL,
            "SUPABASE_KEY":          self.SUPABASE_KEY,
        }
        missing = [k for k, v in required.items() if not v]
        if missing:
            raise ValueError(f"Missing required environment variables: {missing}")
        return True


config = Config()