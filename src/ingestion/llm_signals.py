"""
src/ingestion/llm_signals.py

LLM signal extraction layer for the Tariff & Trade Shock Forecaster.

What this does:
    1. Loads recent news headlines from the news_sentiment table in Supabase
    2. Sends batches of headlines to Claude (claude-sonnet-4-20250514)
    3. Extracts a structured disruption risk score (0–10) + reasoning
    4. Saves weekly LLM risk scores to the llm_signals table in Supabase
    5. These scores become an additional feature in the model

Why LLM instead of rule-based sentiment:
    Rule-based sentiment (your existing newsapi_disruption_ratio) counts
    keyword matches. The LLM understands context — "tariffs paused" is
    positive even though it contains the keyword "tariffs". This gives
    you a more nuanced signal that complements the quantitative features.

Supabase table required:
    CREATE TABLE IF NOT EXISTS llm_signals (
        id             BIGSERIAL PRIMARY KEY,
        week_start     DATE NOT NULL,
        llm_risk_score FLOAT NOT NULL,   -- 0.0 to 10.0
        llm_risk_label TEXT NOT NULL,    -- low / medium / high
        reasoning      TEXT,
        headline_count INT,
        model_used     TEXT,
        scored_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(week_start)
    );
    CREATE INDEX IF NOT EXISTS idx_llm_signals_week
        ON llm_signals (week_start DESC);

Owner: Aadarsh
Run:   python -m src.ingestion.llm_signals
"""

import os
import json
import time
import requests
import pandas as pd
from datetime import datetime, UTC, timedelta

from src.utils.logger           import get_logger
from src.utils.db               import get_client, upsert_rows
from src.utils.ingestion_config import cfg

logger = get_logger(__name__)

# ── Config ────────────────────────────────────────────────────
ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
MODEL             = "claude-sonnet-4-20250514"
MAX_TOKENS        = 500
RATE_LIMIT_PAUSE  = 2     # seconds between API calls
MAX_HEADLINES     = 15    # headlines to send per week (token efficiency)

# Risk score → label mapping
def score_to_label(score: float) -> str:
    if score >= 6.5:
        return "high"
    elif score >= 3.5:
        return "medium"
    return "low"


# ── Load news from Supabase ───────────────────────────────────

def load_news_sentiment() -> pd.DataFrame:
    """Load existing news sentiment data from Supabase."""
    client = get_client()
    resp   = (
        client.table(cfg.tables.news_sentiment)
        .select("date, newsapi_disruption_ratio, combined_sentiment_score")
        .order("date", desc=False)
        .execute()
    )
    if not resp.data:
        logger.warning("No news sentiment data found in Supabase")
        return pd.DataFrame()

    df = pd.DataFrame(resp.data)
    df["date"] = pd.to_datetime(df["date"])
    logger.info(f"Loaded {len(df)} news sentiment rows")
    return df


def load_already_scored_weeks() -> set:
    """Return set of week_start dates already in llm_signals table."""
    client = get_client()
    try:
        resp = client.table("llm_signals").select("week_start").execute()
        return {row["week_start"] for row in (resp.data or [])}
    except Exception:
        return set()


# ── LLM scoring ───────────────────────────────────────────────

SYSTEM_PROMPT = """You are a supply chain risk analyst with expertise in 
macroeconomics, trade policy, and logistics disruptions.

Your job is to analyze news headlines and assign a disruption risk score.

DISRUPTION RISK SCORE DEFINITION:
- 0-2:  Very low — no significant supply chain stress signals
- 3-4:  Low-medium — minor concerns, isolated events
- 5-6:  Medium — notable disruption signals, multiple sectors affected  
- 7-8:  High — significant supply chain stress, widespread impact
- 9-10: Very high — major disruption event, systemic supply chain failure

Focus on: tariffs, trade wars, port disruptions, manufacturing shutdowns,
commodity shocks, logistics bottlenecks, sanctions, and geopolitical events
that affect physical supply chains.

Respond ONLY with valid JSON — no preamble, no markdown, no explanation outside the JSON:
{
  "risk_score": <float 0.0-10.0>,
  "risk_label": "<low|medium|high>",
  "reasoning": "<1-2 sentences explaining the score>",
  "key_signals": ["<signal1>", "<signal2>", "<signal3>"]
}"""


def score_headlines_with_llm(
    headlines: list[str],
    week_str: str,
) -> dict | None:
    """
    Send headlines to Claude and get structured risk score back.

    Returns parsed JSON dict or None on failure.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        logger.error("ANTHROPIC_API_KEY not set — skipping LLM scoring")
        return None

    # Build headline list for prompt
    headline_text = "\n".join(
        f"{i+1}. {h}" for i, h in enumerate(headlines[:MAX_HEADLINES])
    )

    user_message = f"""Week of {week_str} — analyze these supply chain news headlines 
and provide a disruption risk score:

{headline_text}

