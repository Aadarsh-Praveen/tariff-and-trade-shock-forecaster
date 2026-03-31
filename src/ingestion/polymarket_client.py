"""
src/ingestion/polymarket_client.py

Fetches trade/supply chain disruption prediction markets from Polymarket
and writes a weekly fear index into Supabase.

All URLs, keywords, and limits come from configs/ingestion_config.yaml.
No API key required — Polymarket CLOB API is public.

Owner: Aadarsh
Run:   python -m src.ingestion.polymarket_client
"""

import json
import requests
import pandas as pd
from datetime import datetime, timedelta, timezone
from src.utils.logger import get_logger
from src.utils.db import upsert_rows
from src.utils.ingestion_config import cfg

logger = get_logger(__name__)


def _parse_prices(raw_prices) -> tuple:
    """
    Safely parse outcomePrices from Polymarket API.

    The API returns prices in two possible formats:
      - A Python list:    ["0.72", "0.28"]
      - A JSON string:    '["0.72", "0.28"]'

    Both are handled here. Returns (0.0, 0.0) on any parse failure.

    Returns:
        (yes_price, no_price) as floats
    """
    try:
        if isinstance(raw_prices, list):
            prices = raw_prices
        elif isinstance(raw_prices, str):
            prices = json.loads(raw_prices)
        else:
            return 0.0, 0.0

        yes = float(prices[0]) if len(prices) > 0 and prices[0] else 0.0
        no  = float(prices[1]) if len(prices) > 1 and prices[1] else 0.0
        return yes, no

    except (ValueError, TypeError, json.JSONDecodeError):
        return 0.0, 0.0


def _is_disruption(question: str) -> bool:
    """Return True if the market question matches any disruption keyword from config."""
    q = question.lower()
    return any(kw.lower() in q for kw in cfg.polymarket.disruption_keywords)


def fetch_active_markets() -> pd.DataFrame:
    """
    Fetch active Polymarket markets and filter for disruption-related ones.

    Returns:
        DataFrame with columns [market_id, question, end_date,
                                 yes_price, no_price, volume_usd, fetched_at]
    """
    try:
        logger.info("Fetching active Polymarket markets")
        resp = requests.get(
            f"{cfg.polymarket.gamma_base_url}/markets",
            params={
                "limit":  cfg.polymarket.markets_limit,
                "active": "true",
                "closed": "false",
            },
            timeout=15,
        )
        resp.raise_for_status()
        markets = resp.json()

        records = []
        for m in markets:
            question = m.get("question") or ""
            if not _is_disruption(question):
                continue

            yes_price, no_price = _parse_prices(m.get("outcomePrices"))

            records.append({
                "market_id":  m.get("id"),
                "question":   question,
                "end_date":   m.get("endDate"),
                "yes_price":  yes_price,
                "no_price":   no_price,
                "volume_usd": float(m.get("volume") or 0),
                "fetched_at": datetime.now(timezone.utc).isoformat(),
            })

        df = pd.DataFrame(records) if records else pd.DataFrame()
        logger.info(f"Found {len(df)} disruption-related active markets")
        return df

    except Exception as e:
        logger.error(f"Failed to fetch Polymarket markets: {e}")
        raise


def compute_fear_index(markets_df: pd.DataFrame):
    """
    Compute today's disruption fear index from active markets.
    Fear index = volume-weighted average YES price scaled to 0-100.

    Returns:
        Row dict ready for Supabase upsert, or None if no data
    """
    if markets_df.empty:
        logger.warning("No active disruption markets found — fear index skipped")
        return None

    df = markets_df[markets_df["volume_usd"] > 0].copy()
    if df.empty:
        logger.warning("All markets have zero volume — fear index skipped")
        return None

    total_volume   = df["volume_usd"].sum()
    weighted_price = (df["yes_price"] * df["volume_usd"]).sum() / total_volume

    result = {
        "date":         datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "fear_score":   round(weighted_price * 100, 2),
        "market_count": int(len(df)),
        "total_volume": round(float(total_volume), 2),
    }
    logger.info(
        f"Fear index: {result['fear_score']} "
        f"from {result['market_count']} markets, "
        f"${result['total_volume']:,.0f} volume"
    )
    return result


def fetch_historical_fear_index() -> list:
    """
    Attempt to build historical weekly fear index from closed markets.
    Returns empty list gracefully if no historical data is available —
    Polymarket historical data through the gamma API is limited.
    """
    days_back = cfg.polymarket.historical_days_back
    try:
        logger.info(f"Fetching historical Polymarket data ({days_back} days)")
        resp = requests.get(
            f"{cfg.polymarket.gamma_base_url}/markets",
            params={"limit": 500, "closed": "true", "active": "false"},
            timeout=20,
        )
        resp.raise_for_status()
        markets = resp.json()

        cutoff  = datetime.now(timezone.utc) - timedelta(days=days_back)
        records = []

        for m in markets:
            question = m.get("question") or ""
            if not _is_disruption(question):
                continue

            end_str = m.get("endDate")
            if not end_str:
                continue
            try:
                end_dt = datetime.fromisoformat(end_str.replace("Z", "+00:00"))
                if end_dt < cutoff:
                    continue
            except ValueError:
                continue

            yes_price, _ = _parse_prices(m.get("outcomePrices"))
            records.append({
                "date":       pd.Timestamp(end_str[:10]),
                "yes_price":  yes_price,
                "volume_usd": float(m.get("volume") or 0),
            })

        if not records:
            logger.warning(
                "No historical disruption markets found — "
                "this is normal. Today's active markets will still be captured."
            )
            return []

        df = pd.DataFrame(records)
        df = df[df["volume_usd"] > 0]
        df["week"] = df["date"].dt.to_period("W").dt.start_time

        rows = []
        for week, g in df.groupby("week"):
            total_vol  = g["volume_usd"].sum()
            fear_score = round(
                (g["yes_price"] * g["volume_usd"]).sum() / total_vol * 100, 2
            )
            rows.append({
                "date":         str(week.date()),
                "fear_score":   fear_score,
                "market_count": int(len(g)),
                "total_volume": round(float(total_vol), 2),
            })

        rows.sort(key=lambda r: r["date"])
        logger.info(f"Historical fear index: {len(rows)} weekly points")
        return rows

    except Exception as e:
        logger.error(f"Failed to build historical fear index: {e}")
        return []


def save_to_db(rows: list) -> int:
    """Upsert fear index rows into Supabase fear_index table."""
    return upsert_rows(cfg.tables.fear_index, rows, on_conflict="date")


def run():
    """Entry point — fetch historical + today's fear index, save to Supabase."""
    historical = fetch_historical_fear_index()
    total      = save_to_db(historical)

    markets   = fetch_active_markets()
    today_row = compute_fear_index(markets)
    if today_row:
        save_to_db([today_row])
        total += 1
    else:
        logger.warning("No fear index data saved today.")

    logger.info(f"Polymarket ingestion complete — {total} rows in Supabase")
    return historical


if __name__ == "__main__":
    run()