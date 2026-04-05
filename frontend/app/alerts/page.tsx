'use client'

import { useState, useMemo } from 'react'
import { Filter, Bell, CheckCircle, Clock, AlertTriangle, Mail } from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { AlertFeed } from '@/components/alerts/alert-feed'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { alerts as initialAlerts } from '@/lib/data/mock-data'
import type { Alert, RiskSeverity, RiskCategory } from '@/lib/data/types'

export default function AlertsPage() {
  const [localAlerts, setLocalAlerts] = useState<Alert[]>(initialAlerts)
  const [severityFilter, setSeverityFilter] = useState<RiskSeverity | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<RiskCategory | 'all'>('all')
  const [tab, setTab] = useState<'all' | 'unread' | 'acknowledged'>('all')
  
  // Subscription state
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
    setLocalAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, isRead: true } : a))
    )
  }
  
  const handleAcknowledge = (alertId: string) => {
    setLocalAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, isRead: true, isAcknowledged: true } : a))
    )
  }
  
  const handleMarkAllAsRead = () => {
    setLocalAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })))
  }
  
  const handleSubscribe = async () => {
    try {
      const response = await fetch('http://localhost:8000/alerts/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          threshold: parseInt(threshold),
          commodities: 'all',
          frequency: 'weekly',
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        setSubscriptionStatus(`✓ Subscribed! ${data.message}`)
        setTimeout(() => {
          setSubscriptionOpen(false)
          setSubscriptionStatus(null)
          setEmail('')
        }, 3000)
      } else {
        setSubscriptionStatus('Failed to subscribe. Please try again.')
      }
    } catch (err) {
      setSubscriptionStatus('Error: Could not connect to API')
    }
  }
  
  // Stats
  const stats = useMemo(() => {
    const unread = localAlerts.filter((a) => !a.isRead).length
    const critical = localAlerts.filter((a) => a.severity === 'critical').length
    const acknowledged = localAlerts.filter((a) => a.isAcknowledged).length
    const avgResponseTime = 4.2 // hours (mock)
    return { total: localAlerts.length, unread, critical, acknowledged, avgResponseTime }
  }, [localAlerts])
  
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DashboardHeader
        title="Alerts & Notifications"
        description="Monitor and respond to risk alerts"
      />
      
      <main className="flex-1 space-y-6 p-6 bg-background">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-red-20 bg-red-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-red-12 p-2">
                  <Bell className="size-5 text-[#df2531]" />
                </div>
                <div>
                  <p className="text-sm text-45">Total Alerts</p>
                  <p className="text-2xl font-bold tabular-nums text-100">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-20 bg-red-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-red-12 p-2">
                  <AlertTriangle className="size-5 text-[#df2531]" />
                </div>
                <div>
                  <p className="text-sm text-45">Critical</p>
                  <p className="text-2xl font-bold tabular-nums text-[#df2531]">{stats.critical}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-20 bg-red-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-red-8 p-2">
                  <Clock className="size-5 text-70" />
                </div>
                <div>
                  <p className="text-sm text-45">Unread</p>
                  <p className="text-2xl font-bold tabular-nums text-100">{stats.unread}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-20 bg-red-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-[rgba(34,197,94,0.12)] p-2">
                  <CheckCircle className="size-5 text-[#22c55e]" />
                </div>
                <div>
                  <p className="text-sm text-45">Acknowledged</p>
                  <p className="text-2xl font-bold tabular-nums text-[#22c55e]">{stats.acknowledged}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Email Subscription */}
        <Card className="border-red-20 bg-red-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="size-5" />
                  Email Alert Subscription
                </CardTitle>
                <CardDescription className="text-45">
                  Get notified when risk score exceeds your threshold
                </CardDescription>
              </div>
              <Dialog open={subscriptionOpen} onOpenChange={setSubscriptionOpen}>
                <DialogTrigger asChild>
                  <Button variant="default" className="bg-red-15 hover:bg-red-12 border-red-40">
                    Subscribe
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-background border-red-30">
                  <DialogHeader>
                    <DialogTitle className="text-100">Subscribe to Risk Alerts</DialogTitle>
                    <DialogDescription className="text-45">
                      Enter your email and set a risk threshold to receive alerts
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-100">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your.email@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-background border-red-20 text-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="threshold" className="text-100">Alert Threshold (0-100)</Label>
                      <Input
                        id="threshold"
                        type="number"
                        min="1"
                        max="100"
                        value={threshold}
                        onChange={(e) => setThreshold(e.target.value)}
                        className="bg-background border-red-20 text-100"
                      />
                      <p className="text-xs text-45">
                        You'll be alerted when risk score exceeds this value
                      </p>
                    </div>
                    {subscriptionStatus && (
                      <div className={`text-sm p-3 rounded-lg ${
                        subscriptionStatus.startsWith('✓')
                          ? 'bg-[rgba(34,197,94,0.12)] text-[#22c55e] border border-[rgba(34,197,94,0.3)]'
                          : 'bg-red-12 text-[#df2531] border border-red-30'
                      }`}>
                        {subscriptionStatus}
                      </div>
                    )}
                    <Button
                      onClick={handleSubscribe}
                      disabled={!email || !threshold}
                      className="w-full bg-red-15 hover:bg-red-12 border border-red-40"
                    >
                      Subscribe to Alerts
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-70">
              Receive email notifications when the risk score exceeds your defined threshold.
              Weekly frequency by default. You can unsubscribe at any time.
            </p>
          </CardContent>
        </Card>
        
        {/* Alerts List */}
        <Card className="border-red-20 bg-red-4">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Alert Feed</CardTitle>
                <CardDescription className="text-45">
                  {filteredAlerts.length} alerts
                </CardDescription>
              </div>
              
              <div className="flex items-center gap-2">
                {stats.unread > 0 && (
                  <Button variant="outline" size="sm" onClick={handleMarkAllAsRead} className="border-red-20 hover:bg-red-8 text-70 hover:text-100">
                    Mark all as read
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <TabsList className="bg-red-8 border border-red-20">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="unread">
                    Unread
                    {stats.unread > 0 && (
                      <span className="ml-1.5 flex size-5 items-center justify-center rounded-full bg-[#df2531] text-[10px] text-white">
                        {stats.unread}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="acknowledged">Acknowledged</TabsTrigger>
                </TabsList>
                
                <div className="flex items-center gap-2">
                  <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as RiskSeverity | 'all')}>
                    <SelectTrigger className="w-32 bg-background border-red-20 text-100">
                      <SelectValue placeholder="Severity" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-red-30">
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as RiskCategory | 'all')}>
                    <SelectTrigger className="w-36 bg-background border-red-20 text-100">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-red-30">
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="financial">Financial</SelectItem>
                      <SelectItem value="operational">Operational</SelectItem>
                      <SelectItem value="geopolitical">Geopolitical</SelectItem>
                      <SelectItem value="compliance">Compliance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="mt-4">
                <TabsContent value="all" className="m-0">
                  <AlertFeed
                    alerts={filteredAlerts}
                    onMarkAsRead={handleMarkAsRead}
                    onAcknowledge={handleAcknowledge}
                  />
                </TabsContent>
                <TabsContent value="unread" className="m-0">
                  <AlertFeed
                    alerts={filteredAlerts}
                    onMarkAsRead={handleMarkAsRead}
                    onAcknowledge={handleAcknowledge}
                  />
                </TabsContent>
                <TabsContent value="acknowledged" className="m-0">
                  <AlertFeed
                    alerts={filteredAlerts}
                    onMarkAsRead={handleMarkAsRead}
                    onAcknowledge={handleAcknowledge}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