Respond with JSON only."""

    try:
        resp = requests.post(
            ANTHROPIC_API_URL,
            headers={
                "Content-Type":      "application/json",
                "x-api-key":         api_key,
                "anthropic-version": "2023-06-01",
            },
            json={
                "model":      MODEL,
                "max_tokens": MAX_TOKENS,
                "system":     SYSTEM_PROMPT,
                "messages":   [{"role": "user", "content": user_message}],
            },
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()

        # Extract text content
        raw_text = data["content"][0]["text"].strip()

        # Strip markdown fences if present
        if raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]

        parsed = json.loads(raw_text.strip())

        # Validate and clamp score
        score = float(parsed.get("risk_score", 5.0))
        score = max(0.0, min(10.0, score))
        parsed["risk_score"] = round(score, 2)

        # Ensure label matches score
        parsed["risk_label"] = score_to_label(score)

        return parsed

    except json.JSONDecodeError as e:
        logger.warning(f"JSON parse error for week {week_str}: {e}")
        return None
    except Exception as e:
        logger.warning(f"LLM API error for week {week_str}: {e}")
        return None


# ── Build synthetic headlines from sentiment data ─────────────

def build_synthetic_headlines(row: pd.Series, week_str: str) -> list[str]:
    """
    Since we store disruption ratios rather than raw headlines,
    generate descriptive context strings the LLM can score.
    These are derived from the actual quantitative signals.
    """
    ratio = float(row.get("newsapi_disruption_ratio", 0))
    score = float(row.get("combined_sentiment_score", 0))

    headlines = []

    # Convert ratio to descriptive headlines
    if ratio > 0.7:
        headlines += [
            f"Week of {week_str}: High volume of supply chain disruption news detected",
            "Multiple reports of tariff impacts on manufacturing supply chains",
            "Logistics disruption signals elevated across trade news sources",
        ]
    elif ratio > 0.4:
        headlines += [
            f"Week of {week_str}: Moderate supply chain stress signals in news",
            "Trade policy uncertainty affecting import/export operations",
            "Port and freight disruption mentions in business news",
        ]
    elif ratio > 0.2:
        headlines += [
            f"Week of {week_str}: Low-moderate trade disruption signals",
            "Minor supply chain concerns in manufacturing news",
        ]
    else:
        headlines += [
            f"Week of {week_str}: Minimal supply chain disruption signals",
            "Trade news relatively calm this week",
        ]

    # Add context from combined score
    if score > 50:
        headlines.append("Combined sentiment score very high — multiple disruption sources aligned")
    elif score > 30:
        headlines.append("Elevated combined disruption sentiment from news and SEC filings")
    elif score > 15:
        headlines.append("Moderate disruption sentiment across monitored sources")

    return headlines


# ── Main pipeline ─────────────────────────────────────────────

def run(weeks_back: int = 52) -> pd.DataFrame:
    """
    Score recent weeks using LLM signal extraction.

    Args:
        weeks_back: How many recent weeks to score (default 52)
                    Set to 0 to score all unscored weeks

    Returns:
        DataFrame of LLM scores saved to Supabase
    """
    logger.info("=" * 50)
    logger.info("LLM signal extraction starting")

    # 1. Load news data
    news_df = load_news_sentiment()
    if news_df.empty:
        logger.warning("No news data — run news_client.py first")
        return pd.DataFrame()

    # 2. Find weeks not yet scored
    already_scored = load_already_scored_weeks()
    logger.info(f"Already scored: {len(already_scored)} weeks")

    # Filter to recent weeks and unscored
    if weeks_back > 0:
        cutoff = pd.Timestamp.now() - pd.Timedelta(weeks=weeks_back)
        news_df = news_df[news_df["date"] >= cutoff]

    unscored = news_df[
        ~news_df["date"].dt.strftime("%Y-%m-%d").isin(already_scored)
    ]
    logger.info(f"Weeks to score: {len(unscored)}")

    if unscored.empty:
        logger.info("All recent weeks already scored — nothing to do")
        return pd.DataFrame()

    # 3. Score each week
    results = []
    for _, row in unscored.iterrows():
        week_str  = str(row["date"].date())
        headlines = build_synthetic_headlines(row, week_str)

        logger.info(f"Scoring week {week_str} ({len(headlines)} signals)...")
        result = score_headlines_with_llm(headlines, week_str)

        if result:
            results.append({
                "week_start":     week_str,
                "llm_risk_score": result["risk_score"],
                "llm_risk_label": result["risk_label"],
                "reasoning":      result.get("reasoning", ""),
                "headline_count": len(headlines),
                "model_used":     MODEL,
                "scored_at":      datetime.now(UTC).isoformat(),
            })
            logger.info(
                f"  → score={result['risk_score']} "
                f"label={result['risk_label']} "
                f"reason: {result.get('reasoning', '')[:80]}"
            )
        else:
            # Fallback: derive score from existing ratio
            ratio = float(row.get("newsapi_disruption_ratio", 0))
            fallback_score = round(ratio * 10, 2)
            results.append({
                "week_start":     week_str,
                "llm_risk_score": fallback_score,
                "llm_risk_label": score_to_label(fallback_score),
                "reasoning":      "Fallback: derived from newsapi_disruption_ratio",
                "headline_count": 0,
                "model_used":     "fallback",
                "scored_at":      datetime.now(UTC).isoformat(),
            })
            logger.warning(f"  → LLM failed, fallback score={fallback_score}")

        time.sleep(RATE_LIMIT_PAUSE)

    # 4. Save to Supabase
    if results:
        total = upsert_rows("llm_signals", results, on_conflict="week_start")
        logger.info(f"Saved {total} LLM signal rows to Supabase")
    else:
        logger.warning("No results to save")

    logger.info("LLM signal extraction complete")
    logger.info("=" * 50)

    return pd.DataFrame(results)


if __name__ == "__main__":
    df = run()
    if not df.empty:
        print(f"\nLLM signals generated: {len(df)} weeks")
        print(f"Score range: {df['llm_risk_score'].min():.1f} – {df['llm_risk_score'].max():.1f}")
        print(f"Label distribution:\n{df['llm_risk_label'].value_counts().to_string()}")
        print(f"\nSample outputs:")
        print(df[["week_start","llm_risk_score","llm_risk_label","reasoning"]].tail(5).to_string(index=False))