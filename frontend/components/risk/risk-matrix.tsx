'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { RiskEvent } from '@/lib/data/types'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface RiskMatrixProps {
  events: RiskEvent[]
  selectedEventId?: string
  onEventSelect?: (event: RiskEvent) => void
}

const GRID_SIZE = 5

// Map likelihood/impact to visual positions (1-5 to 0-4)
const getPosition = (value: number) => value - 1

// Calculate risk level based on likelihood * impact
const getRiskLevel = (likelihood: number, impact: number): 'critical' | 'high' | 'medium' | 'low' => {
  const score = likelihood * impact
  if (score >= 20) return 'critical'
  if (score >= 12) return 'high'
  if (score >= 6) return 'medium'
  return 'low'
}

const cellColors: Record<string, string> = {
  'critical': 'bg-risk-critical/40',
  'high': 'bg-risk-high/30',
  'medium': 'bg-risk-medium/20',
  'low': 'bg-risk-low/15',
}

const dotColors: Record<string, string> = {
  'critical': 'bg-risk-critical',
  'high': 'bg-risk-high',
  'medium': 'bg-risk-medium',
  'low': 'bg-risk-low',
}

export function RiskMatrix({ events, selectedEventId, onEventSelect }: RiskMatrixProps) {
  // Group events by their position on the matrix
  const eventsByPosition = useMemo(() => {
    const map = new Map<string, RiskEvent[]>()
    events.forEach((event) => {
      const key = `${event.likelihood}-${event.impact}`
      const existing = map.get(key) || []
      map.set(key, [...existing, event])
    })
    return map
  }, [events])
  
  // Generate grid cells (5x5)
  const cells = useMemo(() => {
    const result: Array<{
      likelihood: number
      impact: number
      riskLevel: ReturnType<typeof getRiskLevel>
      events: RiskEvent[]
    }> = []
    
    // Go from top (high impact) to bottom (low impact)
    for (let impact = 5; impact >= 1; impact--) {
      for (let likelihood = 1; likelihood <= 5; likelihood++) {
        const key = `${likelihood}-${impact}`
        result.push({
          likelihood,
          impact,
          riskLevel: getRiskLevel(likelihood, impact),
          events: eventsByPosition.get(key) || [],
        })
      }
    }
    
    return result
  }, [eventsByPosition])
  
  return (
    <TooltipProvider>
      <div className="flex flex-col gap-2">
        {/* Matrix container */}
        <div className="flex gap-2">
          {/* Y-axis label */}
          <div className="flex w-8 flex-col items-center justify-center">
            <span className="rotate-[-90deg] whitespace-nowrap text-xs font-medium text-muted-foreground">
              Impact
            </span>
          </div>
          
          {/* Y-axis values */}
          <div className="flex flex-col justify-between py-1 pr-2">
            {[5, 4, 3, 2, 1].map((val) => (
              <div key={val} className="flex h-16 items-center justify-center text-xs text-muted-foreground">
                {val}
              </div>
            ))}
          </div>
          
          {/* Grid */}
          <div className="grid flex-1 grid-cols-5 gap-1">
            {cells.map((cell, index) => (
              <div
                key={index}
                className={cn(
                  'relative flex h-16 items-center justify-center rounded-md border border-border/50',
                  cellColors[cell.riskLevel]
                )}
              >
                {/* Event dots */}
                {cell.events.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-1 p-1">
                    {cell.events.slice(0, 4).map((event) => (
                      <Tooltip key={event.id}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => onEventSelect?.(event)}
                            className={cn(
                              'size-3 rounded-full transition-transform hover:scale-125',
                              dotColors[event.severity],
                              selectedEventId === event.id && 'ring-2 ring-white ring-offset-1 ring-offset-background'
                            )}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <div className="space-y-1">
                            <p className="font-medium">{event.title}</p>
                            <p className="text-xs text-muted-foreground">{event.supplierName}</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                    {cell.events.length > 4 && (
                      <span className="text-[10px] font-medium text-foreground">
                        +{cell.events.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* X-axis values */}
        <div className="flex gap-2 pl-12">
          <div className="grid flex-1 grid-cols-5 gap-1">
            {[1, 2, 3, 4, 5].map((val) => (
              <div key={val} className="flex h-6 items-center justify-center text-xs text-muted-foreground">
                {val}
              </div>
            ))}
          </div>
        </div>
        
        {/* X-axis label */}
        <div className="flex justify-center pl-12">
          <span className="text-xs font-medium text-muted-foreground">Likelihood</span>
        </div>
      </div>
    </TooltipProvider>
  )
}
