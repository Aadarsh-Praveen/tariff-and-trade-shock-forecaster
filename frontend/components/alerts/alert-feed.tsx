'use client'

import { useState } from 'react'
import {
  AlertCircle, AlertTriangle, Info, CheckCircle,
  Check, Eye, MoreVertical, ChevronDown, Shield, TrendingUp, Clock, MapPin,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Alert as AlertType } from '@/lib/data/types'
import { formatRelativeTime, getCategoryLabel } from '@/lib/data/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const CORAL = '#df2531'
const AMBER = '#f59e0b'
const GREEN = '#22c55e'
const BLUE = '#6366f1'

interface AlertFeedProps {
  alerts: AlertType[]
  onMarkAsRead?: (alertId: string) => void
  onAcknowledge?: (alertId: string) => void
}

const severityConfig = {
  critical: { icon: AlertCircle, color: CORAL, bg: 'bg-coral-soft', border: 'border-l-coral', text: 'text-coral', badgeBg: 'bg-coral-soft', badgeText: 'text-coral', badgeBorder: 'border-coral' },
  high:     { icon: AlertTriangle, color: AMBER, bg: 'bg-amber-soft', border: 'border-l-amber', text: 'text-amber', badgeBg: 'bg-amber-soft', badgeText: 'text-amber', badgeBorder: 'border-amber' },
  medium:   { icon: Info, color: AMBER, bg: 'bg-amber-faint', border: 'border-l-amber', text: 'text-amber', badgeBg: 'bg-amber-faint', badgeText: 'text-amber', badgeBorder: 'border-amber' },
  low:      { icon: CheckCircle, color: GREEN, bg: 'bg-green-soft', border: 'border-l-green', text: 'text-green', badgeBg: 'bg-green-soft', badgeText: 'text-green', badgeBorder: 'border-green' },
}

// Generate contextual detail data based on alert properties
function getAlertDetails(alert: AlertType) {
  const severity = alert.severity
  const isHighSeverity = severity === 'critical' || severity === 'high'

  const riskImpact = severity === 'critical' ? 92 : severity === 'high' ? 78 : severity === 'medium' ? 55 : 32
  const responseTime = severity === 'critical' ? 'Immediate' : severity === 'high' ? 'Within 24 hours' : severity === 'medium' ? 'Within 1 week' : 'Next review cycle'

  const recommendations = isHighSeverity
    ? [
        'Escalate to senior risk management team immediately',
        'Review all affected supplier contracts and SLAs',
        'Activate contingency sourcing plans for critical components',
        'Schedule emergency stakeholder briefing',
      ]
    : [
        'Continue monitoring through standard review process',
        'Update risk register with latest assessment',
        'Review mitigation strategies at next team meeting',
      ]

  const timeline = [
    { time: 'Now', event: 'Alert triggered', status: 'active' as const },
    { time: formatRelativeTime(alert.createdAt), event: 'Risk condition detected', status: 'done' as const },
    { time: 'Pending', event: alert.isAcknowledged ? 'Acknowledged by team' : 'Awaiting acknowledgement', status: alert.isAcknowledged ? 'done' as const : 'pending' as const },
    { time: 'Pending', event: 'Resolution & follow-up', status: 'pending' as const },
  ]

  const affectedAreas = alert.category === 'financial'
    ? ['Procurement costs', 'Currency exposure', 'Payment terms']
    : alert.category === 'operational'
    ? ['Production capacity', 'Delivery timelines', 'Quality standards']
    : alert.category === 'geopolitical'
    ? ['Trade routes', 'Regulatory compliance', 'Tariff exposure']
    : ['Audit requirements', 'Documentation', 'Certification renewals']

  return { riskImpact, responseTime, recommendations, timeline, affectedAreas }
}

