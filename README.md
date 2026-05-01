# 📦 Tariff & Trade Shock Forecaster

> **Real-time supply chain disruption risk forecasting using macro signals, commodity prices, trade data, news sentiment, and prediction markets.**

[![Live App](https://img.shields.io/badge/Live%20App-Vercel-black?style=for-the-badge&logo=vercel)](https://tariff-and-trade-shock-forecaster.vercel.app)
[![API Docs](https://img.shields.io/badge/API%20Docs-Cloud%20Run-blue?style=for-the-badge&logo=google-cloud)](https://tariff-forecaster-1012423274591.us-central1.run.app/docs)


---

## 🌐 Live Deployment

| Component | URL |
|-----------|-----|
| **Frontend Dashboard** | https://tariff-and-trade-shock-forecaster.vercel.app |
| **Backend API** | https://tariff-forecaster-1012423274591.us-central1.run.app |
| **API Docs (Swagger)** | https://tariff-forecaster-1012423274591.us-central1.run.app/docs |

---

## 🎯 What It Does

The Tariff & Trade Shock Forecaster predicts the probability of supply chain disruption **3 weeks ahead** using a LightGBM ensemble trained on 6 years of weekly macro data.

### Key Features
- **Real-time risk scoring** — updated weekly from live data feeds
- **SHAP explainability** — understand exactly which signals are driving risk
- **Historical event analysis** — compare current conditions to COVID-19, Suez Canal blockage, Ukraine invasion, and the 2025 tariff wave
- **Sector breakdown** — separate risk scores for Energy, Manufacturing, and Trade
- **Custom commodity tracker** — build your own risk score from selected commodities
- **12-week forward forecast** — Prophet-powered trend projection
- **AI risk assessment** — Claude-powered plain English disruption narrative
- **Alert system** — subscribe to email alerts when risk exceeds your threshold

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Data Sources                         │
│  FRED · Alpha Vantage · NOAA · NewsAPI · Polymarket     │
│  SEC EDGAR · Supabase (feature store)                   │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                  ML Pipeline (src/)                     │
│  Feature Engineering → LightGBM + XGBoost training      │
│  SHAP Analysis → Prophet Forecasting → Claude LLM       │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│              FastAPI Backend (app/api.py)               │
│  Deployed on Google Cloud Run (us-central1)             │
│  15+ endpoints · CORS enabled · Auto-scaling            │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│           Next.js Frontend (frontend/)                  │
│  Deployed on Vercel · Dashboard · Charts · SHAP viz     │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Model Performance

| Metric | Score |
|--------|-------|
| **F1 Score** | 0.984 |
| **Precision** | 96.8% |
| **Recall** | 100% |
| **Training weeks** | 313 |
| **Test weeks** | 62 |
| **Features** | 47 signals |
| **Data sources** | 5 live feeds |

---

## 🚀 API Endpoints

### Risk
| Endpoint | Description |
|----------|-------------|
| `GET /risk/current` | Latest disruption risk score |
| `GET /risk/history` | Full prediction history |
| `GET /risk/forecast` | 12-week forward forecast |
| `GET /risk/sectors` | Risk by sector (Energy, Manufacturing, Trade) |
| `GET /risk/custom` | Custom risk for selected commodities |
| `GET /risk/compare/{event}` | Compare to historical disruption |

### Signals & Model
| Endpoint | Description |
|----------|-------------|
| `GET /signals/top` | Top 10 driving signals |
| `GET /signals/llm-reasoning` | Claude AI risk narrative |
| `GET /model/metrics` | Model performance metrics |
| `GET /model/features` | Top 20 feature importances |

### SHAP
| Endpoint | Description |
|----------|-------------|
| `GET /shap/waterfall/{date}` | SHAP waterfall for a specific date |
| `GET /shap/summary` | Global feature importance |
| `GET /shap/events` | Named historical disruption events |

### Dashboard
| Endpoint | Description |
|----------|-------------|
| `GET /dashboard/summary` | Single-call dashboard data |

---

## 🔑 Key Historical Events Analyzed

| Event | Date | Risk Score |
|-------|------|-----------|
| COVID-19 peak supply shock | 2020-03-20 | High |
| Suez Canal blockage | 2021-03-26 | High |
| Ukraine invasion week 1 | 2022-03-04 | High |
| Port congestion crisis | 2022-10-07 | High |
| 2025 tariff wave | 2025-03-07 | Medium |

---

## 🛠️ Tech Stack

**ML & Data**
- Python 3.11, LightGBM, XGBoost, SHAP, Prophet
- pandas, scikit-learn, numpy

**Backend**
- FastAPI, uvicorn
- Google Cloud Run (Docker)
- Supabase (PostgreSQL feature store)

**Frontend**
- Next.js 14, TypeScript, Tailwind CSS
- Recharts, shadcn/ui
- Deployed on Vercel

**Data Sources**
- FRED (Federal Reserve Economic Data)
- Alpha Vantage (commodity prices)
- NOAA (economic indicators)
- NewsAPI (trade news sentiment)
- Polymarket (prediction markets)

**AI**
- Anthropic Claude (weekly risk narrative generation)

---

## 📁 Project Structure

```
tariff-and-trade-shock-forecaster/
├── app/
│   └── api.py              # FastAPI backend (15+ endpoints)
├── src/
│   ├── data/               # Data ingestion pipelines
│   ├── features/           # Feature engineering
│   ├── models/             # Model training & SHAP analysis
│   └── utils/              # DB, logging, config utilities
├── frontend/               # Next.js dashboard
├── models/                 # Trained model artifacts (.pkl)
├── configs/                # Ingestion & model configuration
├── sql/                    # Database schema
├── tests/                  # Unit & integration tests
├── Dockerfile              # Cloud Run container
└── requirements.txt        # Python dependencies
```

---

## 🏃 Running Locally

### Backend
```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Fill in: SUPABASE_URL, SUPABASE_KEY, FRED_API_KEY,
#          ALPHA_VANTAGE_API_KEY, NEWSAPI_KEY, ANTHROPIC_API_KEY

# Run API
uvicorn app.api:app --reload --port 8000

# Visit: http://localhost:8000/docs
```

### Frontend
```bash
cd frontend
npm install

# Set environment variable
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

npm run dev
# Visit: http://localhost:3000
```

---

## 🐳 Docker

```bash
docker build -t tariff-forecaster .
docker run -p 8080:8080 \
  -e SUPABASE_URL=your_url \
  -e SUPABASE_KEY=your_key \
  tariff-forecaster
```

---


## 📄 License

MIT License — see [LICENSE](LICENSE) for details.