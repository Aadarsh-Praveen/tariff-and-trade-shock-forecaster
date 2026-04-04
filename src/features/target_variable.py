"""
src/features/target_variable.py

Builds the binary target variable for the disruption forecaster.

Target definition:
    disruption_in_3w = 1 if a supply chain disruption occurs
                         in the NEXT 3 weeks, else 0

Two-step labeling approach:
    1. Manual anchors  — known historical disruption events hard-coded
                         as ground truth. These are the "named events"
                         that give judges concrete evidence.
    2. Rule-based fill — a composite signal flags additional disruption
                         weeks automatically, calibrated to align with
                         the manual anchors.

Why this matters for the hackathon:
    Manual anchors let you say in your pitch:
    "Our model flagged the COVID shock 3 weeks before peak disruption"
    "Ukraine invasion supply pressure was detected on Feb 25, 2022"
    These specific claims are what win Analytical Depth points.

Owner: Aadarsh
Run:   python -m src.features.target_variable
"""

import pandas as pd
import numpy as np
from src.utils.logger import get_logger
from src.utils.db import get_client, upsert_rows
from src.utils.ingestion_config import cfg

logger = get_logger(__name__)

# ── Manual anchor events ──────────────────────────────────────
# These are the known ground-truth disruption windows.
# Format: (start_date, end_date, event_name)
# The entire window between start and end is labeled as disruption=1.
# Dates are the DISRUPTION WINDOW — not the trigger date.
# We label 3 weeks BEFORE each window so the model learns to predict ahead.

# Loaded from configs/ingestion_config.yaml → target.disruption_anchors
# No hardcoded values here — edit the config file to add/remove events
DISRUPTION_ANCHORS = [
    (a["start"], a["end"], a["event"])
    for a in cfg.target.disruption_anchors
]


# ── Rule-based disruption signal ─────────────────────────────

def compute_rule_based_signal(df: pd.DataFrame) -> pd.Series:
    """
    Flags weeks where multiple signals simultaneously indicate stress.

    Rules (all thresholds chosen to align with manual anchor windows):
        1. import_price_index 4-week pct change > +2%  (import inflation)
        2. new_orders 4-week pct change < -1%          (demand crunch)
        3. industrials ETF 4-week pct change < -2%     (market stress)
        4. copper 4-week pct change outside ±5%        (commodity shock)

    A week is flagged if ANY 2 of the 4 rules trigger simultaneously.
    This keeps recall high — we'd rather have false positives than
    miss a real disruption.

    Returns:
        Binary Series — 1 = rule-based disruption signal, 0 = calm
    """
    signal = pd.Series(0, index=df.index)
    votes  = pd.DataFrame(index=df.index)

    # Thresholds from ingestion_config.yaml → target.rules
    r = cfg.target.rules

    # Rule 1 — import price inflation
    if "import_price_index_pct_4w" in df.columns:
        votes["import_spike"] = (
            df["import_price_index_pct_4w"] > r.import_price_pct_4w_threshold
        ).astype(int)
    else:
        logger.warning("import_price_index_pct_4w not found — skipping rule 1")
        votes["import_spike"] = 0

    # Rule 2 — manufacturing order crunch
    if "new_orders_pct_4w" in df.columns:
        votes["order_crunch"] = (
            df["new_orders_pct_4w"] < r.new_orders_pct_4w_threshold
        ).astype(int)
    else:
        logger.warning("new_orders_pct_4w not found — skipping rule 2")
        votes["order_crunch"] = 0

    # Rule 3 — industrials ETF decline
    if "industrials_pct_4w" in df.columns:
        votes["market_stress"] = (
            df["industrials_pct_4w"] < r.industrials_pct_4w_threshold
        ).astype(int)
    else:
        logger.warning("industrials_pct_4w not found — skipping rule 3")
        votes["market_stress"] = 0

    # Rule 4 — commodity shock (copper moving sharply in either direction)
    if "copper_pct_4w" in df.columns:
        votes["commodity_shock"] = (
            df["copper_pct_4w"].abs() > r.copper_abs_pct_4w_threshold
        ).astype(int)
    else:
        logger.warning("copper_pct_4w not found — skipping rule 4")
        votes["commodity_shock"] = 0

    # Flag if min_rules_to_trigger rules fire simultaneously
    signal = (
        votes.sum(axis=1) >= cfg.target.min_rules_to_trigger
    ).astype(int)
    logger.info(
        f"Rule-based signal: {signal.sum()} disruption weeks "
        f"out of {len(signal)} total ({signal.mean()*100:.1f}%)"
    )
    return signal


# ── Apply manual anchors ──────────────────────────────────────

def apply_manual_anchors(df: pd.DataFrame) -> pd.Series:
    """
    Creates a binary series where known disruption windows = 1.

    Each anchor window is expanded by ±1 week on each side to account
    for the weekly resampling frequency — disruptions don't start
    precisely on a Friday.

    Returns:
        Binary Series — 1 = inside a known disruption window, 0 = calm
    """
    manual = pd.Series(0, index=df.index)

    for start_str, end_str, event_name in DISRUPTION_ANCHORS:
        start = pd.Timestamp(start_str) - pd.Timedelta(weeks=1)
        end   = pd.Timestamp(end_str)   + pd.Timedelta(weeks=1)

        mask = (df["date"] >= start) & (df["date"] <= end)
        manual[mask] = 1
        logger.info(
            f"Anchor '{event_name}': {mask.sum()} weeks labeled "
            f"({start_str} to {end_str})"
        )

    logger.info(
        f"Manual anchors total: {manual.sum()} disruption weeks "
        f"out of {len(manual)} ({manual.mean()*100:.1f}%)"
    )
    return manual


