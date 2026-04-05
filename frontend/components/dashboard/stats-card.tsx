'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

interface StatsCardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon: React.ReactNode
}

export function StatsCard({ title, value, change, changeLabel, icon }: StatsCardProps) {
  const getTrendIcon = () => {
    if (!change) return <Minus className="size-3" />
    if (change > 0) return <TrendingUp className="size-3" />
    return <TrendingDown className="size-3" />
  }
  
  const getTrendColor = () => {
    if (!change) return 'text-45'
    // For risk scores, up is bad, down is good
    if (change > 0) return 'text-[#df2531]'
    return 'text-[#22c55e]'
  }
  
  return (
    <Card className="border-neutral bg-neutral-dark hover:bg-neutral-hover hover:border-neutral-hover transition-all cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="rounded-lg bg-red-12 border border-red-20 p-2 text-[#df2531]">
            {icon}
          </div>
          {change !== undefined && (
            <div className={cn('flex items-center gap-1 text-xs font-medium', getTrendColor())}>
              {getTrendIcon()}
              <span>{change > 0 ? '+' : ''}{change}%</span>
            </div>
          )}
        </div>
        <div className="mt-3">
          <p className="text-sm text-45">{title}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-100">{value}</p>
          {changeLabel && (
            <p className="mt-1 text-xs text-45">{changeLabel}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
