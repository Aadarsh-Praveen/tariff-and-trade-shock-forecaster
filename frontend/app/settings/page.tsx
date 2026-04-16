'use client'

import { useState, useEffect } from 'react'
import { Bell, Shield, Link2, RefreshCw, Check, AlertTriangle } from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const CORAL = '#df2531'
const AMBER = '#f59e0b'
const GREEN = '#22c55e'
const BLUE = '#6366f1'
const PURPLE = '#8b5cf6'
const ORANGE = '#f97316'
const YELLOW = '#eab308'
const RED = '#ef4444'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function RiskSlider({
  value, onChange, min, max, step, color,
}: {
  value: number; onChange: (val: number[]) => void; min: number; max: number; step: number; color: string
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="relative flex items-center" style={{ height: 32 }}>
      <div className="absolute left-0 right-0 rounded-full" style={{ height: 6, backgroundColor: 'rgba(128,128,128,0.15)' }} />
      <div className="absolute left-0 rounded-full" style={{ height: 6, width: `${pct}%`, backgroundColor: color, opacity: 0.5 }} />
      <div className="absolute rounded-full" style={{
        width: 18, height: 18, backgroundColor: color,
        border: '3px solid rgba(128,128,128,0.3)',
        boxShadow: `0 0 10px ${color}66, 0 2px 4px rgba(0,0,0,0.3)`,
        left: `calc(${pct}% - 9px)`, cursor: 'grab', zIndex: 2,
      }} />
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange([Number(e.target.value)])}
        className="absolute inset-0 w-full opacity-0 cursor-pointer" style={{ height: 32, zIndex: 3 }}
      />
    </div>
  )
}

