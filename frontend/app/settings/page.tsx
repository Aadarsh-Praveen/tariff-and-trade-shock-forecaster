'use client'

import { useState } from 'react'
import {
  Bell,
  Shield,
  Link2,
  RefreshCw,
  Check,
  AlertTriangle,
} from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Hardcoded colors
const colors = {
  t1: 'var(--t1, #f0e8ee)',
  t2: 'var(--t2, rgba(240,232,238,0.65))',
  t3: 'var(--t3, rgba(240,232,238,0.38))',
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
  cardBg: 'var(--card-bg, #1a1723)',
  border: 'var(--border-vis, rgba(255,220,240,0.12))',
  borderSubtle: 'var(--border, rgba(255,220,240,0.06))',
  secondary: 'var(--secondary, rgba(240,232,238,0.06))',
  trackBg: 'rgba(240,232,238,0.10)',
}

// Custom visible slider — replaces invisible shadcn Slider
function RiskSlider({
  value,
  onChange,
  min,
  max,
  step,
  color,
}: {
  value: number
  onChange: (val: number[]) => void
  min: number
  max: number
  step: number
  color: string
}) {
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div className="relative flex items-center" style={{ height: 32 }}>
      {/* Full track */}
      <div
        className="absolute left-0 right-0 rounded-full"
        style={{
          height: 6,
          backgroundColor: colors.trackBg,
        }}
      />
      {/* Filled range */}
      <div
        className="absolute left-0 rounded-full"
        style={{
          height: 6,
          width: `${pct}%`,
          backgroundColor: color,
          opacity: 0.5,
        }}
      />
      {/* Thumb */}
      <div
        className="absolute rounded-full"
        style={{
          width: 18,
          height: 18,
          backgroundColor: color,
          border: '3px solid rgba(0,0,0,0.3)',
          boxShadow: `0 0 10px ${color}66, 0 2px 4px rgba(0,0,0,0.3)`,
          left: `calc(${pct}% - 9px)`,
          cursor: 'grab',
          zIndex: 2,
        }}
      />
      {/* Invisible native input for interaction */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange([Number(e.target.value)])}
        className="absolute inset-0 w-full opacity-0 cursor-pointer"
        style={{ height: 32, zIndex: 3 }}
      />
    </div>
  )
}

