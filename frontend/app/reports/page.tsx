'use client'

import { useEffect, useState } from 'react'
import { FileText, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api/client'

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [riskScore, setRiskScore] = useState<number | null>(null)
  const [riskLevel, setRiskLevel] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const s = await api.getDashboardSummary()
        if (cancelled) return
        setGeneratedAt(s.generated_at)
        setRiskScore(s.current.risk_score)
        setRiskLevel(s.current.risk_level)
        setError(null)
      } catch {
        if (!cancelled) {
          setError('Could not load report metadata from the API.')
          setGeneratedAt(null)
          setRiskScore(null)
          setRiskLevel(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DashboardHeader title="Reports" description="Live snapshots from model and API data" />

      <main className="flex-1 space-y-6 p-6">
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <FileText className="size-5 text-primary" />
              </div>
              <div>
                <CardTitle>Latest dashboard snapshot</CardTitle>
                <CardDescription>
                  Pulled from <code className="text-xs">GET /dashboard/summary</code>
                  {generatedAt && ` • Generated ${new Date(generatedAt).toLocaleString()}`}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {riskScore != null && (
              <p className="text-sm text-foreground">
                Current model risk score:{' '}
                <span className="font-semibold tabular-nums">{riskScore.toFixed(1)}</span>
                {riskLevel && (
                  <span className="text-muted-foreground capitalize"> ({riskLevel})</span>
                )}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              PDF or scheduled report exports are not generated server-side. Use the dashboard, model, and forecast
              pages for full charts, or export data from your API client / notebooks.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/">
                  Open dashboard
                  <ExternalLink className="ml-1 size-3" />
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/model">Model metrics</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/forecast">Forecast</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
