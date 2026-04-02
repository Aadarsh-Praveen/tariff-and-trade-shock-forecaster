"""
tests/test_features.py

Tests for all feature engineering functions.
No API calls, no Supabase — purely unit tests on DataFrames.

Run with: pytest tests/test_features.py -v
"""

import pytest
import pandas as pd
import numpy as np
from src.features.lag_features import (
    compute_lag_features,
    compute_lag_changes,
    compute_pct_change,
)
from src.features.rolling_features import (
    compute_rolling_mean,
    compute_rolling_std,
    compute_rolling_momentum,
    compute_rolling_zscore,
)
from src.features.cross_features import (
    compute_copper_pmi_stress,
    compute_multi_commodity_stress,
    compute_fear_macro_alignment,
    compute_all_cross_features,
)


# ── Shared test fixture ───────────────────────────────────────

@pytest.fixture
def sample_df():
    """
    Realistic sample DataFrame with 20 weeks of data.
    Mimics the merged raw signal DataFrame from pipeline.py.
    """
    n = 20
    dates = pd.date_range("2025-01-01", periods=n, freq="W-FRI")
    rng   = np.random.default_rng(42)

    return pd.DataFrame({
        "date":                   dates,
        "copper":                 8000 + rng.normal(0, 300, n).cumsum(),
        "wheat":                  550  + rng.normal(0, 20, n).cumsum(),
        "aluminum":               2200 + rng.normal(0, 80, n).cumsum(),
        "crude_oil_price":        70   + rng.normal(0, 3, n).cumsum(),
        "natural_gas_price":      3.0  + rng.normal(0, 0.2, n).cumsum(),
        "import_price_index":     105  + rng.normal(0, 1, n).cumsum(),
        "industrial_production":  102  + rng.normal(0, 0.5, n).cumsum(),
        "new_orders":             52   + rng.normal(0, 1, n).cumsum(),
        "capacity_utilization":   78   + rng.normal(0, 0.5, n).cumsum(),
        "unemployment_rate":      4.0  + rng.normal(0, 0.1, n).cumsum(),
        "trade_balance":          -80  + rng.normal(0, 5, n).cumsum(),
        "fear_index":             abs(rng.normal(30, 15, n)),
        "newsapi_disruption_ratio": rng.uniform(0.1, 0.5, n),
    })


# ─────────────────────────────────────────────────────────────
# Lag features
# ─────────────────────────────────────────────────────────────

class TestLagFeatures:

    def test_lag_columns_created(self, sample_df):
        result = compute_lag_features(sample_df, ["copper"])
        assert "copper_lag_1w" in result.columns
        assert "copper_lag_2w" in result.columns
        assert "copper_lag_4w" in result.columns

    def test_lag_1w_correct_value(self, sample_df):
        result = compute_lag_features(sample_df, ["copper"])
        # Row index 3: lag_1w should equal row 2's copper value
        assert result["copper_lag_1w"].iloc[3] == pytest.approx(
            result["copper"].iloc[2], rel=1e-5
        )

    def test_lag_first_rows_are_nan(self, sample_df):
        result = compute_lag_features(sample_df, ["copper"])
        # First row can't have a 1-week lag
        assert pd.isna(result["copper_lag_1w"].iloc[0])
        # First 3 rows can't have a 4-week lag
        assert result["copper_lag_4w"].iloc[:4].isna().all()

    def test_lag_missing_signal_skipped(self, sample_df):
        # Should not crash on missing signal
        result = compute_lag_features(sample_df, ["nonexistent_signal"])
        assert "nonexistent_signal_lag_1w" not in result.columns

    def test_lag_multiple_signals(self, sample_df):
        result = compute_lag_features(sample_df, ["copper", "wheat"])
        for sig in ["copper", "wheat"]:
            for w in [1, 2, 4]:
                assert f"{sig}_lag_{w}w" in result.columns

    def test_change_features_created(self, sample_df):
        result = compute_lag_changes(sample_df, ["copper"])
        assert "copper_change_1w" in result.columns
        assert "copper_change_4w" in result.columns

    def test_change_value_correct(self, sample_df):
        result = compute_lag_changes(sample_df, ["copper"])
        idx = 5
        expected = result["copper"].iloc[idx] - result["copper"].iloc[idx - 1]
        assert result["copper_change_1w"].iloc[idx] == pytest.approx(expected, rel=1e-5)

    def test_pct_change_created(self, sample_df):
        result = compute_pct_change(sample_df, ["copper"])
        assert "copper_pct_1w" in result.columns
        assert "copper_pct_4w" in result.columns

    def test_pct_change_value_reasonable(self, sample_df):
        result = compute_pct_change(sample_df, ["copper"])
        # Pct changes in a realistic price series should be small
        valid = result["copper_pct_1w"].dropna()
        assert valid.abs().max() < 50    # No single-week move > 50%


# ─────────────────────────────────────────────────────────────
# Rolling features
# ─────────────────────────────────────────────────────────────

