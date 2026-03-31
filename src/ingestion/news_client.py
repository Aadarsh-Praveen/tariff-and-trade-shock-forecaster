"""
src/ingestion/news_client.py

Fetches disruption-related news from:
  1. NewsAPI   — real headlines (key required, free tier)
  2. SEC EDGAR — supply chain risk filings (no key needed)

All URLs, queries, keywords, and weights come from
configs/ingestion_config.yaml. No hardcoded values in this file.

Owner: Aadarsh
Run:   python -m src.ingestion.news_client
"""

import requests
import pandas as pd
from datetime import datetime, timedelta
from src.utils.config import config
from src.utils.logger import get_logger
from src.utils.db import upsert_rows
from src.utils.ingestion_config import cfg

logger = get_logger(__name__)


# ─────────────────────────────────────────────────────────────
# NewsAPI
# ─────────────────────────────────────────────────────────────

def _is_disruption_article(title: str, description: str) -> bool:
    """Return True if article matches any disruption keyword from config."""
    text = (title + " " + description).lower()
    return any(kw.lower() in text for kw in cfg.newsapi.disruption_keywords)


def fetch_newsapi_articles() -> pd.DataFrame:
    """
    Fetch news articles for all queries in ingestion_config.yaml.

    Returns:
        Deduplicated DataFrame with columns
        [date, title, description, source, is_disruption]
    """
    days_back = cfg.newsapi.days_back
    from_date = (datetime.now(timezone.utc) - timedelta(days=days_back)).strftime("%Y-%m-%d")
    to_date   = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    all_items = []

    for query in cfg.newsapi.queries:
        try:
            logger.info(f"NewsAPI query: '{query}'")
            resp = requests.get(
                cfg.newsapi.base_url,
                params={
                    "q":        query,
                    "from":     from_date,
                    "to":       to_date,
                    "language": cfg.newsapi.language,
                    "sortBy":   cfg.newsapi.sort_by,
                    "pageSize": cfg.newsapi.page_size,
                    "apiKey":   config.NEWSAPI_KEY,
                },
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()

            if data.get("status") != "ok":
                logger.warning(f"NewsAPI error: {data.get('message', 'unknown')}")
                continue

            articles = data.get("articles", [])
            all_items.extend(articles)
            logger.info(f"  -> {len(articles)} articles")

        except Exception as e:
            logger.warning(f"Skipping NewsAPI query '{query}': {e}")

    if not all_items:
        logger.warning("No articles fetched from NewsAPI")
        return pd.DataFrame()

    rows = [
        {
            "date":        a.get("publishedAt", "")[:10],
            "title":       a.get("title", "") or "",
            "description": a.get("description", "") or "",
            "source":      a.get("source", {}).get("name", ""),
        }
        for a in all_items
    ]

    df = pd.DataFrame(rows).drop_duplicates(subset=["title"])
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.dropna(subset=["date"])
    df["is_disruption"] = df.apply(
        lambda r: _is_disruption_article(r["title"], r["description"]), axis=1
    )

    logger.info(
        f"NewsAPI total: {len(df)} | disruption-tagged: {df['is_disruption'].sum()}"
    )
    return df.sort_values("date").reset_index(drop=True)


def compute_newsapi_weekly(articles_df: pd.DataFrame) -> pd.DataFrame:
    """Aggregate articles into weekly disruption signals."""
    if articles_df.empty:
        return pd.DataFrame()

    df = articles_df.copy()
    df["week"] = pd.to_datetime(df["date"]).dt.to_period("W").dt.start_time

    total   = df.groupby("week").size().rename("newsapi_article_count")
    disrupt = (
        df[df["is_disruption"]]
        .groupby("week")
        .size()
        .rename("newsapi_disruption_count")
    )

    weekly = pd.concat([total, disrupt], axis=1).fillna(0).reset_index()
    weekly = weekly.rename(columns={"week": "date"})
    weekly["newsapi_disruption_ratio"] = (
        weekly["newsapi_disruption_count"]
        / weekly["newsapi_article_count"].replace(0, 1)
    ).round(4)

    return weekly.sort_values("date").reset_index(drop=True)


# ─────────────────────────────────────────────────────────────
# SEC EDGAR
# ─────────────────────────────────────────────────────────────

def fetch_sec_filings() -> pd.DataFrame:
    """
    Fetch SEC filings mentioning supply chain risk.
    Queries and settings come from ingestion_config.yaml.

    Returns:
        DataFrame with columns [date, company, form_type]
    """
    days_back  = cfg.sec_edgar.days_back
    start_date = (datetime.now(timezone.utc) - timedelta(days=days_back)).strftime("%Y-%m-%d")
    end_date   = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    all_hits   = []

    headers = {
        "User-Agent":       cfg.sec_edgar.user_agent,
        "Accept-Encoding":  "gzip, deflate",
    }

    for query in cfg.sec_edgar.queries:
        try:
            logger.info(f"SEC EDGAR query: '{query}'")
            resp = requests.get(
                cfg.sec_edgar.search_url,
                params={
                    "q":         query,
                    "dateRange": "custom",
                    "startdt":   start_date,
                    "enddt":     end_date,
                    "forms":     cfg.sec_edgar.form_types,
                    "hits.hits.total.value": cfg.sec_edgar.results_per_query,
                },
                headers=headers,
                timeout=20,
            )
            resp.raise_for_status()
            data = resp.json()
            hits = data.get("hits", {}).get("hits", [])

            for hit in hits:
                src = hit.get("_source", {})
                all_hits.append({
                    "date":      src.get("file_date", "")[:10],
                    "company":   (src.get("display_names") or ["Unknown"])[0],
                    "form_type": src.get("form_type", ""),
                })
            logger.info(f"  -> {len(hits)} filings")

        except Exception as e:
            logger.warning(f"Skipping SEC query '{query}': {e}")

    if not all_hits:
        logger.warning("No SEC filings fetched")
        return pd.DataFrame()

    df = pd.DataFrame(all_hits).drop_duplicates()
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.dropna(subset=["date"])
    logger.info(f"SEC EDGAR total: {len(df)} filings")
    return df.sort_values("date").reset_index(drop=True)


def compute_sec_weekly(filings_df: pd.DataFrame) -> pd.DataFrame:
    """Aggregate filings into weekly mention counts."""
    if filings_df.empty:
        return pd.DataFrame()

    df = filings_df.copy()
    df["week"] = pd.to_datetime(df["date"]).dt.to_period("W").dt.start_time
    weekly = (
        df.groupby("week").size()
        .rename("sec_mention_count")
        .reset_index()
        .rename(columns={"week": "date"})
    )
    return weekly.sort_values("date").reset_index(drop=True)


# ─────────────────────────────────────────────────────────────
# Combine and save
# ─────────────────────────────────────────────────────────────

def combine_signals(
    newsapi_weekly: pd.DataFrame,
    sec_weekly: pd.DataFrame,
) -> pd.DataFrame:
    """
    Merge NewsAPI and SEC weekly signals.
    Weights come from ingestion_config.yaml → sentiment_scoring.

    Returns:
        Merged weekly DataFrame ready to upsert into Supabase
    """
    frames = []
    if not newsapi_weekly.empty:
        frames.append(newsapi_weekly.set_index("date"))
    if not sec_weekly.empty:
        frames.append(sec_weekly.set_index("date"))

    if not frames:
        logger.warning("No data from either NewsAPI or SEC EDGAR")
        return pd.DataFrame()

    combined = pd.concat(frames, axis=1).fillna(0).reset_index()

    for col in [
        "newsapi_article_count", "newsapi_disruption_count",
        "newsapi_disruption_ratio", "sec_mention_count",
    ]:
        if col not in combined.columns:
            combined[col] = 0

    # Weights from config
    w_news = cfg.sentiment_scoring.newsapi_weight
    w_sec  = cfg.sentiment_scoring.sec_weight
    cap    = max(combined["sec_mention_count"].max(), 1)
    sec_normalise_cap = cfg.sentiment_scoring.sec_normalise_cap

    sec_norm = (combined["sec_mention_count"] / sec_normalise_cap * 100).clip(0, 100)

    combined["combined_sentiment_score"] = (
        combined["newsapi_disruption_ratio"] * 100 * w_news +
        sec_norm * w_sec
    ).round(2)

    return combined.sort_values("date").reset_index(drop=True)


def save_to_db(combined_df: pd.DataFrame) -> int:
    """
    Upsert combined signals into Supabase.
    Table name comes from ingestion_config.yaml → tables.news_sentiment.
    """
    if combined_df.empty:
        return 0

    rows = []
    for _, row in combined_df.iterrows():
        rows.append({
            "date":                     str(row["date"].date()),
            "newsapi_article_count":    int(row.get("newsapi_article_count", 0)),
            "newsapi_disruption_count": int(row.get("newsapi_disruption_count", 0)),
            "newsapi_disruption_ratio": round(float(row.get("newsapi_disruption_ratio", 0)), 4),
            "sec_mention_count":        int(row.get("sec_mention_count", 0)),
            "combined_sentiment_score": round(float(row.get("combined_sentiment_score", 0)), 2),
        })

    return upsert_rows(cfg.tables.news_sentiment, rows, on_conflict="date")


def run():
    config.validate()

    articles       = fetch_newsapi_articles()
    newsapi_weekly = compute_newsapi_weekly(articles)

    filings    = fetch_sec_filings()
    sec_weekly = compute_sec_weekly(filings)

    combined = combine_signals(newsapi_weekly, sec_weekly)
    total    = save_to_db(combined)

    logger.info(f"News ingestion complete — {total} rows in Supabase")
    return combined


if __name__ == "__main__":
    run()