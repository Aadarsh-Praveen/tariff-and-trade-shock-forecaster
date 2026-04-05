'use client'

import { useState, useMemo } from 'react'
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react'
import { useDashboard } from '@/components/dashboard/dashboard-context'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { MultiLineChart } from '@/components/charts/multi-line-chart'
import { BarChart } from '@/components/charts/bar-chart'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { getMetricsForTimeRange, monthlyMetrics } from '@/lib/data/mock-data'
import type { RiskCategory } from '@/lib/data/types'
import { cn } from '@/lib/utils'

const categories: { key: RiskCategory; label: string; color: string }[] = [
  { key: 'financial', label: 'Financial', color: 'bg-chart-1' },
  { key: 'operational', label: 'Operational', color: 'bg-chart-2' },
  { key: 'geopolitical', label: 'Geopolitical', color: 'bg-chart-3' },
  { key: 'compliance', label: 'Compliance', color: 'bg-chart-4' },
]

export default function TrendsPage() {
  const { timeRange } = useDashboard()
  const [selectedCategories, setSelectedCategories] = useState<RiskCategory[]>([
    'financial',
    'operational',
    'geopolitical',
    'compliance',
  ])
  
  const filteredMetrics = useMemo(() => {
    return getMetricsForTimeRange(timeRange.months)
  }, [timeRange])
  
  const toggleCategory = (category: RiskCategory) => {
    setSelectedCategories((prev) => {
      if (prev.includes(category)) {
        return prev.filter((c) => c !== category)
      }
      return [...prev, category]
    })
  }
  
  // Calculate trends
  const trends = useMemo(() => {
    if (filteredMetrics.length < 2) {
      return { overall: 0, financial: 0, operational: 0, geopolitical: 0, compliance: 0, incidents: 0 }
    }
    
    const first = filteredMetrics[0]
    const last = filteredMetrics[filteredMetrics.length - 1]
    
    const calcTrend = (a: number, b: number) => {
      if (a === 0) return 0
      return Math.round(((b - a) / a) * 100)
    }
    
    return {
      overall: calcTrend(first.overallScore, last.overallScore),
      financial: calcTrend(first.financialScore, last.financialScore),
      operational: calcTrend(first.operationalScore, last.operationalScore),
      geopolitical: calcTrend(first.geopoliticalScore, last.geopoliticalScore),
      compliance: calcTrend(first.complianceScore, last.complianceScore),
      incidents: calcTrend(first.incidentCount, last.incidentCount),
    }
  }, [filteredMetrics])
  
  const TrendIndicator = ({ value, inverse = false }: { value: number; inverse?: boolean }) => {
    const isPositive = inverse ? value < 0 : value > 0
    const isNegative = inverse ? value > 0 : value < 0
    
    if (value === 0) {
      return (
        <div className="flex items-center gap-1 text-muted-foreground">
          <Minus className="size-3" />
          <span className="text-xs">No change</span>
        </div>
      )
    }
    
    // For risk scores, down is good (inverse=false means up=bad)
    const color = inverse
      ? (isPositive ? 'text-risk-low' : 'text-risk-critical')
      : (isPositive ? 'text-risk-critical' : 'text-risk-low')
    
    return (
      <div className={cn('flex items-center gap-1', color)}>
        {value > 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
        <span className="text-xs font-medium">{value > 0 ? '+' : ''}{value}%</span>
      </div>
    )
  }
  
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DashboardHeader
        title="Trend Analysis"
        description="Risk trends over time"
      />
      
      <main className="flex-1 space-y-6 p-6">
        {/* Trend Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Overall Risk</p>
                <TrendIndicator value={trends.overall} />
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums">
                {filteredMetrics[filteredMetrics.length - 1]?.overallScore ?? '-'}
              </p>
            </CardContent>
          </Card>
          
          {categories.map((cat) => (
            <Card key={cat.key}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn('size-2 rounded-full', cat.color)} />
                    <p className="text-sm text-muted-foreground">{cat.label}</p>
                  </div>
                  <TrendIndicator value={trends[cat.key]} />
                </div>
                <p className="mt-2 text-2xl font-bold tabular-nums">
                  {filteredMetrics[filteredMetrics.length - 1]?.[`${cat.key}Score` as keyof typeof filteredMetrics[0]] ?? '-'}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Main Chart */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Risk Category Trends</CardTitle>
                <CardDescription>
                  Compare risk categories over {timeRange.label.toLowerCase()}
                </CardDescription>
              </div>
              
              <div className="flex flex-wrap items-center gap-4">
                {categories.map((cat) => (
                  <div key={cat.key} className="flex items-center gap-2">
                    <Checkbox
                      id={cat.key}
                      checked={selectedCategories.includes(cat.key)}
                      onCheckedChange={() => toggleCategory(cat.key)}
                    />
                    <Label
                      htmlFor={cat.key}
                      className="flex cursor-pointer items-center gap-1.5 text-sm"
                    >
                      <span className={cn('size-2 rounded-full', cat.color)} />
                      {cat.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {selectedCategories.length > 0 ? (
              <MultiLineChart data={filteredMetrics} categories={selectedCategories} />
            ) : (
              <div className="flex h-[400px] items-center justify-center">
                <p className="text-muted-foreground">Select at least one category to display</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Secondary Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Incident Count</CardTitle>
                  <CardDescription>Monthly incidents over time</CardDescription>
                </div>
                <TrendIndicator value={trends.incidents} inverse />
              </div>
            </CardHeader>
            <CardContent>
              <BarChart
                data={filteredMetrics}
                dataKey="incidentCount"
                color="var(--color-risk-high)"
                label="Incidents"
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Suppliers Monitored</CardTitle>
              <CardDescription>Active supplier coverage</CardDescription>
            </CardHeader>
            <CardContent>
              <BarChart
                data={filteredMetrics}
                dataKey="suppliersMonitored"
                color="var(--color-primary)"
                label="Suppliers"
              />
            </CardContent>
          </Card>
        </div>
        
        {/* Forecast Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Risk Forecast
              <Badge variant="outline">Beta</Badge>
            </CardTitle>
            <CardDescription>
              Projected risk based on current trends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 rounded-lg border border-dashed p-6">
              <Info className="size-8 text-muted-foreground" />
              <div>
                <p className="font-medium">Predictive Analytics Coming Soon</p>
                <p className="text-sm text-muted-foreground">
                  Based on current trends, overall risk is projected to{' '}
                  {trends.overall > 0 ? 'increase' : trends.overall < 0 ? 'decrease' : 'remain stable'}{' '}
                  in the coming months. Advanced forecasting with ML models will be available soon.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
