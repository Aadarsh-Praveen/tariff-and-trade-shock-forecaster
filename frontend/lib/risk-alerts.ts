/**
 * Build UI alerts from API responses (no mock data).
 */
import { api } from '@/lib/api/client'
import type { Alert, RiskSeverity } from '@/lib/data/types'

function severityFromScore(score: number): RiskSeverity {
  if (score >= 85) return 'critical'
  if (score >= 65) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

export async function fetchDerivedAlerts(): Promise<Alert[]> {
  const [summary, named] = await Promise.all([
    api.getDashboardSummary(),
    api.getNamedEvents(),
  ])

  const seen = new Set<string>()
  const out: Alert[] = []

  for (const ev of named.events) {
    const id = `ne-${ev.date}-${ev.event.slice(0, 24)}`
    if (seen.has(id)) continue
    seen.add(id)
    const score = ev.risk_score ?? 0
    out.push({
      id,
      title: ev.event,
      description: `${ev.period} • Model score ${score} (${ev.risk_level ?? '—'})`,
      severity: severityFromScore(score),
      category: 'geopolitical',
      supplierName: 'Named disruption event',
      createdAt: new Date((ev as { actual_date?: string }).actual_date || ev.date),
      isRead: false,
      isAcknowledged: false,
    })
  }

  const highs = summary.history
    .filter((h) => h.risk_score >= 60 || h.risk_level === 'high')
    .slice(-25)

  for (const h of highs) {
    const id = `wk-${h.date}`
    if (seen.has(id)) continue
    seen.add(id)
    out.push({
      id,
      title: `Elevated model risk (${h.risk_level})`,
      description: `Weekly disruption risk score ${h.risk_score} on ${h.date}.`,
      severity: severityFromScore(h.risk_score),
      category: 'operational',
      createdAt: new Date(h.date),
      isRead: false,
      isAcknowledged: false,
    })
  }

  out.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  return out.slice(0, 100)
}
