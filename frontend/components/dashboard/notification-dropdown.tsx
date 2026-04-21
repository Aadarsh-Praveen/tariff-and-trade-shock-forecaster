'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Check, Eye, Clock, AlertTriangle, CheckCircle, Info, X } from 'lucide-react'
import type { Alert as AlertType } from '@/lib/data/types'
import { fetchDerivedAlerts } from '@/lib/risk-alerts'
import { formatRelativeTime } from '@/lib/data/utils'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useDashboard } from './dashboard-context'

const severityIcons = {
  critical: AlertTriangle,
  high: AlertTriangle,
  medium: Info,
  low: CheckCircle,
}

const severityColors = {
  critical: 'text-coral',
  high: 'text-amber',
  medium: 'text-amber',
  low: 'text-green',
}

export function NotificationDropdown() {
  const router = useRouter()
  const { unreadAlertCount, setUnreadAlertCount } = useDashboard()
  const [localAlerts, setLocalAlerts] = useState<AlertType[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const alerts = await fetchDerivedAlerts()
        if (!cancelled) setLocalAlerts(alerts.slice(0, 12))
      } catch {
        if (!cancelled) setLocalAlerts([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Update unread count when alerts change
  useEffect(() => {
    const unreadCount = localAlerts.filter((a) => !a.isRead).length
    setUnreadAlertCount(unreadCount)
  }, [localAlerts, setUnreadAlertCount])

  const handleMarkAsRead = (alertId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setLocalAlerts(prev => 
      prev.map(a => a.id === alertId ? { ...a, isRead: true } : a)
    )
  }

  const handleMarkAllAsRead = () => {
    setLocalAlerts(prev => prev.map(a => ({ ...a, isRead: true })))
  }

  const handleAlertClick = (alertId: string) => {
    setLocalAlerts(prev => 
      prev.map(a => a.id === alertId ? { ...a, isRead: true } : a)
    )
    setOpen(false)
    router.push('/alerts')
  }

  const handleViewAll = () => {
    setOpen(false)
    router.push('/alerts')
  }

  const unreadAlerts = localAlerts.filter(a => !a.isRead)
  const recentAlerts = localAlerts.slice(0, 5)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button 
          className="relative flex items-center justify-center w-9 h-9 rounded-md transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary/20"
          aria-label={`Notifications (${unreadAlertCount} unread)`}
        >
          <Bell className="size-5 text-muted-foreground" />
          {unreadAlertCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-coral text-white text-[9px] font-bold animate-pulse">
              {unreadAlertCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-[380px] bg-card border-border p-0"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <h3 className="font-semibold text-foreground text-[13px]">Notifications</h3>
            {unreadAlertCount > 0 && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {unreadAlertCount} unread {unreadAlertCount === 1 ? 'alert' : 'alerts'}
              </p>
            )}
          </div>
          {unreadAlertCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="h-7 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <Check className="size-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <div className="max-h-[400px] overflow-y-auto">
          {recentAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Bell className="size-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No notifications</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                You're all caught up!
              </p>
            </div>
          ) : (
            recentAlerts.map((alert) => {
              const Icon = severityIcons[alert.severity]
              const colorClass = severityColors[alert.severity]
              
              return (
                <div
                  key={alert.id}
                  className={cn(
                    "relative flex gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-border last:border-0",
                    !alert.isRead && "bg-secondary/30",
                    "hover:bg-secondary/50"
                  )}
                  onClick={() => handleAlertClick(alert.id)}
                >
                  {/* Unread indicator */}
                  {!alert.isRead && (
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-coral" />
                  )}

                  {/* Icon */}
                  <div className={cn(
                    "flex-shrink-0 rounded-lg p-1.5 bg-secondary/50",
                    !alert.isRead && "bg-opacity-100"
                  )}>
                    <Icon className={cn("size-4", colorClass)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn(
                        "text-[13px] text-foreground leading-tight line-clamp-2",
                        !alert.isRead && "font-medium"
                      )}>
                        {alert.title}
                      </p>
                      {!alert.isRead && (
                        <button
                          onClick={(e) => handleMarkAsRead(alert.id, e)}
                          className="flex-shrink-0 text-muted-foreground hover:text-foreground p-1 rounded-sm hover:bg-secondary transition-colors"
                          title="Mark as read"
                        >
                          <Check className="size-3" />
                        </button>
                      )}
                    </div>
                    
                    <p className="text-[11px] text-muted-foreground line-clamp-1">
                      {alert.description}
                    </p>
                    
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <Clock className="size-3" />
                      <span>{formatRelativeTime(alert.createdAt)}</span>
                      {alert.supplierName && (
                        <>
                          <span>•</span>
                          <span className="truncate">{alert.supplierName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        {recentAlerts.length > 0 && (
          <>
            <DropdownMenuSeparator className="bg-border" />
            <div className="p-2">
              <Button
                variant="ghost"
                className="w-full text-[12px] text-muted-foreground hover:text-foreground"
                onClick={handleViewAll}
              >
                View all notifications
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
