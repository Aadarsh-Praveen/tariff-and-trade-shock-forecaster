# RiskGuard Frontend - Supply Chain Risk Dashboard

A modern Next.js dashboard for supply chain risk assessment with ML-powered predictions, real-time monitoring, and comprehensive analytics.

## Features

- **Dark/Light Theme Toggle** - Seamless theme switching with persistence
- **ML Model Integration** - Real-time risk predictions and forecasts
- **Interactive Dashboard** - Comprehensive risk metrics and visualizations
- **Supplier Monitoring** - Track and analyze supplier risk profiles
- **Alert Management** - Real-time risk alerts and notifications
- **Trend Analysis** - Historical and predictive risk trends
- **Report Generation** - Automated risk reporting
- **Offline Mode** - Demo data when backend is unavailable

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + shadcn/ui
- **Charts**: Recharts
- **State Management**: React Context
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend API running on `http://localhost:8000` (optional - works in offline mode)

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

## Theme System

The dashboard supports both dark and light themes with full text visibility.

### Dark Mode (Default)
- Pure black background `#000000`
- White text for all content
- Red accent `#df2531` for high-risk indicators

### Light Mode
- Pure white background `#ffffff`
- Black text for all content
- Red accent `#df2531` for high-risk indicators

### Toggle Theme
Click the sun/moon icon in the top-right header to switch themes. Your preference is saved to localStorage.

## Pages

1. **Dashboard** (`/`) - Main overview with key metrics
2. **Model** (`/model`) - ML model details and predictions
3. **Signals** (`/signals`) - Leading indicators tracking
4. **Events** (`/events`) - Risk event monitoring
5. **Custom Tracker** (`/custom-tracker`) - Custom metric tracking
6. **Sectors** (`/sectors`) - Industry sector analysis
7. **Forecast** (`/forecast`) - Risk forecasting
8. **Alerts** (`/alerts`) - Alert management
9. **Suppliers** (`/suppliers`) - Supplier analysis
10. **Risk Matrix** (`/risk-matrix`) - Likelihood vs Impact matrix
11. **Reports** (`/reports`) - Report generation
12. **Trends** (`/trends`) - Trend analysis
13. **Settings** (`/settings`) - Configuration

## API Integration

The frontend connects to the FastAPI backend at `http://localhost:8000`. If the backend is not running, it automatically switches to demo mode with sample data.

### Key Endpoints
- `GET /api/dashboard/summary` - Dashboard metrics
- `GET /api/risk/history` - Historical risk data
- `GET /api/model/info` - ML model information
- `GET /api/shap/summary` - SHAP values
- `GET /api/signals` - Leading indicators

## Project Structure

```
frontend/
├── app/                    # Next.js app router pages
│   ├── page.tsx           # Dashboard home
│   ├── model/             # ML model page
│   ├── signals/           # Signals page
│   ├── events/            # Events page
│   └── ...                # Other pages
├── components/            # React components
│   ├── dashboard/         # Dashboard-specific components
│   ├── ui/                # Reusable UI components (shadcn)
│   ├── risk/              # Risk visualization components
│   ├── suppliers/         # Supplier components
│   ├── alerts/            # Alert components
│   ├── theme-provider.tsx # Theme context provider
│   └── theme-toggle.tsx   # Theme toggle button
├── lib/                   # Utilities and helpers
│   ├── api/               # API client
│   ├── data/              # Data types and mock data
│   └── utils.ts           # Utility functions
└── public/                # Static assets

```

## Color System

### Base Colors
- **Primary**: Red `#df2531` (high risk, primary actions)
- **Secondary**: Amber `#f59e0b` (medium risk)
- **Success**: Green `#22c55e` (low risk)

### Adaptive Text Classes
- `.text-100` - Full brightness (white in dark, black in light)
- `.text-70` - High visibility (70-80% opacity)
- `.text-45` - Medium visibility (45-60% opacity)
- `.text-25` - Low visibility (25-40% opacity)

## Development Notes

- All pages use `bg-background` for theme-aware backgrounds
- Components use semantic Tailwind classes for theme adaptation
- Theme state persists across page navigation
- Offline mode activates automatically when backend is unavailable

## Contributing

When making changes:
1. Ensure all new components support both themes
2. Use semantic color classes (`bg-background`, `text-foreground`)
3. Test in both dark and light modes
4. Verify offline mode still works

## License

Part of the Tariff and Trade Shock Forecaster project.
