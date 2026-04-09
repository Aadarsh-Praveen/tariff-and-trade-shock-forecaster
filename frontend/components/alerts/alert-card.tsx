'use client'

import { AlertCircle, AlertTriangle, Info, CheckCircle, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Alert } from '@/lib/data/types'
import { formatRelativeTime } from '@/lib/data/utils'

interface AlertCardProps {
  alert: Alert
  onClick?: () => void
}

const severityConfig = {
  critical: {
    icon: AlertCircle,
    bg: 'bg-[rgba(223,37,49,0.12)]',
    border: 'border-[rgba(223,37,49,0.3)]',
    text: 'text-[#df2531]',
  },
  high: {
    icon: AlertTriangle,
    bg: 'bg-[rgba(223,37,49,0.12)]',
    border: 'border-[rgba(223,37,49,0.3)]',
    text: 'text-[#df2531]',
  },
  medium: {
    icon: Info,
    bg: 'bg-[rgba(245,158,11,0.12)]',
    border: 'border-[rgba(245,158,11,0.3)]',
    text: 'text-[#f59e0b]',
  },
  low: {
    icon: CheckCircle,
    bg: 'bg-[rgba(34,197,94,0.12)]',
    border: 'border-[rgba(34,197,94,0.3)]',
    text: 'text-[#22c55e]',
  },
}

export function AlertCard({ alert, onClick }: AlertCardProps) {
  const config = severityConfig[alert.severity]
  const Icon = config.icon
  
  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-all border-neutral bg-neutral-dark hover:bg-neutral-hover',
        !alert.isRead && 'bg-red-8 border-red-20'
      )}
    >
      <div className={cn('rounded-lg p-2 border', config.bg, config.border)}>
        <Icon className={cn('size-4', config.text)} />
      </div>
      
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className={cn(
            'text-sm font-medium leading-none',
            !alert.isRead && 'font-semibold'
          )}>
            {alert.title}
          </p>
          {!alert.isRead && (
            <span className="flex size-2 rounded-full bg-[#df2531] shadow-[0_0_8px_rgba(223,37,49,0.6)]" />
          )}
        </div>
        <p className="line-clamp-2 text-sm text-70">
          {alert.description}
        </p>
        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs text-45">
            {formatRelativeTime(alert.createdAt)}
          </span>
          {alert.supplierName && (
            <>
              <span className="text-45">·</span>
              <span className="text-xs text-45">
                {alert.supplierName}
              </span>
            </>
          )}
        </div>
      </div>
      
      <ChevronRight className="size-4 text-45 opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  )
}