export default function SettingsPage() {
  const { toast } = useToast()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  const [criticalThreshold, setCriticalThreshold] = useState([75])
  const [highThreshold, setHighThreshold] = useState([50])
  const [mediumThreshold, setMediumThreshold] = useState([25])

  const [emailAlerts, setEmailAlerts] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [criticalOnly, setCriticalOnly] = useState(false)
  const [dailyDigest, setDailyDigest] = useState(true)
  const [weeklyReport, setWeeklyReport] = useState(true)

  const [refreshInterval, setRefreshInterval] = useState('15')

  // Load settings on mount
  useEffect(() => {
    fetch(`${API_BASE_URL}/settings`)
      .then(res => res.json())
      .then(data => {
        setCriticalThreshold([data.critical_threshold || 75])
        setHighThreshold([data.high_threshold || 50])
        setMediumThreshold([data.medium_threshold || 25])
        setEmailAlerts(data.email_alerts ?? true)
        setPushNotifications(data.push_notifications ?? true)
        setCriticalOnly(data.critical_only ?? false)
        setDailyDigest(data.daily_digest ?? true)
        setWeeklyReport(data.weekly_report ?? true)
        setRefreshInterval(String(data.refresh_interval || 15))
      })
      .catch(err => console.error('Failed to load settings:', err))
  }, [])

  const handleRefreshNow = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch(`${API_BASE_URL}/settings/refresh`, {
        method: 'POST',
      })
      const data = await response.json()
      
      if (response.ok) {
        toast({
          title: "Data Refreshed",
          description: `Successfully refreshed ${data.weeks_loaded} weeks of data.`,
        })
      } else {
        throw new Error(data.detail || 'Failed to refresh data')
      }
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: error instanceof Error ? error.message : 'Could not refresh data',
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleSaveSettings = async () => {
    setIsSaving(true)
    try {
      const settings = {
        refresh_interval: parseInt(refreshInterval),
        critical_threshold: criticalThreshold[0],
        high_threshold: highThreshold[0],
        medium_threshold: mediumThreshold[0],
        email_alerts: emailAlerts,
        push_notifications: pushNotifications,
        critical_only: criticalOnly,
        daily_digest: dailyDigest,
        weekly_report: weeklyReport,
      }

      const response = await fetch(`${API_BASE_URL}/settings/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })
      const data = await response.json()
      
      if (response.ok) {
        toast({
          title: "Settings Saved",
          description: "Your preferences have been saved successfully.",
        })
      } else {
        throw new Error(data.detail || 'Failed to save settings')
      }
    } catch (error) {
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : 'Could not save settings',
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const integrations = [
    { id: 'erp', name: 'SAP ERP', status: 'connected', lastSync: '2 min ago' },
    { id: 'crm', name: 'Salesforce CRM', status: 'connected', lastSync: '5 min ago' },
    { id: 'logistics', name: 'Oracle SCM', status: 'connected', lastSync: '1 hour ago' },
    { id: 'risk', name: 'Dun & Bradstreet', status: 'disconnected', lastSync: 'Never' },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DashboardHeader title="Settings" description="Configure dashboard preferences" />

      <main className="flex-1 space-y-6 p-6">

        {/* ═══ RISK THRESHOLDS ═══ */}
        <Card className="border-border bg-card overflow-hidden">
          <div style={{ height: 3, background: `linear-gradient(90deg, ${RED}, ${ORANGE}60 40%, ${YELLOW}40 70%, ${GREEN}00)` }} />
          <CardHeader>
            <div className="flex items-center gap-3">
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: `${CORAL}12`, border: `1px solid ${CORAL}20`,
              }}>
                <Shield className="size-4" style={{ color: CORAL }} />
              </div>
              <div>
                <CardTitle className="text-foreground text-base">Risk Thresholds</CardTitle>
                <CardDescription className="text-xs mt-0.5">Configure alert thresholds for different risk severity levels</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* Critical */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <Label className="flex items-center gap-2 text-foreground">
                  <span className="size-2 rounded-full" style={{ backgroundColor: RED }} />
                  Critical Threshold
                </Label>
                <span className="text-sm font-bold tabular-nums" style={{ color: RED }}>{criticalThreshold[0]}+</span>
              </div>
              <RiskSlider value={criticalThreshold[0]} onChange={setCriticalThreshold} min={50} max={100} step={5} color={RED} />
              <p className="mt-1 text-xs text-muted-foreground">Triggers immediate alerts and escalation</p>
            </div>

            <Separator className="bg-border" />

            {/* High */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <Label className="flex items-center gap-2 text-foreground">
                  <span className="size-2 rounded-full" style={{ backgroundColor: ORANGE }} />
                  High Threshold
                </Label>
                <span className="text-sm font-bold tabular-nums" style={{ color: ORANGE }}>{highThreshold[0]} – {criticalThreshold[0] - 1}</span>
              </div>
              <RiskSlider value={highThreshold[0]} onChange={setHighThreshold} min={25} max={criticalThreshold[0] - 5} step={5} color={ORANGE} />
              <p className="mt-1 text-xs text-muted-foreground">Requires attention within 24 hours</p>
            </div>

            <Separator className="bg-border" />

            {/* Medium */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <Label className="flex items-center gap-2 text-foreground">
                  <span className="size-2 rounded-full" style={{ backgroundColor: YELLOW }} />
                  Medium Threshold
                </Label>
                <span className="text-sm font-bold tabular-nums" style={{ color: YELLOW }}>{mediumThreshold[0]} – {highThreshold[0] - 1}</span>
              </div>
              <RiskSlider value={mediumThreshold[0]} onChange={setMediumThreshold} min={10} max={highThreshold[0] - 5} step={5} color={YELLOW} />
              <p className="mt-1 text-xs text-muted-foreground">Monitor and review during regular assessments</p>
            </div>

            {/* Low Risk */}
            <div className="rounded-lg p-3" style={{ backgroundColor: `${GREEN}08`, border: `1px solid ${GREEN}15` }}>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ backgroundColor: GREEN }} />
                <span className="text-sm font-medium text-foreground">Low Risk</span>
                <span className="text-sm text-muted-foreground">0 – {mediumThreshold[0] - 1}</span>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* ═══ NOTIFICATION PREFERENCES ═══ */}
        <Card className="border-border bg-card overflow-hidden">
          <div style={{ height: 3, background: `linear-gradient(90deg, ${PURPLE}, ${PURPLE}00)` }} />
          <CardHeader>
            <div className="flex items-center gap-3">
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: `${PURPLE}12`, border: `1px solid ${PURPLE}20`,
              }}>
                <Bell className="size-4" style={{ color: PURPLE }} />
              </div>
              <div>
                <CardTitle className="text-foreground text-base">Notification Preferences</CardTitle>
                <CardDescription className="text-xs mt-0.5">Choose how you want to receive alerts and updates</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'Email Alerts', desc: 'Receive risk alerts via email', checked: emailAlerts, onChange: setEmailAlerts },
              { label: 'Push Notifications', desc: 'Browser push notifications for urgent alerts', checked: pushNotifications, onChange: setPushNotifications },
              { label: 'Critical Alerts Only', desc: 'Only notify for critical severity events', checked: criticalOnly, onChange: setCriticalOnly },
              { label: 'Daily Digest', desc: 'Receive a daily summary of all alerts', checked: dailyDigest, onChange: setDailyDigest },
              { label: 'Weekly Report', desc: 'Automated weekly risk assessment report', checked: weeklyReport, onChange: setWeeklyReport },
            ].map((item, i, arr) => (
              <div key={item.label}>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-foreground">{item.label}</Label>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch checked={item.checked} onCheckedChange={item.onChange} />
                </div>
                {i < arr.length - 1 && <Separator className="mt-4 bg-border" />}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ═══ CONNECTED INTEGRATIONS ═══ */}
        <Card className="border-border bg-card overflow-hidden">
          <div style={{ height: 3, background: `linear-gradient(90deg, ${BLUE}, ${BLUE}00)` }} />
          <CardHeader>
            <div className="flex items-center gap-3">
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: `${BLUE}12`, border: `1px solid ${BLUE}20`,
              }}>
                <Link2 className="size-4" style={{ color: BLUE }} />
              </div>
              <div>
                <CardTitle className="text-foreground text-base">Connected Integrations</CardTitle>
                <CardDescription className="text-xs mt-0.5">External systems connected to the risk platform</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {integrations.map((integration) => {
                const connected = integration.status === 'connected'
                const statusColor = connected ? GREEN : AMBER
                return (
                  <div key={integration.id} className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div className="flex items-center gap-3">
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: `${statusColor}10`, border: `1px solid ${statusColor}20`,
                      }}>
                        <Link2 className="size-4" style={{ color: statusColor }} />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground text-sm">{integration.name}</h3>
                        <p className="text-xs text-muted-foreground">Last sync: {integration.lastSync}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 11, fontWeight: 600,
                        padding: '3px 10px', borderRadius: 6,
                        backgroundColor: `${statusColor}12`,
                        border: `1px solid ${statusColor}25`,
                        color: statusColor,
                      }}>
                        {connected ? <Check className="size-3" /> : <AlertTriangle className="size-3" />}
                        {connected ? 'Connected' : 'Disconnected'}
                      </span>
                      <Button variant="outline" size="sm">
                        {connected ? 'Configure' : 'Connect'}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* ═══ DATA REFRESH ═══ */}
        <Card className="border-border bg-card overflow-hidden">
          <div style={{ height: 3, background: `linear-gradient(90deg, ${AMBER}, ${AMBER}00)` }} />
          <CardHeader>
            <div className="flex items-center gap-3">
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: `${AMBER}12`, border: `1px solid ${AMBER}20`,
              }}>
                <RefreshCw className="size-4" style={{ color: AMBER }} />
              </div>
              <div>
                <CardTitle className="text-foreground text-base">Data Refresh</CardTitle>
                <CardDescription className="text-xs mt-0.5">Configure how often data is refreshed</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Label className="text-foreground">Auto-refresh interval</Label>
              <Select value={refreshInterval} onValueChange={setRefreshInterval}>
                <SelectTrigger className="w-40 bg-secondary border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {[
                    { value: '5', label: 'Every 5 minutes' },
                    { value: '15', label: 'Every 15 minutes' },
                    { value: '30', label: 'Every 30 minutes' },
                    { value: '60', label: 'Every hour' },
                    { value: '0', label: 'Manual only' },
                  ].map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-foreground">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleRefreshNow} disabled={isRefreshing}>
                <RefreshCw className={`mr-2 size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh Now'}
              </Button>
              <Button variant="outline" onClick={handleSaveSettings} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer note */}
        <div className="rounded-lg border border-border p-4 text-sm bg-secondary text-muted-foreground">
          Receive email notifications when the risk score exceeds your defined threshold. Weekly frequency by default. You can unsubscribe at any time.
        </div>

      </main>
    </div>
  )
}