'use client'

import { X, MapPin, Calendar, DollarSign, Package, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Supplier, RiskCategory } from '@/lib/data/types'
import { formatDate, formatCurrency, getScoreSeverity, getCategoryLabel } from '@/lib/data/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'

interface SupplierDetailPanelProps {
  supplier: Supplier | null
  open: boolean
  onClose: () => void
}

const statusConfig = {
  'active': { label: 'Active', className: 'border-risk-low/30 bg-risk-low/10 text-risk-low' },
  'under-review': { label: 'Under Review', className: 'border-risk-medium/30 bg-risk-medium/10 text-risk-medium' },
  'suspended': { label: 'Suspended', className: 'border-risk-critical/30 bg-risk-critical/10 text-risk-critical' },
}

const tierConfig = {
  'Tier 1': { className: 'border-primary/30 bg-primary/10 text-primary' },
  'Tier 2': { className: 'border-muted-foreground/30 bg-muted/50 text-muted-foreground' },
  'Tier 3': { className: 'border-muted-foreground/20 bg-muted/30 text-muted-foreground' },
}

export function SupplierDetailPanel({ supplier, open, onClose }: SupplierDetailPanelProps) {
  if (!supplier) return null
  
  const severity = getScoreSeverity(supplier.riskScore)
  const severityColors = {
    critical: 'text-risk-critical',
    high: 'text-risk-high',
    medium: 'text-risk-medium',
    low: 'text-risk-low',
  }
  
  const categories: RiskCategory[] = ['financial', 'operational', 'geopolitical', 'compliance']
  
  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl">{supplier.name}</SheetTitle>
          </div>
          <SheetDescription className="flex items-center gap-2">
            <MapPin className="size-3" />
            {supplier.location.country}, {supplier.location.region}
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* Status and Tier */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={tierConfig[supplier.category].className}>
              {supplier.category}
            </Badge>
            <Badge variant="outline" className={statusConfig[supplier.status].className}>
              {statusConfig[supplier.status].label}
            </Badge>
          </div>
          
          {/* Overall Risk Score */}
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Overall Risk Score</span>
              <span className={cn('text-3xl font-bold tabular-nums', severityColors[severity])}>
                {supplier.riskScore}
              </span>
            </div>
            <div className="mt-2">
              <Progress
                value={supplier.riskScore}
                className="h-2"
              />
            </div>
          </div>
          
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="size-4" />
                Contract Value
              </div>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {formatCurrency(supplier.contractValue)}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="size-4" />
                Critical Parts
              </div>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {supplier.criticalParts}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="size-4" />
                Incidents
              </div>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {supplier.incidents}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="size-4" />
                Last Assessment
              </div>
              <p className="mt-1 text-lg font-semibold">
                {formatDate(supplier.lastAssessment)}
              </p>
            </div>
          </div>
          
          <Separator />
          
          {/* Risk Breakdown */}
          <div>
            <h3 className="mb-4 font-semibold">Risk Breakdown</h3>
            <div className="space-y-4">
              {categories.map((category) => {
                const score = supplier.riskBreakdown[category]
                const catSeverity = getScoreSeverity(score)
                
                return (
                  <div key={category}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{getCategoryLabel(category)}</span>
                      <span className={cn('font-medium tabular-nums', severityColors[catSeverity])}>
                        {score}
                      </span>
                    </div>
                    <Progress value={score} className="h-1.5" />
                  </div>
                )
              })}
            </div>
          </div>
          
          <Separator />
          
          {/* Actions */}
          <div className="flex gap-2">
            <Button className="flex-1">View Full Profile</Button>
            <Button variant="outline" className="flex-1">Export Report</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
