"""
tests/test_keys.py

Validates that all API keys are loaded correctly from .env
and that each service is actually reachable with those keys.
"""

import pytest
import requests
from src.utils.config import config


# ─────────────────────────────────────────────────────────────
# 1. Config loading — are keys present in .env at all?
# ─────────────────────────────────────────────────────────────

class TestConfigLoading:

    def test_fred_key_is_set(self):
        assert config.FRED_API_KEY, (
            "FRED_API_KEY is empty. "
            "Get your free key at https://fred.stlouisfed.org/docs/api/api_key.html "
            "and add it to your .env file."
        )

    def test_alpha_vantage_key_is_set(self):
        assert config.ALPHA_VANTAGE_API_KEY, (
            "ALPHA_VANTAGE_API_KEY is empty. "
            "Get your free key at https://www.alphavantage.co/support/#api-key "
            "and add it to your .env file."
        )

    def test_newsapi_key_is_set(self):
        assert config.NEWSAPI_KEY, (
            "NEWSAPI_KEY is empty. "
            "Get your free key at https://newsapi.org/register "
            "and add it to your .env file."
        )

    def test_noaa_key_is_set(self):
        assert config.NOAA_API_KEY, (
            "NOAA_API_KEY is empty. "
            "Get your free token at https://www.ncdc.noaa.gov/cdo-web/token "
            "and add it to your .env file."
        )

    def test_supabase_url_is_set(self):
        assert config.SUPABASE_URL, (
            "SUPABASE_URL is empty. "
            "Get it from your Supabase project: Settings → API → Project URL."
        )

    def test_supabase_key_is_set(self):
        assert config.SUPABASE_KEY, (
            "SUPABASE_KEY is empty. "
            "Get it from your Supabase project: Settings → API → anon/public key."
        )

    def test_supabase_url_format(self):
        """URL must start with https:// and contain supabase.co"""
        url = config.SUPABASE_URL
        if url:
            assert url.startswith("https://"), (
                f"SUPABASE_URL must start with https:// — got: {url}"
            )
            assert "supabase.co" in url, (
                f"SUPABASE_URL doesn't look right — got: {url}"
            )

    def test_no_placeholder_values(self):
        """Make sure nobody left the .env.example placeholder text in .env"""
        placeholders = [
            "your_fred_key_here",
            "your_alpha_vantage_key_here",
            "your_newsapi_key_here",
            "your_supabase_anon_key_here",
            "https://your-project-ref.supabase.co",
        ]
        all_values = [
            config.FRED_API_KEY,
            config.ALPHA_VANTAGE_API_KEY,
            config.NEWSAPI_KEY,
            config.SUPABASE_URL,
            config.SUPABASE_KEY,
        ]
        for val in all_values:
            for placeholder in placeholders:
                assert val != placeholder, (
                    f"Found placeholder value in .env: '{val}'. "
                    "Replace it with your real key."
                )


# ─────────────────────────────────────────────────────────────
# 2. Live connectivity — do the keys actually work?
# ─────────────────────────────────────────────────────────────

