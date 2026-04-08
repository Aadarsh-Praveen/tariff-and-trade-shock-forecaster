'''
"""
app/api.py

FastAPI REST API for the Tariff & Trade Shock Forecaster.

Endpoints:
    GET  /                              Health check
    GET  /risk/current                  Latest disruption risk score
    GET  /risk/history                  Full prediction history
    GET  /risk/date/{date}              Risk score for a specific date
    GET  /risk/forecast                 12-week forward forecast
    GET  /signals/top                   Top driving signals for latest week
    GET  /signals/forecast              Prophet forecast for a specific signal
    GET  /signals/llm-reasoning         Latest Claude LLM risk reasoning
    GET  /model/metrics                 Model performance metrics
    GET  /model/features                Top 20 feature importances
    GET  /shap/waterfall/{date}         SHAP waterfall JSON for a specific date
    GET  /shap/summary                  Overall SHAP feature importance
    GET  /shap/events                   Named disruption events list

Run locally:
    uvicorn app.api:app --reload --port 8000

Docs (auto-generated):
    http://localhost:8000/docs
"""

import json
import pickle
import os
from datetime import datetime, timezone
from typing import Optional

import numpy as np
import pandas as pd
import shap as shap_lib
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from src.utils.db               import get_client
from src.utils.ingestion_config import cfg
from src.utils.logger           import get_logger

logger = get_logger(__name__)

# Python 3.10 compatibility - UTC was added in 3.11
UTC = timezone.utc

# ── App setup ─────────────────────────────────────────────────
app = FastAPI(
    title       = "Tariff & Trade Shock Forecaster API",
    description = (
        "Real-time supply chain disruption risk forecasting. "
        "Predicts disruption probability 3 weeks ahead using "
        "macro signals, commodity prices, trade data, and sentiment."
    ),
    version     = "1.0.0",
    docs_url    = "/docs",
    redoc_url   = "/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Paths ─────────────────────────────────────────────────────
MODELS_DIR    = "models"
LGB_MODEL     = os.path.join(MODELS_DIR, "lgb_model.pkl")
FEATURES_FILE = os.path.join(MODELS_DIR, "feature_columns.json")
METRICS_FILE  = os.path.join(MODELS_DIR, "metrics.json")

RISK_HIGH   = 65
RISK_MEDIUM = 40

# ── Feature label map ─────────────────────────────────────────
FEATURE_LABELS = {
    "natural_gas_price":              "Natural gas price",
    "natural_gas_price_lag_1w":       "Natural gas (1w ago)",
    "natural_gas_price_lag_2w":       "Natural gas (2w ago)",
    "natural_gas_price_lag_4w":       "Natural gas (4w ago)",
    "natural_gas_price_std_4w":       "Natural gas volatility (4w)",
    "natural_gas_price_std_8w":       "Natural gas volatility (8w)",
    "natural_gas_price_mean_4w":      "Natural gas avg (4w)",
    "natural_gas_price_mean_8w":      "Natural gas avg (8w)",
    "crude_oil_price":                "Crude oil price",
    "crude_oil_price_lag_1w":         "Crude oil (1w ago)",
    "crude_oil_price_lag_2w":         "Crude oil (2w ago)",
    "crude_oil_price_std_4w":         "Crude oil volatility (4w)",
    "crude_oil_price_std_8w":         "Crude oil volatility (8w)",
    "crude_oil_price_mean_4w":        "Crude oil avg (4w)",
    "crude_oil_price_mean_8w":        "Crude oil avg (8w)",
    "copper":                         "Copper price",
    "copper_lag_1w":                  "Copper (1w ago)",
    "copper_lag_2w":                  "Copper (2w ago)",
    "copper_zscore_4w":               "Copper z-score (4w)",
    "import_price_index":             "Import price index",
    "import_price_index_pct_4w":      "Import prices % change (4w)",
    "import_price_index_change_4w":   "Import prices change (4w)",
    "import_price_index_lag_1w":      "Import prices (1w ago)",
    "import_price_index_mean_4w":     "Import prices avg (4w)",
    "import_price_index_std_8w":      "Import prices volatility (8w)",
    "trade_balance":                  "Trade balance",
    "trade_balance_change_4w":        "Trade balance change (4w)",
    "trade_balance_momentum_4w":      "Trade balance momentum (4w)",
    "trade_balance_lag_4w":           "Trade balance (4w ago)",
    "trade_balance_momentum_8w":      "Trade balance momentum (8w)",
    "goods_imports":                  "Goods imports",
    "goods_imports_pct_4w":           "Goods imports % change (4w)",
    "goods_imports_lag_4w":           "Goods imports (4w ago)",
    "goods_imports_mean_8w":          "Goods imports avg (8w)",
    "ppi_manufacturing":              "Manufacturing PPI",
    "ppi_manufacturing_pct_4w":       "Manufacturing PPI % change (4w)",
    "ppi_manufacturing_mean_4w":      "Manufacturing PPI avg (4w)",
    "ppi_manufacturing_lag_1w":       "Manufacturing PPI (1w ago)",
    "ppi_manufacturing_lag_2w":       "Manufacturing PPI (2w ago)",
    "cpi_all":                        "CPI (all items)",
    "cpi_all_lag_1w":                 "CPI (1w ago)",
    "cpi_all_lag_2w":                 "CPI (2w ago)",
    "cpi_all_lag_4w":                 "CPI (4w ago)",
    "cpi_all_mean_4w":                "CPI avg (4w)",
    "cpi_all_mean_8w":                "CPI avg (8w)",
    "export_price_index_pct_4w":      "Export prices % change (4w)",
    "export_price_index_lag_2w":      "Export prices (2w ago)",
    "export_price_index_mean_4w":     "Export prices avg (4w)",
    "capacity_utilization":           "Capacity utilization",
    "capacity_utilization_std_8w":    "Capacity util. volatility (8w)",
    "capacity_utilization_change_4w": "Capacity util. change (4w)",
    "manufacturing_employment":       "Manufacturing employment",
    "manufacturing_employment_std_4w":"Mfg employment volatility (4w)",
    "manufacturing_employment_std_8w":"Mfg employment volatility (8w)",
    "energy_std_8w":                  "Energy ETF volatility (8w)",
    "energy_mean_4w":                 "Energy ETF avg (4w)",
    "energy_mean_8w":                 "Energy ETF avg (8w)",
    "energy_zscore_4w":               "Energy ETF z-score (4w)",
    "energy_zscore_8w":               "Energy ETF z-score (8w)",
    "materials_momentum_4w":          "Materials ETF momentum (4w)",
    "aluminum_zscore_8w":             "Aluminum z-score (8w)",
    "wheat_lag_1w":                   "Wheat price (1w ago)",
    "housing_starts_mean_4w":         "Housing starts avg (4w)",
    "housing_starts_change_4w":       "Housing starts change (4w)",
    "housing_starts_std_8w":          "Housing starts volatility (8w)",
    "unemployment_rate_pct_4w":       "Unemployment % change (4w)",
    "trade_pressure_index":           "Trade pressure index",
    "copper_pmi_stress":              "Copper-PMI stress index",
    "energy_mfg_ratio":               "Energy/manufacturing ratio",
    "capacity_labour_stress":         "Capacity-labour stress",
    "multi_commodity_stress":         "Multi-commodity stress",
    "fear_macro_alignment":           "Fear-macro alignment",
    "llm_risk_score":                 "AI risk score (Claude)",
    "llm_risk_score_lag_1w":          "AI risk score (1w ago)",
    "llm_risk_score_lag_2w":          "AI risk score (2w ago)",
    "fear_index":                     "Polymarket fear index",
    "fear_index_lag_1w":              "Polymarket fear (1w ago)",
    "newsapi_disruption_ratio":       "News disruption ratio",
    "combined_sentiment_score":       "Combined sentiment score",
}

def _label(feature_name: str) -> str:
    return FEATURE_LABELS.get(
        feature_name,
        feature_name.replace("_", " ").title()
    )


# ── Response models ───────────────────────────────────────────

class RiskResponse(BaseModel):
    date:                   str
    risk_score:             float
    risk_level:             str
    disruption_probability: float
    forecast_horizon_weeks: int
    top_signals:            list[str]
    generated_at:           str

class HistoryPoint(BaseModel):
    date:       str
    risk_score: float
    risk_level: str

class ForecastPoint(BaseModel):
    date:        str
    risk_score:  float
    risk_level:  str
    is_forecast: bool

class SignalResponse(BaseModel):
    date:    str
    signals: list[dict]

class MetricsResponse(BaseModel):
    model:     str
    f1:        float
    precision: float
    recall:    float
    accuracy:  float


# ── Model + data caching ──────────────────────────────────────

_model          = None
_threshold      = None
_feature_cols   = None
_df_cache       = None
_proba_cache    = None
_cache_ts       = None
_shap_explainer = None
CACHE_TTL_SEC   = 3600


def get_model():
    global _model, _threshold, _feature_cols
    if _model is None:
        if not os.path.exists(LGB_MODEL):
            raise RuntimeError(f"Model not found at {LGB_MODEL}. Run train.py first.")
        with open(LGB_MODEL, "rb") as f:
            saved = pickle.load(f)
        with open(FEATURES_FILE, "r") as f:
            _feature_cols = json.load(f)
        _model     = saved["model"]
        _threshold = saved["threshold"]
        logger.info(f"Model loaded — threshold: {_threshold:.2f}")
    return _model, _threshold, _feature_cols


def _get_shap_explainer():
    """Cache the SHAP TreeExplainer — expensive to create."""
    global _shap_explainer
    if _shap_explainer is None:
        model, _, _ = get_model()
        _shap_explainer = shap_lib.TreeExplainer(model)
        logger.info("SHAP explainer initialised")
    return _shap_explainer


def _paginate(table: str, select: str, order: str) -> list:
    client    = get_client()
    all_rows  = []
    page_size = 1000
    offset    = 0
    while True:
        resp = (
            client.table(table)
            .select(select)
            .order(order, desc=False)
            .range(offset, offset + page_size - 1)
            .execute()
        )
        batch = resp.data or []
        all_rows.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size
    return all_rows


def get_data_and_predictions():
    """Load features + compute predictions — cached for 1 hour."""
    global _df_cache, _proba_cache, _cache_ts

    now = datetime.now(UTC).timestamp()
    if _df_cache is not None and _cache_ts and (now - _cache_ts) < CACHE_TTL_SEC:
        return _df_cache, _proba_cache

    model, _, feature_cols = get_model()
    rows = _paginate("features", "date, feature_name, value", "date")
    df   = pd.DataFrame(rows)
    df["date"] = pd.to_datetime(df["date"])
    wide = df.pivot_table(
        index="date", columns="feature_name",
        values="value", aggfunc="last",
    ).reset_index()
    wide.columns.name = None

    feat_cols = [c for c in wide.columns if c != "date"]
    wide[feat_cols] = wide[feat_cols].fillna(wide[feat_cols].median())

    available    = [c for c in feature_cols if c in wide.columns]
    X            = wide[available]
    proba        = model.predict_proba(X)[:, 1]

    _df_cache    = wide
    _proba_cache = proba
    _cache_ts    = now
    logger.info(f"Data refreshed — {len(wide)} weeks scored")
    return wide, proba


def _get_X(df: pd.DataFrame, feature_cols: list) -> tuple:
    """Return aligned feature matrix and available column list."""
    available = [c for c in feature_cols if c in df.columns]
    feat_cols = [c for c in df.columns if c != "date"]
    df_filled = df.copy()
    df_filled[feat_cols] = df_filled[feat_cols].fillna(df_filled[feat_cols].median())
    return df_filled[available], available


def risk_label(score: float) -> str:
    if score >= RISK_HIGH:   return "high"
    if score >= RISK_MEDIUM: return "medium"
    return "low"


def get_top_signals(row: pd.Series, feature_cols: list, n: int = 3) -> list[str]:
    available = {c: abs(row[c]) for c in feature_cols if c in row.index and pd.notna(row[c])}
    return [s[0] for s in sorted(available.items(), key=lambda x: x[1], reverse=True)[:n]]


# ── Startup ───────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    try:
        get_model()
        logger.info("API startup complete — model loaded")
    except Exception as e:
        logger.error(f"Startup warning: {e}")


# ── Health ────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
def health_check():
    return {
        "status":    "ok",
        "service":   "Tariff & Trade Shock Forecaster",
        "version":   "1.0.0",
        "timestamp": datetime.now(UTC).isoformat(),
    }


# ── Risk endpoints ────────────────────────────────────────────

@app.get("/risk/current", response_model=RiskResponse, tags=["Risk"])
def get_current_risk():
    """Latest disruption risk score with top 3 driving signals."""
    df, proba          = get_data_and_predictions()
    _, _, feature_cols = get_model()
    idx                = len(df) - 1
    prob               = float(proba[idx])
    score              = round(prob * 100, 2)
    return RiskResponse(
        date                   = str(df["date"].iloc[idx].date()),
        risk_score             = score,
        risk_level             = risk_label(score),
        disruption_probability = round(prob, 4),
        forecast_horizon_weeks = cfg.target.forecast_horizon_weeks,
        top_signals            = get_top_signals(df.iloc[idx], feature_cols),
        generated_at           = datetime.now(UTC).isoformat(),
    )


@app.get("/risk/date/{target_date}", response_model=RiskResponse, tags=["Risk"])
def get_risk_for_date(target_date: str):
    """Risk score for a specific date (YYYY-MM-DD)."""
    try:
        target = pd.Timestamp(target_date)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid date. Use YYYY-MM-DD.")

    df, proba          = get_data_and_predictions()
    _, _, feature_cols = get_model()
    idx                = (df["date"] - target).abs().idxmin()
    prob               = float(proba[idx])
    score              = round(prob * 100, 2)
    return RiskResponse(
        date                   = str(df["date"].iloc[idx].date()),
        risk_score             = score,
        risk_level             = risk_label(score),
        disruption_probability = round(prob, 4),
        forecast_horizon_weeks = cfg.target.forecast_horizon_weeks,
        top_signals            = get_top_signals(df.iloc[idx], feature_cols),
        generated_at           = datetime.now(UTC).isoformat(),
    )


@app.get("/risk/history", response_model=list[HistoryPoint], tags=["Risk"])
def get_risk_history(
    start: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    end:   Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    limit: int           = Query(52,   description="Max weeks to return", le=500),
):
    """Full prediction history for charting."""
    df, proba     = get_data_and_predictions()
    result        = df[["date"]].copy()
    result["risk_score"] = (proba * 100).round(2)
    result["risk_level"] = [risk_label(s) for s in result["risk_score"]]
    if start:
        result = result[result["date"] >= pd.Timestamp(start)]
    if end:
        result = result[result["date"] <= pd.Timestamp(end)]
    result = result.tail(limit)
    return [
        HistoryPoint(date=str(r["date"].date()), risk_score=r["risk_score"], risk_level=r["risk_level"])
        for _, r in result.iterrows()
    ]


@app.get("/risk/forecast", response_model=list[ForecastPoint], tags=["Risk"])
def get_forecast(weeks: int = Query(12, description="Weeks to forecast", le=26)):
    """12-week forward risk forecast powered by Prophet."""
    df, proba = get_data_and_predictions()

    try:
        client       = get_client()
        latest       = df["date"].max()
        resp         = (
            client.table("predictions")
            .select("date, risk_score, risk_level")
            .gt("date", str(latest.date()))
            .order("date", desc=False)
            .limit(weeks)
            .execute()
        )
        prophet_rows = resp.data or []
    except Exception:
        prophet_rows = []

    points        = []
    recent_scores = (proba[-8:] * 100).tolist()
    recent_dates  = df["date"].iloc[-8:].tolist()

    for d, s in zip(recent_dates, recent_scores):
        points.append(ForecastPoint(
            date=str(pd.Timestamp(d).date()), risk_score=round(s, 2),
            risk_level=risk_label(s), is_forecast=False,
        ))

    if prophet_rows:
        for row in prophet_rows[:weeks]:
            points.append(ForecastPoint(
                date=row["date"], risk_score=round(float(row["risk_score"]), 2),
                risk_level=row["risk_level"], is_forecast=True,
            ))
    else:
        last_score = recent_scores[-1]
        trend      = (recent_scores[-1] - recent_scores[-5]) / 4 if len(recent_scores) >= 5 else 0
        decay      = 0.85
        last_date  = pd.Timestamp(recent_dates[-1])
        score      = last_score
        for i in range(1, weeks + 1):
            score = max(0, min(100, score + trend * (decay ** i)))
            points.append(ForecastPoint(
                date=str((last_date + pd.Timedelta(weeks=i)).date()),
                risk_score=round(score, 2), risk_level=risk_label(score), is_forecast=True,
            ))
    return points


# ── Signal endpoints ──────────────────────────────────────────

@app.get("/signals/top", response_model=SignalResponse, tags=["Signals"])
def get_top_signals_endpoint(
    target_date: Optional[str] = Query(None, description="Date YYYY-MM-DD — defaults to latest")
):
    """Top 10 signals by absolute value for a given week."""
    df, _              = get_data_and_predictions()
    _, _, feature_cols = get_model()

    idx = (
        (df["date"] - pd.Timestamp(target_date)).abs().idxmin()
        if target_date else len(df) - 1
    )
    row  = df.iloc[idx]
    sigs = [
        {"feature": col, "label": _label(col), "value": round(float(row[col]), 4)}
        for col in feature_cols if col in row.index and pd.notna(row[col])
    ]
    sigs.sort(key=lambda x: abs(x["value"]), reverse=True)
    return SignalResponse(date=str(df["date"].iloc[idx].date()), signals=sigs[:10])


@app.get("/signals/forecast", tags=["Signals"])
def get_signal_forecasts(
    signal: str = Query("natural_gas_price", description="Signal name")
):
    """
    Prophet forecast for a specific signal with confidence intervals.
    Available: natural_gas_price, crude_oil_price, copper,
               import_price_index, trade_balance, cpi_all
    """
    client = get_client()
    resp   = (
        client.table("signal_forecasts")
        .select("forecast_date, yhat, yhat_lower, yhat_upper, is_forecast")
        .eq("signal_name", signal)
        .order("forecast_date", desc=False)
        .execute()
    )
    if not resp.data:
        raise HTTPException(
            status_code=404,
            detail=f"No forecast for '{signal}'. Run prophet_forecast.py first."
        )
    return {
        "signal":       signal,
        "label":        _label(signal),
        "points":       resp.data,
        "generated_at": datetime.now(UTC).isoformat(),
    }


@app.get("/signals/llm-reasoning", tags=["Signals"])
def get_llm_reasoning():
    """
    Latest Claude LLM risk reasoning.
    Returns the most recent week's AI-generated disruption assessment —
    plain English explanation of why risk is elevated.
    """
    client = get_client()
    resp   = (
        client.table("llm_signals")
        .select("week_start, llm_risk_score, llm_risk_label, reasoning, model_used")
        .order("week_start", desc=True)
        .limit(1)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="No LLM signals found.")

    row = resp.data[0]
    return {
        "week":         row["week_start"],
        "risk_score":   row["llm_risk_score"],
        "risk_label":   row["llm_risk_label"],
        "reasoning":    row["reasoning"],
        "model_used":   row["model_used"],
        "generated_at": datetime.now(UTC).isoformat(),
    }


# ── Model endpoints ───────────────────────────────────────────

@app.get("/model/metrics", response_model=list[MetricsResponse], tags=["Model"])
def get_model_metrics():
    """Model performance metrics from the last training run."""
    if not os.path.exists(METRICS_FILE):
        raise HTTPException(status_code=404, detail="Metrics not found. Run train.py first.")
    with open(METRICS_FILE, "r") as f:
        metrics = json.load(f)
    return [
        MetricsResponse(
            model=m.get("model","unknown"), f1=m.get("f1",0),
            precision=m.get("precision",0), recall=m.get("recall",0),
            accuracy=m.get("accuracy",0),
        )
        for m in metrics
    ]


@app.get("/model/features", tags=["Model"])
def get_feature_importance():
    """Top 20 feature importances from the trained LightGBM model."""
    model, _, feature_cols = get_model()
    feat_imp = sorted(
        zip(feature_cols, model.feature_importances_.tolist()),
        key=lambda x: x[1], reverse=True,
    )[:20]
    return {
        "features": [
            {"feature": name, "label": _label(name), "importance": round(score, 6)}
            for name, score in feat_imp
        ],
        "generated_at": datetime.now(UTC).isoformat(),
    }


# ── SHAP endpoints ────────────────────────────────────────────

@app.get("/shap/waterfall/{target_date}", tags=["SHAP"])
def get_shap_waterfall(
    target_date: str,
    top_n: int = Query(12, description="Number of features to return", le=30),
):
    """
    SHAP waterfall data for a specific date.

    Returns base value, prediction, and per-feature SHAP values.
    Frontend renders this as an interactive horizontal bar chart.
    Positive SHAP = pushed toward disruption (red bars).
    Negative SHAP = pushed away from disruption (green bars).

    Key dates to try:
        2020-03-20  COVID-19 peak
        2021-03-26  Suez Canal blockage
        2022-03-04  Ukraine invasion week 1
        2022-10-07  Port congestion peak
        2025-03-07  2025 tariff wave
    """
    try:
        target = pd.Timestamp(target_date)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid date. Use YYYY-MM-DD.")

    df, proba          = get_data_and_predictions()
    _, _, feature_cols = get_model()
    explainer          = _get_shap_explainer()

    idx      = (df["date"] - target).abs().idxmin()
    row_date = df["date"].iloc[idx]
    X, available = _get_X(df, feature_cols)
    row      = X.iloc[[idx]]

    # Compute SHAP values
    shap_vals = explainer.shap_values(row)
    if isinstance(shap_vals, list):
        shap_vals = shap_vals[1]
    sv_array = shap_vals[0]

    base_value = (
        float(explainer.expected_value[1])
        if isinstance(explainer.expected_value, (list, np.ndarray))
        else float(explainer.expected_value)
    )

    # Build sorted feature list
    features = [
        {
            "feature":       fname,
            "label":         _label(fname),
            "shap_value":    round(float(sv), 5),
            "feature_value": round(float(row[fname].iloc[0]), 4),
            "direction":     "increases_risk" if sv > 0 else "decreases_risk",
        }
        for fname, sv in zip(available, sv_array)
    ]
    features.sort(key=lambda x: abs(x["shap_value"]), reverse=True)

    return {
        "date":         str(row_date.date()),
        "base_value":   round(base_value, 4),
        "prediction":   round(float(proba[idx]), 4),
        "risk_score":   round(float(proba[idx]) * 100, 2),
        "risk_level":   risk_label(float(proba[idx]) * 100),
        "features":     features[:top_n],
        "generated_at": datetime.now(UTC).isoformat(),
    }


@app.get("/shap/summary", tags=["SHAP"])
def get_shap_summary(
    top_n: int = Query(20, description="Number of top features to return", le=50)
):
    """
    Overall SHAP feature importance across all weeks.

    Returns mean absolute SHAP value per feature sorted descending.
    Use this to render the global importance bar chart.
    Note: computed on full dataset — may take a few seconds first call.
    """
    df, _              = get_data_and_predictions()
    _, _, feature_cols = get_model()
    explainer          = _get_shap_explainer()
    X, available       = _get_X(df, feature_cols)

    shap_vals = explainer.shap_values(X)
    if isinstance(shap_vals, list):
        shap_vals = shap_vals[1]

    mean_abs = np.abs(shap_vals).mean(axis=0)
    summary  = [
        {
            "feature":       fname,
            "label":         _label(fname),
            "mean_abs_shap": round(float(v), 6),
            "rank":          i + 1,
        }
        for i, (fname, v) in enumerate(
            sorted(zip(available, mean_abs), key=lambda x: x[1], reverse=True)[:top_n]
        )
    ]
    return {
        "features":     summary,
        "total_weeks":  len(X),
        "generated_at": datetime.now(UTC).isoformat(),
    }


@app.get("/shap/events", tags=["SHAP"])
def get_named_events():
    """
    List of named disruption events with risk scores.
    Used to populate the Event Analysis page sidebar.
    """
    events = [
        {"date": "2020-03-20", "event": "COVID-19 peak supply shock",  "period": "Feb–Jun 2020"},
        {"date": "2021-03-26", "event": "Suez Canal blockage",         "period": "Mar–Apr 2021"},
        {"date": "2022-03-04", "event": "Ukraine invasion — week 1",   "period": "Feb–Jun 2022"},
        {"date": "2022-10-07", "event": "Port congestion crisis peak", "period": "Sep–Dec 2022"},
        {"date": "2025-03-07", "event": "2025 tariff wave",            "period": "Jan 2025–present"},
    ]

    df, proba = get_data_and_predictions()
    for ev in events:
        idx              = (df["date"] - pd.Timestamp(ev["date"])).abs().idxmin()
        ev["risk_score"] = round(float(proba[idx]) * 100, 2)
        ev["risk_level"] = risk_label(float(proba[idx]) * 100)
        ev["actual_date"]= str(df["date"].iloc[idx].date())

    return {"events": events, "generated_at": datetime.now(UTC).isoformat()}

@app.get("/dashboard/summary", tags=["Dashboard"])
def get_dashboard_summary():
    """
    Single endpoint that returns everything the dashboard
    needs in one call — reduces frontend API calls from 5 to 1.

    Returns:
        - current risk score + level + top signals
        - last 52 weeks of history
        - 12-week forecast
        - latest LLM reasoning
        - 4-week trend direction
    """
    df, proba          = get_data_and_predictions()
    _, _, feature_cols = get_model()

    # Current
    idx      = len(df) - 1
    prob     = float(proba[idx])
    score    = round(prob * 100, 2)
    level    = risk_label(score)
    top_sigs = get_top_signals(df.iloc[idx], feature_cols)

    # Trend — compare current to 4 weeks ago
    prev_score = round(float(proba[max(0, idx-4)]) * 100, 2)
    trend_pts  = round(score - prev_score, 1)
    trend_dir  = "rising" if trend_pts > 2 else "falling" if trend_pts < -2 else "stable"

    # Last 52 weeks history
    history = [
        {
            "date":       str(df["date"].iloc[i].date()),
            "risk_score": round(float(proba[i]) * 100, 2),
            "risk_level": risk_label(float(proba[i]) * 100),
        }
        for i in range(max(0, idx-51), idx+1)
    ]

    # Forecast from Supabase
    try:
        client       = get_client()
        latest       = df["date"].max()
        resp         = (
            client.table("predictions")
            .select("date, risk_score, risk_level")
            .gt("date", str(latest.date()))
            .order("date", desc=False)
            .limit(12)
            .execute()
        )
        forecast = resp.data or []
    except Exception:
        forecast = []

    # LLM reasoning
    try:
        client  = get_client()
        resp    = (
            client.table("llm_signals")
            .select("week_start, llm_risk_score, llm_risk_label, reasoning, model_used")
            .order("week_start", desc=True)
            .limit(1)
            .execute()
        )
        llm = resp.data[0] if resp.data else None
    except Exception:
        llm = None

    # High-risk weeks in last 4
    last4       = [float(proba[max(0, idx-i)]) * 100 for i in range(4)]
    high_weeks  = sum(1 for s in last4 if s >= RISK_HIGH)

    return {
        "current": {
            "date":                   str(df["date"].iloc[idx].date()),
            "risk_score":             score,
            "risk_level":             level,
            "disruption_probability": round(prob, 4),
            "top_signals": [
                {"feature": s, "label": _label(s)} for s in top_sigs
            ],
        },
        "trend": {
            "direction":        trend_dir,
            "change_4w":        trend_pts,
            "high_weeks_last4": high_weeks,
        },
        "history":  history,
        "forecast": forecast,
        "llm": {
            "reasoning":  llm["reasoning"]   if llm else None,
            "risk_score": llm["llm_risk_score"] if llm else None,
            "risk_label": llm["llm_risk_label"] if llm else None,
            "week":       llm["week_start"]  if llm else None,
            "model":      llm["model_used"]  if llm else None,
        },
        "meta": {
            "forecast_horizon_weeks": cfg.target.forecast_horizon_weeks,
            "training_weeks":         313,
            "test_weeks":             62,
            "model_f1":               0.984,
            "model_precision":        0.968,
            "model_recall":           1.0,
            "features_count":         457,
            "data_sources":           5,
        },
        "generated_at": datetime.now(UTC).isoformat(),
    }'''



