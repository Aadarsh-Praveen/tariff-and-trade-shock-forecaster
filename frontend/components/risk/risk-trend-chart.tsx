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
  ReferenceLine,
} from 'recharts'
import type { MonthlyMetrics } from '@/lib/data/types'

const CORAL = '#df2531'
const AMBER = '#f59e0b'
const GREEN = '#22c55e'

interface RiskTrendChartProps {
  data: MonthlyMetrics[]
  title?: string
  description?: string
}

function riskHex(score: number): string {
  if (score >= 65) return CORAL
  if (score >= 40) return AMBER
  return GREEN
}

export function RiskTrendChart({ data }: RiskTrendChartProps) {
  const chartData = useMemo(() => {
    return data.map((item) => ({
      date: item.month,
      score: item.overallScore,
      label: (() => {
        try {
          return new Date(item.month).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        } catch { return item.month }
      })(),
    }))
  }, [data])

  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="historyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CORAL} stopOpacity={0.30} />
              <stop offset="50%" stopColor={AMBER} stopOpacity={0.10} />
              <stop offset="95%" stopColor={AMBER} stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.12)" />

          {/* Threshold reference lines */}
          <ReferenceLine y={65} stroke={CORAL} strokeDasharray="6 4" strokeOpacity={0.4} label={{ value: 'High Risk', position: 'right', fill: CORAL, fontSize: 10, fontWeight: 600 }} />
          <ReferenceLine y={40} stroke={AMBER} strokeDasharray="6 4" strokeOpacity={0.4} label={{ value: 'Medium', position: 'right', fill: AMBER, fontSize: 10, fontWeight: 600 }} />

          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'currentColor', fontSize: 11, opacity: 0.65 }}
            dy={10}
            interval="preserveStartEnd"
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'currentColor', fontSize: 11, opacity: 0.65 }}
            domain={[0, 100]}
            dx={-10}
          />

          <Tooltip
            cursor={{ stroke: 'rgba(128,128,128,0.2)', strokeWidth: 1 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.[0]) return null
              const score = payload[0].value as number
              const rc = riskHex(score)
              const level = score >= 65 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW'
              return (
                <div style={{
                  backgroundColor: '#1c1c1e', border: 'none', borderRadius: 14,
                  padding: '14px 18px', boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
                  minWidth: 180,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 8 }}>{label}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Risk Score</span>
                    <span style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: rc }}>{score.toFixed(1)}</span>
                  </div>
                  <div style={{
                    marginTop: 6, padding: '3px 8px', borderRadius: 6,
                    backgroundColor: `${rc}18`, display: 'inline-flex', alignSelf: 'flex-start',
                  }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: rc, letterSpacing: '0.5px' }}>{level} RISK</span>
                  </div>
                </div>
              )
            }}
          />

          <Area
            type="monotone"
            dataKey="score"
            stroke={CORAL}
            strokeWidth={2.5}
            fill="url(#historyGrad)"
            dot={(props: any) => {
              if (!props || typeof props.index !== 'number') return <g key={`empty-${Math.random()}`} />
              const point = chartData[props.index]
              if (!point || typeof props.cx !== 'number' || typeof props.cy !== 'number') return <g key={`skip-${props.index}`} />
              // Show every 4th dot to reduce clutter
              if (props.index % 4 !== 0 && props.index !== chartData.length - 1) return <g key={`hide-${props.index}`} />
              const dotColor = riskHex(point.score)
              return (
                <circle
                  key={`dot-${props.index}`}
                  cx={props.cx} cy={props.cy} r={3.5}
                  fill={dotColor} stroke="var(--background)" strokeWidth={2}
                />
              )
            }}
            activeDot={{ r: 6, fill: CORAL, stroke: 'var(--background)', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}