class TestRollingFeatures:

    def test_rolling_mean_columns_created(self, sample_df):
        result = compute_rolling_mean(sample_df, ["copper"])
        assert "copper_mean_4w" in result.columns
        assert "copper_mean_8w" in result.columns

    def test_rolling_mean_smooths_values(self, sample_df):
        result = compute_rolling_mean(sample_df, ["copper"])
        # Rolling mean should be less volatile than raw signal
        raw_std  = sample_df["copper"].std()
        mean_std = result["copper_mean_4w"].dropna().std()
        assert mean_std < raw_std

    def test_rolling_std_columns_created(self, sample_df):
        result = compute_rolling_std(sample_df, ["copper"])
        assert "copper_std_4w" in result.columns
        assert "copper_std_8w" in result.columns

    def test_rolling_std_non_negative(self, sample_df):
        result = compute_rolling_std(sample_df, ["copper"])
        valid = result["copper_std_4w"].dropna()
        assert (valid >= 0).all()

    def test_rolling_momentum_columns_created(self, sample_df):
        result = compute_rolling_momentum(sample_df, ["copper"])
        assert "copper_momentum_4w" in result.columns

    def test_rolling_momentum_centered_around_zero(self, sample_df):
        result = compute_rolling_momentum(sample_df, ["copper"])
        valid = result["copper_momentum_4w"].dropna()
        # Momentum (deviation from mean) should be roughly centered
        assert abs(valid.mean()) < valid.std() * 2

    def test_rolling_zscore_columns_created(self, sample_df):
        result = compute_rolling_zscore(sample_df, ["copper"])
        assert "copper_zscore_4w" in result.columns

    def test_rolling_zscore_normalised(self, sample_df):
        result = compute_rolling_zscore(sample_df, ["copper"])
        valid = result["copper_zscore_4w"].dropna()
        # Z-scores should mostly be within -3 to +3
        assert (valid.abs() <= 4).mean() > 0.9


# ─────────────────────────────────────────────────────────────
# Cross features
# ─────────────────────────────────────────────────────────────

class TestCrossFeatures:

    @pytest.fixture
    def df_with_pct(self, sample_df):
        """Sample df with pct change and zscore features pre-computed."""
        df = compute_pct_change(sample_df, [
            "copper", "new_orders", "crude_oil_price",
            "industrial_production", "import_price_index", "trade_balance"
        ])
        df = compute_rolling_zscore(df, ["capacity_utilization", "unemployment_rate"])
        df = compute_rolling_momentum(df, [
            "copper", "wheat", "aluminum", "crude_oil_price", "natural_gas_price"
        ])
        df = compute_lag_features(df, ["fear_index"])
        return df

    def test_copper_pmi_stress_created(self, df_with_pct):
        df = compute_copper_pmi_stress(df_with_pct)
        assert "copper_pmi_stress" in df.columns

    def test_copper_pmi_stress_formula(self, df_with_pct):
        df = compute_copper_pmi_stress(df_with_pct)
        idx = 6
        expected = (
            df_with_pct["copper_pct_4w"].iloc[idx]
            - df_with_pct["new_orders_pct_4w"].iloc[idx]
        )
        if pd.notna(df["copper_pmi_stress"].iloc[idx]):
            assert df["copper_pmi_stress"].iloc[idx] == pytest.approx(expected, rel=1e-3)

    def test_multi_commodity_stress_range(self, df_with_pct):
        df = compute_multi_commodity_stress(df_with_pct)
        if "multi_commodity_stress" in df.columns:
            valid = df["multi_commodity_stress"].dropna()
            n_commodities = len([
                c for c in df_with_pct.columns
                if c.endswith("_momentum_4w") and
                any(c.startswith(p) for p in ["copper", "wheat", "aluminum", "crude_oil", "natural_gas"])
            ])
            assert (valid >= 0).all()
            assert (valid <= n_commodities).all()

    def test_fear_macro_alignment_created(self, df_with_pct):
        df = compute_copper_pmi_stress(df_with_pct)
        df = compute_fear_macro_alignment(df)
        assert "fear_macro_alignment" in df.columns

    def test_compute_all_cross_features_runs(self, df_with_pct):
        df = compute_all_cross_features(df_with_pct)
        assert isinstance(df, pd.DataFrame)
        assert len(df) == len(df_with_pct)


# ─────────────────────────────────────────────────────────────
# Pipeline integration
# ─────────────────────────────────────────────────────────────

class TestPipelineIntegration:

    def test_full_feature_pipeline_shape(self, sample_df):
        """End-to-end: run all features and verify output shape."""
        from src.features.pipeline import build_feature_matrix
        result = build_feature_matrix(sample_df)
        assert isinstance(result, pd.DataFrame)
        assert "date" in result.columns
        # Should have significantly more columns than raw signals
        assert len(result.columns) > len(sample_df.columns) * 3

    def test_full_feature_pipeline_no_all_nan_rows(self, sample_df):
        """No row should be entirely NaN after pipeline."""
        from src.features.pipeline import build_feature_matrix
        result = build_feature_matrix(sample_df)
        feat_cols = [c for c in result.columns if c != "date"]
        all_nan_rows = result[feat_cols].isna().all(axis=1).sum()
        assert all_nan_rows == 0

    def test_full_feature_pipeline_date_sorted(self, sample_df):
        """Output must be sorted by date ascending."""
        from src.features.pipeline import build_feature_matrix
        result = build_feature_matrix(sample_df)
        dates = result["date"].tolist()
        assert dates == sorted(dates)