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
import { cn } from '@/lib/utils'

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
        if (!isBackendOffline(err)) {
          console.error('Dashboard error:', err)
        }
        setError('Unable to connect to backend API. Please ensure the server is running at http://127.0.0.1:8000')
        setData(null)
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
          <div className="text-muted-foreground text-[13px]">Loading dashboard data...</div>
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
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-4">
            <div className="text-[16px] font-semibold text-foreground">Backend API Unavailable</div>
            <div className="text-[13px] text-t2 max-w-md">
              {error || 'Unable to fetch dashboard data. Please ensure the backend server is running at http://127.0.0.1:8000'}
            </div>
            <div className="text-[11px] text-t3 font-mono bg-secondary px-4 py-2 rounded-md inline-block">
              uvicorn app.api:app --reload --port 8000
            </div>
          </div>
        </main>
      </div>
    )
  }

  const trendIcon = data.trend.direction === 'rising' ? '↑' : data.trend.direction === 'falling' ? '↓' : '→'
  const trendColor = data.trend.direction === 'rising' ? 'text-coral' : data.trend.direction === 'falling' ? 'text-green' : 'text-t2'

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DashboardHeader
        title="Dashboard"
        description="Supply chain disruption risk overview"
      />
      
      <main className="flex-1 space-y-6 p-6">
        {error && (
          <Alert className="border-coral bg-coral-faint">
            <AlertTriangle className="h-4 w-4 text-coral" />
            <AlertDescription className="text-t2 text-[12px]">
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
            accentColor="coral"
          />
          <StatsCard
            title="Disruption Probability"
            value={`${(data.current.disruption_probability * 100).toFixed(1)}%`}
            icon={<Activity className="size-5" />}
            accentColor="amber"
          />
          <StatsCard
            title="Trend Direction"
            value={data.trend.direction.charAt(0).toUpperCase() + data.trend.direction.slice(1)}
            icon={<TrendingUp className={`size-5 ${trendColor}`} />}
            accentColor={data.trend.direction === 'rising' ? 'coral' : 'green'}
          />
          <StatsCard
            title="Model Precision"
            value={`${(data.meta.model_precision * 100).toFixed(1)}%`}
            icon={<Building2 className="size-5" />}
            accentColor="blue"
          />
        </div>
        
        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Risk Score Gauge */}
          <Card className="lg:col-span-1 border-border bg-card">
            <CardHeader>
              <CardTitle className="text-[14px] font-bold text-foreground">Overall Risk Score</CardTitle>
              <CardDescription className="text-[11px] text-t3">
                {data.current.date}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center pb-6 space-y-4">
              <RiskScoreGauge score={data.current.risk_score} size="lg" />
              <div className="text-center space-y-2">
                <div className="text-[12px] text-t2">
                  Risk Level: <span className={cn(
                    'font-semibold',
                    data.current.risk_level === 'high' && 'text-coral',
                    data.current.risk_level === 'medium' && 'text-amber',
                    data.current.risk_level === 'low' && 'text-green'
                  )}>
                    {data.current.risk_level.toUpperCase()}
                  </span>
                </div>
                <div className="text-[10px] text-t4">
                  {data.trend.high_weeks_last4} high-risk week(s) in last 4
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Top Driving Signals & AI Reasoning */}
          <div className="space-y-4 lg:col-span-2">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-[14px] font-bold text-foreground">Top Driving Signals</CardTitle>
                <CardDescription className="text-[11px] text-t3">
                  Most influential factors for current risk score
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.current.top_signals.slice(0, 5).map((signal, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-[12px] text-t2">{signal.label}</span>
                    <span className="text-[10px] text-t4 font-mono">{signal.feature}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {data.llm.reasoning && (
              <Card className="border-purple bg-purple-faint">
                <CardHeader>
                  <div className="flex items-start gap-2">
                    <div className="rounded-md bg-purple-soft p-1.5">
                      <Activity className="size-4 text-purple" />
                    </div>
                    <div>
                      <CardTitle className="text-[14px] font-bold text-foreground">AI Risk Assessment</CardTitle>
                      <CardDescription className="text-[10px] text-t3">
                        {data.llm.model} • {data.llm.week}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-[12px] text-t2 leading-relaxed">
                    {data.llm.reasoning}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        
        {/* Risk History Chart */}
        {data.history.length > 0 && (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-[14px] font-bold text-foreground">Risk History</CardTitle>
              <CardDescription className="text-[11px] text-t3">
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
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-[22px] font-bold text-foreground">{data.meta.features_count}</div>
                <div className="text-[10px] text-t4 section-label">Features Engineered</div>
              </div>
              <div>
                <div className="text-[22px] font-bold text-foreground">{data.meta.data_sources}</div>
                <div className="text-[10px] text-t4 section-label">Data Sources</div>
              </div>
              <div>
                <div className="text-[22px] font-bold text-foreground">{data.meta.training_weeks}</div>
                <div className="text-[10px] text-t4 section-label">Training Weeks</div>
              </div>
              <div>
                <div className="text-[22px] font-bold text-foreground">{(data.meta.model_recall * 100).toFixed(0)}%</div>
                <div className="text-[10px] text-t4 section-label">Recall Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
