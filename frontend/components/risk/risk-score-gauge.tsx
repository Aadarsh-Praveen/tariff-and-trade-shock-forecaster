'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { getScoreSeverity } from '@/lib/data/utils'

const CORAL = '#df2531'
const AMBER = '#f59e0b'
const GREEN = '#22c55e'

function severityColor(severity: string): string {
  if (severity === 'critical' || severity === 'high') return CORAL
  if (severity === 'medium') return AMBER
  return GREEN
}

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
  const color = severityColor(severity)

  const sizeConfig = {
    sm: { width: 120, strokeWidth: 8, scoreFontSize: 28, labelFontSize: 11 },
    md: { width: 180, strokeWidth: 12, scoreFontSize: 40, labelFontSize: 13 },
    lg: { width: 240, strokeWidth: 16, scoreFontSize: 52, labelFontSize: 14 },
  }

  const config = sizeConfig[size]
  const radius = (config.width - config.strokeWidth) / 2
  const circumference = radius * Math.PI
  const progress = (animatedScore / 100) * circumference

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <svg
        width={config.width}
        height={config.width / 2 + config.strokeWidth}
        className="overflow-visible"
        style={{ filter: `drop-shadow(0 0 16px ${color}60)` }}
      >
        {/* Background arc */}
        <path
          d={`M ${config.strokeWidth / 2} ${config.width / 2} A ${radius} ${radius} 0 0 1 ${config.width - config.strokeWidth / 2} ${config.width / 2}`}
          fill="none"
          strokeWidth={config.strokeWidth}
          stroke="rgba(128,128,128,0.15)"
          strokeLinecap="round"
        />

        {/* Progress arc */}
        <path
          d={`M ${config.strokeWidth / 2} ${config.width / 2} A ${radius} ${radius} 0 0 1 ${config.width - config.strokeWidth / 2} ${config.width / 2}`}
          fill="none"
          strokeWidth={config.strokeWidth}
          stroke={color}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
        />

        {/* Score number */}
        <text
          x={config.width / 2}
          y={config.width / 2 - 10}
          textAnchor="middle"
          fill={color}
          style={{
            fontSize: config.scoreFontSize,
            fontWeight: 800,
            fontVariantNumeric: 'tabular-nums',
            fontFamily: 'inherit',
          }}
        >
          {animatedScore}
        </text>

        {/* "Risk Score" label */}
        {showLabel && (
          <text
            x={config.width / 2}
            y={config.width / 2 + 18}
            textAnchor="middle"
            fill="currentColor"
            style={{
              fontSize: config.labelFontSize,
              opacity: 0.5,
              fontFamily: 'inherit',
            }}
          >
            Risk Score
          </text>
        )}
      </svg>

      {showLabel && (
        <div className="mt-2 flex items-center gap-2">
          <div
            className="size-2 rounded-full"
            style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}60` }}
          />
          <span className="text-sm font-semibold capitalize" style={{ color }}>
            {severity} Risk
          </span>
        </div>
      )}
    </div>
  )
}