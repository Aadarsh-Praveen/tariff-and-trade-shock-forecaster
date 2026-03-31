"""
src/ingestion/fred_client.py

Fetches macroeconomic series from the FRED API.
All series IDs, URLs, and settings come from configs/ingestion_config.yaml.
No hardcoded values in this file.

Owner: Aadarsh
Run:   python -m src.ingestion.fred_client
"""

import requests
import pandas as pd
from src.utils.config import config
from src.utils.logger import get_logger
from src.utils.db import upsert_rows
from src.utils.ingestion_config import cfg

logger = get_logger(__name__)


def fetch_series(series_id: str, signal_name: str) -> pd.DataFrame:
    """
    Fetch a single FRED series by ID.

    Args:
        series_id:   FRED series ID e.g. "INDPRO"
        signal_name: Human-readable name e.g. "industrial_production"

    Returns:
        DataFrame with columns [date, <signal_name>]
    """
    params = {
        "series_id":         series_id,
        "api_key":           config.FRED_API_KEY,
        "file_type":         "json",
        "observation_start": cfg.global_.start_date,
    }
    try:
        logger.info(f"Fetching FRED: {signal_name} ({series_id})")
        resp = requests.get(cfg.fred.base_url, params=params, timeout=15)
        resp.raise_for_status()

        observations = resp.json().get("observations", [])
        if not observations:
            logger.warning(f"No observations returned for {series_id}")
            return pd.DataFrame(columns=["date", signal_name])

        df = pd.DataFrame(observations)[["date", "value"]]
        df["date"]        = pd.to_datetime(df["date"])
        df["value"]       = pd.to_numeric(df["value"], errors="coerce")
        df = (
            df.dropna(subset=["value"])
            .rename(columns={"value": signal_name})
            .sort_values("date")
            .reset_index(drop=True)
        )
        logger.info(
            f"  -> {len(df)} rows | "
            f"{df['date'].min().date()} to {df['date'].max().date()}"
        )
        return df

    except requests.exceptions.HTTPError as e:
        logger.error(f"HTTP error fetching {series_id}: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error fetching {series_id}: {e}")
        raise


def fetch_all_series() -> pd.DataFrame:
    """
    Fetch every series defined in ingestion_config.yaml → fred.series
    and merge into a single weekly DataFrame.

    Returns:
        Wide DataFrame with one column per signal, indexed by weekly date
    """
    frames = []
    for signal_name, series_id in cfg.fred.series.items():
        try:
            df = fetch_series(series_id, signal_name).set_index("date")
            frames.append(df)
        except Exception as e:
            logger.warning(f"Skipping {signal_name} ({series_id}): {e}")

    if not frames:
        raise RuntimeError(
            "No FRED series fetched. Check FRED_API_KEY and network."
        )

    combined = pd.concat(frames, axis=1)
    combined = (
        combined
        .resample(cfg.global_.resample_frequency)
        .last()
        .dropna(how="all")
        .reset_index()
    )
    logger.info(f"FRED combined shape: {combined.shape}")
    return combined


def save_to_db(df: pd.DataFrame) -> int:
    """
    Upsert FRED data into Supabase.
    Table name comes from ingestion_config.yaml → tables.macro_signals.
    """
    rows        = []
    signal_cols = [c for c in df.columns if c != "date"]

    for _, row in df.iterrows():
        for signal_name in signal_cols:
            val = row[signal_name]
            if pd.notna(val):
                rows.append({
                    "date":        str(row["date"].date()),
                    "signal_name": signal_name,
                    "value":       float(val),
                    "source":      "FRED",
                })

    return upsert_rows(cfg.tables.macro_signals, rows, on_conflict="date,signal_name")


def run():
    config.validate()
    df    = fetch_all_series()
    total = save_to_db(df)
    logger.info(f"FRED ingestion complete — {total} rows in Supabase")
    return df


if __name__ == "__main__":
    run()