"""
app/api.py

FastAPI REST API for the Tariff & Trade Shock Forecaster.

Endpoints:
    GET  /                              Health check
    GET  /risk/current                  Latest disruption risk score
    GET  /risk/history                  Full prediction history
    GET  /risk/date/{date}              Risk score for a specific date
    GET  /risk/forecast                 12-week forward forecast
    GET  /risk/custom                   Personalised risk score for selected commodities
    GET  /risk/sectors                  Risk scores broken down by sector
    GET  /risk/compare/{event_key}      Compare current signals to a historical disruption
    GET  /risk/compare/events/list      List available historical events for comparison
    GET  /signals/top                   Top driving signals for latest week
    GET  /signals/forecast              Prophet forecast for a specific signal
    GET  /signals/llm-reasoning         Latest Claude LLM risk reasoning
    GET  /model/metrics                 Model performance metrics
    GET  /model/features                Top 20 feature importances
    GET  /shap/waterfall/{date}         SHAP waterfall JSON for a specific date
    GET  /shap/summary                  Overall SHAP feature importance
    GET  /shap/events                   Named disruption events list
    GET  /dashboard/summary             Single-call dashboard summary
    GET  /commodities/list              Available commodities for the selector
    POST /alerts/subscribe              Subscribe to risk alerts
    DEL  /alerts/unsubscribe            Unsubscribe from risk alerts
    GET  /alerts/check                  Check which subscribers should be alerted now

Run locally:
    uvicorn app.api:app --reload --port 8000

Docs (auto-generated):
    http://localhost:8000/docs
"""

