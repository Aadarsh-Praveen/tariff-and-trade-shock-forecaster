import type { RiskSeverity, RiskCategory } from './types'

export function getRiskColor(severity: RiskSeverity): string {
  const colors: Record<RiskSeverity, string> = {
    critical: 'var(--risk-critical)',
    high: 'var(--risk-high)',
    medium: 'var(--risk-medium)',
    low: 'var(--risk-low)',
  }
  return colors[severity]
}

export function getRiskColorClass(severity: RiskSeverity): string {
  const classes: Record<RiskSeverity, string> = {
    critical: 'text-risk-critical',
    high: 'text-risk-high',
    medium: 'text-risk-medium',
    low: 'text-risk-low',
  }
  return classes[severity]
}

export function getRiskBgClass(severity: RiskSeverity): string {
  const classes: Record<RiskSeverity, string> = {
    critical: 'bg-risk-critical',
    high: 'bg-risk-high',
    medium: 'bg-risk-medium',
    low: 'bg-risk-low',
  }
  return classes[severity]
}

export function getScoreSeverity(score: number): RiskSeverity {
  if (score >= 75) return 'critical'
  if (score >= 50) return 'high'
  if (score >= 25) return 'medium'
  return 'low'
}

export function getCategoryIcon(category: RiskCategory): string {
  const icons: Record<RiskCategory, string> = {
    financial: 'DollarSign',
    operational: 'Settings',
    geopolitical: 'Globe',
    compliance: 'Shield',
  }
  return icons[category]
}

export function getCategoryLabel(category: RiskCategory): string {
  const labels: Record<RiskCategory, string> = {
    financial: 'Financial',
    operational: 'Operational',
    geopolitical: 'Geopolitical',
    compliance: 'Compliance',
  }
  return labels[category]
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  
  return formatDate(date)
}

export function calculateTrendPercentage(current: number, previous: number): number {
  if (previous === 0) return 0
  return Math.round(((current - previous) / previous) * 100 * 10) / 10
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
