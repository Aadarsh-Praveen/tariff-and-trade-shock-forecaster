'use client'

import { useState, useMemo } from 'react'
import { Bell, CheckCircle, Clock, AlertTriangle, Mail, Lightbulb } from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { AlertFeed } from '@/components/alerts/alert-feed'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { alerts as initialAlerts } from '@/lib/data/mock-data'
import type { Alert, RiskSeverity, RiskCategory } from '@/lib/data/types'

const CORAL = '#df2531'
const AMBER = '#f59e0b'
const GREEN = '#22c55e'
const BLUE = '#6366f1'
const PURPLE = '#8b5cf6'

export default function AlertsPage() {
  const [localAlerts, setLocalAlerts] = useState<Alert[]>(initialAlerts)
  const [severityFilter, setSeverityFilter] = useState<RiskSeverity | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<RiskCategory | 'all'>('all')
  const [tab, setTab] = useState<'all' | 'unread' | 'acknowledged'>('all')

  const [email, setEmail] = useState('')
  const [threshold, setThreshold] = useState('65')
  const [subscriptionOpen, setSubscriptionOpen] = useState(false)
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null)

  const filteredAlerts = useMemo(() => {
    return localAlerts.filter((alert) => {
      if (severityFilter !== 'all' && alert.severity !== severityFilter) return false
      if (categoryFilter !== 'all' && alert.category !== categoryFilter) return false
      if (tab === 'unread' && alert.isRead) return false
      if (tab === 'acknowledged' && !alert.isAcknowledged) return false
      return true
    })
  }, [localAlerts, severityFilter, categoryFilter, tab])

  const handleMarkAsRead = (alertId: string) => {
    setLocalAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, isRead: true } : a)))
  }
  const handleAcknowledge = (alertId: string) => {
    setLocalAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, isRead: true, isAcknowledged: true } : a)))
  }
  const handleMarkAllAsRead = () => {
    setLocalAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })))
  }

  const handleSubscribe = async () => {
    try {
      const response = await fetch('http://localhost:8000/alerts/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, threshold: parseInt(threshold), commodities: 'all', frequency: 'weekly' }),
      })
      if (response.ok) {
        const data = await response.json()
        setSubscriptionStatus(`✓ Subscribed! ${data.message}`)
        setTimeout(() => { setSubscriptionOpen(false); setSubscriptionStatus(null); setEmail(''); }, 3000)
      } else {
        setSubscriptionStatus('Failed to subscribe. Please try again.')
      }
    } catch { setSubscriptionStatus('Error: Could not connect to API') }
  }

  const stats = useMemo(() => {
    const unread = localAlerts.filter((a) => !a.isRead).length
    const critical = localAlerts.filter((a) => a.severity === 'critical').length
    const acknowledged = localAlerts.filter((a) => a.isAcknowledged).length
    return { total: localAlerts.length, unread, critical, acknowledged }
  }, [localAlerts])

  const STAT_CARDS = [
    { icon: Bell, label: 'Total Alerts', value: stats.total, color: CORAL },
    { icon: AlertTriangle, label: 'Critical', value: stats.critical, color: CORAL },
    { icon: Clock, label: 'Unread', value: stats.unread, color: AMBER },
    { icon: CheckCircle, label: 'Acknowledged', value: stats.acknowledged, color: GREEN },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DashboardHeader title="Alerts & Notifications" description="Monitor and respond to risk alerts" />

      <main className="flex-1 space-y-6 p-6">

        {/* ═══ STATS ═══ */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STAT_CARDS.map((s) => (
            <Card key={s.label} className="border-border bg-card overflow-hidden">
              <div style={{ height: 3, background: `linear-gradient(90deg, ${s.color}, ${s.color}00)` }} />
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: `${s.color}12`, border: `1px solid ${s.color}20`,
                  }}>
                    <s.icon className="size-5" style={{ color: s.color }} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">{s.label}</p>
                    <p className="text-2xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ═══ EMAIL SUBSCRIPTION ═══ */}
        <Card className="border-border bg-card overflow-hidden">
          <div style={{ height: 3, background: `linear-gradient(90deg, ${PURPLE}, ${PURPLE}00)` }} />
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: `${PURPLE}12`, border: `1px solid ${PURPLE}20`,
                }}>
                  <Mail className="size-4" style={{ color: PURPLE }} />
                </div>
                <div>
                  <CardTitle className="text-foreground text-base">Email Alert Subscription</CardTitle>
                  <CardDescription className="text-xs mt-0.5">Get notified when risk score exceeds your threshold</CardDescription>
                </div>
              </div>
              <Dialog open={subscriptionOpen} onOpenChange={setSubscriptionOpen}>
                <DialogTrigger asChild>
                  <button
                    className="rounded-lg px-4 py-2 text-sm font-semibold transition-all"
                    style={{
                      backgroundColor: `${PURPLE}12`,
                      border: `1px solid ${PURPLE}35`,
                      color: PURPLE,
                      cursor: 'pointer',
                    }}
                  >
                    Subscribe
                  </button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Subscribe to Risk Alerts</DialogTitle>
                    <DialogDescription>Enter your email and set a risk threshold to receive alerts</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <label className="text-[13px] font-medium text-foreground">Email Address</label>
                      <input
                        type="email" placeholder="your.email@example.com" value={email} onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-9 px-3 rounded-md text-[13px] text-foreground bg-input border border-border focus:border-primary outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[13px] font-medium text-foreground">Alert Threshold (0-100)</label>
                      <input
                        type="number" min="1" max="100" value={threshold} onChange={(e) => setThreshold(e.target.value)}
                        className="w-full h-9 px-3 rounded-md text-[13px] text-foreground bg-input border border-border focus:border-primary outline-none"
                      />
                      <p className="text-[11px] text-muted-foreground">You'll be alerted when risk score exceeds this value</p>
                    </div>
                    {subscriptionStatus && (
                      <div style={{
                        padding: '10px 14px', borderRadius: 10, fontSize: 13,
                        backgroundColor: subscriptionStatus.startsWith('✓') ? `${GREEN}12` : `${CORAL}12`,
                        border: `1px solid ${subscriptionStatus.startsWith('✓') ? `${GREEN}30` : `${CORAL}30`}`,
                        color: subscriptionStatus.startsWith('✓') ? GREEN : CORAL,
                      }}>
                        {subscriptionStatus}
                      </div>
                    )}
                    <button
                      onClick={handleSubscribe} disabled={!email || !threshold}
                      className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: `${PURPLE}12`,
                        border: `1px solid ${PURPLE}35`,
                        color: PURPLE,
                        cursor: !email || !threshold ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Subscribe to Alerts
                    </button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              Receive email notifications when the risk score exceeds your defined threshold.
              Weekly frequency by default. You can unsubscribe at any time.
            </p>
          </CardContent>
        </Card>

        {/* ═══ ALERT FEED — kept as-is per request ═══ */}
        <Card className="border-border bg-card overflow-hidden">
          <div style={{ height: 3, background: `linear-gradient(90deg, ${CORAL}, ${AMBER}40 50%, transparent)` }} />
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: `${CORAL}12`, border: `1px solid ${CORAL}20`,
                }}>
                  <Bell className="size-4" style={{ color: CORAL }} />
                </div>
                <div>
                  <CardTitle className="text-foreground text-base">Alert Feed</CardTitle>
                  <CardDescription className="text-xs mt-0.5">{filteredAlerts.length} alerts</CardDescription>
                </div>
              </div>
              {stats.unread > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground border border-border hover:bg-secondary hover:text-foreground transition-colors"
                >
                  Mark all as read
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <TabsList className="bg-secondary border border-border">
                  <TabsTrigger value="all" className="text-muted-foreground data-[state=active]:bg-foreground data-[state=active]:text-background">
                    All
                  </TabsTrigger>
                  <TabsTrigger value="unread" className="text-muted-foreground data-[state=active]:bg-foreground data-[state=active]:text-background">
                    Unread
                    {stats.unread > 0 && (
                      <span className="ml-1.5 flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-semibold"
                        style={{ backgroundColor: CORAL, color: '#fff' }}>
                        {stats.unread}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="acknowledged" className="text-muted-foreground data-[state=active]:bg-foreground data-[state=active]:text-background">
                    Acknowledged
                  </TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-2">
                  <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as RiskSeverity | 'all')}>
                    <SelectTrigger className="w-32 bg-card border-border text-muted-foreground">
                      <SelectValue placeholder="Severity" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {['all', 'critical', 'high', 'medium', 'low'].map((v) => (
                        <SelectItem key={v} value={v} className="text-foreground">
                          {v.charAt(0).toUpperCase() + v.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as RiskCategory | 'all')}>
                    <SelectTrigger className="w-36 bg-card border-border text-muted-foreground">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {['all', 'financial', 'operational', 'geopolitical', 'compliance'].map((v) => (
                        <SelectItem key={v} value={v} className="text-foreground">
                          {v.charAt(0).toUpperCase() + v.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-4">
                <TabsContent value="all" className="m-0">
                  <AlertFeed alerts={filteredAlerts} onMarkAsRead={handleMarkAsRead} onAcknowledge={handleAcknowledge} />
                </TabsContent>
                <TabsContent value="unread" className="m-0">
                  <AlertFeed alerts={filteredAlerts} onMarkAsRead={handleMarkAsRead} onAcknowledge={handleAcknowledge} />
                </TabsContent>
                <TabsContent value="acknowledged" className="m-0">
                  <AlertFeed alerts={filteredAlerts} onMarkAsRead={handleMarkAsRead} onAcknowledge={handleAcknowledge} />
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}