import json
import pickle
import os
from collections import defaultdict
from datetime import datetime, timezone
from typing import Optional

import numpy as np
import pandas as pd
import shap as shap_lib
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from src.utils.db               import get_client
from src.utils.ingestion_config import cfg
from src.utils.logger           import get_logger

logger = get_logger(__name__)

# Python 3.10 compatibility - UTC was added in 3.11
UTC = timezone.utc

# ── App setup ─────────────────────────────────────────────────
app = FastAPI(
    title       = "Tariff & Trade Shock Forecaster API",
    description = (
        "Real-time supply chain disruption risk forecasting. "
        "Predicts disruption probability 3 weeks ahead using "
        "macro signals, commodity prices, trade data, and sentiment."
    ),
    version     = "1.0.0",
    docs_url    = "/docs",
    redoc_url   = "/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Paths ─────────────────────────────────────────────────────
MODELS_DIR    = "models"
LGB_MODEL     = os.path.join(MODELS_DIR, "lgb_model.pkl")
FEATURES_FILE = os.path.join(MODELS_DIR, "feature_columns.json")
METRICS_FILE  = os.path.join(MODELS_DIR, "metrics.json")

RISK_HIGH   = 65
RISK_MEDIUM = 40

# ── Feature label map ─────────────────────────────────────────
FEATURE_LABELS = {
    "natural_gas_price":              "Natural gas price",
    "natural_gas_price_lag_1w":       "Natural gas (1w ago)",
    "natural_gas_price_lag_2w":       "Natural gas (2w ago)",
    "natural_gas_price_lag_4w":       "Natural gas (4w ago)",
    "natural_gas_price_std_4w":       "Natural gas volatility (4w)",
    "natural_gas_price_std_8w":       "Natural gas volatility (8w)",
    "natural_gas_price_mean_4w":      "Natural gas avg (4w)",
    "natural_gas_price_mean_8w":      "Natural gas avg (8w)",
    "crude_oil_price":                "Crude oil price",
    "crude_oil_price_lag_1w":         "Crude oil (1w ago)",
    "crude_oil_price_lag_2w":         "Crude oil (2w ago)",
    "crude_oil_price_std_4w":         "Crude oil volatility (4w)",
    "crude_oil_price_std_8w":         "Crude oil volatility (8w)",
    "crude_oil_price_mean_4w":        "Crude oil avg (4w)",
    "crude_oil_price_mean_8w":        "Crude oil avg (8w)",
    "copper":                         "Copper price",
    "copper_lag_1w":                  "Copper (1w ago)",
    "copper_lag_2w":                  "Copper (2w ago)",
    "copper_zscore_4w":               "Copper z-score (4w)",
    "import_price_index":             "Import price index",
    "import_price_index_pct_4w":      "Import prices % change (4w)",
    "import_price_index_change_4w":   "Import prices change (4w)",
    "import_price_index_lag_1w":      "Import prices (1w ago)",
    "import_price_index_mean_4w":     "Import prices avg (4w)",
    "import_price_index_std_8w":      "Import prices volatility (8w)",
    "trade_balance":                  "Trade balance",
    "trade_balance_change_4w":        "Trade balance change (4w)",
    "trade_balance_momentum_4w":      "Trade balance momentum (4w)",
    "trade_balance_lag_4w":           "Trade balance (4w ago)",
    "trade_balance_momentum_8w":      "Trade balance momentum (8w)",
    "goods_imports":                  "Goods imports",
    "goods_imports_pct_4w":           "Goods imports % change (4w)",
    "goods_imports_lag_4w":           "Goods imports (4w ago)",
    "goods_imports_mean_8w":          "Goods imports avg (8w)",
    "ppi_manufacturing":              "Manufacturing PPI",
    "ppi_manufacturing_pct_4w":       "Manufacturing PPI % change (4w)",
    "ppi_manufacturing_mean_4w":      "Manufacturing PPI avg (4w)",
    "ppi_manufacturing_lag_1w":       "Manufacturing PPI (1w ago)",
    "ppi_manufacturing_lag_2w":       "Manufacturing PPI (2w ago)",
    "cpi_all":                        "CPI (all items)",
    "cpi_all_lag_1w":                 "CPI (1w ago)",
    "cpi_all_lag_2w":                 "CPI (2w ago)",
    "cpi_all_lag_4w":                 "CPI (4w ago)",
    "cpi_all_mean_4w":                "CPI avg (4w)",
    "cpi_all_mean_8w":                "CPI avg (8w)",
    "export_price_index_pct_4w":      "Export prices % change (4w)",
    "export_price_index_lag_2w":      "Export prices (2w ago)",
    "export_price_index_mean_4w":     "Export prices avg (4w)",
    "capacity_utilization":           "Capacity utilization",
    "capacity_utilization_std_8w":    "Capacity util. volatility (8w)",
    "capacity_utilization_change_4w": "Capacity util. change (4w)",
    "manufacturing_employment":       "Manufacturing employment",
    "manufacturing_employment_std_4w":"Mfg employment volatility (4w)",
    "manufacturing_employment_std_8w":"Mfg employment volatility (8w)",
    "energy_std_8w":                  "Energy ETF volatility (8w)",
    "energy_mean_4w":                 "Energy ETF avg (4w)",
    "energy_mean_8w":                 "Energy ETF avg (8w)",
    "energy_zscore_4w":               "Energy ETF z-score (4w)",
    "energy_zscore_8w":               "Energy ETF z-score (8w)",
    "materials_momentum_4w":          "Materials ETF momentum (4w)",
    "aluminum_zscore_8w":             "Aluminum z-score (8w)",
    "wheat_lag_1w":                   "Wheat price (1w ago)",
    "housing_starts_mean_4w":         "Housing starts avg (4w)",
    "housing_starts_change_4w":       "Housing starts change (4w)",
    "housing_starts_std_8w":          "Housing starts volatility (8w)",
    "unemployment_rate_pct_4w":       "Unemployment % change (4w)",
    "trade_pressure_index":           "Trade pressure index",
    "copper_pmi_stress":              "Copper-PMI stress index",
    "energy_mfg_ratio":               "Energy/manufacturing ratio",
    "capacity_labour_stress":         "Capacity-labour stress",
    "multi_commodity_stress":         "Multi-commodity stress",
    "fear_macro_alignment":           "Fear-macro alignment",
    "llm_risk_score":                 "AI risk score (Claude)",
    "llm_risk_score_lag_1w":          "AI risk score (1w ago)",
    "llm_risk_score_lag_2w":          "AI risk score (2w ago)",
    "fear_index":                     "Polymarket fear index",
    "fear_index_lag_1w":              "Polymarket fear (1w ago)",
    "newsapi_disruption_ratio":       "News disruption ratio",
    "combined_sentiment_score":       "Combined sentiment score",
}

def _label(feature_name: str) -> str:
    return FEATURE_LABELS.get(
        feature_name,
        feature_name.replace("_", " ").title()
    )


# ── Commodity selector config ─────────────────────────────────
COMMODITY_SIGNAL_MAP = {
    "copper":        ["copper", "copper_lag", "copper_pct", "copper_change", "copper_momentum", "copper_zscore", "copper_mean", "copper_std"],
    "natural_gas":   ["natural_gas_price", "natural_gas_price_lag", "natural_gas_price_pct", "natural_gas_price_std", "natural_gas_price_mean", "natural_gas_price_momentum", "natural_gas_price_zscore"],
    "crude_oil":     ["crude_oil_price", "crude_oil_price_lag", "crude_oil_price_pct", "crude_oil_price_std", "crude_oil_price_mean", "crude_oil_price_momentum"],
    "wheat":         ["wheat", "wheat_lag", "wheat_pct", "wheat_change", "wheat_momentum", "wheat_std"],
    "aluminum":      ["aluminum", "aluminum_lag", "aluminum_pct", "aluminum_change", "aluminum_momentum", "aluminum_zscore"],
    "import_prices": ["import_price_index", "import_price_index_pct", "import_price_index_lag", "import_price_index_change", "import_price_index_mean", "import_price_index_std"],
    "trade_balance": ["trade_balance", "trade_balance_change", "trade_balance_momentum", "trade_balance_lag", "trade_pressure_index"],
    "energy_sector": ["energy", "energy_std", "energy_mean", "energy_zscore", "energy_momentum"],
    "industrials":   ["industrials", "industrials_std", "industrials_mean", "industrials_lag"],
    "manufacturing": ["ppi_manufacturing", "ppi_manufacturing_pct", "manufacturing_employment", "industrial_production", "capacity_utilization", "new_orders"],
    "cpi":           ["cpi_all", "cpi_all_lag", "cpi_all_mean", "cpi_all_pct"],
    "materials":     ["materials", "materials_momentum", "aluminum", "copper"],
}

AVAILABLE_COMMODITIES = list(COMMODITY_SIGNAL_MAP.keys())

# ── Sector config ─────────────────────────────────────────────
SECTOR_SIGNALS = {
    "energy": [
        "crude_oil_price", "natural_gas_price", "energy",
        "crude_oil_price_std_8w", "natural_gas_price_std_4w",
        "energy_std_8w", "energy_mean_4w", "energy_zscore_4w",
    ],
    "manufacturing": [
        "ppi_manufacturing", "industrial_production", "new_orders",
        "manufacturing_employment", "capacity_utilization",
        "copper", "aluminum", "ppi_manufacturing_pct_4w",
        "capacity_utilization_std_8w",
    ],
    "trade": [
        "import_price_index", "trade_balance", "goods_imports",
        "export_price_index", "import_price_index_pct_4w",
        "trade_balance_change_4w", "goods_imports_pct_4w",
        "trade_pressure_index",
    ],
}

SECTOR_LABELS = {
    "energy":        "Energy & fuel supply",
    "manufacturing": "Manufacturing & industrials",
    "trade":         "Trade & imports",
}

# ── Historical events config ──────────────────────────────────
HISTORICAL_EVENTS = {
    "covid_2020":   {"date": "2020-03-20", "label": "COVID-19 supply shock (March 2020)"},
    "suez_2021":    {"date": "2021-03-26", "label": "Suez Canal blockage (March 2021)"},
    "ukraine_2022": {"date": "2022-03-04", "label": "Ukraine invasion (March 2022)"},
    "port_2022":    {"date": "2022-10-07", "label": "Port congestion crisis (Oct 2022)"},
    "tariff_2025":  {"date": "2025-03-07", "label": "2025 tariff wave (March 2025)"},
}

# ── Response models ───────────────────────────────────────────
class RiskResponse(BaseModel):
    date:                   str
    risk_score:             float
    risk_level:             str
    disruption_probability: float
    forecast_horizon_weeks: int
    top_signals:            list[str]
    generated_at:           str

class HistoryPoint(BaseModel):
    date:       str
    risk_score: float
    risk_level: str

class ForecastPoint(BaseModel):
    date:        str
    risk_score:  float
    risk_level:  str
    is_forecast: bool

class SignalResponse(BaseModel):
    date:    str
    signals: list[dict]

class MetricsResponse(BaseModel):
    model:     str
    f1:        float
    precision: float
    recall:    float
    accuracy:  float

class AlertSubscription(BaseModel):
    email:       str
    threshold:   int = 65
    commodities: str = "all"
    frequency:   str = "weekly"


# ── Model + data caching ──────────────────────────────────────
_model          = None
_threshold      = None
_feature_cols   = None
_df_cache       = None
_proba_cache    = None
_cache_ts       = None
_shap_explainer = None
CACHE_TTL_SEC   = 3600


def get_model():
    global _model, _threshold, _feature_cols
    if _model is None:
        if not os.path.exists(LGB_MODEL):
            raise RuntimeError(f"Model not found at {LGB_MODEL}. Run train.py first.")
        with open(LGB_MODEL, "rb") as f:
            saved = pickle.load(f)
        with open(FEATURES_FILE, "r") as f:
            _feature_cols = json.load(f)
        _model     = saved["model"]
        _threshold = saved["threshold"]
        logger.info(f"Model loaded — threshold: {_threshold:.2f}")
    return _model, _threshold, _feature_cols


def _get_shap_explainer():
    """Cache the SHAP TreeExplainer — expensive to create."""
    global _shap_explainer
    if _shap_explainer is None:
        model, _, _ = get_model()
        _shap_explainer = shap_lib.TreeExplainer(model)
        logger.info("SHAP explainer initialised")
    return _shap_explainer


def _paginate(table: str, select: str, order: str) -> list:
    client    = get_client()
    all_rows  = []
    page_size = 1000
    offset    = 0
    while True:
        resp = (
            client.table(table)
            .select(select)
            .order(order, desc=False)
            .range(offset, offset + page_size - 1)
            .execute()
        )
        batch = resp.data or []
        all_rows.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size
    return all_rows


def get_data_and_predictions():
    """Load features + compute predictions — cached for 1 hour."""
    global _df_cache, _proba_cache, _cache_ts

    now = datetime.now(UTC).timestamp()
    if _df_cache is not None and _cache_ts and (now - _cache_ts) < CACHE_TTL_SEC:
        return _df_cache, _proba_cache

    model, _, feature_cols = get_model()
    rows = _paginate("features", "date, feature_name, value", "date")
    df   = pd.DataFrame(rows)
    df["date"] = pd.to_datetime(df["date"])
    wide = df.pivot_table(
        index="date", columns="feature_name",
        values="value", aggfunc="last",
    ).reset_index()
    wide.columns.name = None

    feat_cols = [c for c in wide.columns if c != "date"]
    wide[feat_cols] = wide[feat_cols].fillna(wide[feat_cols].median())

    available    = [c for c in feature_cols if c in wide.columns]
    X            = wide[available]
    proba        = model.predict_proba(X)[:, 1]

    _df_cache    = wide
    _proba_cache = proba
    _cache_ts    = now
    logger.info(f"Data refreshed — {len(wide)} weeks scored")
    return wide, proba


def _get_X(df: pd.DataFrame, feature_cols: list) -> tuple:
    """Return aligned feature matrix and available column list."""
    available = [c for c in feature_cols if c in df.columns]
    feat_cols = [c for c in df.columns if c != "date"]
    df_filled = df.copy()
    df_filled[feat_cols] = df_filled[feat_cols].fillna(df_filled[feat_cols].median())
    return df_filled[available], available


def _get_filled_X(df: pd.DataFrame, feature_cols: list) -> tuple[pd.DataFrame, list]:
    """
    Shared helper: fill NaNs and return (X_aligned, available_cols).
    Avoids duplicating the same 4-line block across sector/custom/SHAP endpoints.
    """
    available = [c for c in feature_cols if c in df.columns]
    non_date  = [c for c in df.columns if c != "date"]
    filled    = df.copy()
    filled[non_date] = filled[non_date].fillna(filled[non_date].median())
    return filled[available], available


def _compute_shap_recent(df, feature_cols, weeks=4):
    """
    Compute SHAP values for the last `weeks` rows.
    Returns (shap_vals_2d, feat_idx_map, available_cols).
    """
    explainer      = _get_shap_explainer()
    X, available   = _get_filled_X(df, feature_cols)
    X_recent       = X.tail(weeks)
    shap_vals      = explainer.shap_values(X_recent)
    if isinstance(shap_vals, list):
        shap_vals  = shap_vals[1]
    feat_idx       = {f: i for i, f in enumerate(available)}
    return shap_vals, feat_idx, available


def risk_label(score: float) -> str:
    if score >= RISK_HIGH:   return "high"
    if score >= RISK_MEDIUM: return "medium"
    return "low"


def get_top_signals(row: pd.Series, feature_cols: list, n: int = 3) -> list[str]:
    available = {c: abs(row[c]) for c in feature_cols if c in row.index and pd.notna(row[c])}
    return [s[0] for s in sorted(available.items(), key=lambda x: x[1], reverse=True)[:n]]


# ── Startup ───────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    try:
        get_model()
        logger.info("API startup complete — model loaded")
    except Exception as e:
        logger.error(f"Startup warning: {e}")


# ═══════════════════════════════════════════════════════════════
# HEALTH
# ═══════════════════════════════════════════════════════════════

@app.get("/", tags=["Health"])
def health_check():
    return {
        "status":    "ok",
        "service":   "Tariff & Trade Shock Forecaster",
        "version":   "1.0.0",
        "timestamp": datetime.now(UTC).isoformat(),
    }


# ═══════════════════════════════════════════════════════════════
# RISK
# ═══════════════════════════════════════════════════════════════

@app.get("/risk/current", response_model=RiskResponse, tags=["Risk"])
def get_current_risk():
    """Latest disruption risk score with top 3 driving signals."""
    df, proba          = get_data_and_predictions()
    _, _, feature_cols = get_model()
    idx                = len(df) - 1
    prob               = float(proba[idx])
    score              = round(prob * 100, 2)
    return RiskResponse(
        date                   = str(df["date"].iloc[idx].date()),
        risk_score             = score,
        risk_level             = risk_label(score),
        disruption_probability = round(prob, 4),
        forecast_horizon_weeks = cfg.target.forecast_horizon_weeks,
        top_signals            = get_top_signals(df.iloc[idx], feature_cols),
        generated_at           = datetime.now(UTC).isoformat(),
    )


@app.get("/risk/date/{target_date}", response_model=RiskResponse, tags=["Risk"])
def get_risk_for_date(target_date: str):
    """Risk score for a specific date (YYYY-MM-DD)."""
    try:
        target = pd.Timestamp(target_date)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid date. Use YYYY-MM-DD.")

    df, proba          = get_data_and_predictions()
    _, _, feature_cols = get_model()
    idx                = (df["date"] - target).abs().idxmin()
    prob               = float(proba[idx])
    score              = round(prob * 100, 2)
    return RiskResponse(
        date                   = str(df["date"].iloc[idx].date()),
        risk_score             = score,
        risk_level             = risk_label(score),
        disruption_probability = round(prob, 4),
        forecast_horizon_weeks = cfg.target.forecast_horizon_weeks,
        top_signals            = get_top_signals(df.iloc[idx], feature_cols),
        generated_at           = datetime.now(UTC).isoformat(),
    )


@app.get("/risk/history", response_model=list[HistoryPoint], tags=["Risk"])
def get_risk_history(
    start: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    end:   Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    limit: int           = Query(52,   description="Max weeks to return", le=500),
):
    """Full prediction history for charting."""
    df, proba     = get_data_and_predictions()
    result        = df[["date"]].copy()
    result["risk_score"] = (proba * 100).round(2)
    result["risk_level"] = [risk_label(s) for s in result["risk_score"]]
    if start:
        result = result[result["date"] >= pd.Timestamp(start)]
    if end:
        result = result[result["date"] <= pd.Timestamp(end)]
    result = result.tail(limit)
    return [
        HistoryPoint(date=str(r["date"].date()), risk_score=r["risk_score"], risk_level=r["risk_level"])
        for _, r in result.iterrows()
    ]


@app.get("/risk/forecast", response_model=list[ForecastPoint], tags=["Risk"])
def get_forecast(weeks: int = Query(12, description="Weeks to forecast", le=26)):
    """12-week forward risk forecast powered by Prophet."""
    df, proba = get_data_and_predictions()

    try:
        client       = get_client()
        latest       = df["date"].max()
        resp         = (
            client.table("predictions")
            .select("date, risk_score, risk_level")
            .gt("date", str(latest.date()))
            .order("date", desc=False)
            .limit(weeks)
            .execute()
        )
        prophet_rows = resp.data or []
    except Exception:
        prophet_rows = []

    points        = []
    recent_scores = (proba[-8:] * 100).tolist()
    recent_dates  = df["date"].iloc[-8:].tolist()

    for d, s in zip(recent_dates, recent_scores):
        points.append(ForecastPoint(
            date=str(pd.Timestamp(d).date()), risk_score=round(s, 2),
            risk_level=risk_label(s), is_forecast=False,
        ))

    if prophet_rows:
        for row in prophet_rows[:weeks]:
            points.append(ForecastPoint(
                date=row["date"], risk_score=round(float(row["risk_score"]), 2),
                risk_level=row["risk_level"], is_forecast=True,
            ))
    else:
        last_score = recent_scores[-1]
        trend      = (recent_scores[-1] - recent_scores[-5]) / 4 if len(recent_scores) >= 5 else 0
        decay      = 0.85
        last_date  = pd.Timestamp(recent_dates[-1])
        score      = last_score
        for i in range(1, weeks + 1):
            score = max(0, min(100, score + trend * (decay ** i)))
            points.append(ForecastPoint(
                date=str((last_date + pd.Timedelta(weeks=i)).date()),
                risk_score=round(score, 2), risk_level=risk_label(score), is_forecast=True,
            ))
    return points


@app.get("/risk/custom", tags=["Risk"])
def get_custom_risk(
    signals: str = Query(
        "copper,natural_gas,crude_oil",
        description="Comma-separated commodities. Available: " + ", ".join(AVAILABLE_COMMODITIES)
    ),
    weeks: int = Query(4, description="How many recent weeks to average", le=12),
):
    """
    Personalised risk score for user-selected commodities.

    Computes a risk score weighted toward the signals the user cares about.
    Example: ?signals=copper,natural_gas,aluminum
    """
    df, proba          = get_data_and_predictions()
    _, _, feature_cols = get_model()

    requested = [s.strip().lower() for s in signals.split(",")]
    invalid   = [s for s in requested if s not in COMMODITY_SIGNAL_MAP]
    if invalid:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown commodities: {invalid}. Available: {AVAILABLE_COMMODITIES}"
        )

    selected_prefixes = []
    for sig in requested:
        selected_prefixes.extend(COMMODITY_SIGNAL_MAP[sig])

    relevant_features = [
        f for f in feature_cols
        if any(f.startswith(pfx) for pfx in selected_prefixes)
        and f in df.columns
    ]
    if not relevant_features:
        raise HTTPException(status_code=400, detail="No matching features found for selected commodities.")

    shap_vals, feat_idx, available = _compute_shap_recent(df, feature_cols, weeks=weeks)

    base_proba   = float(proba[-1])
    relevant_idx = [feat_idx[f] for f in relevant_features if f in feat_idx]

    if not relevant_idx:
        custom_score = round(base_proba * 100, 2)
    else:
        relevant_shap = shap_vals[:, relevant_idx].sum(axis=1).mean()
        total_shap    = np.abs(shap_vals).sum(axis=1).mean()
        selected_shap = np.abs(shap_vals[:, relevant_idx]).sum(axis=1).mean()
        weight        = float(selected_shap / total_shap) if total_shap > 0 else 0.5
        custom_score  = round(min(100, max(0, base_proba * 100 + relevant_shap * 100 * weight)), 2)

    mean_abs     = np.abs(shap_vals[:, relevant_idx]).mean(axis=0) if relevant_idx else []
    top_relevant = sorted(
        zip([relevant_features[i] for i in range(len(relevant_idx)) if i < len(mean_abs)], mean_abs),
        key=lambda x: x[1], reverse=True
    )[:5]

    return {
        "selected_commodities":  requested,
        "custom_risk_score":     custom_score,
        "custom_risk_level":     risk_label(custom_score),
        "overall_risk_score":    round(base_proba * 100, 2),
        "overall_risk_level":    risk_label(base_proba * 100),
        "top_signals":           [
            {"feature": f, "label": _label(f), "mean_abs_shap": round(float(v), 5)}
            for f, v in top_relevant
        ],
        "available_commodities": AVAILABLE_COMMODITIES,
        "weeks_averaged":        weeks,
        "generated_at":          datetime.now(UTC).isoformat(),
    }