export function AlertFeed({ alerts, onMarkAsRead, onAcknowledge }: AlertFeedProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggleExpand = (alertId: string) => {
    setExpandedId(prev => prev === alertId ? null : alertId)
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => {
        const config = severityConfig[alert.severity]
        const Icon = config.icon
        const isExpanded = expandedId === alert.id
        const details = getAlertDetails(alert)

        return (
          <div
            key={alert.id}
            className={cn(
              'group relative rounded-lg border border-l-4 transition-all border-border overflow-hidden',
              config.border,
              !alert.isRead && 'bg-secondary/30'
            )}
          >
            {/* Main alert row — clickable */}
            <div
              className="flex items-start gap-4 p-4 cursor-pointer"
              onClick={() => {
                toggleExpand(alert.id)
                if (!alert.isRead) onMarkAsRead?.(alert.id)
              }}
            >
              <div className={cn('mt-0.5 rounded-lg p-2', config.bg)}>
                <Icon className={cn('size-5', config.text)} />
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className={cn('font-medium leading-none text-foreground', !alert.isRead && 'font-semibold')}>
                        {alert.title}
                      </h3>
                      {!alert.isRead && <span className="flex size-2 rounded-full bg-primary" />}
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.description}</p>
                  </div>

                  <div className="flex items-center gap-1">
                    <ChevronDown
                      className="size-4 text-muted-foreground transition-transform duration-200"
                      style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost" size="icon"
                          className="size-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground hover:bg-secondary"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-card border-border">
                        {!alert.isRead && (
                          <DropdownMenuItem onClick={() => onMarkAsRead?.(alert.id)}>
                            <Eye className="mr-2 size-4" /> Mark as read
                          </DropdownMenuItem>
                        )}
                        {!alert.isAcknowledged && (
                          <DropdownMenuItem onClick={() => onAcknowledge?.(alert.id)}>
                            <Check className="mr-2 size-4" /> Acknowledge
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn('inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold', config.badgeBg, config.badgeText, config.badgeBorder)}>
                    {alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)}
                  </span>
                  <span className="inline-flex items-center rounded-md border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground bg-transparent">
                    {getCategoryLabel(alert.category)}
                  </span>
                  {alert.supplierName && (
                    <span className="inline-flex items-center rounded-md border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground bg-secondary/50">
                      {alert.supplierName}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">{formatRelativeTime(alert.createdAt)}</span>
                  {alert.isAcknowledged && (
                    <span className="flex items-center gap-1 text-xs" style={{ color: GREEN }}>
                      <Check className="size-3" /> Acknowledged
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ═══ EXPANDABLE DETAIL PANEL ═══ */}
            <div
              style={{
                maxHeight: isExpanded ? 600 : 0,
                opacity: isExpanded ? 1 : 0,
                transition: 'max-height 0.3s ease, opacity 0.2s ease',
                overflow: 'hidden',
              }}
            >
              <div className="px-4 pb-5 pt-1 border-t border-border">
                <div className="grid gap-5 md:grid-cols-3 mt-4">

                  {/* Left — Risk Impact + Response */}
                  <div className="space-y-4">
                    {/* Risk Impact Score */}
                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-2">Risk Impact</div>
                      <div className="flex items-center gap-3">
                        <div style={{
                          width: 48, height: 48, borderRadius: 12,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          backgroundColor: `${config.color}12`, border: `1px solid ${config.color}25`,
                        }}>
                          <span style={{ fontSize: 18, fontWeight: 800, color: config.color }}>{details.riskImpact}</span>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground">{alert.severity.toUpperCase()} Severity</div>
                          <div className="text-xs text-muted-foreground">Impact score out of 100</div>
                        </div>
                      </div>
                      {/* Impact bar */}
                      <div style={{ width: '100%', height: 4, borderRadius: 2, backgroundColor: 'rgba(128,128,128,0.12)', overflow: 'hidden', marginTop: 8 }}>
                        <div style={{ width: `${details.riskImpact}%`, height: '100%', borderRadius: 2, backgroundColor: config.color, transition: 'width 0.4s ease' }} />
                      </div>
                    </div>

                    {/* Response Time */}
                    <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ backgroundColor: `${BLUE}08`, border: `1px solid ${BLUE}12` }}>
                      <Clock className="size-4" style={{ color: BLUE }} />
                      <div>
                        <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Response Required</div>
                        <div className="text-sm font-semibold text-foreground">{details.responseTime}</div>
                      </div>
                    </div>

                    {/* Affected Areas */}
                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-2">Affected Areas</div>
                      <div className="flex flex-wrap gap-1.5">
                        {details.affectedAreas.map((area) => (
                          <span key={area} className="text-[11px] px-2 py-1 rounded-md text-muted-foreground" style={{ backgroundColor: 'rgba(128,128,128,0.08)' }}>
                            {area}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Middle — Timeline */}
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-3">Event Timeline</div>
                    <div className="space-y-0">
                      {details.timeline.map((step, i) => {
                        const stepColor = step.status === 'done' ? GREEN : step.status === 'active' ? config.color : 'rgba(128,128,128,0.3)'
                        const isLast = i === details.timeline.length - 1
                        return (
                          <div key={i} className="flex gap-3">
                            {/* Dot + line */}
                            <div className="flex flex-col items-center">
                              <div style={{
                                width: 10, height: 10, borderRadius: '50%',
                                backgroundColor: stepColor,
                                boxShadow: step.status === 'active' ? `0 0 8px ${stepColor}60` : 'none',
                                flexShrink: 0, marginTop: 4,
                              }} />
                              {!isLast && (
                                <div style={{ width: 2, flex: 1, minHeight: 24, backgroundColor: 'rgba(128,128,128,0.12)', marginTop: 2, marginBottom: 2 }} />
                              )}
                            </div>
                            {/* Content */}
                            <div className="pb-4">
                              <div className="text-xs font-medium text-foreground">{step.event}</div>
                              <div className="text-[10px] text-muted-foreground">{step.time}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Right — Recommendations */}
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-3">Recommended Actions</div>
                    <div className="space-y-2">
                      {details.recommendations.map((rec, i) => (
                        <div key={i} className="flex gap-2 items-start">
                          <div style={{
                            width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            backgroundColor: `${config.color}10`, border: `1px solid ${config.color}20`,
                            fontSize: 9, fontWeight: 700, color: config.color,
                          }}>
                            {i + 1}
                          </div>
                          <span className="text-xs text-muted-foreground leading-relaxed">{rec}</span>
                        </div>
                      ))}
                    </div>

                    {/* Action buttons */}
                    {!alert.isAcknowledged && (
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); onAcknowledge?.(alert.id) }}
                          className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                          style={{ backgroundColor: `${config.color}12`, border: `1px solid ${config.color}30`, color: config.color }}
                        >
                          <Check className="size-3 inline mr-1" />Acknowledge
                        </button>
                        {!alert.isRead && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onMarkAsRead?.(alert.id) }}
                            className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground border border-border hover:bg-secondary transition-all"
                          >
                            <Eye className="size-3 inline mr-1" />Mark Read
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}