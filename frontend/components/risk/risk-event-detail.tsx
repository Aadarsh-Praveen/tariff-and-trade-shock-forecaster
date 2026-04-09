'use client'

import { AlertCircle, AlertTriangle, Info, CheckCircle, Building2, Calendar, Tag, ListChecks } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RiskEvent } from '@/lib/data/types'
import { formatDate, getCategoryLabel } from '@/lib/data/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface RiskEventDetailProps {
  event: RiskEvent | null
}

const severityConfig = {
  critical: {
    icon: AlertCircle,
    bg: 'bg-risk-critical/10',
    text: 'text-risk-critical',
    badge: 'border-risk-critical/30 bg-risk-critical/10 text-risk-critical',
  },
  high: {
    icon: AlertTriangle,
    bg: 'bg-risk-high/10',
    text: 'text-risk-high',
    badge: 'border-risk-high/30 bg-risk-high/10 text-risk-high',
  },
  medium: {
    icon: Info,
    bg: 'bg-risk-medium/10',
    text: 'text-risk-medium',
    badge: 'border-risk-medium/30 bg-risk-medium/10 text-risk-medium',
  },
  low: {
    icon: CheckCircle,
    bg: 'bg-risk-low/10',
    text: 'text-risk-low',
    badge: 'border-risk-low/30 bg-risk-low/10 text-risk-low',
  },
}

const statusConfig = {
  open: { label: 'Open', className: 'border-risk-high/30 bg-risk-high/10 text-risk-high' },
  mitigating: { label: 'Mitigating', className: 'border-risk-medium/30 bg-risk-medium/10 text-risk-medium' },
  resolved: { label: 'Resolved', className: 'border-risk-low/30 bg-risk-low/10 text-risk-low' },
}

export function RiskEventDetail({ event }: RiskEventDetailProps) {
  if (!event) {
    return (
      <Card className="h-full">
        <CardContent className="flex h-full items-center justify-center p-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-secondary">
              <Info className="size-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Select a risk event from the matrix to view details
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  const config = severityConfig[event.severity]
  const Icon = config.icon
  const status = statusConfig[event.status]
  
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className={cn('rounded-lg p-2', config.bg)}>
            <Icon className={cn('size-5', config.text)} />
          </div>
          <div className="flex-1 space-y-1">
            <CardTitle className="text-base leading-tight">{event.title}</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={config.badge}>
                {event.severity.charAt(0).toUpperCase() + event.severity.slice(1)}
              </Badge>
              <Badge variant="outline" className={status.className}>
                {status.label}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{event.description}</p>
        
        <Separator />
        
        <div className="grid gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground">Supplier:</span>
            <span className="font-medium">{event.supplierName}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Tag className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground">Category:</span>
            <span className="font-medium">{getCategoryLabel(event.type)}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground">Created:</span>
            <span className="font-medium">{formatDate(event.createdAt)}</span>
          </div>
          
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Likelihood:</span>
              <span className="ml-1 font-medium">{event.likelihood}/5</span>
            </div>
            <div>
              <span className="text-muted-foreground">Impact:</span>
              <span className="ml-1 font-medium">{event.impact}/5</span>
            </div>
          </div>
        </div>
        
        {event.mitigationSteps && event.mitigationSteps.length > 0 && (
          <>
            <Separator />
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <ListChecks className="size-4" />
                Mitigation Steps
              </div>
              <ul className="space-y-1.5">
                {event.mitigationSteps.map((step, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
