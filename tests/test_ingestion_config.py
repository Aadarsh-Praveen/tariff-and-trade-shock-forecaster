"""
tests/test_ingestion_config.py

Tests that ingestion_config.yaml loads correctly and all expected
values are present and valid.

Run with:  pytest tests/test_ingestion_config.py -v

No API calls are made — this is purely config validation.
"""

import pytest
from src.utils.ingestion_config import cfg


# ─────────────────────────────────────────────────────────────
# Global settings
# ─────────────────────────────────────────────────────────────

class TestGlobalConfig:

    def test_start_date_is_set(self):
        assert cfg.global_.start_date, "start_date is empty"

    def test_start_date_format(self):
        from datetime import datetime
        try:
            datetime.strptime(cfg.global_.start_date, "%Y-%m-%d")
        except ValueError:
            pytest.fail(
                f"start_date '{cfg.global_.start_date}' is not valid YYYY-MM-DD format"
            )

    def test_resample_frequency_is_set(self):
        assert cfg.global_.resample_frequency, "resample_frequency is empty"

    def test_lookback_weeks_positive(self):
        assert cfg.global_.lookback_weeks > 0, (
            f"lookback_weeks must be > 0, got {cfg.global_.lookback_weeks}"
        )

    def test_forecast_horizon_positive(self):
        assert cfg.global_.forecast_horizon_weeks > 0, (
            f"forecast_horizon_weeks must be > 0, got {cfg.global_.forecast_horizon_weeks}"
        )


# ─────────────────────────────────────────────────────────────
# Supabase table names
# ─────────────────────────────────────────────────────────────

class TestTablesConfig:

    def test_all_table_names_present(self):
        assert cfg.tables.macro_signals,  "macro_signals table name is empty"
        assert cfg.tables.market_prices,  "market_prices table name is empty"
        assert cfg.tables.fear_index,     "fear_index table name is empty"
        assert cfg.tables.news_sentiment, "news_sentiment table name is empty"

    def test_table_names_are_strings(self):
        for name in [
            cfg.tables.macro_signals,
            cfg.tables.market_prices,
            cfg.tables.fear_index,
            cfg.tables.news_sentiment,
        ]:
            assert isinstance(name, str), f"Table name must be string, got {type(name)}"

    def test_table_names_no_spaces(self):
        for name in [
            cfg.tables.macro_signals,
            cfg.tables.market_prices,
            cfg.tables.fear_index,
            cfg.tables.news_sentiment,
        ]:
            assert " " not in name, (
                f"Table name '{name}' contains a space — Supabase table names cannot have spaces"
            )


# ─────────────────────────────────────────────────────────────
# FRED config
# ─────────────────────────────────────────────────────────────

class TestFredConfig:

    def test_base_url_is_set(self):
        assert cfg.fred.base_url, "fred.base_url is empty"

    def test_base_url_is_https(self):
        assert cfg.fred.base_url.startswith("https://"), (
            f"fred.base_url must start with https://, got {cfg.fred.base_url}"
        )

    def test_series_not_empty(self):
        assert len(cfg.fred.series) > 0, "fred.series is empty — add at least one series"

    def test_series_values_are_strings(self):
        for name, series_id in cfg.fred.series.items():
            assert isinstance(series_id, str) and series_id, (
                f"FRED series ID for '{name}' is empty or not a string"
            )

    def test_required_series_present(self):
        """These are the minimum signals needed for the model."""
        required = [
            "import_price_index",
            "industrial_production",
            "cpi_all",
        ]
        for key in required:
            assert key in cfg.fred.series, (
                f"Required FRED series '{key}' missing from ingestion_config.yaml"
            )

    def test_series_ids_uppercase(self):
        """FRED series IDs are always uppercase e.g. INDPRO not indpro."""
        for name, series_id in cfg.fred.series.items():
            assert series_id == series_id.upper(), (
                f"FRED series ID '{series_id}' for '{name}' should be uppercase"
            )


# ─────────────────────────────────────────────────────────────
# Alpha Vantage config
# ─────────────────────────────────────────────────────────────

class TestAlphaVantageConfig:

    def test_base_url_is_set(self):
        assert cfg.alpha_vantage.base_url, "alpha_vantage.base_url is empty"

    def test_rate_limit_pause_reasonable(self):
        assert 10 <= cfg.alpha_vantage.rate_limit_pause_seconds <= 60, (
            f"rate_limit_pause_seconds should be 10–60s for free tier, "
            f"got {cfg.alpha_vantage.rate_limit_pause_seconds}"
        )

    def test_commodities_not_empty(self):
        assert len(cfg.alpha_vantage.commodities) > 0, (
            "alpha_vantage.commodities is empty"
        )

    def test_etfs_not_empty(self):
        assert len(cfg.alpha_vantage.etfs) > 0, "alpha_vantage.etfs is empty"

    def test_required_commodities_present(self):
        # crude_oil and lumber require Alpha Vantage premium — removed
        # copper, wheat, aluminum are available on free tier
        required = ["copper", "wheat", "aluminum"]
        for key in required:
            assert key in cfg.alpha_vantage.commodities, (
                f"Required commodity '{key}' missing from ingestion_config.yaml"
            )

    def test_commodity_codes_uppercase(self):
        for name, code in cfg.alpha_vantage.commodities.items():
            assert code == code.upper(), (
                f"Commodity code '{code}' for '{name}' should be uppercase"
            )

    def test_etf_tickers_uppercase(self):
        for label, ticker in cfg.alpha_vantage.etfs.items():
            assert ticker == ticker.upper(), (
                f"ETF ticker '{ticker}' for '{label}' should be uppercase"
            )


