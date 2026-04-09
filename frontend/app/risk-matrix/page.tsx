'use client'

import { useState, useMemo } from 'react'
import { Filter } from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { RiskMatrix } from '@/components/risk/risk-matrix'
import { RiskEventDetail } from '@/components/risk/risk-event-detail'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { riskEvents, suppliers } from '@/lib/data/mock-data'
import type { RiskEvent, RiskCategory, RiskSeverity, SupplierTier } from '@/lib/data/types'

export default function RiskMatrixPage() {
  const [selectedEvent, setSelectedEvent] = useState<RiskEvent | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<RiskCategory | 'all'>('all')
  const [severityFilter, setSeverityFilter] = useState<RiskSeverity | 'all'>('all')
  const [tierFilter, setTierFilter] = useState<SupplierTier | 'all'>('all')
  
  const filteredEvents = useMemo(() => {
    return riskEvents.filter((event) => {
      if (categoryFilter !== 'all' && event.type !== categoryFilter) return false
      if (severityFilter !== 'all' && event.severity !== severityFilter) return false
      if (tierFilter !== 'all') {
        const supplier = suppliers.find((s) => s.id === event.supplierId)
        if (supplier && supplier.category !== tierFilter) return false
      }
      return true
    })
  }, [categoryFilter, severityFilter, tierFilter])
  
  const activeFilters = [categoryFilter, severityFilter, tierFilter].filter((f) => f !== 'all').length
  
  const clearFilters = () => {
    setCategoryFilter('all')
    setSeverityFilter('all')
    setTierFilter('all')
  }
  
  // Summary stats
  const stats = useMemo(() => {
    const critical = filteredEvents.filter((e) => e.severity === 'critical').length
    const high = filteredEvents.filter((e) => e.severity === 'high').length
    const medium = filteredEvents.filter((e) => e.severity === 'medium').length
    const low = filteredEvents.filter((e) => e.severity === 'low').length
    return { critical, high, medium, low, total: filteredEvents.length }
  }, [filteredEvents])
  
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DashboardHeader
        title="Risk Matrix"
        description="Likelihood vs Impact analysis"
      />
      
      <main className="flex-1 space-y-6 p-6">
        {/* Filters */}
        <Card>
          <CardContent className="flex flex-wrap items-center gap-4 p-4">
            <div className="flex items-center gap-2">
              <Filter className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters</span>
            </div>
            
            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as RiskCategory | 'all')}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="financial">Financial</SelectItem>
                <SelectItem value="operational">Operational</SelectItem>
                <SelectItem value="geopolitical">Geopolitical</SelectItem>
                <SelectItem value="compliance">Compliance</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as RiskSeverity | 'all')}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={tierFilter} onValueChange={(v) => setTierFilter(v as SupplierTier | 'all')}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Supplier Tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="Tier 1">Tier 1</SelectItem>
                <SelectItem value="Tier 2">Tier 2</SelectItem>
                <SelectItem value="Tier 3">Tier 3</SelectItem>
              </SelectContent>
            </Select>
            
            {activeFilters > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear ({activeFilters})
              </Button>
            )}
            
            <div className="ml-auto flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-risk-critical" />
                <span className="text-xs text-muted-foreground">{stats.critical}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-risk-high" />
                <span className="text-xs text-muted-foreground">{stats.high}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-risk-medium" />
                <span className="text-xs text-muted-foreground">{stats.medium}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-risk-low" />
                <span className="text-xs text-muted-foreground">{stats.low}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Matrix and Details */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Risk Assessment Matrix</CardTitle>
              <CardDescription>
                {stats.total} risk events plotted by likelihood and impact
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RiskMatrix
                events={filteredEvents}
                selectedEventId={selectedEvent?.id}
                onEventSelect={setSelectedEvent}
              />
            </CardContent>
          </Card>
          
          <div className="lg:col-span-1">
            <RiskEventDetail event={selectedEvent} />
          </div>
        </div>
        
        {/* Legend */}
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-6">
              <span className="text-sm font-medium">Risk Levels:</span>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="size-4 rounded bg-risk-critical/40" />
                  <span className="text-sm text-muted-foreground">Critical (20-25)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-4 rounded bg-risk-high/30" />
                  <span className="text-sm text-muted-foreground">High (12-19)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-4 rounded bg-risk-medium/20" />
                  <span className="text-sm text-muted-foreground">Medium (6-11)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-4 rounded bg-risk-low/15" />
                  <span className="text-sm text-muted-foreground">Low (1-5)</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Click on dots to view event details
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
