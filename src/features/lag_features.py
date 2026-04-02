"""
src/features/lag_features.py

Creates lag features from raw signals.

A lag feature answers: "what was this signal N weeks ago?"

Why lags matter:
  Supply chain disruptions don't happen instantly. Signals like copper
  price or PMI move BEFORE the disruption hits. Lag features let the
  model learn: "when copper was high 2 weeks ago AND PMI was falling,
  disruption followed."

Lag windows used: 1 week, 2 weeks, 4 weeks
"""

import pandas as pd
from src.utils.logger import get_logger
from src.utils.ingestion_config import cfg

logger = get_logger(__name__)

# Which signals to create lags for and which windows to use
# Loaded from config — no hardcoding
LAG_WINDOWS = [1, 2, 4]   # weeks


def compute_lag_features(df: pd.DataFrame, signals: list[str]) -> pd.DataFrame:
    """
    Create lag features for specified signals.

    Args:
        df:       Wide DataFrame indexed by date, one column per signal
        signals:  List of column names to create lags for

    Returns:
        DataFrame with new lag columns added
        Column naming: <signal>_lag_<n>w
        e.g. copper_lag_2w = copper price 2 weeks ago
    """
    result = df.copy()
    result = result.sort_values("date").reset_index(drop=True)

    new_cols = []
    for signal in signals:
        if signal not in df.columns:
            logger.warning(f"Signal '{signal}' not found in DataFrame — skipping lags")
            continue

        for weeks in LAG_WINDOWS:
            col_name = f"{signal}_lag_{weeks}w"
            result[col_name] = result[signal].shift(weeks)
            new_cols.append(col_name)

    logger.info(f"Created {len(new_cols)} lag features for {len(signals)} signals")
    return result


def compute_lag_changes(df: pd.DataFrame, signals: list[str]) -> pd.DataFrame:
    """
    Create week-over-week change features.

    Change = current value minus value N weeks ago.
    Captures momentum — is the signal accelerating or reversing?

    Column naming: <signal>_change_<n>w
    e.g. copper_change_4w = copper price change over last 4 weeks
    """
    result = df.copy()
    result = result.sort_values("date").reset_index(drop=True)

    new_cols = []
    for signal in signals:
        if signal not in df.columns:
            continue

        for weeks in LAG_WINDOWS:
            col_name = f"{signal}_change_{weeks}w"
            result[col_name] = result[signal] - result[signal].shift(weeks)
            new_cols.append(col_name)

    logger.info(f"Created {len(new_cols)} change features")
    return result


def compute_pct_change(df: pd.DataFrame, signals: list[str]) -> pd.DataFrame:
    """
    Create percentage change features.

    Pct change = (current - N weeks ago) / N weeks ago * 100
    More interpretable than raw change for signals at different scales.

    Column naming: <signal>_pct_<n>w
    e.g. copper_pct_4w = copper % change over 4 weeks
    """
    result = df.copy()
    result = result.sort_values("date").reset_index(drop=True)

    new_cols = []
    for signal in signals:
        if signal not in df.columns:
            continue

        for weeks in LAG_WINDOWS:
            col_name = f"{signal}_pct_{weeks}w"
            result[col_name] = (
                (result[signal] - result[signal].shift(weeks))
                / result[signal].shift(weeks).abs().replace(0, float("nan"))
                * 100
            ).round(4)
            new_cols.append(col_name)

    logger.info(f"Created {len(new_cols)} pct change features")
    return result