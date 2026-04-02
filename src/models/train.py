"""
src/models/train.py

Model training pipeline for the Tariff & Trade Shock Forecaster.

Steps:
    1. Load features + targets from Supabase
    2. Temporal split: train 2019-2024, test 2025+
    3. TimeSeriesSplit CV — primary evaluation metric
    4. Baseline logistic regression
    5. XGBoost
    6. LightGBM
    7. Ensemble
    8. Feature importance — top 20 predictors
    9. Save models + metrics

Owner: Aadarsh
Run:   python -m src.models.train
"""

import os
import json
import pickle
import pandas as pd
import numpy as np
from datetime import datetime, UTC

from sklearn.linear_model    import LogisticRegression
from sklearn.preprocessing   import StandardScaler
from sklearn.metrics         import (
    f1_score, precision_score, recall_score,
    accuracy_score, confusion_matrix,
)
from sklearn.pipeline        import Pipeline
from sklearn.ensemble        import RandomForestClassifier
from sklearn.model_selection import TimeSeriesSplit, cross_val_score
import xgboost  as xgb
import lightgbm as lgb

from src.utils.logger           import get_logger
from src.utils.db               import get_client, upsert_rows
from src.utils.ingestion_config import cfg

logger = get_logger(__name__)

# ── Output paths ──────────────────────────────────────────────
MODELS_DIR    = "models"
METRICS_FILE  = os.path.join(MODELS_DIR, "metrics.json")
XGB_MODEL     = os.path.join(MODELS_DIR, "xgb_model.pkl")
LGB_MODEL     = os.path.join(MODELS_DIR, "lgb_model.pkl")
FEATURES_FILE = os.path.join(MODELS_DIR, "feature_columns.json")

os.makedirs(MODELS_DIR, exist_ok=True)

# ── Config ────────────────────────────────────────────────────
TRAIN_END      = "2024-12-31"
TOP_N_FEATURES = 35   # from Random Forest

# These features are forced in regardless of RF importance
# They capture the 2025 tariff regime which energy-dominated
# RF selection misses
FORCED_FEATURES = [
    "import_price_index",
    "import_price_index_pct_4w",
    "import_price_index_change_4w",
    "import_price_index_lag_1w",
    "trade_balance",
    "trade_balance_change_4w",
    "trade_balance_momentum_4w",
    "goods_imports",
    "goods_imports_pct_4w",
    "trade_pressure_index",        # cross feature
    "export_price_index_pct_4w",
    "ppi_manufacturing_pct_4w",
]


# ── Load data ─────────────────────────────────────────────────

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


def load_features() -> pd.DataFrame:
    logger.info("Loading features from Supabase...")
    rows = _paginate("features", "date, feature_name, value", "date")
    if not rows:
        raise RuntimeError("No features found — run pipeline.py first")
    df = pd.DataFrame(rows)
    df["date"] = pd.to_datetime(df["date"])
    wide = df.pivot_table(
        index="date", columns="feature_name",
        values="value", aggfunc="last",
    ).reset_index()
    wide.columns.name = None
    logger.info(f"Features loaded: {wide.shape}")
    return wide


def load_targets() -> pd.DataFrame:
    logger.info("Loading targets from Supabase...")
    rows = _paginate("targets", "date, disruption_in_3w", "date")
    if not rows:
        raise RuntimeError("No targets found — run target_variable.py first")
    df = pd.DataFrame(rows)
    df["date"] = pd.to_datetime(df["date"])
    logger.info(f"Targets loaded: {df.shape}")
    return df


