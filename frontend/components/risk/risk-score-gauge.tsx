'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { getScoreSeverity } from '@/lib/data/utils'

interface RiskScoreGaugeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

export function RiskScoreGauge({
  score,
  size = 'md',
  showLabel = true,
  className,
}: RiskScoreGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0)
  
  useEffect(() => {
    const duration = 1000
    const steps = 60
    const increment = score / steps
    let current = 0
    
    const timer = setInterval(() => {
      current += increment
      if (current >= score) {
        setAnimatedScore(score)
        clearInterval(timer)
      } else {
        setAnimatedScore(Math.round(current))
      }
    }, duration / steps)
    
    return () => clearInterval(timer)
  }, [score])
  
  const severity = getScoreSeverity(score)
  
  const sizeConfig = {
    sm: { width: 120, strokeWidth: 8, fontSize: 'text-2xl' },
    md: { width: 180, strokeWidth: 12, fontSize: 'text-4xl' },
    lg: { width: 240, strokeWidth: 16, fontSize: 'text-5xl' },
  }
  
  const config = sizeConfig[size]
  const radius = (config.width - config.strokeWidth) / 2
  const circumference = radius * Math.PI // Half circle
  const progress = (animatedScore / 100) * circumference
  
  const colorMap = {
    critical: 'stroke-[#df2531]',
    high: 'stroke-[#df2531]',
    medium: 'stroke-[#f59e0b]',
    low: 'stroke-[#22c55e]',
  }
  
  const textColorMap = {
    critical: 'text-[#df2531]',
    high: 'text-[#df2531]',
    medium: 'text-[#f59e0b]',
    low: 'text-[#22c55e]',
  }
  
  const glowMap = {
    critical: 'drop-shadow-[0_0_16px_rgba(223,37,49,0.6)]',
    high: 'drop-shadow-[0_0_16px_rgba(223,37,49,0.6)]',
    medium: 'drop-shadow-[0_0_16px_rgba(245,158,11,0.6)]',
    low: 'drop-shadow-[0_0_16px_rgba(34,197,94,0.6)]',
  }
  
  return (
    <div className={cn('flex flex-col items-center', className)}>
      <svg
        width={config.width}
        height={config.width / 2 + config.strokeWidth}
        className={cn('overflow-visible', glowMap[severity])}
      >
        {/* Background arc - subtle red */}
        <path
          d={`M ${config.strokeWidth / 2} ${config.width / 2} A ${radius} ${radius} 0 0 1 ${config.width - config.strokeWidth / 2} ${config.width / 2}`}
          fill="none"
          strokeWidth={config.strokeWidth}
          className="stroke-[rgba(223,37,49,0.15)]"
          strokeLinecap="round"
        />
        
        {/* Progress arc */}
        <path
          d={`M ${config.strokeWidth / 2} ${config.width / 2} A ${radius} ${radius} 0 0 1 ${config.width - config.strokeWidth / 2} ${config.width / 2}`}
          fill="none"
          strokeWidth={config.strokeWidth}
          className={cn(colorMap[severity], 'transition-all duration-300')}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          style={{
            transition: 'stroke-dashoffset 0.5s ease-out',
          }}
        />
        
        {/* Center text */}
        <text
          x={config.width / 2}
          y={config.width / 2 - 10}
          textAnchor="middle"
          className={cn(config.fontSize, textColorMap[severity], 'font-bold tabular-nums')}
        >
          {animatedScore}
        </text>
        
        {showLabel && (
          <text
            x={config.width / 2}
            y={config.width / 2 + 20}
            textAnchor="middle"
            className="fill-[rgba(255,255,255,0.45)] text-sm"
          >
            Risk Score
          </text>
        )}
      </svg>
      
      {showLabel && (
        <div className="mt-2 flex items-center gap-2">
          <div 
            className="size-2 rounded-full"
            style={{ 
              backgroundColor: severity === 'critical' || severity === 'high' 
                ? '#df2531' 
                : severity === 'medium' 
                  ? '#f59e0b' 
                  : '#22c55e'
            }}
          />
          <span className={cn('text-sm font-medium capitalize', textColorMap[severity])}>
            {severity} Risk
          </span>
        </div>
      )}
    </div>
  )
}
