"""
src/models/prophet_forecast.py

Prophet-based time series forecasting for key supply chain signals.

What this does:
    1. Loads historical values for each key signal from Supabase
    2. Trains a Prophet model on each signal
    3. Generates 12-week forward forecasts
    4. Saves forecasts to the signal_forecasts table in Supabase
    5. The FastAPI /risk/forecast endpoint reads from this table

Why Prophet:
    Prophet handles weekly time series with trend + seasonality + holidays.
    It's robust to missing data and outliers — both common in macro signals.
    It gives confidence intervals (yhat_lower, yhat_upper) which power
    the forecast chart's confidence band in the dashboard.

Pitch line:
    "We forecast 6 key macro signals 12 weeks ahead using Prophet,
    then feed those forecasts into our disruption model to generate
    a defensible risk trajectory — not just trend extrapolation."

Supabase table required:
    CREATE TABLE IF NOT EXISTS signal_forecasts (
        id           BIGSERIAL PRIMARY KEY,
        signal_name  TEXT NOT NULL,
        forecast_date DATE NOT NULL,
        yhat          FLOAT NOT NULL,
        yhat_lower    FLOAT NOT NULL,
        yhat_upper    FLOAT NOT NULL,
        is_forecast   BOOLEAN NOT NULL DEFAULT TRUE,
        generated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(signal_name, forecast_date)
    );
    CREATE INDEX IF NOT EXISTS idx_signal_forecasts_signal
        ON signal_forecasts (signal_name, forecast_date DESC);

Owner: Aadarsh
Run:   python -m src.models.prophet_forecast
"""

import warnings
import pandas as pd
import numpy as np
from datetime import datetime, UTC

warnings.filterwarnings("ignore")

# Prophet import with helpful error message
try:
    from prophet import Prophet
except ImportError:
    raise ImportError(
        "Prophet not installed. Run: pip install prophet"
    )

from src.utils.logger           import get_logger
from src.utils.db               import get_client, upsert_rows
from src.utils.ingestion_config import cfg

logger = get_logger(__name__)

# ── Signals to forecast ───────────────────────────────────────
# These are your most predictive signals from the SHAP analysis.
# Prophet trains one model per signal.
FORECAST_SIGNALS = [
    "natural_gas_price",
    "crude_oil_price",
    "copper",
    "import_price_index",
    "trade_balance",
    "cpi_all",
]

FORECAST_WEEKS   = 12    # how far ahead to forecast
HISTORY_WEEKS    = 156   # 3 years of history for Prophet training


# ── Load signal history from Supabase ────────────────────────

def load_signal_history(signal_name: str) -> pd.DataFrame:
    """
    Load weekly history for a single signal from macro_signals
    or market_prices table.

    Returns DataFrame with columns [ds, y] — Prophet's required format.
    ds = date, y = value
    """
    client = get_client()

    # Try macro_signals first
    resp = (
        client.table(cfg.tables.macro_signals)
        .select("date, value")
        .eq("signal_name", signal_name)
        .order("date", desc=False)
        .execute()
    )

    if resp.data:
        df = pd.DataFrame(resp.data)
        df["date"] = pd.to_datetime(df["date"])
        df = df.rename(columns={"date": "ds", "value": "y"})
        df = df.dropna(subset=["y"])
        df = df.sort_values("ds").reset_index(drop=True)

        # Keep last N weeks for training
        if len(df) > HISTORY_WEEKS:
            df = df.tail(HISTORY_WEEKS).reset_index(drop=True)

        logger.info(f"  Loaded {len(df)} rows for {signal_name} from macro_signals")
        return df

    # Try market_prices
    resp = (
        client.table(cfg.tables.market_prices)
        .select("date, price")
        .eq("asset_name", signal_name)
        .order("date", desc=False)
        .execute()
    )

    if resp.data:
        df = pd.DataFrame(resp.data)
        df["date"] = pd.to_datetime(df["date"])
        df = df.rename(columns={"date": "ds", "price": "y"})
        df = df.dropna(subset=["y"])
        df = df.sort_values("ds").reset_index(drop=True)

        if len(df) > HISTORY_WEEKS:
            df = df.tail(HISTORY_WEEKS).reset_index(drop=True)

        logger.info(f"  Loaded {len(df)} rows for {signal_name} from market_prices")
        return df

    logger.warning(f"  No data found for signal: {signal_name}")
    return pd.DataFrame()


# ── Train Prophet model ───────────────────────────────────────