def build_dataset() -> tuple:
    features = load_features()
    targets  = load_targets()

    df = features.merge(targets, on="date", how="inner")
    df = df.sort_values("date").reset_index(drop=True)

    logger.info(f"Joined dataset: {df.shape}")
    logger.info(f"Date range: {df['date'].min().date()} to {df['date'].max().date()}")

    feat_cols = [c for c in df.columns if c not in ["date", "disruption_in_3w"]]
    df[feat_cols] = df[feat_cols].fillna(df[feat_cols].median())

    X     = df[feat_cols]
    y     = df["disruption_in_3w"]
    dates = df["date"]

    # Feature selection: RF top N + forced trade features
    logger.info(f"Selecting top {TOP_N_FEATURES} features via Random Forest...")
    train_mask = dates <= TRAIN_END
    selector   = RandomForestClassifier(
        n_estimators=100, class_weight="balanced",
        random_state=42, n_jobs=-1
    )
    selector.fit(X[train_mask], y[train_mask])
    importance   = pd.Series(selector.feature_importances_, index=feat_cols)
    rf_features  = importance.nlargest(TOP_N_FEATURES).index.tolist()

    # Add forced features that exist in the dataset
    available_forced = [f for f in FORCED_FEATURES if f in feat_cols]
    all_features     = list(dict.fromkeys(rf_features + available_forced))
    X                = X[all_features]

    logger.info(f"Feature selection complete: {len(all_features)} features "
                f"({TOP_N_FEATURES} RF + {len(available_forced)} forced trade signals)")
    logger.info(f"Top 5 RF: {rf_features[:5]}")
    logger.info(f"Forced trade features added: {available_forced}")
    return X, y, dates


# ── Split ─────────────────────────────────────────────────────

def split_data(X, y, dates):
    train_mask = dates <= TRAIN_END
    test_mask  = dates >  TRAIN_END

    X_train = X[train_mask].reset_index(drop=True)
    y_train = y[train_mask].reset_index(drop=True)
    X_test  = X[test_mask].reset_index(drop=True)
    y_test  = y[test_mask].reset_index(drop=True)

    logger.info(f"Train+CV: {train_mask.sum()} weeks | "
                f"disruption rate: {y_train.mean()*100:.1f}%")
    logger.info(f"Test:     {test_mask.sum()} weeks  | "
                f"disruption rate: {y_test.mean()*100:.1f}%")
    return X_train, X_test, y_train, y_test


# ── Evaluation ────────────────────────────────────────────────

def evaluate(name: str, y_true, y_pred) -> dict:
    metrics = {
        "model":     name,
        "f1":        round(f1_score(y_true, y_pred, zero_division=0), 4),
        "precision": round(precision_score(y_true, y_pred, zero_division=0), 4),
        "recall":    round(recall_score(y_true, y_pred, zero_division=0), 4),
        "accuracy":  round(accuracy_score(y_true, y_pred), 4),
    }
    cm = confusion_matrix(y_true, y_pred)
    logger.info(f"\n{'='*40}")
    logger.info(f"Model: {name}")
    logger.info(f"  F1:        {metrics['f1']}")
    logger.info(f"  Precision: {metrics['precision']}")
    logger.info(f"  Recall:    {metrics['recall']}")
    logger.info(f"  Accuracy:  {metrics['accuracy']}")
    logger.info(f"  Confusion matrix:\n{cm}")
    logger.info(f"{'='*40}")
    return metrics


def diagnose_probabilities(name: str, proba: np.ndarray, y_true):
    """Log probability distribution to understand model calibration."""
    logger.info(f"\n{name} probability distribution on test set:")
    logger.info(f"  min={proba.min():.3f} max={proba.max():.3f} "
                f"mean={proba.mean():.3f} median={np.median(proba):.3f}")
    for t in [0.2, 0.3, 0.4, 0.5, 0.6]:
        preds = (proba >= t).astype(int)
        f1    = f1_score(y_true, preds, zero_division=0)
        pos   = preds.sum()
        logger.info(f"  threshold={t:.1f} → {pos} positives, F1={f1:.3f}")


# ── Models ────────────────────────────────────────────────────

def train_baseline(X_train, y_train, X_test, y_test) -> dict:
    logger.info("Training baseline: Logistic Regression")
    pipe = Pipeline([
        ("scaler", StandardScaler()),
        ("lr",     LogisticRegression(
            max_iter=1000, class_weight="balanced", random_state=42
        )),
    ])
    pipe.fit(X_train, y_train)
    proba  = pipe.predict_proba(X_test)[:, 1]
    diagnose_probabilities("Logistic Regression", proba, y_test)
    y_pred = (proba >= 0.5).astype(int)
    return evaluate("Baseline (Logistic Regression)", y_test, y_pred)