export default function SettingsPage() {
  const [criticalThreshold, setCriticalThreshold] = useState([75])
  const [highThreshold, setHighThreshold] = useState([50])
  const [mediumThreshold, setMediumThreshold] = useState([25])
  
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [criticalOnly, setCriticalOnly] = useState(false)
  const [dailyDigest, setDailyDigest] = useState(true)
  const [weeklyReport, setWeeklyReport] = useState(true)
  
  const [refreshInterval, setRefreshInterval] = useState('15')
  
  const integrations = [
    { id: 'erp', name: 'SAP ERP', status: 'connected', lastSync: '2 min ago' },
    { id: 'crm', name: 'Salesforce CRM', status: 'connected', lastSync: '5 min ago' },
    { id: 'logistics', name: 'Oracle SCM', status: 'connected', lastSync: '1 hour ago' },
    { id: 'risk', name: 'Dun & Bradstreet', status: 'disconnected', lastSync: 'Never' },
  ]
  
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DashboardHeader
        title="Settings"
        description="Configure dashboard preferences"
      />
      
      <main className="flex-1 space-y-6 p-6">

        {/* Risk Thresholds */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Shield className="size-5" />Risk Thresholds
            </CardTitle>
            <CardDescription>
              Configure alert thresholds for different risk severity levels
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">

              {/* Critical */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-foreground">
                    <span className="size-2 rounded-full bg-coral" />
                    Critical Threshold
                  </Label>
                  <span className="text-sm font-medium tabular-nums text-foreground">
                    {criticalThreshold[0]}+
                  </span>
                </div>
                <RiskSlider
                  value={criticalThreshold[0]}
                  onChange={setCriticalThreshold}
                  min={50}
                  max={100}
                  step={5}
                  color={colors.critical}
                />
                <p className="mt-1 text-xs text-t3">
                  Triggers immediate alerts and escalation
                </p>
              </div>
              
              <Separator className="bg-border" />

              {/* High */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-foreground">
                    <span className="size-2 rounded-full bg-amber" />
                    High Threshold
                  </Label>
                  <span className="text-sm font-medium tabular-nums text-foreground">
                    {highThreshold[0]} - {criticalThreshold[0] - 1}
                  </span>
                </div>
                <RiskSlider
                  value={highThreshold[0]}
                  onChange={setHighThreshold}
                  min={25}
                  max={criticalThreshold[0] - 5}
                  step={5}
                  color={colors.high}
                />
                <p className="mt-1 text-xs text-t3">
                  Requires attention within 24 hours
                </p>
              </div>
              
              <Separator className="bg-border" />

              {/* Medium */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-foreground">
                    <span className="size-2 rounded-full bg-amber" />
                    Medium Threshold
                  </Label>
                  <span className="text-sm font-medium tabular-nums text-foreground">
                    {mediumThreshold[0]} - {highThreshold[0] - 1}
                  </span>
                </div>
                <RiskSlider
                  value={mediumThreshold[0]}
                  onChange={setMediumThreshold}
                  min={10}
                  max={highThreshold[0] - 5}
                  step={5}
                  color={colors.medium}
                />
                <p className="mt-1 text-xs text-t3">
                  Monitor and review during regular assessments
                </p>
              </div>

              {/* Low Risk */}
              <div className="rounded-lg p-3 bg-secondary">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-green" />
                  <span className="text-sm font-medium text-foreground">Low Risk</span>
                  <span className="text-sm text-t3">0 - {mediumThreshold[0] - 1}</span>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Bell className="size-5" />Notification Preferences
            </CardTitle>
            <CardDescription>Choose how you want to receive alerts and updates</CardDescription>
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
                    <p className="text-sm text-t3">{item.desc}</p>
                  </div>
                  <Switch checked={item.checked} onCheckedChange={item.onChange} />
                </div>
                {i < arr.length - 1 && <Separator className="mt-4 bg-border" />}
              </div>
            ))}

          </CardContent>
        </Card>

        {/* Connected Integrations */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Link2 className="size-5" />Connected Integrations
            </CardTitle>
            <CardDescription>External systems connected to the risk platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {integrations.map((integration) => (
                <div
                  key={integration.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg p-2 bg-secondary">
                      <Link2 className="size-4 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{integration.name}</h3>
                      <p className="text-sm text-t3">Last sync: {integration.lastSync}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {integration.status === 'connected' ? (
                      <span className="inline-flex items-center rounded-md border border-green px-2.5 py-0.5 text-xs font-semibold text-green bg-green-soft">
                        <Check className="mr-1 size-3" />
                        Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-md border border-amber px-2.5 py-0.5 text-xs font-semibold text-amber bg-amber-soft">
                        <AlertTriangle className="mr-1 size-3" />
                        Disconnected
                      </span>
                    )}
                    <Button variant="outline" size="sm">
                      {integration.status === 'connected' ? 'Configure' : 'Connect'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Data Refresh */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <RefreshCw className="size-5" />Data Refresh
            </CardTitle>
            <CardDescription>Configure how often data is refreshed</CardDescription>
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
                    <SelectItem key={opt.value} value={opt.value} className="text-t2">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2">
              <Button>
                <RefreshCw className="mr-2 size-4" />
                Refresh Now
              </Button>
              <Button variant="outline">Save Settings</Button>
            </div>
          </CardContent>
        </Card>

        {/* Email Threshold Alert */}
        <div className="rounded-lg border border-border p-4 text-sm bg-secondary text-t3">
          Receive email notifications when the risk score exceeds your defined threshold. Weekly frequency by default. You can unsubscribe at any time.
        </div>

      </main>
    </div>
  )
}