@app.get("/risk/sectors", tags=["Risk"])
def get_sector_risks():
    """
    Risk scores broken down by sector: Energy, Manufacturing, Trade.

    Each score is derived from the SHAP contributions of signals
    relevant to that sector only — not an overall model output.
    """
    df, proba          = get_data_and_predictions()
    _, _, feature_cols = get_model()

    shap_vals, feat_idx, available = _compute_shap_recent(df, feature_cols, weeks=4)
    base_score  = round(float(proba[-1]) * 100, 2)
    sectors_out = {}

    for sector, sig_list in SECTOR_SIGNALS.items():
        matching_idx = [feat_idx[f] for f in sig_list if f in feat_idx]
        if not matching_idx:
            sectors_out[sector] = {
                "sector":      sector,
                "label":       SECTOR_LABELS[sector],
                "risk_score":  base_score,
                "risk_level":  risk_label(base_score),
                "top_signals": [],
            }
            continue

        sector_shap  = shap_vals[:, matching_idx].sum(axis=1).mean()
        total_shap   = np.abs(shap_vals).sum(axis=1).mean()
        sector_abs   = np.abs(shap_vals[:, matching_idx]).sum(axis=1).mean()
        weight       = float(sector_abs / total_shap) if total_shap > 0 else 0.33
        sector_score = round(min(100, max(0, base_score + sector_shap * 100 * weight)), 2)

        matched_sigs = [f for f in sig_list if f in feat_idx]
        mean_abs     = np.abs(shap_vals[:, matching_idx]).mean(axis=0)
        top3         = sorted(
            zip(matched_sigs[:len(mean_abs)], mean_abs),
            key=lambda x: x[1], reverse=True
        )[:3]

        sectors_out[sector] = {
            "sector":      sector,
            "label":       SECTOR_LABELS[sector],
            "risk_score":  sector_score,
            "risk_level":  risk_label(sector_score),
            "top_signals": [
                {"feature": f, "label": _label(f), "mean_abs_shap": round(float(v), 5)}
                for f, v in top3
            ],
        }

    return {
        "overall_risk_score": base_score,
        "overall_risk_level": risk_label(base_score),
        "sectors":            list(sectors_out.values()),
        "generated_at":       datetime.now(UTC).isoformat(),
    }


