'use client'

import { useEffect, useState } from 'react'
import { Building2, AlertTriangle, TrendingUp, Activity } from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { StatsCard } from '@/components/dashboard/stats-card'
import { RiskScoreGauge } from '@/components/risk/risk-score-gauge'
import { RiskTrendChart } from '@/components/risk/risk-trend-chart'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { api, DashboardSummary, isBackendOffline } from '@/lib/api/client'

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const summary = await api.getDashboardSummary()
        setData(summary)
        setError(null)
      } catch (err) {
        // Only log unexpected errors
        if (!isBackendOffline(err)) {
          console.error('Dashboard error:', err)
        }
        
        // Check if it's an API connection error
        if (isBackendOffline(err)) {
          setError('⚠️ Backend API is not running. Showing demo data.\n\nTo see real predictions, start the FastAPI server:\ncd /home/suriya/Desktop/tariff-and-trade-shock-forecaster\nuvicorn app.api:app --reload --port 8000')
        } else {
          setError('Failed to load dashboard data. Using demo mode.')
        }
        
        // Set realistic demo data
        const demoHistory = Array.from({ length: 52 }, (_, i) => {
          const date = new Date()
          date.setDate(date.getDate() - (52 - i) * 7)
          const baseRisk = 60 + Math.sin(i / 8) * 15 + Math.random() * 5
          return {
            date: date.toISOString().split('T')[0],
            risk_score: Math.max(30, Math.min(90, baseRisk)),
            risk_level: baseRisk > 65 ? 'high' : baseRisk > 40 ? 'medium' : 'low',
          }
        })
        
        setData({
          current: {
            date: new Date().toISOString().split('T')[0],
            risk_score: 72.3,
            risk_level: 'high',
            disruption_probability: 0.723,
            top_signals: [
              { feature: 'natural_gas_price_lag_1w', label: 'Natural gas (1w ago)' },
              { feature: 'copper', label: 'Copper price' },
              { feature: 'import_price_index_pct_4w', label: 'Import prices % change (4w)' },
              { feature: 'trade_balance_change_4w', label: 'Trade balance change (4w)' },
              { feature: 'natural_gas_price_std_4w', label: 'Natural gas volatility (4w)' },
            ],
          },
          trend: {
            direction: 'rising',
            change_4w: 5.2,
            high_weeks_last4: 3,
          },
          history: demoHistory,
          forecast: [],
          llm: {
            reasoning: 'Trade balance deterioration combined with natural gas price volatility indicates elevated disruption risk. Import price inflation remains sustained above historical averages. The 4-week rolling volatility in energy commodities suggests continued supply chain stress through Q2 2026.',
            risk_score: 68,
            risk_label: 'high',
            week: new Date().toISOString().split('T')[0],
            model: 'claude-3.5-sonnet',
          },
          meta: {
            forecast_horizon_weeks: 3,
            training_weeks: 313,
            test_weeks: 62,
            model_f1: 0.984,
            model_precision: 0.968,
            model_recall: 1.0,
            features_count: 457,
            data_sources: 5,
          },
          generated_at: new Date().toISOString(),
        })
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <DashboardHeader
          title="Dashboard"
          description="Supply chain risk overview"
        />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-70">Loading dashboard data...</div>
        </main>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <DashboardHeader
          title="Dashboard"
          description="Supply chain risk overview"
        />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-70">No data available</div>
        </main>
      </div>
    )
  }

  const trendIcon = data.trend.direction === 'rising' ? '↑' : data.trend.direction === 'falling' ? '↓' : '→'
  const trendColor = data.trend.direction === 'rising' ? 'text-[#df2531]' : data.trend.direction === 'falling' ? 'text-[#22c55e]' : 'text-70'

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DashboardHeader
        title="Dashboard"
        description="Supply chain disruption risk overview"
      />
      
      <main className="flex-1 space-y-6 p-6">
        {error && (
          <Alert className="border-red-30 bg-red-8">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-70 whitespace-pre-line">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Current Risk Score"
            value={data.current.risk_score.toFixed(1)}
            change={data.trend.change_4w}
            changeLabel="vs 4 weeks ago"
            icon={<AlertTriangle className="size-5" />}
          />
          <StatsCard
            title="Disruption Probability"
            value={`${(data.current.disruption_probability * 100).toFixed(1)}%`}
            icon={<Activity className="size-5" />}
          />
          <StatsCard
            title="Trend Direction"
            value={data.trend.direction.charAt(0).toUpperCase() + data.trend.direction.slice(1)}
            icon={<TrendingUp className={`size-5 ${trendColor}`} />}
          />
          <StatsCard
            title="Model Precision"
            value={`${(data.meta.model_precision * 100).toFixed(1)}%`}
            icon={<Building2 className="size-5" />}
          />
        </div>
        
        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Risk Score Gauge */}
          <Card className="lg:col-span-1 border-red-20 bg-red-4">
            <CardHeader>
              <CardTitle>Overall Risk Score</CardTitle>
              <CardDescription className="text-45">
                {data.current.date}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center pb-6 space-y-4">
              <RiskScoreGauge score={data.current.risk_score} size="lg" />
              <div className="text-center space-y-2">
                <div className="text-sm text-70">
                  Risk Level: <span className={`font-semibold ${
                    data.current.risk_level === 'high' ? 'text-[#df2531]' :
                    data.current.risk_level === 'medium' ? 'text-[#f59e0b]' :
                    'text-[#22c55e]'
                  }`}>
                    {data.current.risk_level.toUpperCase()}
                  </span>
                </div>
                <div className="text-xs text-45">
                  {data.trend.high_weeks_last4} high-risk week(s) in last 4
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Top Driving Signals & AI Reasoning */}
          <div className="space-y-4 lg:col-span-2">
            <Card className="border-red-20 bg-red-4">
              <CardHeader>
                <CardTitle>Top Driving Signals</CardTitle>
                <CardDescription className="text-45">
                  Most influential factors for current risk score
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.current.top_signals.slice(0, 5).map((signal, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-red-20 last:border-0">
                    <span className="text-sm text-70">{signal.label}</span>
                    <span className="text-xs text-45 font-mono">{signal.feature}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {data.llm.reasoning && (
              <Card className="border-red-20 bg-red-4">
                <CardHeader>
                  <CardTitle>AI Risk Assessment</CardTitle>
                  <CardDescription className="text-45">
                    {data.llm.model} • {data.llm.week}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-70 leading-relaxed">
                    {data.llm.reasoning}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        
        {/* Risk History Chart */}
        {data.history.length > 0 && (
          <Card className="border-red-20 bg-red-4">
            <CardHeader>
              <CardTitle>Risk History</CardTitle>
              <CardDescription className="text-45">
                Risk score over the past {data.history.length} weeks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RiskTrendChart
                data={data.history.map(h => ({
                  month: h.date,
                  overallScore: h.risk_score,
                  financialScore: 75,
                  operationalScore: 68,
                  geopoliticalScore: 82,
                  complianceScore: 71,
                  incidentCount: 0,
                  suppliersMonitored: 245,
                }))}
                title=""
                description=""
              />
            </CardContent>
          </Card>
        )}

        {/* Model Info Footer */}
        <Card className="border-red-20 bg-red-4">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-100">{data.meta.features_count}</div>
                <div className="text-xs text-45">Features Engineered</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-100">{data.meta.data_sources}</div>
                <div className="text-xs text-45">Data Sources</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-100">{data.meta.training_weeks}</div>
                <div className="text-xs text-45">Training Weeks</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-100">{(data.meta.model_recall * 100).toFixed(0)}%</div>
                <div className="text-xs text-45">Recall (No False Negatives)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
