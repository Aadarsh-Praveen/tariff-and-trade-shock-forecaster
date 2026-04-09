'use client'

import { useEffect, useState } from 'react'
import { Building2, AlertTriangle, TrendingUp, Activity, BarChart3, Cpu, Lightbulb } from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { StatsCard } from '@/components/dashboard/stats-card'
import { RiskScoreGauge } from '@/components/risk/risk-score-gauge'
import { RiskTrendChart } from '@/components/risk/risk-trend-chart'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { api, DashboardSummary, isBackendOffline } from '@/lib/api/client'

const CORAL = '#df2531'
const AMBER = '#f59e0b'
const GREEN = '#22c55e'
const BLUE = '#6366f1'
const PURPLE = '#8b5cf6'

function riskHex(level: string): string {
  if (level === 'high') return CORAL
  if (level === 'medium') return AMBER
  return GREEN
}

const RANK_COLORS = [CORAL, AMBER, BLUE, GREEN, PURPLE]

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
        if (!isBackendOffline(err)) console.error('Dashboard error:', err)
        setError('Unable to connect to backend API. Please ensure the server is running at http://127.0.0.1:8000')
        setData(null)
      } finally { setLoading(false) }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <DashboardHeader title="Dashboard" description="Supply chain risk overview" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground text-[13px]">Loading dashboard data...</div>
        </main>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <DashboardHeader title="Dashboard" description="Supply chain risk overview" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="text-[16px] font-semibold text-foreground">Backend API Unavailable</div>
            <div className="text-[13px] text-muted-foreground max-w-md">
              {error || 'Unable to fetch dashboard data. Please ensure the backend server is running at http://127.0.0.1:8000'}
            </div>
            <div className="text-[11px] text-muted-foreground font-mono bg-secondary px-4 py-2 rounded-md inline-block">
              uvicorn app.api:app --reload --port 8000
            </div>
          </div>
        </main>
      </div>
    )
  }

  const rc = riskHex(data.current.risk_level)
  const trendUp = data.trend.direction === 'rising'
  const trendDown = data.trend.direction === 'falling'

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DashboardHeader title="Dashboard" description="Supply chain disruption risk overview" />

      <main className="flex-1 space-y-6 p-6">
        {error && (
          <Alert style={{ backgroundColor: `${CORAL}08`, border: `1px solid ${CORAL}20` }}>
            <AlertTriangle className="h-4 w-4" style={{ color: CORAL }} />
            <AlertDescription className="text-muted-foreground text-[12px]">{error}</AlertDescription>
          </Alert>
        )}

        {/* ═══ STATS ROW ═══ */}
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
            icon={<TrendingUp className="size-5" />}
            accentColor={trendUp ? 'coral' : 'green'}
          />
          <StatsCard
            title="Model Precision"
            value={`${(data.meta.model_precision * 100).toFixed(1)}%`}
            icon={<Building2 className="size-5" />}
            accentColor="blue"
          />
        </div>

        {/* ═══ MAIN CONTENT ═══ */}
        <div className="grid gap-6 lg:grid-cols-3">

          {/* Risk Score Gauge */}
          <Card className="lg:col-span-1 border-border bg-card overflow-hidden relative">
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '100%',
              background: `radial-gradient(ellipse at 50% 0%, ${rc}10 0%, transparent 60%)`,
              pointerEvents: 'none',
            }} />
            <div style={{ height: 3, background: `linear-gradient(90deg, ${rc}, ${rc}40 50%, transparent)` }} />
            <CardHeader className="relative">
              <div className="flex items-center gap-3">
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: `${rc}12`, border: `1px solid ${rc}20`,
                }}>
                  <AlertTriangle className="size-4" style={{ color: rc }} />
                </div>
                <div>
                  <CardTitle className="text-foreground text-base">Overall Risk Score</CardTitle>
                  <CardDescription className="text-xs mt-0.5">{data.current.date}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative flex flex-col items-center justify-center pb-6 space-y-4">
              <RiskScoreGauge score={data.current.risk_score} size="lg" />
              <div className="text-center space-y-2">
                <div className="text-[12px] text-muted-foreground">
                  Risk Level:{' '}
                  <span style={{
                    fontWeight: 700, color: rc,
                    padding: '2px 8px', borderRadius: 6,
                    backgroundColor: `${rc}15`,
                  }}>
                    {data.current.risk_level.toUpperCase()}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {data.trend.high_weeks_last4} high-risk week(s) in last 4
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Signals + AI Reasoning */}
          <div className="space-y-4 lg:col-span-2">

            {/* Top Driving Signals */}
            <Card className="border-border bg-card overflow-hidden">
              <div style={{ height: 3, background: `linear-gradient(90deg, ${CORAL}, ${AMBER}60 50%, transparent)` }} />
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: `${CORAL}12`, border: `1px solid ${CORAL}20`,
                  }}>
                    <TrendingUp className="size-4" style={{ color: CORAL }} />
                  </div>
                  <div>
                    <CardTitle className="text-foreground text-base">Top Driving Signals</CardTitle>
                    <CardDescription className="text-xs mt-0.5">Most influential factors for current risk score</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-0">
                {data.current.top_signals.slice(0, 5).map((signal, i) => {
                  const rankColor = RANK_COLORS[i] || RANK_COLORS[RANK_COLORS.length - 1]
                  return (
                    <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                      <div className="flex items-center gap-3">
                        <div style={{
                          width: 28, height: 28, borderRadius: 7,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          backgroundColor: `${rankColor}12`, border: `1px solid ${rankColor}20`,
                          fontSize: 11, fontWeight: 700, color: rankColor,
                        }}>
                          {i + 1}
                        </div>
                        <span className="text-[12px] text-foreground font-medium">{signal.label}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">{signal.feature}</span>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* AI Risk Assessment */}
            {data.llm.reasoning && (
              <Card className="border-border bg-card overflow-hidden relative">
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: '100%',
                  background: `radial-gradient(ellipse at 0% 0%, ${PURPLE}10 0%, transparent 60%)`,
                  pointerEvents: 'none',
                }} />
                <div style={{ height: 3, background: `linear-gradient(90deg, ${PURPLE}, ${PURPLE}00)` }} />
                <CardHeader className="relative">
                  <div className="flex items-start gap-3">
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      backgroundColor: `${PURPLE}12`, border: `1px solid ${PURPLE}20`,
                      flexShrink: 0,
                    }}>
                      <Lightbulb className="size-4" style={{ color: PURPLE }} />
                    </div>
                    <div>
                      <CardTitle className="text-foreground text-base">AI Risk Assessment</CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {data.llm.model} • {data.llm.week}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <p className="text-[12px] text-muted-foreground leading-relaxed">{data.llm.reasoning}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* ═══ RISK HISTORY CHART ═══ */}
        {data.history.length > 0 && (
          <Card className="border-border bg-card overflow-hidden">
            <div style={{ height: 3, background: `linear-gradient(90deg, ${AMBER}, ${AMBER}00)` }} />
            <CardHeader>
              <div className="flex items-center gap-3">
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: `${AMBER}12`, border: `1px solid ${AMBER}20`,
                }}>
                  <BarChart3 className="size-4" style={{ color: AMBER }} />
                </div>
                <div>
                  <CardTitle className="text-foreground text-base">Risk History</CardTitle>
                  <CardDescription className="text-xs mt-0.5">Risk score over the past {data.history.length} weeks</CardDescription>
                </div>
              </div>
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

        {/* ═══ MODEL INFO FOOTER ═══ */}
        <Card className="border-border bg-card overflow-hidden">
          <div style={{ height: 3, background: `linear-gradient(90deg, ${BLUE}, ${GREEN}40 50%, transparent)` }} />
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              {[
                { value: data.meta.features_count, label: 'Features Engineered', color: CORAL },
                { value: data.meta.data_sources, label: 'Data Sources', color: AMBER },
                { value: data.meta.training_weeks, label: 'Training Weeks', color: BLUE },
                { value: `${(data.meta.model_recall * 100).toFixed(0)}%`, label: 'Recall Rate', color: GREEN },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-[22px] font-bold tabular-nums" style={{ color: stat.color }}>{stat.value}</div>
                  <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}