class TestLiveConnectivity:

    def test_fred_api_live(self):
        """
        Makes a real call to FRED with your key.
        Fetches a single observation to confirm the key is valid.
        """
        if not config.FRED_API_KEY:
            pytest.skip("FRED_API_KEY not set — skipping live test")

        resp = requests.get(
            "https://api.stlouisfed.org/fred/series/observations",
            params={
                "series_id":         "INDPRO",
                "api_key":           config.FRED_API_KEY,
                "file_type":         "json",
                "observation_start": "2026-01-01",
                "limit":             1,
            },
            timeout=10,
        )
        assert resp.status_code == 200, (
            f"FRED API returned {resp.status_code}. Check your key."
        )
        data = resp.json()
        assert "observations" in data, (
            f"FRED response missing 'observations'. Got: {list(data.keys())}"
        )
        assert len(data["observations"]) > 0, (
            "FRED returned 0 observations. Key may be invalid."
        )
        print(f"\n  FRED OK — got {len(data['observations'])} observation(s)")

    def test_alpha_vantage_api_live(self):
        """
        Makes a real call to Alpha Vantage.
        Fetches copper price (1 data point) to confirm key is valid.
        """
        if not config.ALPHA_VANTAGE_API_KEY:
            pytest.skip("ALPHA_VANTAGE_API_KEY not set — skipping live test")

        resp = requests.get(
            "https://www.alphavantage.co/query",
            params={
                "function": "COPPER",
                "interval": "monthly",
                "apikey":   config.ALPHA_VANTAGE_API_KEY,
            },
            timeout=10,
        )
        assert resp.status_code == 200, (
            f"Alpha Vantage returned {resp.status_code}. Check your key."
        )
        data = resp.json()

        # Rate limit message means key is valid but quota hit
        if "Note" in data or "Information" in data:
            msg = data.get("Note", data.get("Information", ""))
            pytest.skip(f"Alpha Vantage rate limit hit — key is valid. Message: {msg}")

        assert "data" in data, (
            f"Alpha Vantage response missing 'data'. Got: {list(data.keys())}. "
            "Key may be invalid."
        )
        print(f"\n  Alpha Vantage OK — got {len(data['data'])} data points")

    def test_newsapi_live(self):
        """
        Makes a real call to NewsAPI.
        Fetches 1 headline to confirm key is valid.
        """
        if not config.NEWSAPI_KEY:
            pytest.skip("NEWSAPI_KEY not set — skipping live test")

        resp = requests.get(
            "https://newsapi.org/v2/everything",
            params={
                "q":        "supply chain",
                "pageSize": 1,
                "language": "en",
                "apiKey":   config.NEWSAPI_KEY,
            },
            timeout=10,
        )
        assert resp.status_code == 200, (
            f"NewsAPI returned {resp.status_code}. "
            f"Body: {resp.text[:200]}. Check your key."
        )
        data = resp.json()
        assert data.get("status") == "ok", (
            f"NewsAPI returned status '{data.get('status')}'. "
            f"Message: {data.get('message', 'none')}. Key may be invalid."
        )
        print(f"\n  NewsAPI OK — {data.get('totalResults', 0)} total articles available")

    def test_gdelt_api_live(self):
        """
        GDELT is optional — skipped if unreachable.
        We use NewsAPI + SEC EDGAR as primary text signals instead.
        """
        try:
            resp = requests.get(
                "https://api.gdeltproject.org/api/v2/doc/doc",
                params={
                    "query":      "supply chain tariff",
                    "mode":       "artlist",
                    "maxrecords": 1,
                    "format":     "json",
                },
                timeout=10,
            )
            if resp.status_code in (200, 429):
                print(f"\n  GDELT reachable (status {resp.status_code}) — optional source")
            else:
                print(f"\n  GDELT returned {resp.status_code} — skipping, not critical")
        except Exception:
            pytest.skip("GDELT unreachable from this network — not critical, using NewsAPI + SEC EDGAR instead")

    def test_supabase_live(self):
        """
        Connects to Supabase and checks the news_sentiment table exists.
        """
        if not config.SUPABASE_URL or not config.SUPABASE_KEY:
            pytest.skip("Supabase credentials not set — skipping live test")

        from supabase import create_client
        client = create_client(config.SUPABASE_URL, config.SUPABASE_KEY)

        # Try to read 1 row from news_sentiment — will fail if table doesn't exist
        try:
            resp = client.table("news_sentiment").select("id").limit(1).execute()
            print(f"\n  Supabase OK — news_sentiment table exists")
        except Exception as e:
            pytest.fail(
                f"Supabase connected but query failed: {e}\n"
                "Did you run supabase/schema.sql in the SQL Editor?"
            )

    def test_noaa_api_live(self):
        """
        Makes a real call to NOAA CDO API.
        Fetches 1 data point to confirm token is valid.
        """
        if not config.NOAA_API_KEY:
            pytest.skip("NOAA_API_KEY not set — skipping live test")

        resp = requests.get(
            "https://www.ncdc.noaa.gov/cdo-web/api/v2/data",
            headers={"token": config.NOAA_API_KEY},
            params={
                "datasetid":  "GHCND",
                "locationid": "CITY:US360019",  # New York City
                "datatypeid": "TMAX",
                "startdate":  "2026-01-01",
                "enddate":    "2026-01-02",
                "limit":      1,
            },
            timeout=10,
        )
        assert resp.status_code == 200, (
            f"NOAA API returned {resp.status_code}. Check your token."
        )
        data = resp.json()
        assert "results" in data, (
            f"NOAA response missing 'results'. Got: {list(data.keys())}"
        )
        print(f"\n  NOAA OK — got {len(data['results'])} result(s)")

    def test_polymarket_api_live(self):
        """
        Polymarket needs no key — verify public endpoint is reachable.
        """
        resp = requests.get(
            "https://gamma-api.polymarket.com/markets",
            params={"limit": 1, "active": "true"},
            timeout=10,
        )
        assert resp.status_code == 200, (
            f"Polymarket API returned {resp.status_code}. No key needed — check network."
        )
        data = resp.json()
        assert isinstance(data, list), (
            f"Expected list from Polymarket, got: {type(data)}"
        )
        print(f"\n  Polymarket OK — public API is reachable")


# ─────────────────────────────────────────────────────────────
# 3. Supabase table structure — did you run schema.sql?
# ─────────────────────────────────────────────────────────────

class TestSupabaseTables:

    @pytest.fixture(autouse=True)
    def skip_if_no_creds(self):
        if not config.SUPABASE_URL or not config.SUPABASE_KEY:
            pytest.skip("Supabase credentials not set")

    def _client(self):
        from supabase import create_client
        return create_client(config.SUPABASE_URL, config.SUPABASE_KEY)

    def test_macro_signals_table_exists(self):
        resp = self._client().table("macro_signals").select("id").limit(1).execute()
        assert resp is not None, "macro_signals table not found — run schema.sql"
        print("\n  macro_signals table OK")

    def test_market_prices_table_exists(self):
        resp = self._client().table("market_prices").select("id").limit(1).execute()
        assert resp is not None, "market_prices table not found — run schema.sql"
        print("\n  market_prices table OK")

    def test_fear_index_table_exists(self):
        resp = self._client().table("fear_index").select("id").limit(1).execute()
        assert resp is not None, "fear_index table not found — run schema.sql"
        print("\n  fear_index table OK")

    def test_news_sentiment_table_exists(self):
        resp = self._client().table("news_sentiment").select("id").limit(1).execute()
        assert resp is not None, "news_sentiment table not found — run schema.sql"
        print("\n  news_sentiment table OK")