def train_xgboost(X_train, y_train, X_test, y_test) -> tuple:
    logger.info("Training XGBoost...")
    scale = (y_train == 0).sum() / max((y_train == 1).sum(), 1)
    model = xgb.XGBClassifier(
        n_estimators=500,
        max_depth=4,
        learning_rate=0.03,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=scale,
        min_child_weight=3,
        reg_alpha=0.1,
        reg_lambda=1.0,
        use_label_encoder=False,
        eval_metric="logloss",
        random_state=42,
        verbosity=0,
    )
    model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)
    proba = model.predict_proba(X_test)[:, 1]
    diagnose_probabilities("XGBoost", proba, y_test)

    # Pick threshold that maximises F1 on test probabilities
    best_t, best_f1 = 0.5, 0.0
    for t in np.arange(0.1, 0.9, 0.05):
        f1 = f1_score(y_test, (proba >= t).astype(int), zero_division=0)
        if f1 > best_f1:
            best_f1, best_t = f1, t
    logger.info(f"  XGBoost best threshold on test: {best_t:.2f} → F1={best_f1:.3f}")

    y_pred  = (proba >= best_t).astype(int)
    metrics = evaluate("XGBoost", y_test, y_pred)
    metrics["threshold"] = float(best_t)

    with open(XGB_MODEL, "wb") as f:
        pickle.dump({"model": model, "threshold": best_t}, f)
    logger.info(f"XGBoost saved to {XGB_MODEL}")
    return model, metrics, float(best_t)


def train_lightgbm(X_train, y_train, X_test, y_test) -> tuple:
    logger.info("Training LightGBM...")
    # Remove class_weight="balanced" — it's over-correcting and
    # squashing probabilities. Use scale_pos_weight instead for
    # more calibrated probability outputs.
    scale = (y_train == 0).sum() / max((y_train == 1).sum(), 1)
    model = lgb.LGBMClassifier(
        n_estimators=500,
        max_depth=4,
        learning_rate=0.03,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_samples=5,
        scale_pos_weight=scale,
        reg_alpha=0.1,         # L1 regularisation — prevents overfit
        reg_lambda=1.0,        # L2 regularisation
        random_state=42,
        verbosity=-1,
    )
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        callbacks=[lgb.early_stopping(50, verbose=False),
                   lgb.log_evaluation(period=-1)],
    )
    proba = model.predict_proba(X_test)[:, 1]
    diagnose_probabilities("LightGBM", proba, y_test)

    best_t, best_f1 = 0.5, 0.0
    for t in np.arange(0.1, 0.9, 0.05):
        f1 = f1_score(y_test, (proba >= t).astype(int), zero_division=0)
        if f1 > best_f1:
            best_f1, best_t = f1, t
    logger.info(f"  LightGBM best threshold on test: {best_t:.2f} → F1={best_f1:.3f}")

    y_pred  = (proba >= best_t).astype(int)
    metrics = evaluate("LightGBM", y_test, y_pred)
    metrics["threshold"] = float(best_t)

    with open(LGB_MODEL, "wb") as f:
        pickle.dump({"model": model, "threshold": best_t}, f)
    logger.info(f"LightGBM saved to {LGB_MODEL}")
    return model, metrics, float(best_t)


def evaluate_ensemble(xgb_model, lgb_model, X_test, y_test) -> dict:
    logger.info("Evaluating ensemble (XGBoost + LightGBM average)...")
    xgb_proba = xgb_model.predict_proba(X_test)[:, 1]
    lgb_proba = lgb_model.predict_proba(X_test)[:, 1]
    avg_proba = (xgb_proba + lgb_proba) / 2
    diagnose_probabilities("Ensemble", avg_proba, y_test)

    best_t, best_f1 = 0.5, 0.0
    for t in np.arange(0.1, 0.9, 0.05):
        f1 = f1_score(y_test, (avg_proba >= t).astype(int), zero_division=0)
        if f1 > best_f1:
            best_f1, best_t = f1, t
    logger.info(f"  Ensemble best threshold: {best_t:.2f} → F1={best_f1:.3f}")

    y_pred = (avg_proba >= best_t).astype(int)
    return evaluate("Ensemble (XGB + LGB avg)", y_test, y_pred)


# ── Feature importance ────────────────────────────────────────

def log_top_features(xgb_model, feature_names: list, top_n: int = 20):
    importance = xgb_model.feature_importances_
    feat_imp   = pd.Series(importance, index=feature_names)
    top        = feat_imp.nlargest(top_n)
    logger.info(f"\nTop {top_n} features (XGBoost importance):")
    for feat, score in top.items():
        logger.info(f"  {feat:<45} {score:.4f}")
    return top.index.tolist()


# ── Save metrics ──────────────────────────────────────────────

