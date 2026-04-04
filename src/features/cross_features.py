"""
src/features/cross_features.py

Creates cross-signal features — relationships between two or more signals.

Why cross-signal features matter:
  No single signal predicts disruption reliably. But COMBINATIONS are
  powerful. "Copper rising AND PMI falling simultaneously" is a much
  stronger signal than either alone. These features capture those
  joint conditions that precede disruptions.

These are the features that give this model its edge over simpler approaches.
"""

import pandas as pd
import numpy as np
from src.utils.logger import get_logger

logger = get_logger(__name__)


def compute_copper_pmi_stress(df: pd.DataFrame) -> pd.DataFrame:
    """
    Copper-PMI stress index.

    When copper prices rise (demand surge) while manufacturing orders
    fall (supply crunch), the gap between supply and demand is widening.
    This is one of the strongest historical precursors to supply disruption.

    copper_pmi_stress = copper_pct_4w - new_orders_pct_4w
    High positive value = demand exceeding supply capacity = stress
    """
    result = df.copy()

    if "copper_pct_4w" in df.columns and "new_orders_pct_4w" in df.columns:
        result["copper_pmi_stress"] = (
            df["copper_pct_4w"] - df["new_orders_pct_4w"]
        ).round(4)
        logger.info("Created copper_pmi_stress feature")
    else:
        logger.warning("copper_pct_4w or new_orders_pct_4w missing — skipping copper_pmi_stress")

    return result


def compute_energy_manufacturing_ratio(df: pd.DataFrame) -> pd.DataFrame:
    """
    Energy cost vs manufacturing output ratio.

    When energy costs rise faster than manufacturing output,
    factories face margin pressure which leads to production cuts.
    A leading indicator for manufacturing supply disruptions.

    energy_mfg_ratio = crude_oil_pct_4w / industrial_production_pct_4w
    """
    result = df.copy()

    if "crude_oil_price_pct_4w" in df.columns and "industrial_production_pct_4w" in df.columns:
        denominator = df["industrial_production_pct_4w"].replace(0, float("nan"))
        result["energy_mfg_ratio"] = (
            df["crude_oil_price_pct_4w"] / denominator
        ).round(4)
        logger.info("Created energy_mfg_ratio feature")
    else:
        logger.warning("Skipping energy_mfg_ratio — missing required columns")

    return result


def compute_trade_pressure_index(df: pd.DataFrame) -> pd.DataFrame:
    """
    Trade pressure index.

    Combines import price inflation with trade balance deterioration.
    When imports get more expensive AND the trade deficit widens,
    supply chains are under maximum external pressure.

    trade_pressure = import_price_index_pct_4w + abs(trade_balance_change_4w) / 1000
    """
    result = df.copy()

    if "import_price_index_pct_4w" in df.columns and "trade_balance_change_4w" in df.columns:
        result["trade_pressure_index"] = (
            df["import_price_index_pct_4w"]
            + (df["trade_balance_change_4w"].abs() / 1000)
        ).round(4)
        logger.info("Created trade_pressure_index feature")
    else:
        logger.warning("Skipping trade_pressure_index — missing required columns")

    return result


def compute_capacity_labour_stress(df: pd.DataFrame) -> pd.DataFrame:
    """
    Capacity utilisation vs labour market stress index.

    When capacity utilisation is high (factories near maximum output)
    AND unemployment is low (hard to hire), any disruption causes
    outsized shortages because there's no buffer capacity.

    capacity_labour_stress = capacity_utilization_zscore_4w
                           - unemployment_rate_zscore_4w
    High value = system under maximum strain
    """
    result = df.copy()

    if "capacity_utilization_zscore_4w" in df.columns and "unemployment_rate_zscore_4w" in df.columns:
        result["capacity_labour_stress"] = (
            df["capacity_utilization_zscore_4w"]
            - df["unemployment_rate_zscore_4w"]
        ).round(4)
        logger.info("Created capacity_labour_stress feature")
    else:
        logger.warning("Skipping capacity_labour_stress — missing required columns")

    return result


def compute_multi_commodity_stress(df: pd.DataFrame) -> pd.DataFrame:
    """
    Multi-commodity stress index.

    When multiple commodities move in the same direction simultaneously,
    it signals a broad supply shock rather than a single-market event.
    This is the Polymarket equivalent for physical commodities.

    Counts how many key commodities are above their 4-week average.
    Range: 0 (no stress) to N (all commodities elevated)
    """
    result = df.copy()

    commodity_momentum_cols = [
        c for c in df.columns
        if c.endswith("_momentum_4w")
        and any(
            c.startswith(p)
            for p in ["copper", "wheat", "aluminum", "crude_oil", "natural_gas"]
        )
    ]

    if len(commodity_momentum_cols) >= 2:
        stress = pd.DataFrame(index=df.index)
        for col in commodity_momentum_cols:
            stress[col] = (df[col] > 0).astype(int)

        result["multi_commodity_stress"] = stress.sum(axis=1)
        logger.info(
            f"Created multi_commodity_stress from {len(commodity_momentum_cols)} commodities"
        )
    else:
        logger.warning("Skipping multi_commodity_stress — fewer than 2 commodity momentum cols")

    return result


def compute_fear_macro_alignment(df: pd.DataFrame) -> pd.DataFrame:
    """
    Fear index + macro alignment score.

    When prediction markets (Polymarket fear index) align with
    deteriorating macro conditions, the combined signal is much
    stronger than either alone.

    fear_macro_alignment = fear_index_lag_1w * copper_pmi_stress
    Non-zero only when both signals are elevated simultaneously.
    """
    result = df.copy()

    if "fear_index_lag_1w" in df.columns and "copper_pmi_stress" in df.columns:
        result["fear_macro_alignment"] = (
            df["fear_index_lag_1w"] * df["copper_pmi_stress"]
        ).round(4)
        logger.info("Created fear_macro_alignment feature")
    else:
        logger.warning("Skipping fear_macro_alignment — missing fear_index_lag_1w or copper_pmi_stress")

    return result


def compute_all_cross_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Run all cross-signal feature computations in sequence.

    Returns:
        DataFrame with all cross features added
    """
    result = df.copy()
    result = compute_copper_pmi_stress(result)
    result = compute_energy_manufacturing_ratio(result)
    result = compute_trade_pressure_index(result)
    result = compute_capacity_labour_stress(result)
    result = compute_multi_commodity_stress(result)
    result = compute_fear_macro_alignment(result)

    cross_cols = [
        "copper_pmi_stress",
        "energy_mfg_ratio",
        "trade_pressure_index",
        "capacity_labour_stress",
        "multi_commodity_stress",
        "fear_macro_alignment",
    ]
    created = [c for c in cross_cols if c in result.columns]
    logger.info(f"Cross features complete — {len(created)} features created")
    return result