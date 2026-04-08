'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { c } from '@/lib/theme-colors'

interface StatsCardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon: React.ReactNode
  accentColor?: 'coral' | 'amber' | 'green' | 'blue' | 'purple'
}

const accentMap = {
  coral: { border: 'border-l-coral', soft: 'bg-coral-soft', text: 'text-coral' },
  amber: { border: 'border-l-amber', soft: 'bg-amber-soft', text: 'text-amber' },
  green: { border: 'border-l-green', soft: 'bg-green-soft', text: 'text-green' },
  blue: { border: 'border-l-blue', soft: 'bg-blue-soft', text: 'text-blue' },
  purple: { border: 'border-l-purple', soft: 'bg-purple-soft', text: 'text-purple' },
}

export function StatsCard({ title, value, change, changeLabel, icon, accentColor = 'coral' }: StatsCardProps) {
  const accent = accentMap[accentColor]
  
  const trendColor = !change ? 'text-muted-foreground' : change > 0 ? 'text-coral' : 'text-green'
  const trendBg = !change ? '' : change > 0 ? 'bg-coral-faint' : 'bg-green-faint'

  const barWidth = Math.min(100, Math.abs(typeof value === 'number' ? value : parseFloat(value.toString()) || 0))
  
  return (
    <Card className={cn('stat-card border-border bg-card', accent.border)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="section-label text-t4 mb-2">{title}</p>
            <p className="text-[22px] font-bold tabular-nums text-foreground leading-none">{value}</p>
            {changeLabel && <p className="mt-2 text-[10px] text-t4">{changeLabel}</p>}
          </div>
          {change !== undefined && (
            <div className={cn('flex items-center gap-1 text-[9px] font-semibold px-2 py-1 rounded', trendColor, trendBg)}>
              {!change ? <Minus className="size-3" /> : change > 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              <span>{change > 0 ? '+' : ''}{change}%</span>
            </div>
          )}
        </div>
        <div className="mt-3 progress-track">
          <div className="progress-fill" style={{ width: `${barWidth}%`, backgroundColor: `var(--risk-${accentColor === 'coral' ? 'high' : accentColor === 'amber' ? 'medium' : accentColor === 'green' ? 'low' : accentColor === 'blue' ? 'blue' : 'purple'})`, opacity: 0.85 }} />
        </div>
      </CardContent>
    </Card>
  )
}
