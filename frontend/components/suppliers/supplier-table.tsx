'use client'

import { useState, useMemo } from 'react'
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  Building2,
  MapPin,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Supplier } from '@/lib/data/types'
import { formatDate, formatCurrency, getScoreSeverity } from '@/lib/data/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type SortKey = 'name' | 'riskScore' | 'category' | 'location' | 'lastAssessment' | 'status' | 'contractValue'
type SortOrder = 'asc' | 'desc'

interface SupplierTableProps {
  suppliers: Supplier[]
  onSupplierSelect?: (supplier: Supplier) => void
  selectedSupplierId?: string
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

export function SupplierTable({ suppliers, onSupplierSelect, selectedSupplierId }: SupplierTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('riskScore')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  
  const sortedSuppliers = useMemo(() => {
    return [...suppliers].sort((a, b) => {
      let comparison = 0
      
      switch (sortKey) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'riskScore':
          comparison = a.riskScore - b.riskScore
          break
        case 'category':
          comparison = a.category.localeCompare(b.category)
          break
        case 'location':
          comparison = a.location.country.localeCompare(b.location.country)
          break
        case 'lastAssessment':
          comparison = a.lastAssessment.getTime() - b.lastAssessment.getTime()
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
        case 'contractValue':
          comparison = a.contractValue - b.contractValue
          break
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [suppliers, sortKey, sortOrder])
  
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('desc')
    }
  }
  
  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) return <ArrowUpDown className="ml-1 size-3" />
    return sortOrder === 'asc' ? (
      <ArrowUp className="ml-1 size-3" />
    ) : (
      <ArrowDown className="ml-1 size-3" />
    )
  }
  
  const getRiskScoreColor = (score: number) => {
    const severity = getScoreSeverity(score)
    const colors = {
      critical: 'text-risk-critical',
      high: 'text-risk-high',
      medium: 'text-risk-medium',
      low: 'text-risk-low',
    }
    return colors[severity]
  }
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8 font-medium"
                onClick={() => handleSort('name')}
              >
                Supplier
                <SortIcon columnKey="name" />
              </Button>
            </TableHead>
            <TableHead className="w-[100px]">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8 font-medium"
                onClick={() => handleSort('riskScore')}
              >
                Risk
                <SortIcon columnKey="riskScore" />
              </Button>
            </TableHead>
            <TableHead className="w-[100px]">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8 font-medium"
                onClick={() => handleSort('category')}
              >
                Tier
                <SortIcon columnKey="category" />
              </Button>
            </TableHead>
            <TableHead className="w-[150px]">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8 font-medium"
                onClick={() => handleSort('location')}
              >
                Location
                <SortIcon columnKey="location" />
              </Button>
            </TableHead>
            <TableHead className="w-[120px]">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8 font-medium"
                onClick={() => handleSort('contractValue')}
              >
                Contract
                <SortIcon columnKey="contractValue" />
              </Button>
            </TableHead>
            <TableHead className="w-[120px]">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8 font-medium"
                onClick={() => handleSort('status')}
              >
                Status
                <SortIcon columnKey="status" />
              </Button>
            </TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedSuppliers.map((supplier) => (
            <TableRow
              key={supplier.id}
              className={cn(
                'cursor-pointer transition-colors',
                selectedSupplierId === supplier.id && 'bg-secondary'
              )}
              onClick={() => onSupplierSelect?.(supplier)}
            >
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-secondary">
                    <Building2 className="size-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{supplier.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {supplier.criticalParts} critical parts
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className={cn('text-lg font-bold tabular-nums', getRiskScoreColor(supplier.riskScore))}>
                    {supplier.riskScore}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={tierConfig[supplier.category].className}>
                  {supplier.category}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5 text-sm">
                  <MapPin className="size-3 text-muted-foreground" />
                  <span>{supplier.location.country}</span>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm tabular-nums">
                  {formatCurrency(supplier.contractValue)}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={statusConfig[supplier.status].className}>
                  {statusConfig[supplier.status].label}
                </Badge>
              </TableCell>
              <TableCell>
                <ChevronRight className="size-4 text-muted-foreground" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
