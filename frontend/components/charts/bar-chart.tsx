'use client'

import { useMemo } from 'react'
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { MonthlyMetrics } from '@/lib/data/types'

interface BarChartProps {
  data: MonthlyMetrics[]
  dataKey: 'incidentCount' | 'suppliersMonitored'
  color?: string
  label?: string
}

export function BarChart({
  data,
  dataKey,
  color = 'var(--color-primary)',
  label = 'Value',
}: BarChartProps) {
  const chartData = useMemo(() => {
    return data.map((item) => ({
      month: item.month,
      value: item[dataKey],
    }))
  }, [data, dataKey])
  
  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
            dx={-10}
          />
          <Tooltip
            cursor={{ fill: 'var(--color-secondary)', opacity: 0.5 }}
            contentStyle={{
              backgroundColor: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
            }}
            labelStyle={{ color: 'var(--color-foreground)' }}
            formatter={(value: number) => [value, label]}
          />
          <Bar
            dataKey="value"
            fill={color}
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  )
}
