"""
src/utils/ingestion_config.py

Loads configs/ingestion_config.yaml once and exposes it as
a typed object. Every ingestion client imports from here.

Usage:
    from src.utils.ingestion_config import cfg
    series = cfg.fred.series
    keywords = cfg.newsapi.disruption_keywords
"""

import os
import yaml
from dataclasses import dataclass, field
from typing import Dict, List
from src.utils.logger import get_logger

logger = get_logger(__name__)

_CONFIG_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "configs", "ingestion_config.yaml"
)


def _load_yaml() -> dict:
    path = os.path.abspath(_CONFIG_PATH)
    if not os.path.exists(path):
        raise FileNotFoundError(
            f"ingestion_config.yaml not found at {path}. "
            "Make sure configs/ingestion_config.yaml exists."
        )
    with open(path, "r") as f:
        data = yaml.safe_load(f)
    logger.info(f"Loaded ingestion config from {path}")
    return data


# ── Typed config sections ─────────────────────────────────────

@dataclass
class GlobalConfig:
    start_date: str
    resample_frequency: str
    lookback_weeks: int
    forecast_horizon_weeks: int


@dataclass
class TablesConfig:
    macro_signals: str
    market_prices: str
    fear_index: str
    news_sentiment: str


@dataclass
class FredConfig:
    base_url: str
    series: Dict[str, str]


@dataclass
class AlphaVantageConfig:
    base_url: str
    rate_limit_pause_seconds: int
    commodity_interval: str
    commodities: Dict[str, str]
    etfs: Dict[str, str]


@dataclass
class PolymarketConfig:
    gamma_base_url: str
    markets_limit: int
    historical_days_back: int
    disruption_keywords: List[str]


@dataclass
class NewsAPIConfig:
    base_url: str
    days_back: int
    page_size: int
    language: str
    sort_by: str
    queries: List[str]
    disruption_keywords: List[str]


@dataclass
class SecEdgarConfig:
    search_url: str
    days_back: int
    form_types: str
    results_per_query: int
    user_agent: str
    queries: List[str]


@dataclass
class SentimentScoringConfig:
    newsapi_weight: float
    sec_weight: float
    sec_normalise_cap: int


@dataclass
class IngestionConfig:
    global_: GlobalConfig
    tables: TablesConfig
    fred: FredConfig
    alpha_vantage: AlphaVantageConfig
    polymarket: PolymarketConfig
    newsapi: NewsAPIConfig
    sec_edgar: SecEdgarConfig
    sentiment_scoring: SentimentScoringConfig


def _parse(raw: dict) -> IngestionConfig:
    g = raw["global"]
    return IngestionConfig(
        global_=GlobalConfig(
            start_date=g["start_date"],
            resample_frequency=g["resample_frequency"],
            lookback_weeks=g["lookback_weeks"],
            forecast_horizon_weeks=g["forecast_horizon_weeks"],
        ),
        tables=TablesConfig(**raw["tables"]),
        fred=FredConfig(
            base_url=raw["fred"]["base_url"],
            series=raw["fred"]["series"],
        ),
        alpha_vantage=AlphaVantageConfig(
            base_url=raw["alpha_vantage"]["base_url"],
            rate_limit_pause_seconds=raw["alpha_vantage"]["rate_limit_pause_seconds"],
            commodity_interval=raw["alpha_vantage"]["commodity_interval"],
            commodities=raw["alpha_vantage"]["commodities"],
            etfs=raw["alpha_vantage"]["etfs"],
        ),
        polymarket=PolymarketConfig(
            gamma_base_url=raw["polymarket"]["gamma_base_url"],
            markets_limit=raw["polymarket"]["markets_limit"],
            historical_days_back=raw["polymarket"]["historical_days_back"],
            disruption_keywords=raw["polymarket"]["disruption_keywords"],
        ),
        newsapi=NewsAPIConfig(
            base_url=raw["newsapi"]["base_url"],
            days_back=raw["newsapi"]["days_back"],
            page_size=raw["newsapi"]["page_size"],
            language=raw["newsapi"]["language"],
            sort_by=raw["newsapi"]["sort_by"],
            queries=raw["newsapi"]["queries"],
            disruption_keywords=raw["newsapi"]["disruption_keywords"],
        ),
        sec_edgar=SecEdgarConfig(
            search_url=raw["sec_edgar"]["search_url"],
            days_back=raw["sec_edgar"]["days_back"],
            form_types=raw["sec_edgar"]["form_types"],
            results_per_query=raw["sec_edgar"]["results_per_query"],
            user_agent=raw["sec_edgar"]["user_agent"],
            queries=raw["sec_edgar"]["queries"],
        ),
        sentiment_scoring=SentimentScoringConfig(
            newsapi_weight=raw["sentiment_scoring"]["newsapi_weight"],
            sec_weight=raw["sentiment_scoring"]["sec_weight"],
            sec_normalise_cap=raw["sentiment_scoring"]["sec_normalise_cap"],
        ),
    )


# Singleton — loaded once on first import
cfg: IngestionConfig = _parse(_load_yaml())