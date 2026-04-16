# Tariff and Trade Shock Forecaster

Real-time supply chain disruption risk forecasting system that predicts disruption probability 3 weeks ahead using macro signals, commodity prices, trade data, and sentiment analysis.

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- Supabase account (for database)

### Backend Setup

1. **Clone the repository**:
```bash
git clone <repository-url>
cd tariff-and-trade-shock-forecaster
```

2. **Create virtual environment**:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**:
```bash
pip install -r requirements.txt
```

4. **Configure environment**:
Create a `.env` file in the root directory:
```bash
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

5. **Run the backend**:
```bash
uvicorn app.api:app --reload --port 8000
```

The API will be available at `http://localhost:8000`
- API docs: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Frontend Setup

1. **Navigate to frontend directory**:
```bash
cd frontend
```

2. **Install dependencies**:
```bash
npm install
```

3. **Configure environment**:
Create a `.env.local` file in the `frontend` directory:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

4. **Run the development server**:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## 📁 Project Structure

```
tariff-and-trade-shock-forecaster/
├── app/
│   └── api.py              # FastAPI backend
├── frontend/
│   ├── app/                # Next.js pages
│   ├── components/         # React components
│   ├── lib/               # Utilities and API client
│   └── README.md          # Frontend-specific docs
├── src/
│   ├── data/              # Data ingestion
│   ├── model/             # ML model training
│   └── utils/             # Utility functions
├── models/                # Trained models
├── configs/               # Configuration files
├── sql/                   # Database migrations
└── README.md              # This file
```

## 🔧 Configuration

### Database Setup

Run the SQL migrations to create required tables:

1. Go to your Supabase Dashboard → SQL Editor
2. Run the scripts in the `sql/` directory:
   - `create_user_settings_table.sql` (for settings persistence)

See `sql/README.md` for detailed instructions.

### API Endpoints

The backend provides the following endpoints:

**Risk Assessment**
- `GET /risk/current` - Latest risk score
- `GET /risk/history` - Historical risk data
- `GET /risk/forecast` - 12-week forecast
- `GET /risk/date/{date}` - Risk for specific date

**Signals & Analysis**
- `GET /signals/top` - Top driving signals
- `GET /signals/forecast` - Prophet forecast
- `GET /signals/llm-reasoning` - AI-generated reasoning

**Model Insights**
- `GET /model/metrics` - Model performance
- `GET /model/features` - Feature importance
- `GET /shap/waterfall/{date}` - SHAP analysis
- `GET /shap/summary` - Overall SHAP importance

**Dashboard**
- `GET /dashboard/summary` - Complete dashboard data

**Settings**
- `GET /settings` - Get user settings
- `POST /settings/update` - Save settings
- `POST /settings/refresh` - Force data refresh

## 🐛 Troubleshooting

### "Module not found: '@/lib/api/client'"

This means the API client file is missing. Make sure you have the latest code:
```bash
git pull origin main
```

The file should exist at `frontend/lib/api/client.ts`.

### Backend connection issues

1. Verify the backend is running: `curl http://localhost:8000/`
2. Check `.env` has correct Supabase credentials
3. Ensure CORS is enabled (already configured in `app/api.py`)

### Frontend build errors

1. Clear cache and reinstall:
```bash
cd frontend
rm -rf node_modules .next
npm install
```

2. Verify Node.js version: `node --version` (should be 18+)

### Database errors

If you see "table does not exist" errors:
1. Run the SQL migrations in `sql/` directory
2. Check Supabase connection in `.env`
3. Settings will work with in-memory storage as fallback

## 🔐 Environment Variables

### Backend (`.env` in root)
```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
```

### Frontend (`frontend/.env.local`)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 📊 Features

- **Real-time Risk Assessment**: ML-powered disruption probability forecasting
- **Signal Analysis**: Track commodity prices, trade data, and macro indicators
- **SHAP Explainability**: Understand which factors drive risk scores
- **Interactive Dashboard**: Visualize trends, forecasts, and historical events
- **Custom Tracking**: Monitor specific commodities and sectors
- **Alert System**: Email notifications for threshold breaches
- **Settings Management**: Configurable thresholds and preferences

## 🧪 Testing

Test the backend endpoints:
```bash
# Health check
curl http://localhost:8000/

# Get current risk
curl http://localhost:8000/risk/current

# Dashboard summary
curl http://localhost:8000/dashboard/summary
```

## 📝 Documentation

- [Frontend README](frontend/README.md) - Frontend-specific documentation
- [Settings Implementation](SETTINGS_IMPLEMENTATION.md) - Settings feature details
- [SQL Migrations](sql/README.md) - Database setup guide
- [API Docs](http://localhost:8000/docs) - Interactive API documentation (when backend is running)

## 🤝 Contributing

1. Pull the latest changes before starting work
2. Create a feature branch
3. Make your changes
4. Test both backend and frontend
5. Submit a pull request

## 📄 License

[Add your license here]

## 🆘 Support

If you encounter issues:
1. Check this README for common problems
2. Review the error message carefully
3. Ensure all dependencies are installed
4. Verify environment variables are set correctly
5. Check that both backend and frontend are running