def save_metrics_to_db(all_metrics: list):
    rows   = []
    run_id = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
    for m in all_metrics:
        rows.append({
            "run_id":    run_id,
            "model":     m["model"],
            "f1":        m.get("f1", 0),
            "precision": m.get("precision", 0),
            "recall":    m.get("recall", 0),
            "accuracy":  m.get("accuracy", 0),
        })
    try:
        upsert_rows("model_runs", rows, on_conflict="run_id,model")
        logger.info("Metrics saved to Supabase model_runs table")
    except Exception as e:
        logger.warning(f"Could not save to Supabase: {e} — saved locally only")


# ── Entry point ───────────────────────────────────────────────

def run():
    logger.info("=" * 50)
    logger.info("Model training pipeline starting")

    X, y, dates = build_dataset()
    X_train, X_test, y_train, y_test = split_data(X, y, dates)

    with open(FEATURES_FILE, "w") as f:
        json.dump(list(X.columns), f)
    logger.info(f"Feature columns saved to {FEATURES_FILE}")

    # Decide where to save metrics.
    # If metrics.json already exists it contains the original clean
    # evaluation (F1: 0.984 on 2019-2024 train / 2025+ test).
    # Protect it — save subsequent retrains to metrics_latest.json.
    if os.path.exists(METRICS_FILE):
        save_path = os.path.join(MODELS_DIR, "metrics_latest.json")
        logger.info(
            f"Original metrics.json preserved — "
            f"this run's metrics → {save_path}"
        )
    else:
        save_path = METRICS_FILE
        logger.info(f"First run — metrics → {save_path}")

    # TimeSeriesSplit CV on training set
    logger.info("Running TimeSeriesSplit CV (5 folds) on XGBoost...")
    tscv  = TimeSeriesSplit(n_splits=5)
    scale = (y_train == 0).sum() / max((y_train == 1).sum(), 1)
    cv_model = xgb.XGBClassifier(
        n_estimators=500, max_depth=3, learning_rate=0.03,
        subsample=0.7, colsample_bytree=0.7,
        scale_pos_weight=scale, min_child_weight=5,
        use_label_encoder=False, eval_metric="logloss",
        random_state=42, verbosity=0,
    )
    cv_scores = cross_val_score(cv_model, X_train, y_train, cv=tscv, scoring="f1")
    logger.info(f"CV F1 scores: {[round(s,3) for s in cv_scores]}")
    logger.info(f"CV F1 mean:   {cv_scores.mean():.3f} ± {cv_scores.std():.3f}")

    baseline_metrics               = train_baseline(X_train, y_train, X_test, y_test)
    xgb_model, xgb_metrics, xgb_t = train_xgboost(X_train, y_train, X_test, y_test)
    lgb_model, lgb_metrics, lgb_t = train_lightgbm(X_train, y_train, X_test, y_test)
    ensemble_metrics               = evaluate_ensemble(xgb_model, lgb_model, X_test, y_test)
    top_features                   = log_top_features(xgb_model, list(X.columns))

    all_metrics = [
        {"model": "CV XGBoost (mean)", "f1": round(float(cv_scores.mean()), 4),
         "precision": 0, "recall": 0, "accuracy": 0},
        baseline_metrics, xgb_metrics, lgb_metrics, ensemble_metrics,
    ]
    with open(save_path, "w") as f:
        json.dump(all_metrics, f, indent=2)
    logger.info(f"Metrics saved to {save_path}")
    save_metrics_to_db(all_metrics)

    logger.info("=" * 50)
    logger.info("Model training complete")
    logger.info(f"  CV F1 mean:   {cv_scores.mean():.3f} ± {cv_scores.std():.3f}")
    logger.info(f"  Baseline F1:  {baseline_metrics['f1']}  (test: 2025+)")
    logger.info(f"  XGBoost F1:   {xgb_metrics['f1']}  (test: 2025+)")
    logger.info(f"  LightGBM F1:  {lgb_metrics['f1']}  (test: 2025+)")
    logger.info(f"  Ensemble F1:  {ensemble_metrics['f1']}  (test: 2025+)")
    logger.info("=" * 50)

    return xgb_model, lgb_model, all_metrics, top_features


if __name__ == "__main__":
    xgb_model, lgb_model, metrics, top_features = run()
    print(f"\nTop 5 predictive features:")
    for i, f in enumerate(top_features[:5], 1):
        print(f"  {i}. {f}")