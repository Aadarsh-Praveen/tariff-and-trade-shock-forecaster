'use client'

import { useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  Check,
  Eye,
  MoreVertical,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Alert as AlertType } from '@/lib/data/types'
import { formatRelativeTime, getCategoryLabel } from '@/lib/data/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface AlertFeedProps {
  alerts: AlertType[]
  onMarkAsRead?: (alertId: string) => void
  onAcknowledge?: (alertId: string) => void
}

const severityConfig = {
  critical: {
    icon: AlertCircle,
    bg: 'bg-risk-critical/10',
    border: 'border-l-risk-critical',
    text: 'text-risk-critical',
    badge: 'border-risk-critical/30 bg-risk-critical/10 text-risk-critical',
  },
  high: {
    icon: AlertTriangle,
    bg: 'bg-risk-high/10',
    border: 'border-l-risk-high',
    text: 'text-risk-high',
    badge: 'border-risk-high/30 bg-risk-high/10 text-risk-high',
  },
  medium: {
    icon: Info,
    bg: 'bg-risk-medium/10',
    border: 'border-l-risk-medium',
    text: 'text-risk-medium',
    badge: 'border-risk-medium/30 bg-risk-medium/10 text-risk-medium',
  },
  low: {
    icon: CheckCircle,
    bg: 'bg-risk-low/10',
    border: 'border-l-risk-low',
    text: 'text-risk-low',
    badge: 'border-risk-low/30 bg-risk-low/10 text-risk-low',
  },
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
              'group relative rounded-lg border border-l-4 p-4 transition-colors',
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
                      <h3 className={cn(
                        'font-medium leading-none',
                        !alert.isRead && 'font-semibold'
                      )}>
                        {alert.title}
                      </h3>
                      {!alert.isRead && (
                        <span className="flex size-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {alert.description}
                    </p>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 opacity-0 group-hover:opacity-100"
                      >
                        <MoreVertical className="size-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {!alert.isRead && (
                        <DropdownMenuItem onClick={() => onMarkAsRead?.(alert.id)}>
                          <Eye className="mr-2 size-4" />
                          Mark as read
                        </DropdownMenuItem>
                      )}
                      {!alert.isAcknowledged && (
                        <DropdownMenuItem onClick={() => onAcknowledge?.(alert.id)}>
                          <Check className="mr-2 size-4" />
                          Acknowledge
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={config.badge}>
                    {alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)}
                  </Badge>
                  <Badge variant="outline">
                    {getCategoryLabel(alert.category)}
                  </Badge>
                  {alert.supplierName && (
                    <Badge variant="secondary">
                      {alert.supplierName}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(alert.createdAt)}
                  </span>
                  {alert.isAcknowledged && (
                    <span className="flex items-center gap-1 text-xs text-risk-low">
                      <Check className="size-3" />
                      Acknowledged
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
