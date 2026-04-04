"""
src/features/pipeline.py

Master feature pipeline — reads raw signals from Supabase,
runs all feature engineering steps, saves feature matrix back to Supabase.

Run this after ingestion and before model training.

Owner: Teammate 2
Run:   python -m src.features.pipeline
"""

import time
import pandas as pd
from src.utils.config import config
from src.utils.logger import get_logger
from src.utils.db import get_client, upsert_rows
from src.utils.ingestion_config import cfg
from src.features.lag_features import (
    compute_lag_features,
    compute_lag_changes,
    compute_pct_change,
)
from src.features.rolling_features import (
    compute_rolling_mean,
    compute_rolling_std,
    compute_rolling_momentum,
    compute_rolling_zscore,
)
from src.features.cross_features import compute_all_cross_features

logger = get_logger(__name__)

# ── Signals to engineer features for ─────────────────────────

MACRO_SIGNALS = [
    "import_price_index",
    "ppi_manufacturing",
    "industrial_production",
    "cpi_all",
    "goods_imports",
    "manufacturing_employment",
    "new_orders",
    "crude_oil_price",
    "natural_gas_price",
    "housing_starts",
    "export_price_index",
    "trade_balance",
    "capacity_utilization",
    "unemployment_rate",
]

MARKET_SIGNALS = [
    "copper",
    "wheat",
    "aluminum",
    "industrials",
    "materials",
    "consumer_staples",
    "energy",
]

SENTIMENT_SIGNALS = [
    "fear_index",
    "newsapi_disruption_ratio",
    "combined_sentiment_score",
    "llm_risk_score",              # LLM-extracted disruption signal
]

ALL_SIGNALS = MACRO_SIGNALS + MARKET_SIGNALS + SENTIMENT_SIGNALS


# ── Pagination helper ─────────────────────────────────────────

def _paginate(table: str, select: str, order_col: str) -> list:
    """Generic paginated loader — bypasses Supabase 1000-row limit."""
    client    = get_client()
    all_rows  = []
    page_size = 1000
    offset    = 0
    while True:
        resp = (
            client.table(table)
            .select(select)
            .order(order_col, desc=False)
            .range(offset, offset + page_size - 1)
            .execute()
        )
        batch = resp.data or []
        all_rows.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size
    return all_rows


# ── Load raw data from Supabase ───────────────────────────────

def load_macro_signals() -> pd.DataFrame:
    """Load macro_signals table and pivot to wide format."""
    rows = _paginate(cfg.tables.macro_signals, "date, signal_name, value", "date")
    if not rows:
        logger.warning("No macro signals found in Supabase")
        return pd.DataFrame()

    df = pd.DataFrame(rows)
    df["date"] = pd.to_datetime(df["date"])
    wide = df.pivot_table(
        index="date", columns="signal_name",
        values="value", aggfunc="last",
    ).reset_index()
    wide.columns.name = None
    logger.info(f"Loaded macro signals: {wide.shape}")
    return wide


def load_market_prices() -> pd.DataFrame:
    """Load market_prices table and pivot to wide format."""
    rows = _paginate(cfg.tables.market_prices, "date, asset_name, price", "date")
    if not rows:
        logger.warning("No market prices found in Supabase")
        return pd.DataFrame()

    df = pd.DataFrame(rows)
    df["date"] = pd.to_datetime(df["date"])
    wide = df.pivot_table(
        index="date", columns="asset_name",
        values="price", aggfunc="last",
    ).reset_index()
    wide.columns.name = None
    logger.info(f"Loaded market prices: {wide.shape}")
    return wide


def load_fear_index() -> pd.DataFrame:
    """Load Polymarket fear index."""
    client = get_client()
    resp   = (
        client.table(cfg.tables.fear_index)
        .select("date, fear_score")
        .order("date", desc=False)
        .execute()
    )
    if not resp.data:
        logger.warning("No fear index data found")
        return pd.DataFrame()

    df = pd.DataFrame(resp.data)
    df["date"] = pd.to_datetime(df["date"])
    df = df.rename(columns={"fear_score": "fear_index"})
    logger.info(f"Loaded fear index: {df.shape}")
    return df


def load_news_sentiment() -> pd.DataFrame:
    """Load news sentiment signals."""
    client = get_client()
    resp   = (
        client.table(cfg.tables.news_sentiment)
        .select("date, newsapi_disruption_ratio, combined_sentiment_score")
        .order("date", desc=False)
        .execute()
    )
    if not resp.data:
        logger.warning("No news sentiment data found")
        return pd.DataFrame()

    df = pd.DataFrame(resp.data)
    df["date"] = pd.to_datetime(df["date"])
    logger.info(f"Loaded news sentiment: {df.shape}")
    return df


def load_llm_signals() -> pd.DataFrame:
    """Load LLM-extracted disruption risk scores."""
    client = get_client()
    resp   = (
        client.table("llm_signals")
        .select("week_start, llm_risk_score")
        .order("week_start", desc=False)
        .execute()
    )
    if not resp.data:
        logger.warning("No LLM signals found — run llm_signals.py first")
        return pd.DataFrame()

    df = pd.DataFrame(resp.data)
    df = df.rename(columns={"week_start": "date"})
    df["date"] = pd.to_datetime(df["date"])
    logger.info(f"Loaded LLM signals: {df.shape}")
    return df