def train_prophet(df: pd.DataFrame, signal_name: str) -> Prophet | None:
    """
    Train a Prophet model on a single signal's history.

    Prophet config:
    - Weekly seasonality enabled (your data is weekly)
    - Yearly seasonality enabled (macro cycles)
    - Daily seasonality disabled (weekly data, not daily)
    - changepoint_prior_scale=0.15 — allows trend changes (tariff shocks)
    - seasonality_prior_scale=10   — strong seasonality for commodity cycles
    """
    if df.empty or len(df) < 20:
        logger.warning(f"  Not enough data for {signal_name} ({len(df)} rows) — skipping")
        return None

    try:
        model = Prophet(
            changepoint_prior_scale  = 0.15,
            seasonality_prior_scale  = 10.0,
            yearly_seasonality       = True,
            weekly_seasonality       = False,   # weekly data, not intra-week
            daily_seasonality        = False,
            interval_width           = 0.80,    # 80% confidence interval
            uncertainty_samples      = 200,
        )

        # Suppress Prophet's stdout logging
        import logging
        prophet_logger = logging.getLogger("prophet")
        prophet_logger.setLevel(logging.WARNING)
        cmdstanpy_logger = logging.getLogger("cmdstanpy")
        cmdstanpy_logger.setLevel(logging.WARNING)

        model.fit(df)
        logger.info(f"  Prophet trained on {len(df)} weeks for {signal_name}")
        return model

    except Exception as e:
        logger.error(f"  Prophet training failed for {signal_name}: {e}")
        return None


# ── Generate forecast ─────────────────────────────────────────

def generate_forecast(
    model: Prophet,
    df: pd.DataFrame,
    signal_name: str,
    weeks_ahead: int = FORECAST_WEEKS,
) -> pd.DataFrame:
    """
    Generate forecast including historical fitted values + future predictions.

    Returns DataFrame with columns:
        [signal_name, forecast_date, yhat, yhat_lower, yhat_upper, is_forecast]
    """
    # Create future dataframe — includes history + forecast horizon
    future = model.make_future_dataframe(
        periods=weeks_ahead,
        freq="W",
        include_history=True,
    )

    forecast = model.predict(future)

    # Last N historical rows + forecast rows
    hist_end  = df["ds"].max()
    result_df = forecast[["ds", "yhat", "yhat_lower", "yhat_upper"]].copy()
    result_df["is_forecast"]   = result_df["ds"] > hist_end
    result_df["signal_name"]   = signal_name
    result_df["forecast_date"] = result_df["ds"].dt.strftime("%Y-%m-%d")

    # Keep last 24 historical + all forecast weeks
    hist_df     = result_df[~result_df["is_forecast"]].tail(24)
    forecast_df = result_df[result_df["is_forecast"]]
    combined    = pd.concat([hist_df, forecast_df], ignore_index=True)

    # Round values
    for col in ["yhat", "yhat_lower", "yhat_upper"]:
        combined[col] = combined[col].round(4)

    logger.info(
        f"  Forecast generated: {(~combined['is_forecast']).sum()} historical + "
        f"{combined['is_forecast'].sum()} forecast weeks"
    )
    return combined


# ── Save forecasts to Supabase ────────────────────────────────

def save_forecasts(forecast_df: pd.DataFrame) -> int:
    """Save signal forecasts to Supabase signal_forecasts table."""
    if forecast_df.empty:
        return 0

    rows = []
    run_ts = datetime.now(UTC).isoformat()
    for _, row in forecast_df.iterrows():
        rows.append({
            "signal_name":   row["signal_name"],
            "forecast_date": row["forecast_date"],
            "yhat":          float(row["yhat"]),
            "yhat_lower":    float(row["yhat_lower"]),
            "yhat_upper":    float(row["yhat_upper"]),
            "is_forecast":   bool(row["is_forecast"]),
            "generated_at":  run_ts,
        })

    total = upsert_rows(
        "signal_forecasts", rows,
        on_conflict="signal_name,forecast_date",
    )
    return total


# ── Compute disruption risk from forecasts ────────────────────

