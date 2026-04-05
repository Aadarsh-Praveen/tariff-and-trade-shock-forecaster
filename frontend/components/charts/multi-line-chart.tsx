'use client'

import { useMemo } from 'react'
import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts'
import type { MonthlyMetrics, RiskCategory } from '@/lib/data/types'

interface MultiLineChartProps {
  data: MonthlyMetrics[]
  categories: RiskCategory[]
}

const categoryConfig: Record<RiskCategory, { label: string; color: string }> = {
  financial: { label: 'Financial', color: 'var(--color-chart-1)' },
  operational: { label: 'Operational', color: 'var(--color-chart-2)' },
  geopolitical: { label: 'Geopolitical', color: 'var(--color-chart-3)' },
  compliance: { label: 'Compliance', color: 'var(--color-chart-4)' },
}

export function MultiLineChart({ data, categories }: MultiLineChartProps) {
  const chartData = useMemo(() => {
    return data.map((item) => ({
      month: item.month,
      financial: item.financialScore,
      operational: item.operationalScore,
      geopolitical: item.geopoliticalScore,
      compliance: item.complianceScore,
      overall: item.overallScore,
    }))
  }, [data])
  
  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--color-border)"
          />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
            domain={[0, 100]}
            dx={-10}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
            }}
            labelStyle={{ color: 'var(--color-foreground)', marginBottom: 8 }}
          />
          <Legend
            verticalAlign="top"
            height={36}
            iconType="circle"
            iconSize={8}
          />
          
          {categories.includes('financial') && (
            <Line
              type="monotone"
              dataKey="financial"
              name="Financial"
              stroke={categoryConfig.financial.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          )}
          {categories.includes('operational') && (
            <Line
              type="monotone"
              dataKey="operational"
              name="Operational"
              stroke={categoryConfig.operational.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          )}
          {categories.includes('geopolitical') && (
            <Line
              type="monotone"
              dataKey="geopolitical"
              name="Geopolitical"
              stroke={categoryConfig.geopolitical.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          )}
          {categories.includes('compliance') && (
            <Line
              type="monotone"
              dataKey="compliance"
              name="Compliance"
              stroke={categoryConfig.compliance.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