# NOTE: this route must be declared BEFORE /risk/compare/{event_key}
# so FastAPI doesn't try to match "events" as an event_key path param.
@app.get("/risk/compare/events/list", tags=["Compare"])
def list_comparison_events():
    """List all available historical events for comparison."""
    return {
        "events": [
            {"key": k, "label": v["label"], "date": v["date"]}
            for k, v in HISTORICAL_EVENTS.items()
        ]
    }


@app.get("/risk/compare/{event_key}", tags=["Compare"])
def compare_to_event(event_key: str):
    """
    Compare current signal levels to a named historical disruption.

    Available event keys: covid_2020, suez_2021, ukraine_2022, port_2022, tariff_2025
    """
    if event_key not in HISTORICAL_EVENTS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown event. Available: {list(HISTORICAL_EVENTS.keys())}"
        )

    event              = HISTORICAL_EVENTS[event_key]
    df, proba          = get_data_and_predictions()
    _, _, feature_cols = get_model()

    compare_signals = [
        "natural_gas_price", "crude_oil_price", "copper",
        "import_price_index", "trade_balance", "cpi_all",
        "ppi_manufacturing", "capacity_utilization",
    ]

    curr_idx   = len(df) - 1
    curr_row   = df.iloc[curr_idx]
    curr_score = round(float(proba[curr_idx]) * 100, 2)

    hist_idx   = (df["date"] - pd.Timestamp(event["date"])).abs().idxmin()
    hist_row   = df.iloc[hist_idx]
    hist_score = round(float(proba[hist_idx]) * 100, 2)

    comparison = []
    for sig in compare_signals:
        if sig not in df.columns:
            continue
        curr_val = curr_row[sig]
        hist_val = hist_row[sig]
        if pd.isna(curr_val) or pd.isna(hist_val) or hist_val == 0:
            continue
        pct_diff = round((float(curr_val) - float(hist_val)) / abs(float(hist_val)) * 100, 1)
        comparison.append({
            "feature":        sig,
            "label":          _label(sig),
            "current_value":  round(float(curr_val), 4),
            "event_value":    round(float(hist_val), 4),
            "pct_difference": pct_diff,
            "direction":      "higher" if pct_diff > 0 else "lower" if pct_diff < 0 else "same",
        })

    diffs      = [abs(c["pct_difference"]) for c in comparison]
    avg_diff   = sum(diffs) / len(diffs) if diffs else 100
    similarity = round(max(0, 100 - avg_diff), 1)

    return {
        "event_key":          event_key,
        "event_label":        event["label"],
        "event_date":         event["date"],
        "current_date":       str(df["date"].iloc[curr_idx].date()),
        "current_risk_score": curr_score,
        "event_risk_score":   hist_score,
        "similarity_score":   similarity,
        "similarity_label":   (
            "Very similar conditions" if similarity >= 70
            else "Moderately similar" if similarity >= 40
            else "Different conditions"
        ),
        "signals":            comparison,
        "generated_at":       datetime.now(UTC).isoformat(),
    }


