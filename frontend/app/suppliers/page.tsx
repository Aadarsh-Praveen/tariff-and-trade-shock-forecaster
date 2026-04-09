'use client'

import { useState, useMemo } from 'react'
import { Search, Filter, Map, List, Download } from 'lucide-react'
import { useDashboard } from '@/components/dashboard/dashboard-context'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { SupplierTable } from '@/components/suppliers/supplier-table'
import { SupplierDetailPanel } from '@/components/suppliers/supplier-detail-panel'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { suppliers } from '@/lib/data/mock-data'
import type { Supplier, SupplierStatus, SupplierTier } from '@/lib/data/types'

export default function SuppliersPage() {
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'map'>('table')
  const [statusFilter, setStatusFilter] = useState<SupplierStatus | 'all'>('all')
  const [tierFilter, setTierFilter] = useState<SupplierTier | 'all'>('all')
  const [localSearch, setLocalSearch] = useState('')
  
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => {
      if (statusFilter !== 'all' && supplier.status !== statusFilter) return false
      if (tierFilter !== 'all' && supplier.category !== tierFilter) return false
      if (localSearch) {
        const searchLower = localSearch.toLowerCase()
        return (
          supplier.name.toLowerCase().includes(searchLower) ||
          supplier.location.country.toLowerCase().includes(searchLower) ||
          supplier.location.region.toLowerCase().includes(searchLower)
        )
      }
      return true
    })
  }, [statusFilter, tierFilter, localSearch])
  
  const handleSupplierSelect = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setPanelOpen(true)
  }
  
  // Summary stats
  const stats = useMemo(() => {
    const active = suppliers.filter((s) => s.status === 'active').length
    const underReview = suppliers.filter((s) => s.status === 'under-review').length
    const suspended = suppliers.filter((s) => s.status === 'suspended').length
    const highRisk = suppliers.filter((s) => s.riskScore >= 70).length
    return { active, underReview, suspended, highRisk, total: suppliers.length }
  }, [])
  
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DashboardHeader
        title="Supplier Analysis"
        description="Monitor and assess supplier risk"
      />
      
      <main className="flex-1 space-y-6 p-6">
        {/* Summary Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Suppliers</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-risk-low">{stats.active}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Under Review</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-risk-medium">{stats.underReview}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Suspended</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-risk-critical">{stats.suspended}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">High Risk</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-risk-high">{stats.highRisk}</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Filters and Controls */}
        <Card>
          <CardContent className="flex flex-wrap items-center gap-4 p-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search suppliers..."
                className="pl-9"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
              />
            </div>
            
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as SupplierStatus | 'all')}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="under-review">Under Review</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={tierFilter} onValueChange={(v) => setTierFilter(v as SupplierTier | 'all')}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="Tier 1">Tier 1</SelectItem>
                <SelectItem value="Tier 2">Tier 2</SelectItem>
                <SelectItem value="Tier 3">Tier 3</SelectItem>
              </SelectContent>
            </Select>
            
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(v) => v && setViewMode(v as 'table' | 'map')}
              className="border rounded-lg"
            >
              <ToggleGroupItem value="table" aria-label="Table view" className="px-3">
                <List className="size-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="map" aria-label="Map view" className="px-3">
                <Map className="size-4" />
              </ToggleGroupItem>
            </ToggleGroup>
            
            <Button variant="outline" size="icon">
              <Download className="size-4" />
              <span className="sr-only">Export</span>
            </Button>
          </CardContent>
        </Card>
        
        {/* Supplier List/Map */}
        <Card>
          <CardHeader>
            <CardTitle>Suppliers</CardTitle>
            <CardDescription>
              {filteredSuppliers.length} of {suppliers.length} suppliers
            </CardDescription>
          </CardHeader>
          <CardContent>
            {viewMode === 'table' ? (
              <SupplierTable
                suppliers={filteredSuppliers}
                onSupplierSelect={handleSupplierSelect}
                selectedSupplierId={selectedSupplier?.id}
              />
            ) : (
              <div className="flex h-[500px] items-center justify-center rounded-lg border border-dashed">
                <div className="text-center">
                  <Map className="mx-auto size-12 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Geographic map view coming soon
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supplier locations across {new Set(suppliers.map(s => s.location.region)).size} regions
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      
      <SupplierDetailPanel
        supplier={selectedSupplier}
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
      />
    </div>
  )
}