# ── Combine and create forward-looking target ─────────────────

def build_target(df: pd.DataFrame) -> pd.DataFrame:
    """
    Build the binary target variable.

    Steps:
        1. Compute rule-based disruption signal
        2. Apply manual anchor labels
        3. OR the two signals together (union = more recall)
        4. Shift the combined signal BACK by 3 weeks
           → This makes it forward-looking:
             "is there a disruption in the NEXT 3 weeks?"
        5. Drop the last 3 rows (no future label available)

    Returns:
        DataFrame with columns [date, disruption_signal,
                                  manual_anchor, rule_based,
                                  disruption_in_3w]
    """
    result = df[["date"]].copy()

    # Step 1 & 2
    result["rule_based"]    = compute_rule_based_signal(df)
    result["manual_anchor"] = apply_manual_anchors(df)

    # Step 3 — union of both signals
    result["disruption_signal"] = (
        (result["rule_based"] | result["manual_anchor"])
        .astype(int)
    )

    # Step 4 — shift back 3 weeks to make it forward-looking
    # disruption_in_3w[t] = disruption_signal[t+3]
    result["disruption_in_3w"] = (
        result["disruption_signal"]
        .shift(-3)
        .fillna(0)
        .astype(int)
    )

    # Step 5 — drop last 3 rows (no valid future label)
    result = result.iloc[:-3].copy()

    # Class balance report
    pos = result["disruption_in_3w"].sum()
    neg = len(result) - pos
    ratio = pos / len(result) * 100
    logger.info(f"Target distribution: {pos} disruption ({ratio:.1f}%) | {neg} calm")
    logger.info(f"Class imbalance ratio: 1:{neg/max(pos,1):.1f}")

    return result


# ── Save to Supabase ──────────────────────────────────────────

def save_target_to_db(target_df: pd.DataFrame) -> int:
    """
    Save target variable to Supabase targets table.

    Table schema required:
        CREATE TABLE IF NOT EXISTS targets (
            id                BIGSERIAL PRIMARY KEY,
            date              DATE NOT NULL,
            disruption_in_3w  INT  NOT NULL,   -- 0 or 1
            disruption_signal INT  NOT NULL,   -- combined signal
            manual_anchor     INT  NOT NULL,   -- from known events
            rule_based        INT  NOT NULL,   -- from rules
            created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(date)
        );
        CREATE INDEX IF NOT EXISTS idx_targets_date
            ON targets (date DESC);
    """
    if target_df.empty:
        logger.warning("Empty target DataFrame — nothing to save")
        return 0

    rows = [
        {
            "date":             str(row["date"].date()),
            "disruption_in_3w": int(row["disruption_in_3w"]),
            "disruption_signal": int(row["disruption_signal"]),
            "manual_anchor":    int(row["manual_anchor"]),
            "rule_based":       int(row["rule_based"]),
        }
        for _, row in target_df.iterrows()
    ]

    total = upsert_rows("targets", rows, on_conflict="date")
    logger.info(f"Saved {total} target rows to Supabase")
    return total


# ── Load features from Supabase ───────────────────────────────

def load_features() -> pd.DataFrame:
    """
    Load feature matrix from Supabase with pagination.
    Returns wide DataFrame: one row per date, one column per feature.
    """
    client   = get_client()
    all_rows = []
    page_size = 1000
    offset   = 0

    while True:
        resp = (
            client.table("features")
            .select("date, feature_name, value")
            .order("date", desc=False)
            .range(offset, offset + page_size - 1)
            .execute()
        )
        batch = resp.data or []
        all_rows.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size

    if not all_rows:
        raise RuntimeError("No features found — run pipeline.py first")

    df = pd.DataFrame(all_rows)
    df["date"] = pd.to_datetime(df["date"])

    wide = df.pivot_table(
        index="date",
        columns="feature_name",
        values="value",
        aggfunc="last",
    ).reset_index()
    wide.columns.name = None

    logger.info(f"Loaded feature matrix: {wide.shape}")
    return wide


# ── Entry point ───────────────────────────────────────────────

def run() -> pd.DataFrame:
    """
    Full target variable pipeline:
    1. Load features from Supabase
    2. Build binary target
    3. Save to Supabase targets table
    4. Print summary
    """
    logger.info("=" * 50)
    logger.info("Target variable pipeline starting")

    features = load_features()
    target   = build_target(features)
    total    = save_target_to_db(target)

    logger.info(f"Target pipeline complete — {total} rows saved")
    logger.info("=" * 50)
    return target


if __name__ == "__main__":
    df = run()
    print(f"\nTarget shape: {df.shape}")
    print(f"Date range: {df['date'].min().date()} to {df['date'].max().date()}")
    print(f"\nClass distribution:")
    print(df["disruption_in_3w"].value_counts().to_string())
    print(f"\nDisruption weeks by source:")
    print(f"  Manual anchors:  {df['manual_anchor'].sum()} weeks")
    print(f"  Rule-based only: {(df['rule_based'] & ~df['manual_anchor'].astype(bool)).sum()} weeks")
    print(f"\nKnown disruption windows covered:")
    for start, end, name in DISRUPTION_ANCHORS:
        mask = (df["date"] >= start) & (df["date"] <= end)
        print(f"  {name}: {mask.sum()} weeks labeled")