# ═══════════════════════════════════════════════════════════════
# SIGNALS
# ═══════════════════════════════════════════════════════════════

@app.get("/signals/top", response_model=SignalResponse, tags=["Signals"])
def get_top_signals_endpoint(
    target_date: Optional[str] = Query(None, description="Date YYYY-MM-DD — defaults to latest")
):
    """Top 10 signals by absolute value for a given week."""
    df, _              = get_data_and_predictions()
    _, _, feature_cols = get_model()

    idx = (
        (df["date"] - pd.Timestamp(target_date)).abs().idxmin()
        if target_date else len(df) - 1
    )
    row  = df.iloc[idx]
    sigs = [
        {"feature": col, "label": _label(col), "value": round(float(row[col]), 4)}
        for col in feature_cols if col in row.index and pd.notna(row[col])
    ]
    sigs.sort(key=lambda x: abs(x["value"]), reverse=True)
    return SignalResponse(date=str(df["date"].iloc[idx].date()), signals=sigs[:10])


@app.get("/signals/forecast", tags=["Signals"])
def get_signal_forecasts(
    signal: str = Query("natural_gas_price", description="Signal name")
):
    """
    Prophet forecast for a specific signal with confidence intervals.
    Available: natural_gas_price, crude_oil_price, copper,
               import_price_index, trade_balance, cpi_all
    """
    client = get_client()
    resp   = (
        client.table("signal_forecasts")
        .select("forecast_date, yhat, yhat_lower, yhat_upper, is_forecast")
        .eq("signal_name", signal)
        .order("forecast_date", desc=False)
        .execute()
    )
    if not resp.data:
        raise HTTPException(
            status_code=404,
            detail=f"No forecast for '{signal}'. Run prophet_forecast.py first."
        )
    return {
        "signal":       signal,
        "label":        _label(signal),
        "points":       resp.data,
        "generated_at": datetime.now(UTC).isoformat(),
    }


