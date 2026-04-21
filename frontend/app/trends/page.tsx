'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  LineChart as LineChartIcon,
  BarChart3,
} from 'lucide-react'
import {
  Line,
  LineChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useDashboard } from '@/components/dashboard/dashboard-context'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api/client'
import { cn } from '@/lib/utils'

type SummaryPayload = Awaited<ReturnType<typeof api.getDashboardSummary>>
type SectorPayload = Awaited<ReturnType<typeof api.getSectorRisks>>

export default function TrendsPage() {
  const { timeRange } = useDashboard()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<SummaryPayload | null>(null)
  const [sectorData, setSectorData] = useState<SectorPayload | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const [sum, sec] = await Promise.all([api.getDashboardSummary(), api.getSectorRisks()])
        if (!cancelled) {
          setSummary(sum)
          setSectorData(sec)
          setError(null)
        }
      } catch {
        if (!cancelled) {
          setError('Could not load trend data. Check that the API is running.')
          setSummary(null)
          setSectorData(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const { overallSeries, monthlyHighWeeks, sectors } = useMemo(() => {
    if (!summary || !sectorData) {
      return {
        overallSeries: [] as { label: string; risk_score: number }[],
        monthlyHighWeeks: [] as { month: string; count: number }[],
        sectors: [] as Array<{ sector: string; label: string; risk_score: number; risk_level: string }>,
      }
    }
    const monthsAgo = new Date()
    monthsAgo.setMonth(monthsAgo.getMonth() - timeRange.months)
    const filtered = summary.history.filter((h) => new Date(h.date) >= monthsAgo)
    const series = filtered.map((h) => ({ label: h.date.slice(5), risk_score: h.risk_score }))
    const byMonth = new Map<string, { highWeeks: number }>()
    for (const h of filtered) {
      const ym = h.date.slice(0, 7)
      if (!byMonth.has(ym)) byMonth.set(ym, { highWeeks: 0 })
      const b = byMonth.get(ym)!
      if (h.risk_level === 'high' || h.risk_score >= 65) b.highWeeks += 1
    }
    const monthly = [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ month: month.slice(2), count: v.highWeeks }))
    const sect = sectorData.sectors.map(
      (s: { sector: string; label: string; risk_score: number; risk_level: string }) => ({
        sector: s.sector,
        label: s.label,
        risk_score: s.risk_score,
        risk_level: s.risk_level,
      })
    )
    return { overallSeries: series, monthlyHighWeeks: monthly, sectors: sect }
  }, [summary, sectorData, timeRange.months])

  const trends = useMemo(() => {
    if (overallSeries.length < 2) {
      return { overall: 0 }
    }
    const first = overallSeries[0].risk_score
    const last = overallSeries[overallSeries.length - 1].risk_score
    if (first === 0) return { overall: 0 }
    return { overall: Math.round(((last - first) / first) * 100) }
  }, [overallSeries])

  const TrendIndicator = ({ value }: { value: number }) => {
    if (value === 0) {
      return (
        <div className="flex items-center gap-1 text-muted-foreground">
          <Minus className="size-3" />
          <span className="text-xs">No change</span>
        </div>
      )
    }
    const isUp = value > 0
    const color = isUp ? 'text-risk-critical' : 'text-risk-low'
    return (
      <div className={cn('flex items-center gap-1', color)}>
        {isUp ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
        <span className="text-xs font-medium">
          {value > 0 ? '+' : ''}
          {value}%
        </span>
      </div>
    )
  }

  const lastScore = overallSeries[overallSeries.length - 1]?.risk_score

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <DashboardHeader title="Trend Analysis" description="Risk trends over time" />
        <main className="flex-1 flex items-center justify-center p-6">
          <p className="text-muted-foreground text-sm">Loading trends…</p>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DashboardHeader title="Trend Analysis" description="Risk trends from model history (API)" />

      <main className="flex-1 space-y-6 p-6">
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Overall risk (latest)</p>
                <TrendIndicator value={trends.overall} />
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums">{lastScore != null ? lastScore.toFixed(1) : '—'}</p>
            </CardContent>
          </Card>

          {sectors.map((s: { sector: string; label: string; risk_score: number; risk_level: string }) => (
            <Card key={s.sector}>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground truncate">{s.label}</p>
                <p className="mt-2 text-2xl font-bold tabular-nums">{s.risk_score.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground mt-1 capitalize">{s.risk_level}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <LineChartIcon className="size-5 text-muted-foreground" />
              <div>
                <CardTitle>Weekly disruption risk</CardTitle>
                <CardDescription>Model risk score by week ({timeRange.label.toLowerCase()})</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {overallSeries.length === 0 ? (
              <p className="text-muted-foreground text-sm py-12 text-center">No history in this range.</p>
            ) : (
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={overallSeries.map((r) => ({ week: r.label, score: r.risk_score }))}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                    <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-card)',
                        border: '1px solid var(--color-border)',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      name="Risk score"
                      stroke="var(--color-chart-1)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="size-5 text-muted-foreground" />
                <div>
                  <CardTitle>High-risk weeks by month</CardTitle>
                  <CardDescription>Weeks at or above high-risk threshold in each month</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {monthlyHighWeeks.length === 0 ? (
                <p className="text-muted-foreground text-sm py-8 text-center">No data.</p>
              ) : (
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={monthlyHighWeeks.map((m) => ({ month: m.month, count: m.count }))}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="var(--color-risk-high)" name="High-risk weeks" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Modeling note
                <Badge variant="outline">API</Badge>
              </CardTitle>
              <CardDescription>Sector views use current SHAP allocation; history is aggregate risk only.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4 rounded-lg border border-dashed p-6">
                <Info className="size-8 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium">Per-category time series</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Financial / operational / geopolitical breakdowns over time are not exposed as separate model
                    outputs. Use the{' '}
                    <a href="/sectors" className="text-primary underline">
                      Sectors
                    </a>{' '}
                    page for energy, manufacturing, and trade lens on the latest week.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
