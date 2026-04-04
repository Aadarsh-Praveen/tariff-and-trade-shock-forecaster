"""
src/models/inference.py

Runs the trained LightGBM model on the latest feature data
and saves predictions to the Supabase predictions table.

This is what runs in production after each ingestion cycle.
It does NOT retrain — it uses the saved model from train.py.

Run:   python -m src.models.inference
"""

import json
import pickle
import pandas as pd
import numpy as np
from datetime import datetime, UTC

from src.utils.logger           import get_logger
from src.utils.db               import get_client, upsert_rows
from src.utils.ingestion_config import cfg

logger = get_logger(__name__)

MODELS_DIR    = "models"
LGB_MODEL     = f"{MODELS_DIR}/lgb_model.pkl"
FEATURES_FILE = f"{MODELS_DIR}/feature_columns.json"

RISK_HIGH   = 65
RISK_MEDIUM = 40


# ── Helpers ───────────────────────────────────────────────────

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


def load_model():
    with open(LGB_MODEL, "rb") as f:
        saved = pickle.load(f)
    with open(FEATURES_FILE, "r") as f:
        feature_cols = json.load(f)
    return saved["model"], saved["threshold"], feature_cols


def load_features() -> pd.DataFrame:
    logger.info("Loading features from Supabase...")
    rows = _paginate("features", "date, feature_name, value", "date")
    df   = pd.DataFrame(rows)
    df["date"] = pd.to_datetime(df["date"])
    wide = df.pivot_table(
        index="date", columns="feature_name",
        values="value", aggfunc="last",
    ).reset_index()
    wide.columns.name = None
    logger.info(f"Features loaded: {wide.shape}")
    return wide


def risk_label(score: float) -> str:
    if score >= RISK_HIGH:
        return "high"
    elif score >= RISK_MEDIUM:
        return "medium"
    return "low"


# ── Main inference ────────────────────────────────────────────

def run():
    logger.info("=" * 50)
    logger.info("Inference pipeline starting")

    # 1. Load model
    model, threshold, feature_cols = load_model()
    logger.info(f"Model loaded | threshold: {threshold:.2f} | features: {len(feature_cols)}")

    # 2. Load features
    features = load_features()

    # 3. Align to model's expected feature columns
    available = [c for c in feature_cols if c in features.columns]
    missing   = [c for c in feature_cols if c not in features.columns]
    if missing:
        logger.warning(f"{len(missing)} features missing — will be filled with 0")

    feat_cols = [c for c in features.columns if c != "date"]
    features[feat_cols] = features[feat_cols].fillna(features[feat_cols].median())

    X     = features[available]
    dates = features["date"]

    # 4. Score every week
    proba  = model.predict_proba(X)[:, 1]
    labels = [risk_label(p * 100) for p in proba]

    logger.info(f"Scored {len(proba)} weeks")
    logger.info(f"  High risk:   {sum(l == 'high'   for l in labels)}")
    logger.info(f"  Medium risk: {sum(l == 'medium' for l in labels)}")
    logger.info(f"  Low risk:    {sum(l == 'low'    for l in labels)}")

    # 5. Latest week summary
    latest_date  = dates.iloc[-1]
    latest_score = round(float(proba[-1]) * 100, 2)
    latest_label = labels[-1]
    logger.info(
        f"Latest week: {latest_date.date()} | "
        f"score={latest_score} | level={latest_label}"
    )

    # 6. Build top signals for latest week
    latest_row = X.iloc[-1]
    top3_signals = (
        latest_row
        .abs()
        .nlargest(3)
        .index
        .tolist()
    )

    # 7. Save all predictions to Supabase
    rows = []
    run_ts = datetime.now(UTC).isoformat()
    for i, (date, score, label) in enumerate(
        zip(dates, proba * 100, labels)
    ):
        rows.append({
            "date":        str(date.date()),
            "risk_score":  round(float(score), 2),
            "risk_level":  label,
            "scored_at":   run_ts,
        })

    total = upsert_rows("predictions", rows, on_conflict="date")
    logger.info(f"Saved {total} predictions to Supabase")

    # 8. Save latest prediction summary
    summary = [{
        "date":           str(latest_date.date()),
        "risk_score":     latest_score,
        "risk_level":     latest_label,
        "top_signal_1":   top3_signals[0] if len(top3_signals) > 0 else "",
        "top_signal_2":   top3_signals[1] if len(top3_signals) > 1 else "",
        "top_signal_3":   top3_signals[2] if len(top3_signals) > 2 else "",
        "forecast_horizon_weeks": cfg.target.forecast_horizon_weeks,
        "scored_at":      run_ts,
    }]
    upsert_rows("latest_prediction", summary, on_conflict="date")
    logger.info(f"Latest prediction saved: {latest_score} ({latest_label})")

    logger.info("=" * 50)
    logger.info("Inference pipeline complete")
    return proba, labels


if __name__ == "__main__":
    run()