@app.get("/signals/llm-reasoning", tags=["Signals"])
def get_llm_reasoning():
    """Latest Claude LLM risk reasoning — plain English disruption assessment."""
    client = get_client()
    resp   = (
        client.table("llm_signals")
        .select("week_start, llm_risk_score, llm_risk_label, reasoning, model_used")
        .order("week_start", desc=True)
        .limit(1)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="No LLM signals found.")

    row = resp.data[0]
    return {
        "week":         row["week_start"],
        "risk_score":   row["llm_risk_score"],
        "risk_label":   row["llm_risk_label"],
        "reasoning":    row["reasoning"],
        "model_used":   row["model_used"],
        "generated_at": datetime.now(UTC).isoformat(),
    }


# ═══════════════════════════════════════════════════════════════
# MODEL
# ═══════════════════════════════════════════════════════════════

@app.get("/model/metrics", response_model=list[MetricsResponse], tags=["Model"])
def get_model_metrics():
    """Model performance metrics from the last training run."""
    if not os.path.exists(METRICS_FILE):
        raise HTTPException(status_code=404, detail="Metrics not found. Run train.py first.")
    with open(METRICS_FILE, "r") as f:
        metrics = json.load(f)
    return [
        MetricsResponse(
            model=m.get("model", "unknown"), f1=m.get("f1", 0),
            precision=m.get("precision", 0), recall=m.get("recall", 0),
            accuracy=m.get("accuracy", 0),
        )
        for m in metrics
    ]


@app.get("/model/features", tags=["Model"])
def get_feature_importance():
    """Top 20 feature importances from the trained LightGBM model."""
    model, _, feature_cols = get_model()
    feat_imp = sorted(
        zip(feature_cols, model.feature_importances_.tolist()),
        key=lambda x: x[1], reverse=True,
    )[:20]
    return {
        "features": [
            {"feature": name, "label": _label(name), "importance": round(score, 6)}
            for name, score in feat_imp
        ],
        "generated_at": datetime.now(UTC).isoformat(),
    }


# ═══════════════════════════════════════════════════════════════
# SHAP
# ═══════════════════════════════════════════════════════════════

@app.get("/shap/waterfall/{target_date}", tags=["SHAP"])
def get_shap_waterfall(
    target_date: str,
    top_n: int = Query(12, description="Number of features to return", le=30),
):
    """
    SHAP waterfall data for a specific date.

    Key dates to try:
        2020-03-20  COVID-19 peak
        2021-03-26  Suez Canal blockage
        2022-03-04  Ukraine invasion week 1
        2022-10-07  Port congestion peak
        2025-03-07  2025 tariff wave
    """
    try:
        target = pd.Timestamp(target_date)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid date. Use YYYY-MM-DD.")

    df, proba          = get_data_and_predictions()
    _, _, feature_cols = get_model()
    explainer          = _get_shap_explainer()

    idx      = (df["date"] - target).abs().idxmin()
    row_date = df["date"].iloc[idx]
    X, available = _get_X(df, feature_cols)
    row      = X.iloc[[idx]]

    shap_vals = explainer.shap_values(row)
    if isinstance(shap_vals, list):
        shap_vals = shap_vals[1]
    sv_array = shap_vals[0]

    base_value = (
        float(explainer.expected_value[1])
        if isinstance(explainer.expected_value, (list, np.ndarray))
        else float(explainer.expected_value)
    )

    features = [
        {
            "feature":       fname,
            "label":         _label(fname),
            "shap_value":    round(float(sv), 5),
            "feature_value": round(float(row[fname].iloc[0]), 4),
            "direction":     "increases_risk" if sv > 0 else "decreases_risk",
        }
        for fname, sv in zip(available, sv_array)
    ]
    features.sort(key=lambda x: abs(x["shap_value"]), reverse=True)

    return {
        "date":         str(row_date.date()),
        "base_value":   round(base_value, 4),
        "prediction":   round(float(proba[idx]), 4),
        "risk_score":   round(float(proba[idx]) * 100, 2),
        "risk_level":   risk_label(float(proba[idx]) * 100),
        "features":     features[:top_n],
        "generated_at": datetime.now(UTC).isoformat(),
    }


