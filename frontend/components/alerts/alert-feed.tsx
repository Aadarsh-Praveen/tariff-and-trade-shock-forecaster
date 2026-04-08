'use client'

import {
  AlertCircle, AlertTriangle, Info, CheckCircle,
  Check, Eye, MoreVertical,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Alert as AlertType } from '@/lib/data/types'
import { formatRelativeTime, getCategoryLabel } from '@/lib/data/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface AlertFeedProps {
  alerts: AlertType[]
  onMarkAsRead?: (alertId: string) => void
  onAcknowledge?: (alertId: string) => void
}

const severityConfig = {
  critical: { icon: AlertCircle, bg: 'bg-coral-soft', border: 'border-l-coral', text: 'text-coral', badgeBg: 'bg-coral-soft', badgeText: 'text-coral', badgeBorder: 'border-coral' },
  high:     { icon: AlertTriangle, bg: 'bg-amber-soft', border: 'border-l-amber', text: 'text-amber', badgeBg: 'bg-amber-soft', badgeText: 'text-amber', badgeBorder: 'border-amber' },
  medium:   { icon: Info, bg: 'bg-amber-faint', border: 'border-l-amber', text: 'text-amber', badgeBg: 'bg-amber-faint', badgeText: 'text-amber', badgeBorder: 'border-amber' },
  low:      { icon: CheckCircle, bg: 'bg-green-soft', border: 'border-l-green', text: 'text-green', badgeBg: 'bg-green-soft', badgeText: 'text-green', badgeBorder: 'border-green' },
}

export function AlertFeed({ alerts, onMarkAsRead, onAcknowledge }: AlertFeedProps) {
  return (
    <div className="space-y-3">
      {alerts.map((alert) => {
        const config = severityConfig[alert.severity]
        const Icon = config.icon
        
        return (
          <div
            key={alert.id}
            className={cn(
              'group relative rounded-lg border border-l-4 p-4 transition-colors border-border',
              config.border,
              !alert.isRead && 'bg-secondary/30'
            )}
          >
            <div className="flex items-start gap-4">
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
                    <p className="text-sm text-t2">{alert.description}</p>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground hover:bg-secondary">
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
                
                <div className="flex flex-wrap items-center gap-2">
                  {/* Severity badge — using custom classes that now resolve correctly */}
                  <span className={cn('inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold', config.badgeBg, config.badgeText, config.badgeBorder)}>
                    {alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)}
                  </span>
                  {/* Category badge */}
                  <span className="inline-flex items-center rounded-md border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground bg-transparent">
                    {getCategoryLabel(alert.category)}
                  </span>
                  {/* Supplier badge */}
                  {alert.supplierName && (
                    <span className="inline-flex items-center rounded-md border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground bg-secondary/50">
                      {alert.supplierName}
                    </span>
                  )}
                  <span className="text-xs text-t3">{formatRelativeTime(alert.createdAt)}</span>
                  {alert.isAcknowledged && (
                    <span className="flex items-center gap-1 text-xs text-green">
                      <Check className="size-3" /> Acknowledged
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
