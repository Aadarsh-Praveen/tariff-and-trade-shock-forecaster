"""
src/utils/db.py

Central Supabase client — one connection shared across the whole project.
Every module imports get_client() from here. Nobody creates their own connection.

Tables used:
  - macro_signals   : FRED macro data (date, signal_name, value, source)
  - market_prices   : Alpha Vantage commodities + ETFs (date, asset_name, price, asset_type)
  - fear_index      : Polymarket weekly fear score (date, fear_score, market_count, total_volume)
  - reddit_sentiment: Reddit weekly signals (date, disruption_post_count, disruption_ratio, ...)
"""

import os
import httpx
from supabase import create_client, Client
from src.utils.config import config
from src.utils.logger import get_logger

logger = get_logger(__name__)

_client: Client | None = None


def get_client() -> Client:
    global _client
    if _client is None:
        if not config.SUPABASE_URL or not config.SUPABASE_KEY:
            raise ValueError(
                "SUPABASE_URL and SUPABASE_KEY must be set in .env"
            )
        
        os.environ['HTTPX_LOG_LEVEL'] = 'warning'
        
        _client = create_client(config.SUPABASE_URL, config.SUPABASE_KEY)
        
        try:
            old_session = _client.postgrest.session
            _client.postgrest.session = httpx.Client(
                http2=False,
                limits=httpx.Limits(
                    max_connections=100,
                    max_keepalive_connections=20
                ),
                timeout=httpx.Timeout(30.0),
                base_url=str(old_session._base_url) if hasattr(old_session, '_base_url') else None,
                headers=old_session.headers if hasattr(old_session, 'headers') else {},
            )
            logger.info(f"Supabase client connected to {config.SUPABASE_URL} (HTTP/1.1 forced)")
        except Exception as e:
            logger.warning(f"Could not override HTTP client, using defaults: {e}")
            logger.info(f"Supabase client connected to {config.SUPABASE_URL}")
    
    return _client


def upsert_rows(table: str, rows: list[dict], on_conflict: str = None) -> int:
    if not rows:
        logger.warning(f"upsert_rows called with empty list for '{table}' — skipping")
        return 0
    client = get_client()
    query = client.table(table)
    if on_conflict:
        query = query.upsert(rows, on_conflict=on_conflict)
    else:
        query = query.upsert(rows)
    query.execute()
    logger.info(f"Upserted {len(rows)} rows into '{table}'")
    return len(rows)


def fetch_latest(table: str, days: int = 30) -> list[dict]:
    from datetime import datetime, timedelta
    cutoff = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
    client = get_client()
    resp = (
        client.table(table)
        .select("*")
        .gte("date", cutoff)
        .order("date", desc=True)
        .execute()
    )
    return resp.data or []


def fetch_signal_history(signal_name: str, weeks: int = 8) -> list[dict]:
    from datetime import datetime, timedelta
    cutoff = (datetime.utcnow() - timedelta(weeks=weeks)).strftime("%Y-%m-%d")
    client = get_client()
    resp = (
        client.table("macro_signals")
        .select("date, value")
        .eq("signal_name", signal_name)
        .gte("date", cutoff)
        .order("date", desc=False)
        .execute()
    )
    return resp.data or []