@app.get("/shap/summary", tags=["SHAP"])
def get_shap_summary(
    top_n: int = Query(20, description="Number of top features to return", le=50)
):
    """
    Overall SHAP feature importance across all weeks.
    Note: computed on the full dataset — may take a few seconds on first call.
    """
    df, _              = get_data_and_predictions()
    _, _, feature_cols = get_model()
    explainer          = _get_shap_explainer()
    X, available       = _get_X(df, feature_cols)

    shap_vals = explainer.shap_values(X)
    if isinstance(shap_vals, list):
        shap_vals = shap_vals[1]

    mean_abs = np.abs(shap_vals).mean(axis=0)
    summary  = [
        {
            "feature":       fname,
            "label":         _label(fname),
            "mean_abs_shap": round(float(v), 6),
            "rank":          i + 1,
        }
        for i, (fname, v) in enumerate(
            sorted(zip(available, mean_abs), key=lambda x: x[1], reverse=True)[:top_n]
        )
    ]
    return {
        "features":     summary,
        "total_weeks":  len(X),
        "generated_at": datetime.now(UTC).isoformat(),
    }


@app.get("/shap/events", tags=["SHAP"])
def get_named_events():
    """Named disruption events with risk scores — populates the Event Analysis sidebar."""
    events = [
        {"date": "2020-03-20", "event": "COVID-19 peak supply shock",  "period": "Feb–Jun 2020"},
        {"date": "2021-03-26", "event": "Suez Canal blockage",         "period": "Mar–Apr 2021"},
        {"date": "2022-03-04", "event": "Ukraine invasion — week 1",   "period": "Feb–Jun 2022"},
        {"date": "2022-10-07", "event": "Port congestion crisis peak", "period": "Sep–Dec 2022"},
        {"date": "2025-03-07", "event": "2025 tariff wave",            "period": "Jan 2025–present"},
    ]

    df, proba = get_data_and_predictions()
    for ev in events:
        idx              = (df["date"] - pd.Timestamp(ev["date"])).abs().idxmin()
        ev["risk_score"] = round(float(proba[idx]) * 100, 2)
        ev["risk_level"] = risk_label(float(proba[idx]) * 100)
        ev["actual_date"]= str(df["date"].iloc[idx].date())

    return {"events": events, "generated_at": datetime.now(UTC).isoformat()}


# ═══════════════════════════════════════════════════════════════
# DASHBOARD
# ═══════════════════════════════════════════════════════════════

@app.get("/dashboard/summary", tags=["Dashboard"])
def get_dashboard_summary():
    """
    Single endpoint that returns everything the dashboard needs in one call.
    Reduces frontend API calls from 5 to 1 on initial load.
    """
    df, proba          = get_data_and_predictions()
    _, _, feature_cols = get_model()

    idx      = len(df) - 1
    prob     = float(proba[idx])
    score    = round(prob * 100, 2)
    level    = risk_label(score)
    top_sigs = get_top_signals(df.iloc[idx], feature_cols)

    prev_score = round(float(proba[max(0, idx - 4)]) * 100, 2)
    trend_pts  = round(score - prev_score, 1)
    trend_dir  = "rising" if trend_pts > 2 else "falling" if trend_pts < -2 else "stable"

    history = [
        {
            "date":       str(df["date"].iloc[i].date()),
            "risk_score": round(float(proba[i]) * 100, 2),
            "risk_level": risk_label(float(proba[i]) * 100),
        }
        for i in range(max(0, idx - 51), idx + 1)
    ]

    try:
        client       = get_client()
        latest       = df["date"].max()
        resp         = (
            client.table("predictions")
            .select("date, risk_score, risk_level")
            .gt("date", str(latest.date()))
            .order("date", desc=False)
            .limit(12)
            .execute()
        )
        forecast = resp.data or []
    except Exception:
        forecast = []

    try:
        client = get_client()
        resp   = (
            client.table("llm_signals")
            .select("week_start, llm_risk_score, llm_risk_label, reasoning, model_used")
            .order("week_start", desc=True)
            .limit(1)
            .execute()
        )
        llm = resp.data[0] if resp.data else None
    except Exception:
        llm = None

    last4      = [float(proba[max(0, idx - i)]) * 100 for i in range(4)]
    high_weeks = sum(1 for s in last4 if s >= RISK_HIGH)

    return {
        "current": {
            "date":                   str(df["date"].iloc[idx].date()),
            "risk_score":             score,
            "risk_level":             level,
            "disruption_probability": round(prob, 4),
            "top_signals": [
                {"feature": s, "label": _label(s)} for s in top_sigs
            ],
        },
        "trend": {
            "direction":        trend_dir,
            "change_4w":        trend_pts,
            "high_weeks_last4": high_weeks,
        },
        "history":  history,
        "forecast": forecast,
        "llm": {
            "reasoning":  llm["reasoning"]      if llm else None,
            "risk_score": llm["llm_risk_score"] if llm else None,
            "risk_label": llm["llm_risk_label"] if llm else None,
            "week":       llm["week_start"]     if llm else None,
            "model":      llm["model_used"]     if llm else None,
        },
        "meta": {
            "forecast_horizon_weeks": cfg.target.forecast_horizon_weeks,
            "training_weeks":         313,
            "test_weeks":             62,
            "model_f1":               0.984,
            "model_precision":        0.968,
            "model_recall":           1.0,
            "features_count":         457,
            "data_sources":           5,
        },
        "generated_at": datetime.now(UTC).isoformat(),
    }


# ═══════════════════════════════════════════════════════════════
# COMMODITIES
# ═══════════════════════════════════════════════════════════════

@app.get("/commodities/list", tags=["Commodities"])
def list_commodities():
    """Available commodities for the user commodity selector."""
    return {
        "commodities": [
            {"key": k, "label": k.replace("_", " ").title()}
            for k in AVAILABLE_COMMODITIES
        ]
    }


# ═══════════════════════════════════════════════════════════════
# ALERTS
# ═══════════════════════════════════════════════════════════════

@app.post("/alerts/subscribe", tags=["Alerts"])
def subscribe_to_alerts(sub: AlertSubscription):
    """
    Subscribe to risk alerts.

    Requires Supabase table:
        CREATE TABLE IF NOT EXISTS alert_subscriptions (
            id          BIGSERIAL PRIMARY KEY,
            email       TEXT NOT NULL,
            threshold   INT  NOT NULL DEFAULT 65,
            commodities TEXT NOT NULL DEFAULT 'all',
            frequency   TEXT NOT NULL DEFAULT 'weekly',
            active      BOOLEAN NOT NULL DEFAULT TRUE,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(email)
        );
    """
    if "@" not in sub.email or "." not in sub.email:
        raise HTTPException(status_code=400, detail="Invalid email address.")
    if sub.threshold < 1 or sub.threshold > 100:
        raise HTTPException(status_code=400, detail="Threshold must be between 1 and 100.")

    client = get_client()
    try:
        client.table("alert_subscriptions").upsert({
            "email":       sub.email,
            "threshold":   sub.threshold,
            "commodities": sub.commodities,
            "frequency":   sub.frequency,
            "active":      True,
        }, on_conflict="email").execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save subscription: {e}")

    df, proba  = get_data_and_predictions()
    curr_score = round(float(proba[-1]) * 100, 2)
    alert_now  = curr_score >= sub.threshold

    return {
        "status":           "subscribed",
        "email":            sub.email,
        "threshold":        sub.threshold,
        "current_score":    curr_score,
        "alert_active_now": alert_now,
        "message": (
            f"Alert set. Current risk is {curr_score} — "
            f"{'ABOVE' if alert_now else 'below'} your threshold of {sub.threshold}."
        ),
        "created_at": datetime.now(UTC).isoformat(),
    }


@app.delete("/alerts/unsubscribe", tags=["Alerts"])
def unsubscribe(email: str = Query(..., description="Email to unsubscribe")):
    """Unsubscribe from risk alerts."""
    client = get_client()
    try:
        client.table("alert_subscriptions").update(
            {"active": False}
        ).eq("email", email).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"status": "unsubscribed", "email": email}


@app.get("/alerts/check", tags=["Alerts"])
def check_alerts():
    """
    Check which subscribers should receive alerts right now.
    Intended to be called by GitHub Actions after each inference run.
    """
    df, proba  = get_data_and_predictions()
    curr_score = round(float(proba[-1]) * 100, 2)
    curr_date  = str(df["date"].iloc[-1].date())

    client = get_client()
    try:
        resp = client.table("alert_subscriptions").select(
            "email, threshold, commodities, frequency"
        ).eq("active", True).execute()
        subs = resp.data or []
    except Exception:
        subs = []

    triggered = [
        {
            "email":     s["email"],
            "threshold": s["threshold"],
            "score":     curr_score,
            "date":      curr_date,
            "message":   f"Risk score {curr_score} exceeded your alert threshold of {s['threshold']}",
        }
        for s in subs if curr_score >= s["threshold"]
    ]

    return {
        "current_score":       curr_score,
        "subscribers_checked": len(subs),
        "alerts_triggered":    len(triggered),
        "triggered":           triggered,
        "checked_at":          datetime.now(UTC).isoformat(),
    }