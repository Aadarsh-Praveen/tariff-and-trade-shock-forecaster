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
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function SettingsPage() {
  // Risk Thresholds
  const [criticalThreshold, setCriticalThreshold] = useState([75])
  const [highThreshold, setHighThreshold] = useState([50])
  const [mediumThreshold, setMediumThreshold] = useState([25])
  
  // Notification Preferences
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [criticalOnly, setCriticalOnly] = useState(false)
  const [dailyDigest, setDailyDigest] = useState(true)
  const [weeklyReport, setWeeklyReport] = useState(true)
  
  // Refresh Settings
  const [refreshInterval, setRefreshInterval] = useState('15')
  
  // Connected Integrations (mock data)
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="size-5" />
              Risk Thresholds
            </CardTitle>
            <CardDescription>
              Configure alert thresholds for different risk severity levels
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-risk-critical" />
                    Critical Threshold
                  </Label>
                  <span className="text-sm font-medium tabular-nums">
                    {criticalThreshold[0]}+
                  </span>
                </div>
                <Slider
                  value={criticalThreshold}
                  onValueChange={setCriticalThreshold}
                  min={50}
                  max={100}
                  step={5}
                  className="[&_[role=slider]]:bg-risk-critical"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Triggers immediate alerts and escalation
                </p>
              </div>
              
              <Separator />
              
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-risk-high" />
                    High Threshold
                  </Label>
                  <span className="text-sm font-medium tabular-nums">
                    {highThreshold[0]} - {criticalThreshold[0] - 1}
                  </span>
                </div>
                <Slider
                  value={highThreshold}
                  onValueChange={setHighThreshold}
                  min={25}
                  max={criticalThreshold[0] - 5}
                  step={5}
                  className="[&_[role=slider]]:bg-risk-high"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Requires attention within 24 hours
                </p>
              </div>
              
              <Separator />
              
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-risk-medium" />
                    Medium Threshold
                  </Label>
                  <span className="text-sm font-medium tabular-nums">
                    {mediumThreshold[0]} - {highThreshold[0] - 1}
                  </span>
                </div>
                <Slider
                  value={mediumThreshold}
                  onValueChange={setMediumThreshold}
                  min={10}
                  max={highThreshold[0] - 5}
                  step={5}
                  className="[&_[role=slider]]:bg-risk-medium"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Monitor and review during regular assessments
                </p>
              </div>
              
              <div className="rounded-lg bg-secondary/50 p-3">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-risk-low" />
                  <span className="text-sm font-medium">Low Risk</span>
                  <span className="text-sm text-muted-foreground">
                    0 - {mediumThreshold[0] - 1}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="size-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Choose how you want to receive alerts and updates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Receive risk alerts via email
                </p>
              </div>
              <Switch checked={emailAlerts} onCheckedChange={setEmailAlerts} />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Browser push notifications for urgent alerts
                </p>
              </div>
              <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Critical Alerts Only</Label>
                <p className="text-sm text-muted-foreground">
                  Only notify for critical severity events
                </p>
              </div>
              <Switch checked={criticalOnly} onCheckedChange={setCriticalOnly} />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Daily Digest</Label>
                <p className="text-sm text-muted-foreground">
                  Receive a daily summary of all alerts
                </p>
              </div>
              <Switch checked={dailyDigest} onCheckedChange={setDailyDigest} />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Weekly Report</Label>
                <p className="text-sm text-muted-foreground">
                  Automated weekly risk assessment report
                </p>
              </div>
              <Switch checked={weeklyReport} onCheckedChange={setWeeklyReport} />
            </div>
          </CardContent>
        </Card>
        
        {/* Integration Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="size-5" />
              Connected Integrations
            </CardTitle>
            <CardDescription>
              External systems connected to the risk platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {integrations.map((integration) => (
                <div
                  key={integration.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-secondary p-2">
                      <Link2 className="size-4 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium">{integration.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Last sync: {integration.lastSync}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {integration.status === 'connected' ? (
                      <Badge variant="outline" className="border-risk-low/30 bg-risk-low/10 text-risk-low">
                        <Check className="mr-1 size-3" />
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-risk-high/30 bg-risk-high/10 text-risk-high">
                        <AlertTriangle className="mr-1 size-3" />
                        Disconnected
                      </Badge>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="size-5" />
              Data Refresh
            </CardTitle>
            <CardDescription>
              Configure how often data is refreshed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Label htmlFor="refresh">Auto-refresh interval</Label>
              <Select value={refreshInterval} onValueChange={setRefreshInterval}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">Every 5 minutes</SelectItem>
                  <SelectItem value="15">Every 15 minutes</SelectItem>
                  <SelectItem value="30">Every 30 minutes</SelectItem>
                  <SelectItem value="60">Every hour</SelectItem>
                  <SelectItem value="0">Manual only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2">
              <Button>
                <RefreshCw className="mr-2 size-4" />
                Refresh Now
              </Button>
              <Button variant="outline">
                Save Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
