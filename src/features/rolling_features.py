"""
src/features/rolling_features.py

Creates rolling window features from raw signals.

Rolling features answer: "what has this signal been doing over the last N weeks?"

Why rolling features matter:
  A single week's reading is noisy. A 4-week rolling average smooths out
  noise and reveals the underlying trend. Rolling std captures volatility —
  high volatility in a supply signal often precedes disruption.

Windows used: 4 weeks, 8 weeks
"""

import pandas as pd
from src.utils.logger import get_logger

logger = get_logger(__name__)

ROLLING_WINDOWS = [4, 8]   # weeks


def compute_rolling_mean(df: pd.DataFrame, signals: list[str]) -> pd.DataFrame:
    """
    Create rolling mean features.

    Smooths noise and captures the recent trend direction.

    Column naming: <signal>_mean_<n>w
    e.g. copper_mean_4w = average copper price over last 4 weeks
    """
    result = df.copy()
    result = result.sort_values("date").reset_index(drop=True)

    new_cols = []
    for signal in signals:
        if signal not in df.columns:
            logger.warning(f"Signal '{signal}' not found — skipping rolling mean")
            continue

        for window in ROLLING_WINDOWS:
            col_name = f"{signal}_mean_{window}w"
            result[col_name] = (
                result[signal]
                .rolling(window=window, min_periods=max(1, window // 2))
                .mean()
                .round(4)
            )
            new_cols.append(col_name)

    logger.info(f"Created {len(new_cols)} rolling mean features")
    return result


def compute_rolling_std(df: pd.DataFrame, signals: list[str]) -> pd.DataFrame:
    """
    Create rolling standard deviation features.

    High std = high volatility = potential stress in that signal.
    One of the best early warning indicators for supply disruption.

    Column naming: <signal>_std_<n>w
    e.g. crude_oil_price_std_4w = crude oil volatility over last 4 weeks
    """
    result = df.copy()
    result = result.sort_values("date").reset_index(drop=True)

    new_cols = []
    for signal in signals:
        if signal not in df.columns:
            continue

        for window in ROLLING_WINDOWS:
            col_name = f"{signal}_std_{window}w"
            result[col_name] = (
                result[signal]
                .rolling(window=window, min_periods=max(2, window // 2))
                .std()
                .round(4)
            )
            new_cols.append(col_name)

    logger.info(f"Created {len(new_cols)} rolling std features")
    return result


def compute_rolling_momentum(df: pd.DataFrame, signals: list[str]) -> pd.DataFrame:
    """
    Create rolling momentum features.

    Momentum = current value minus rolling mean.
    Positive momentum = signal rising above its recent average.
    Negative momentum = signal falling below its recent average.

    This captures acceleration — a sudden move away from the trend
    is more significant than a gradual one.

    Column naming: <signal>_momentum_<n>w
    e.g. copper_momentum_4w = copper above/below its 4-week average
    """
    result = df.copy()
    result = result.sort_values("date").reset_index(drop=True)

    new_cols = []
    for signal in signals:
        if signal not in df.columns:
            continue

        for window in ROLLING_WINDOWS:
            rolling_mean = (
                result[signal]
                .rolling(window=window, min_periods=max(1, window // 2))
                .mean()
            )
            col_name = f"{signal}_momentum_{window}w"
            result[col_name] = (result[signal] - rolling_mean).round(4)
            new_cols.append(col_name)

    logger.info(f"Created {len(new_cols)} momentum features")
    return result


def compute_rolling_zscore(df: pd.DataFrame, signals: list[str]) -> pd.DataFrame:
    """
    Create rolling z-score features.

    Z-score = (current - rolling mean) / rolling std
    Measures how many standard deviations the current value is
    from its recent average. Values above 2 or below -2 are unusual.

    This normalises signals at different scales so the model can
    compare copper (thousands of USD) with CPI (index ~300) fairly.

    Column naming: <signal>_zscore_<n>w
    """
    result = df.copy()
    result = result.sort_values("date").reset_index(drop=True)

    new_cols = []
    for signal in signals:
        if signal not in df.columns:
            continue

        for window in ROLLING_WINDOWS:
            rolling_mean = result[signal].rolling(
                window=window, min_periods=max(1, window // 2)
            ).mean()
            rolling_std = result[signal].rolling(
                window=window, min_periods=max(2, window // 2)
            ).std()

            col_name = f"{signal}_zscore_{window}w"
            result[col_name] = (
                (result[signal] - rolling_mean)
                / rolling_std.replace(0, float("nan"))
            ).round(4)
            new_cols.append(col_name)

    logger.info(f"Created {len(new_cols)} z-score features")
    return result