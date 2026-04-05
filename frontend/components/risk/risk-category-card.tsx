'use client'

import { DollarSign, Settings, Globe, Shield, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RiskCategory } from '@/lib/data/types'
import { getScoreSeverity } from '@/lib/data/utils'
import { Card, CardContent } from '@/components/ui/card'

interface RiskCategoryCardProps {
  category: RiskCategory
  score: number
  trend: number
  isSelected?: boolean
  onClick?: () => void
}

const categoryConfig: Record<RiskCategory, { label: string; icon: typeof DollarSign }> = {
  financial: { label: 'Financial', icon: DollarSign },
  operational: { label: 'Operational', icon: Settings },
  geopolitical: { label: 'Geopolitical', icon: Globe },
  compliance: { label: 'Compliance', icon: Shield },
}

export function RiskCategoryCard({
  category,
  score,
  trend,
  isSelected,
  onClick,
}: RiskCategoryCardProps) {
  const config = categoryConfig[category]
  const Icon = config.icon
  const severity = getScoreSeverity(score)
  
  const severityColors = {
    critical: 'border-[rgba(223,37,49,0.4)] bg-[rgba(223,37,49,0.12)]',
    high: 'border-[rgba(223,37,49,0.4)] bg-[rgba(223,37,49,0.12)]',
    medium: 'border-[rgba(245,158,11,0.4)] bg-[rgba(245,158,11,0.12)]',
    low: 'border-[rgba(34,197,94,0.4)] bg-[rgba(34,197,94,0.12)]',
  }
  
  const textColors = {
    critical: 'text-[#df2531]',
    high: 'text-[#df2531]',
    medium: 'text-[#f59e0b]',
    low: 'text-[#22c55e]',
  }
  
  const bgColors = {
    critical: '#df2531',
    high: '#df2531',
    medium: '#f59e0b',
    low: '#22c55e',
  }
  
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all border-neutral bg-neutral-dark hover:bg-neutral-hover hover:border-neutral-hover',
        isSelected && 'ring-2 ring-[#df2531] ring-offset-2 ring-offset-background border-red-40 glow-red bg-red-4',
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className={cn('rounded-lg p-2 border', severityColors[severity])}>
            <Icon className={cn('size-5', textColors[severity])} />
          </div>
          <div className="flex items-center gap-1 text-sm">
            {trend >= 0 ? (
              <TrendingUp className="size-4 text-[#df2531]" />
            ) : (
              <TrendingDown className="size-4 text-[#22c55e]" />
            )}
            <span className={trend >= 0 ? 'text-[#df2531]' : 'text-[#22c55e]'}>
              {trend >= 0 ? '+' : ''}{trend}%
            </span>
          </div>
        </div>
        
        <div className="mt-4">
          <p className="text-sm text-45">{config.label}</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={cn('text-2xl font-bold tabular-nums', textColors[severity])}>
              {score}
            </span>
            <span className="text-sm text-45">/ 100</span>
          </div>
        </div>
        
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.05)]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${score}%`,
                backgroundColor: bgColors[severity]
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