# ─────────────────────────────────────────────────────────────
# Polymarket config
# ─────────────────────────────────────────────────────────────

class TestPolymarketConfig:

    def test_gamma_base_url_is_set(self):
        assert cfg.polymarket.gamma_base_url, "polymarket.gamma_base_url is empty"

    def test_gamma_base_url_is_https(self):
        assert cfg.polymarket.gamma_base_url.startswith("https://"), (
            f"polymarket.gamma_base_url must start with https://"
        )

    def test_markets_limit_positive(self):
        assert cfg.polymarket.markets_limit > 0, (
            f"polymarket.markets_limit must be > 0"
        )

    def test_historical_days_back_reasonable(self):
        assert 30 <= cfg.polymarket.historical_days_back <= 730, (
            f"historical_days_back should be 30–730, "
            f"got {cfg.polymarket.historical_days_back}"
        )

    def test_disruption_keywords_not_empty(self):
        assert len(cfg.polymarket.disruption_keywords) > 0, (
            "polymarket.disruption_keywords is empty"
        )

    def test_disruption_keywords_are_strings(self):
        for kw in cfg.polymarket.disruption_keywords:
            assert isinstance(kw, str) and kw, (
                f"Keyword '{kw}' is empty or not a string"
            )

    def test_required_keywords_present(self):
        required = ["tariff", "supply chain", "trade war"]
        for kw in required:
            assert kw in cfg.polymarket.disruption_keywords, (
                f"Required keyword '{kw}' missing from polymarket.disruption_keywords"
            )


# ─────────────────────────────────────────────────────────────
# NewsAPI config
# ─────────────────────────────────────────────────────────────

class TestNewsAPIConfig:

    def test_base_url_is_set(self):
        assert cfg.newsapi.base_url, "newsapi.base_url is empty"

    def test_days_back_within_free_tier(self):
        assert cfg.newsapi.days_back <= 29, (
            f"newsapi.days_back is {cfg.newsapi.days_back} — "
            "free tier max is 29 days. Set to 29 or less."
        )

    def test_page_size_within_free_tier(self):
        assert cfg.newsapi.page_size <= 100, (
            f"newsapi.page_size is {cfg.newsapi.page_size} — "
            "free tier max is 100 per request."
        )

    def test_queries_not_empty(self):
        assert len(cfg.newsapi.queries) > 0, "newsapi.queries is empty"

    def test_disruption_keywords_not_empty(self):
        assert len(cfg.newsapi.disruption_keywords) > 0, (
            "newsapi.disruption_keywords is empty"
        )

    def test_language_is_set(self):
        assert cfg.newsapi.language, "newsapi.language is empty"


# ─────────────────────────────────────────────────────────────
# SEC EDGAR config
# ─────────────────────────────────────────────────────────────

class TestSecEdgarConfig:

    def test_search_url_is_set(self):
        assert cfg.sec_edgar.search_url, "sec_edgar.search_url is empty"

    def test_search_url_is_https(self):
        assert cfg.sec_edgar.search_url.startswith("https://"), (
            "sec_edgar.search_url must start with https://"
        )

    def test_days_back_positive(self):
        assert cfg.sec_edgar.days_back > 0, "sec_edgar.days_back must be > 0"

    def test_form_types_is_set(self):
        assert cfg.sec_edgar.form_types, "sec_edgar.form_types is empty"

    def test_user_agent_is_set(self):
        assert cfg.sec_edgar.user_agent, (
            "sec_edgar.user_agent is empty — SEC requires a user agent string"
        )

    def test_queries_not_empty(self):
        assert len(cfg.sec_edgar.queries) > 0, "sec_edgar.queries is empty"


# ─────────────────────────────────────────────────────────────
# Sentiment scoring weights
# ─────────────────────────────────────────────────────────────

class TestSentimentScoringConfig:

    def test_weights_sum_to_one(self):
        total = cfg.sentiment_scoring.newsapi_weight + cfg.sentiment_scoring.sec_weight
        assert abs(total - 1.0) < 0.001, (
            f"Sentiment weights must sum to 1.0, got {total}. "
            f"Check newsapi_weight + sec_weight in ingestion_config.yaml"
        )

    def test_weights_between_zero_and_one(self):
        for weight in [
            cfg.sentiment_scoring.newsapi_weight,
            cfg.sentiment_scoring.sec_weight,
        ]:
            assert 0 < weight < 1, (
                f"Each weight must be between 0 and 1, got {weight}"
            )

    def test_sec_normalise_cap_positive(self):
        assert cfg.sentiment_scoring.sec_normalise_cap > 0, (
            "sec_normalise_cap must be > 0"
        )