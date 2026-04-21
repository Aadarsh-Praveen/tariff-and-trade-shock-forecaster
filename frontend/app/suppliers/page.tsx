'use client'

import { useEffect, useState, useMemo } from 'react'
import { Search, Download, Factory, LineChart } from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api/client'
import { cn } from '@/lib/utils'

export default function SuppliersPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sectors, setSectors] = useState<
    Array<{
      sector: string
      label: string
      risk_score: number
      risk_level: string
      top_signals: Array<{ feature: string; label: string; mean_abs_shap: number }>
    }>
  >([])
  const [commodities, setCommodities] = useState<Array<{ key: string; label: string }>>([])
  const [overallScore, setOverallScore] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const [sec, comm] = await Promise.all([api.getSectorRisks(), api.getCommoditiesList()])
        if (cancelled) return
        setSectors(sec.sectors)
        setOverallScore(sec.overall_risk_score)
        setCommodities(comm.commodities ?? [])
        setError(null)
      } catch {
        if (!cancelled) {
          setError('Could not load exposure data from the API.')
          setSectors([])
          setCommodities([])
          setOverallScore(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const filteredCommodities = useMemo(() => {
    if (!search.trim()) return commodities
    const q = search.toLowerCase()
    return commodities.filter((c) => c.key.toLowerCase().includes(q) || c.label.toLowerCase().includes(q))
  }, [commodities, search])

  const highSectorCount = sectors.filter((s) => s.risk_level === 'high').length

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <DashboardHeader
          title="Supply exposure"
          description="Sector & commodity signals from the API"
        />
        <main className="flex-1 flex items-center justify-center p-6">
          <p className="text-muted-foreground text-sm">Loading…</p>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DashboardHeader
        title="Supply exposure"
        description="There is no supplier-level dataset in the API; sector and commodity views reflect live model inputs."
      />

      <main className="flex-1 space-y-6 p-6">
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Overall model risk</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {overallScore != null ? overallScore.toFixed(1) : '—'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Sectors</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{sectors.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">High-risk sectors</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-risk-high">{highSectorCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Tracked commodities</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{commodities.length}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Factory className="size-5 text-muted-foreground" />
                <div>
                  <CardTitle>Sector risk</CardTitle>
                  <CardDescription>From GET /risk/sectors</CardDescription>
                </div>
              </div>
              <Button variant="outline" size="icon" type="button" disabled>
                <Download className="size-4" />
                <span className="sr-only">Export</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4">Sector</th>
                  <th className="py-2 pr-4">Score</th>
                  <th className="py-2 pr-4">Level</th>
                  <th className="py-2">Top signal</th>
                </tr>
              </thead>
              <tbody>
                {sectors.map((s) => (
                  <tr key={s.sector} className="border-b border-border/60">
                    <td className="py-3 pr-4 font-medium">{s.label}</td>
                    <td className="py-3 pr-4 tabular-nums">{s.risk_score.toFixed(1)}</td>
                    <td className="py-3 pr-4 capitalize">{s.risk_level}</td>
                    <td className="py-3 text-muted-foreground">
                      {s.top_signals[0]?.label ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <LineChart className="size-5 text-muted-foreground" />
                <div>
                  <CardTitle>Commodity signals</CardTitle>
                  <CardDescription>From GET /commodities/list — used in custom tracker &amp; forecasts</CardDescription>
                </div>
              </div>
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Filter commodities…"
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {filteredCommodities.map((c) => (
                <span
                  key={c.key}
                  className={cn(
                    'inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs',
                    'bg-secondary/50 font-mono text-foreground'
                  )}
                >
                  <span className="text-muted-foreground mr-2 font-sans">{c.label}</span>
                  {c.key}
                </span>
              ))}
              {filteredCommodities.length === 0 && (
                <p className="text-sm text-muted-foreground">No commodities match your search.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
