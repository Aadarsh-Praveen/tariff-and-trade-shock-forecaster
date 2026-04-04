"""
src/ingestion/alpha_client.py

Fetches commodity prices and sector ETFs from Alpha Vantage.
All asset names, tickers, URLs, and rate limits come from
configs/ingestion_config.yaml. No hardcoded values in this file.

Owner: Aadarsh
Run:   python -m src.ingestion.alpha_client
"""

import time
import requests
import pandas as pd
from src.utils.config import config
from src.utils.logger import get_logger
from src.utils.db import upsert_rows
from src.utils.ingestion_config import cfg

logger = get_logger(__name__)


def fetch_commodity(name: str, function_code: str) -> pd.DataFrame:
    """
    Fetch a single commodity price series from Alpha Vantage.

    Args:
        name:          Human-readable name e.g. "copper"
        function_code: Alpha Vantage function e.g. "COPPER"

    Returns:
        DataFrame with columns [date, <name>]
    """
    params = {
        "function": function_code,
        "interval": cfg.alpha_vantage.commodity_interval,
        "apikey":   config.ALPHA_VANTAGE_API_KEY,
    }
    try:
        logger.info(f"Fetching commodity: {name} ({function_code})")
        resp = requests.get(
            cfg.alpha_vantage.base_url, params=params, timeout=15
        )
        resp.raise_for_status()
        data = resp.json()

        if "data" not in data:
            msg = data.get("Note", data.get("Information", "unknown response"))
            logger.warning(f"No 'data' key for {name}: {msg}")
            return pd.DataFrame(columns=["date", name])

        df = pd.DataFrame(data["data"]).rename(columns={"value": name})
        df["date"] = pd.to_datetime(df["date"])
        df[name]   = pd.to_numeric(df[name], errors="coerce")
        df = (
            df[["date", name]]
            .dropna()
            .sort_values("date")
            .reset_index(drop=True)
        )
        df = df[df["date"] >= cfg.global_.start_date]
        logger.info(f"  -> {len(df)} rows for {name}")
        return df

    except Exception as e:
        logger.error(f"Failed to fetch commodity {name}: {e}")
        raise


def fetch_etf(label: str, ticker: str) -> pd.DataFrame:
    """
    Fetch weekly adjusted close for a sector ETF.

    Args:
        label:  Column name e.g. "industrials"
        ticker: ETF ticker e.g. "XLI"

    Returns:
        DataFrame with columns [date, <label>]
    """
    params = {
        "function": "TIME_SERIES_WEEKLY_ADJUSTED",
        "symbol":   ticker,
        "apikey":   config.ALPHA_VANTAGE_API_KEY,
        "datatype": "json",
    }
    try:
        logger.info(f"Fetching ETF: {ticker} as '{label}'")
        resp = requests.get(
            cfg.alpha_vantage.base_url, params=params, timeout=15
        )
        resp.raise_for_status()
        data   = resp.json()
        weekly = data.get("Weekly Adjusted Time Series", {})

        if not weekly:
            logger.warning(f"No weekly data for {ticker}")
            return pd.DataFrame(columns=["date", label])

        records = [
            {"date": pd.to_datetime(k), label: float(v["5. adjusted close"])}
            for k, v in weekly.items()
        ]
        df = (
            pd.DataFrame(records)
            .sort_values("date")
            .reset_index(drop=True)
        )
        df = df[df["date"] >= cfg.global_.start_date]
        logger.info(f"  -> {len(df)} rows for {ticker}")
        return df

    except Exception as e:
        logger.error(f"Failed to fetch ETF {ticker}: {e}")
        raise


def fetch_all() -> pd.DataFrame:
    """
    Fetch every commodity and ETF defined in ingestion_config.yaml
    and merge into a single weekly DataFrame.

    Pauses between requests as configured in
    alpha_vantage.rate_limit_pause_seconds to respect the free tier limit.

    Returns:
        Wide weekly DataFrame with one column per asset
    """
    frames = []
    pause  = cfg.alpha_vantage.rate_limit_pause_seconds

    for name, function_code in cfg.alpha_vantage.commodities.items():
        try:
            df = fetch_commodity(name, function_code).set_index("date")
            frames.append(df)
            time.sleep(pause)
        except Exception as e:
            logger.warning(f"Skipping commodity {name}: {e}")

    for label, ticker in cfg.alpha_vantage.etfs.items():
        try:
            df = fetch_etf(label, ticker).set_index("date")
            frames.append(df)
            time.sleep(pause)
        except Exception as e:
            logger.warning(f"Skipping ETF {ticker}: {e}")

    if not frames:
        raise RuntimeError(
            "No Alpha Vantage data fetched. Check ALPHA_VANTAGE_API_KEY."
        )

    merged = pd.concat(frames, axis=1)
    # Ensure index is DatetimeIndex before resampling
    # (can become plain Index if some frames had no data)
    merged.index = pd.to_datetime(merged.index)
    combined = (
        merged
        .resample(cfg.global_.resample_frequency)
        .last()
        .dropna(how="all")
        .reset_index()
    )
    logger.info(f"Alpha Vantage combined shape: {combined.shape}")
    return combined


def save_to_db(df: pd.DataFrame) -> int:
    """
    Upsert Alpha Vantage data into Supabase.
    Table name comes from ingestion_config.yaml → tables.market_prices.
    asset_type is derived from whether the name is in commodities or etfs.
    """
    commodity_names = set(cfg.alpha_vantage.commodities.keys())
    rows            = []
    asset_cols      = [c for c in df.columns if c != "date"]

    for _, row in df.iterrows():
        for asset_name in asset_cols:
            val = row[asset_name]
            if pd.notna(val):
                rows.append({
                    "date":       str(row["date"].date()),
                    "asset_name": asset_name,
                    "price":      float(val),
                    "asset_type": "commodity" if asset_name in commodity_names else "etf",
                })

    return upsert_rows(cfg.tables.market_prices, rows, on_conflict="date,asset_name")


def run():
    config.validate()
    df    = fetch_all()
    total = save_to_db(df)
    logger.info(f"Alpha Vantage ingestion complete — {total} rows in Supabase")
    return df


if __name__ == "__main__":
    run()