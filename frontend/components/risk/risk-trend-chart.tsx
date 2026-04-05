'use client'

import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { MonthlyMetrics } from '@/lib/data/types'

interface RiskTrendChartProps {
  data: MonthlyMetrics[]
  title?: string
  description?: string
}

export function RiskTrendChart({
  data,
  title = 'Risk Trend',
  description = 'Overall risk score over time',
}: RiskTrendChartProps) {
  const chartData = useMemo(() => {
    return data.map((item) => ({
      month: item.month,
      score: item.overallScore,
    }))
  }, [data])
  
  return (
    <Card className="border-red-20 bg-red-4">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#df2531" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#df2531" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(223,37,49,0.2)"
              />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 12 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 12 }}
                domain={[0, 100]}
                dx={-10}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#000000',
                  border: '1px solid rgba(223,37,49,0.2)',
                  borderRadius: '12px',
                }}
                labelStyle={{ color: '#ffffff' }}
                itemStyle={{ color: '#df2531' }}
                formatter={(value: number) => [value, 'Risk Score']}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="#df2531"
                strokeWidth={2}
                fill="url(#riskGradient)"
                dot={false}
                activeDot={{
                  r: 6,
                  fill: '#df2531',
                  stroke: '#000000',
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