def compute_forecast_risk(generated_at: str) -> list[dict]:
    """
    Use forecasted signal values to estimate forward disruption risk.

    Logic:
        For each forecast week, score how many signals are trending
        above their recent average. More signals trending up = higher risk.
        Scale to 0–100 risk score.

    Returns list of dicts ready to upsert into predictions table.
    """
    client = get_client()
    resp   = (
        client.table("signal_forecasts")
        .select("signal_name, forecast_date, yhat, is_forecast")
        .eq("is_forecast", True)
        .order("forecast_date", desc=False)
        .execute()
    )
    if not resp.data:
        logger.warning("No forecast data found in signal_forecasts")
        return []

    df = pd.DataFrame(resp.data)
    df["forecast_date"] = pd.to_datetime(df["forecast_date"])

    # Pivot: rows = dates, columns = signals
    pivot = df.pivot_table(
        index="forecast_date",
        columns="signal_name",
        values="yhat",
        aggfunc="last",
    ).reset_index()
    pivot.columns.name = None

    # Load recent actuals for baseline comparison
    resp2 = (
        client.table("signal_forecasts")
        .select("signal_name, forecast_date, yhat, is_forecast")
        .eq("is_forecast", False)
        .order("forecast_date", desc=False)
        .execute()
    )
    if not resp2.data:
        return []

    hist_df    = pd.DataFrame(resp2.data)
    hist_df["forecast_date"] = pd.to_datetime(hist_df["forecast_date"])
    hist_pivot = hist_df.pivot_table(
        index="forecast_date", columns="signal_name",
        values="yhat", aggfunc="last",
    ).reset_index()
    hist_pivot.columns.name = None

    # Compute baseline (mean of last 8 historical weeks per signal)
    signal_cols = [c for c in FORECAST_SIGNALS if c in hist_pivot.columns]
    baseline    = hist_pivot[signal_cols].tail(8).mean()

    # For each forecast week, count signals above baseline
    rows = []
    for _, row in pivot.iterrows():
        above_count = 0
        total_count = 0
        for sig in signal_cols:
            if sig in row and pd.notna(row[sig]) and sig in baseline:
                total_count += 1
                if row[sig] > baseline[sig]:
                    above_count += 1

        # Scale: 0 signals above = 30 risk, all signals above = 90 risk
        if total_count > 0:
            ratio      = above_count / total_count
            risk_score = round(30 + ratio * 60, 2)
        else:
            risk_score = 50.0

        risk_level = "high" if risk_score >= 65 else "medium" if risk_score >= 40 else "low"

        rows.append({
            "date":         str(row["forecast_date"].date()),
            "risk_score":   risk_score,
            "risk_level":   risk_level,
            "scored_at":    generated_at,
        })

    return rows


# ── Entry point ───────────────────────────────────────────────

def run(signals: list[str] = None) -> dict:
    """
    Full Prophet forecast pipeline:
    1. For each signal: load history → train Prophet → generate forecast
    2. Save all forecasts to Supabase
    3. Compute risk scores from forecast values
    4. Save forward predictions to predictions table

    Args:
        signals: list of signal names to forecast (default: FORECAST_SIGNALS)

    Returns:
        Dict of {signal_name: forecast_df}
    """
    logger.info("=" * 50)
    logger.info("Prophet forecast pipeline starting")

    signals    = signals or FORECAST_SIGNALS
    results    = {}
    all_rows   = []
    run_ts     = datetime.now(UTC).isoformat()

    for signal in signals:
        logger.info(f"Processing signal: {signal}")

        # 1. Load history
        history = load_signal_history(signal)
        if history.empty:
            continue

        # 2. Train Prophet
        model = train_prophet(history, signal)
        if model is None:
            continue

        # 3. Generate forecast
        forecast = generate_forecast(model, history, signal)
        results[signal] = forecast
        all_rows.append(forecast)

    if not all_rows:
        logger.error("No forecasts generated — check signal data in Supabase")
        return {}

    # 4. Save all forecasts
    combined = pd.concat(all_rows, ignore_index=True)
    total    = save_forecasts(combined)
    logger.info(f"Saved {total} forecast rows to Supabase")

    # 5. Compute and save forward risk scores
    forward_risk = compute_forecast_risk(run_ts)
    if forward_risk:
        # Mark as forecast rows
        for row in forward_risk:
            row["scored_at"] = run_ts
        risk_total = upsert_rows(
            "predictions", forward_risk, on_conflict="date"
        )
        logger.info(f"Saved {risk_total} forward risk predictions to Supabase")

    logger.info("=" * 50)
    logger.info("Prophet forecast pipeline complete")
    logger.info(f"Signals forecasted: {list(results.keys())}")
    return results


if __name__ == "__main__":
    results = run()

    print(f"\n{'='*50}")
    print("PROPHET FORECAST SUMMARY")
    print(f"{'='*50}")

    for signal, df in results.items():
        forecast_only = df[df["is_forecast"]]
        print(f"\n{signal}:")
        print(f"  Forecast horizon: {len(forecast_only)} weeks")
        print(f"  Next week: {forecast_only['yhat'].iloc[0]:.2f} "
              f"(range: {forecast_only['yhat_lower'].iloc[0]:.2f} – "
              f"{forecast_only['yhat_upper'].iloc[0]:.2f})")
        print(f"  12-week trend: "
              f"{forecast_only['yhat'].iloc[0]:.2f} → "
              f"{forecast_only['yhat'].iloc[-1]:.2f}")