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
import { useDashboard } from '@/components/dashboard/dashboard-context'

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
  const { timeRange } = useDashboard()

  // Fetch data once on mount
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const summary = await api.getDashboardSummary()
        setData(summary)
        setError(null)
      } catch (err) {
        if (!(await isBackendOffline())) console.error('Dashboard error:', err)
        setError('Unable to connect to backend API. Please ensure the server is running at http://127.0.0.1:8000')
        setData(null)
      } finally { setLoading(false) }
    }
    fetchData()
  }, []) // Only fetch once on mount

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

  // Filter history based on selected time range
  const filteredHistory = data.history.filter((h) => {
    const date = new Date(h.date)
    const now = new Date()
    const monthsAgo = new Date(now)
    monthsAgo.setMonth(monthsAgo.getMonth() - timeRange.months)
    return date >= monthsAgo
  })

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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 items-stretch">
          {[
            { title: 'Current Risk Score', value: data.current.risk_score.toFixed(1), change: data.trend.change_4w, changeLabel: 'vs 4 weeks ago', icon: <AlertTriangle className="size-5" />, accentColor: 'coral' as const, hoverColor: CORAL },
            { title: 'Disruption Probability', value: `${(data.current.disruption_probability * 100).toFixed(1)}%`, icon: <Activity className="size-5" />, accentColor: 'amber' as const, hoverColor: AMBER },
            { title: 'Trend Direction', value: data.trend.direction.charAt(0).toUpperCase() + data.trend.direction.slice(1), icon: <TrendingUp className="size-5" />, accentColor: (trendUp ? 'coral' : 'green') as any, hoverColor: trendUp ? CORAL : GREEN },
            { title: 'Model Precision', value: `${(data.meta.model_precision * 100).toFixed(1)}%`, icon: <Building2 className="size-5" />, accentColor: 'blue' as const, hoverColor: BLUE },
          ].map((card) => (
            <div
              key={card.title}
              className="transition-all duration-300 ease-out h-full [&>*]:h-full"
              style={{ borderRadius: 'var(--radius)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)'
                e.currentTarget.style.boxShadow = `0 16px 40px ${card.hoverColor}25, 0 8px 20px rgba(0,0,0,0.25), 0 0 0 1px ${card.hoverColor}15`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <StatsCard
                title={card.title}
                value={card.value}
                {...(card.change !== undefined ? { change: card.change, changeLabel: card.changeLabel } : {})}
                icon={card.icon}
                accentColor={card.accentColor}
              />
            </div>
          ))}
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
                      <span className="text-xs text-foreground font-mono px-2 py-1 rounded-md" style={{ backgroundColor: 'rgba(128,128,128,0.1)' }}>
                        {signal.feature}
                      </span>
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
        {filteredHistory.length > 0 && (
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
                  <CardDescription className="text-xs mt-0.5">Risk score over the past {filteredHistory.length} weeks ({timeRange.label})</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <RiskTrendChart
                data={filteredHistory.map(h => ({
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { value: data.meta.features_count, label: 'ML Features', color: CORAL, icon: <Activity className="size-4" /> },
            { value: data.meta.data_sources, label: 'Data Sources', color: AMBER, icon: <BarChart3 className="size-4" /> },
            { value: `${data.meta.training_weeks} wks`, label: 'Training Data', color: BLUE, icon: <TrendingUp className="size-4" /> },
            { value: `${(data.meta.model_recall * 100).toFixed(0)}%`, label: 'Detection Rate', color: GREEN, icon: <Building2 className="size-4" /> },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-3 rounded-xl p-4 border border-border bg-card transition-all duration-300 ease-out"
              style={{ cursor: 'default' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = `0 8px 24px ${stat.color}20, 0 0 0 1px ${stat.color}15`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: `${stat.color}12`, border: `1px solid ${stat.color}20`,
                color: stat.color,
              }}>
                {stat.icon}
              </div>
              <div>
                <div className="text-lg font-bold tabular-nums text-foreground">{stat.value}</div>
                <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}