def load_all_raw_signals() -> pd.DataFrame:
    """
    Load and merge all raw signals into one wide DataFrame.
    One row per week, one column per signal.
    Missing values are forward-filled then back-filled.
    """
    macro  = load_macro_signals()
    market = load_market_prices()
    fear   = load_fear_index()
    news   = load_news_sentiment()
    llm    = load_llm_signals()

    if macro.empty:
        raise RuntimeError("No macro signals loaded — run FRED ingestion first")

    merged = macro.copy()

    if not market.empty:
        merged = merged.merge(market, on="date", how="left")
    if not fear.empty:
        merged = merged.merge(fear, on="date", how="left")
    if not news.empty:
        merged = merged.merge(news, on="date", how="left")
    if not llm.empty:
        merged = merged.merge(llm, on="date", how="left")

    # Sort by date
    merged = merged.sort_values("date").reset_index(drop=True)

    # Forward fill then backward fill missing values
    signal_cols = [c for c in merged.columns if c != "date"]
    merged[signal_cols] = merged[signal_cols].ffill().bfill()

    logger.info(f"Combined raw signals shape: {merged.shape}")
    return merged


# ── Build feature matrix ──────────────────────────────────────

def build_feature_matrix(raw_df: pd.DataFrame) -> pd.DataFrame:
    """
    Run all feature engineering steps on the raw signal DataFrame.

    Steps:
    1. Lag features     — values N weeks ago
    2. Change features  — absolute change over N weeks
    3. Pct change       — % change over N weeks
    4. Rolling mean     — smoothed trend
    5. Rolling std      — volatility
    6. Rolling momentum — deviation from recent average
    7. Rolling z-score  — normalised signal strength
    8. Cross features   — signal interactions
    """
    logger.info("Building feature matrix...")
    df = raw_df.copy()

    available = [s for s in ALL_SIGNALS if s in df.columns]
    logger.info(f"Engineering features for {len(available)} signals")

    df = compute_lag_features(df, available)
    df = compute_lag_changes(df, available)
    df = compute_pct_change(df, available)
    df = compute_rolling_mean(df, available)
    df = compute_rolling_std(df, available)
    df = compute_rolling_momentum(df, available)
    df = compute_rolling_zscore(df, available)
    df = compute_all_cross_features(df)

    # Second ffill after feature engineering
    feature_cols = [c for c in df.columns if c != "date"]
    df[feature_cols] = df[feature_cols].ffill().bfill()

    # Drop rows where all features are NaN
    df = df.dropna(subset=feature_cols, how="all")

    # Keep only rows with at least 20% of features populated
    threshold = len(feature_cols) * 0.2
    df = df[df[feature_cols].notna().sum(axis=1) >= threshold]

    total_features = len([c for c in df.columns if c != "date"])
    logger.info(f"Feature matrix complete: {df.shape[0]} weeks × {total_features} features")
    return df


# ── Save to Supabase ──────────────────────────────────────────

def _upsert_with_retry(batch: list, batch_num: int, total_batches: int, max_retries: int = 4) -> None:
    """Upsert a single batch with exponential backoff on failure."""
    for attempt in range(max_retries):
        try:
            upsert_rows("features", batch, on_conflict="date,feature_name")
            return
        except Exception as e:
            if attempt < max_retries - 1:
                wait = 2 ** attempt
                logger.warning(
                    f"Batch {batch_num}/{total_batches} failed "
                    f"(attempt {attempt + 1}/{max_retries}): {e} — retrying in {wait}s"
                )
                time.sleep(wait)
            else:
                logger.error(f"Batch {batch_num}/{total_batches} failed after {max_retries} attempts")
                raise


def save_features_to_db(feature_df: pd.DataFrame, batch_size: int = 200) -> int:
    """Save feature matrix to Supabase features table."""
    if feature_df.empty:
        logger.warning("Empty feature DataFrame — nothing to save")
        return 0

    feature_cols = [c for c in feature_df.columns if c != "date"]
    rows = []

    for _, row in feature_df.iterrows():
        date_str = str(row["date"].date())
        for col in feature_cols:
            val = row[col]
            if pd.notna(val):
                rows.append({
                    "date":         date_str,
                    "feature_name": col,
                    "value":        round(float(val), 6),
                })

    total_batches = (len(rows) - 1) // batch_size + 1
    logger.info(f"Saving {len(rows)} feature rows in batches of {batch_size}")

    total = 0
    for i in range(0, len(rows), batch_size):
        batch     = rows[i : i + batch_size]
        batch_num = i // batch_size + 1
        _upsert_with_retry(batch, batch_num, total_batches)
        total += len(batch)
        logger.info(f"  Batch {batch_num}/{total_batches} — {total}/{len(rows)} rows saved")

    logger.info(f"Feature pipeline saved {total} rows to Supabase")
    return total


# ── Entry point ───────────────────────────────────────────────

def run() -> pd.DataFrame:
    """Full pipeline: load → engineer → save."""
    config.validate()

    logger.info("=" * 50)
    logger.info("Feature pipeline starting")

    raw      = load_all_raw_signals()
    features = build_feature_matrix(raw)
    total    = save_features_to_db(features)

    logger.info(f"Feature pipeline complete — {total} rows saved")
    logger.info("=" * 50)
    return features


if __name__ == "__main__":
    df = run()
    print(f"\nFeature matrix shape: {df.shape}")
    print(f"Date range: {df['date'].min().date()} to {df['date'].max().date()}")
    print(f"\nFirst 5 feature columns:")
    feat_cols = [c for c in df.columns if c != "date"][:5]
    print(df[["date"] + feat_cols].tail(3).to_string(index=False))