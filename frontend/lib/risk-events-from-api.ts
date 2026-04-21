/**
 * Map API disruption benchmarks to RiskEvent rows for the risk matrix (no mock suppliers).
 */
import { api } from '@/lib/api/client'
import type { RiskEvent, RiskSeverity } from '@/lib/data/types'

function severityFromScore(score: number): RiskSeverity {
  if (score >= 85) return 'critical'
  if (score >= 65) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

function likelihoodImpact(score: number): { likelihood: 1 | 2 | 3 | 4 | 5; impact: 1 | 2 | 3 | 4 | 5 } {
  const l = Math.min(5, Math.max(1, Math.round(score / 20))) as 1 | 2 | 3 | 4 | 5
  const im = Math.min(5, Math.max(1, Math.round(score / 22))) as 1 | 2 | 3 | 4 | 5
  return { likelihood: l, impact: im }
}

export async function fetchRiskMatrixEvents(): Promise<RiskEvent[]> {
  const [named, compare] = await Promise.all([api.getNamedEvents(), api.getComparisonEventsList()])
  const out: RiskEvent[] = []

  for (const ev of named.events) {
    const score = ev.risk_score ?? 50
    const { likelihood, impact } = likelihoodImpact(score)
    const sev = severityFromScore(score)
    out.push({
      id: `named-${ev.date}`,
      supplierId: 'model',
      supplierName: 'Historical benchmark',
      type: 'operational',
      severity: sev,
      likelihood,
      impact,
      title: ev.event,
      description: `${ev.period} • Score ${score}`,
      createdAt: new Date((ev as { actual_date?: string }).actual_date || ev.date),
      status: 'resolved',
    })
  }

  for (const ce of compare.events) {
    out.push({
      id: `cmp-${ce.key}`,
      supplierId: 'model',
      supplierName: 'Compare event',
      type: 'geopolitical',
      severity: 'high',
      likelihood: 4,
      impact: 4,
      title: ce.label,
      description: `Event key ${ce.key} • ${ce.date}`,
      createdAt: new Date(ce.date),
      status: 'resolved',
    })
  }

  return out
}
