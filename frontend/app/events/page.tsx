'use client'

import { useEffect, useState } from 'react'
import { Lightbulb, Calendar, TrendingUp, TrendingDown } from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { api, isBackendOffline } from '@/lib/api/client'
import { c, getRiskColor } from '@/lib/theme-colors'

/*
 * CHART COLOR CONSTANTS — hardcoded for SVG compatibility
 * SVG fill/stroke attributes can't resolve CSS var() reliably
 */
const CORAL = '#df2531'
const GREEN = '#22c55e'

/*
 * Hardcoded risk colors for inline styles that need hex alpha variants
 * getRiskColor() returns var() which can't have hex alpha suffixed
 */
function riskHex(level: string): string {
  if (level === 'high') return CORAL
  if (level === 'medium') return '#f59e0b'
  return GREEN
}

interface HistoricalEvent {
  date: string
  event: string
  period: string
  risk_score: number
  risk_level: string
  actual_date: string
}

interface ShapFeature {
  feature: string
  label: string
  shap_value: number
  feature_value: number
  direction: string
}

export default function EventsPage() {
  const [events, setEvents] = useState<HistoricalEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<HistoricalEvent | null>(null)
  const [shapData, setShapData] = useState<{
    features: ShapFeature[]
    base_value: number
    prediction: number
    risk_score: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [eventsError, setEventsError] = useState<string | null>(null)
  const [shapError, setShapError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoading(true)
        setEventsError(null)
        const data = await api.getNamedEvents()
        setEvents(data.events)
        if (data.events.length > 0) setSelectedEvent(data.events[0])
        else setSelectedEvent(null)
      } catch (err) {
        if (!(await isBackendOffline())) console.error('Events error:', err)
        setEvents([])
        setSelectedEvent(null)
        setEventsError('Could not load events from the API.')
      } finally {
        setLoading(false)
      }
    }
    fetchEvents()
  }, [])

  useEffect(() => {
    if (!selectedEvent) return
    async function fetchShap() {
      setShapData(null)
      try {
        setShapError(null)
        const data = await api.getShapWaterfall(selectedEvent!.date, 12)
        setShapData({ features: data.features, base_value: data.base_value, prediction: data.prediction, risk_score: data.risk_score })
      } catch (err) {
        if (!(await isBackendOffline())) console.error('SHAP error:', err)
        setShapData(null)
        setShapError('Could not load SHAP waterfall for this date.')
      }
    }
    fetchShap()
  }, [selectedEvent])

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <DashboardHeader title="Events" description="Historical disruption analysis" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Loading event data...</div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DashboardHeader
        title="Historical Event Analysis"
        description="SHAP explainability for major supply chain disruptions"
      />
      
      <main className="flex-1 space-y-6 p-6">
        {eventsError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {eventsError}
          </div>
        )}

        {/* ═══ EVENT TIMELINE ═══ */}
        <Card className="border-border bg-card overflow-hidden">
          <div style={{
            height: 3,
            background: `linear-gradient(90deg, ${CORAL}, #f59e0b80 50%, ${GREEN}00)`,
          }} />
          <CardHeader>
            <div className="flex items-center gap-3">
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: `${CORAL}10`,
                border: `1px solid ${CORAL}20`,
              }}>
                <Calendar className="size-4" style={{ color: CORAL }} />
              </div>
              <div>
                <CardTitle className="text-foreground text-base">Major Disruption Events</CardTitle>
                <CardDescription className="text-xs mt-0.5">Select an event to view detailed SHAP analysis</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => {
                const isActive = selectedEvent?.date === event.date
                const color = riskHex(event.risk_level)
                const score = event.risk_score
                return (
                  <button
                    key={event.date}
                    onClick={() => setSelectedEvent(event)}
                    className="group h-auto p-0 flex flex-col text-left rounded-xl transition-all overflow-hidden"
                    style={{
                      backgroundColor: isActive ? `${color}10` : 'transparent',
                      border: `1px solid ${isActive ? `${color}35` : 'rgba(128,128,128,0.15)'}`,
                      cursor: 'pointer',
                    }}
                  >
                    {/* Top accent bar */}
                    <div style={{
                      height: 3,
                      width: '100%',
                      background: isActive
                        ? `linear-gradient(90deg, ${color}, ${color}00)`
                        : 'transparent',
                      transition: 'all 0.2s',
                    }} />
                    <div className="p-4 w-full">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-[13px] leading-snug text-foreground truncate">
                            {event.event}
                          </div>
                          <div className="text-xs text-foreground mt-1">{event.period}</div>
                        </div>
                        {/* Score badge */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          backgroundColor: `${color}12`,
                          border: `1px solid ${color}25`,
                          flexShrink: 0,
                        }}>
                          <span style={{ fontSize: 16, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
                            {score.toFixed(0)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div style={{
                          width: 6, height: 6, borderRadius: '50%',
                          backgroundColor: color,
                          boxShadow: `0 0 6px ${color}60`,
                        }} />
                        <span className="text-xs font-medium text-foreground tabular-nums">{event.date}</span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {selectedEvent && shapError && !shapData && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {shapError}
          </div>
        )}

        {/* ═══ SELECTED EVENT ═══ */}
        {selectedEvent && shapData && (
          <>
            {/* Event Header */}
            <Card className="border-border bg-card overflow-hidden relative">
              <CardContent className="p-0">
                {/* Background glow */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '100%',
                  background: `radial-gradient(ellipse at 0% 0%, ${riskHex(selectedEvent.risk_level)}18 0%, transparent 60%)`,
                  pointerEvents: 'none',
                }} />
                {/* Top gradient accent */}
                <div style={{
                  height: 3,
                  background: `linear-gradient(90deg, ${riskHex(selectedEvent.risk_level)}, ${riskHex(selectedEvent.risk_level)}40 50%, transparent 100%)`,
                }} />
                <div className="relative flex items-stretch gap-0">
                  {/* Left — score block */}
                  <div className="border-r border-border" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '28px 32px',
                    minWidth: 140,
                  }}>
                    <div style={{
                      width: 72,
                      height: 72,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: `radial-gradient(circle, ${riskHex(selectedEvent.risk_level)}25, ${riskHex(selectedEvent.risk_level)}0a)`,
                      border: `2px solid ${riskHex(selectedEvent.risk_level)}45`,
                      boxShadow: `0 0 24px ${riskHex(selectedEvent.risk_level)}20`,
                    }}>
                      <span style={{
                        fontSize: 28,
                        fontWeight: 800,
                        color: riskHex(selectedEvent.risk_level),
                        fontVariantNumeric: 'tabular-nums',
                        lineHeight: 1,
                      }}>
                        {selectedEvent.risk_score.toFixed(0)}
                      </span>
                    </div>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      marginTop: 8,
                      padding: '3px 10px',
                      borderRadius: 6,
                      backgroundColor: `${riskHex(selectedEvent.risk_level)}18`,
                      color: riskHex(selectedEvent.risk_level),
                      letterSpacing: '0.8px',
                    }}>
                      {selectedEvent.risk_level.toUpperCase()}
                    </span>
                  </div>

                  {/* Right — details */}
                  <div className="flex-1 p-6 flex flex-col justify-center">
                    <h2 className="text-2xl font-bold text-foreground leading-tight">
                      {selectedEvent.event}
                    </h2>
                                          <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="size-3.5 text-foreground" />
                        <span className="text-xs text-foreground">{selectedEvent.period}</span>
                      </div>
                      <div className="w-px h-3.5 bg-border" />
                      <span className="text-xs font-mono text-foreground">{selectedEvent.date}</span>
                    </div>
                    {/* Score bar */}
                    <div className="mt-4" style={{ maxWidth: 280 }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-foreground uppercase tracking-wider font-semibold">Risk Score</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: riskHex(selectedEvent.risk_level), fontVariantNumeric: 'tabular-nums' }}>
                          {selectedEvent.risk_score.toFixed(1)} / 100
                        </span>
                      </div>
                      <div style={{
                        width: '100%',
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: 'rgba(128,128,128,0.12)',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${selectedEvent.risk_score}%`,
                          height: '100%',
                          borderRadius: 3,
                          background: `linear-gradient(90deg, ${riskHex(selectedEvent.risk_level)}aa, ${riskHex(selectedEvent.risk_level)})`,
                          boxShadow: `0 0 8px ${riskHex(selectedEvent.risk_level)}40`,
                          transition: 'width 0.4s ease',
                        }} />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ═══ SHAP WATERFALL ═══ */}
            <Card className="border-border bg-card overflow-hidden">
              <div style={{
                height: 3,
                background: `linear-gradient(90deg, ${CORAL}, ${CORAL}40 40%, ${GREEN}40 60%, ${GREEN}00)`,
              }} />
              <CardHeader>
                <CardTitle className="text-foreground">SHAP Waterfall Analysis</CardTitle>
                <CardDescription>
                  Feature contributions to the disruption prediction on {selectedEvent.date}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={500}>
                  <BarChart
                    data={shapData.features}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
                    <XAxis
                      type="number"
                      stroke={c.axis}
                      tick={{ fill: 'currentColor', fontSize: 11, opacity: 0.5 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      stroke={c.axis}
                      tick={{ fill: 'currentColor', fontSize: 11, opacity: 0.65 }}
                      width={140}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                      contentStyle={{ display: 'none' }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.[0]) return null
                        const d = payload[0].payload as ShapFeature
                        const isUp = d.direction === 'increases_risk'
                        return (
                          <div style={{
                            backgroundColor: '#1c1c1e',
                            border: 'none',
                            borderRadius: 14,
                            padding: '14px 18px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.25)',
                            minWidth: 220,
                          }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 10 }}>
                              {d.label}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.3px' }}>SHAP Impact</span>
                                <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'monospace', color: isUp ? CORAL : GREEN }}>
                                  {isUp ? '+' : ''}{Number(d.shap_value).toFixed(5)}
                                </span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.3px' }}>Feature Value</span>
                                <span style={{ fontSize: 12, fontWeight: 500, fontFamily: 'monospace', color: 'rgba(255,255,255,0.85)' }}>
                                  {d.feature_value.toFixed(4)}
                                </span>
                              </div>
                              <div style={{
                                marginTop: 4,
                                padding: '4px 8px',
                                borderRadius: 6,
                                backgroundColor: isUp ? `${CORAL}18` : `${GREEN}18`,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                alignSelf: 'flex-start',
                              }}>
                                <span style={{ fontSize: 11, fontWeight: 600, color: isUp ? CORAL : GREEN }}>
                                  {isUp ? '↑ Increases risk' : '↓ Decreases risk'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      }}
                    />
                    <Bar dataKey="shap_value" radius={[0, 4, 4, 0]}>
                      {shapData.features.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.direction === 'increases_risk' ? CORAL : GREEN}
                          fillOpacity={0.85}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                {/* Legend */}
                <div className="flex items-center justify-center gap-8 mt-5 text-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: CORAL }} />
                    <TrendingUp className="size-4" style={{ color: CORAL }} />
                    <span className="text-foreground">Increases Risk</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: GREEN }} />
                    <TrendingDown className="size-4" style={{ color: GREEN }} />
                    <span className="text-foreground">Decreases Risk</span>
                  </div>
                </div>

                {/* Model Stats */}
                <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border">
                  {[
                    { label: 'Base Value', value: shapData.base_value.toFixed(4), color: undefined },
                    { label: 'Prediction', value: shapData.prediction.toFixed(4), color: undefined },
                    { label: 'Risk Score', value: shapData.risk_score.toFixed(1), color: riskHex(selectedEvent.risk_level) },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center">
                      <div className="text-xs uppercase tracking-wider font-semibold text-foreground mb-2">{stat.label}</div>
                      <div
                        className="text-2xl font-bold tabular-nums"
                        style={{ color: stat.color || undefined }}
                      >
                        {stat.color ? (
                          <span style={{ color: stat.color }}>{stat.value}</span>
                        ) : (
                          <span className="text-foreground">{stat.value}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ═══ TOP 3 DRIVERS ═══ */}
            <div className="grid gap-4 md:grid-cols-3 items-stretch">
              {shapData.features.slice(0, 3).map((feature, i) => {
                const isUp = feature.direction === 'increases_risk'
                const driverColor = isUp ? CORAL : GREEN
                return (
                  <div
                    key={i}
                    className="transition-all duration-300 ease-out h-full [&>*]:h-full"
                    style={{ borderRadius: 'var(--radius)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)'
                      e.currentTarget.style.boxShadow = `0 16px 40px ${driverColor}25, 0 8px 20px rgba(0,0,0,0.25), 0 0 0 1px ${driverColor}15`
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0) scale(1)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                  <Card className="border-border bg-card overflow-hidden">
                    <div style={{
                      height: 3,
                      background: `linear-gradient(90deg, ${driverColor}, ${driverColor}00)`,
                    }} />
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground">#{i + 1} Driver</span>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 6,
                          backgroundColor: `${driverColor}15`,
                          color: driverColor,
                          letterSpacing: '0.5px',
                        }}>
                          {isUp ? '↑ RISK' : '↓ RISK'}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <div className="text-lg font-semibold text-foreground">{feature.label}</div>
                          <div className="text-xs font-mono text-foreground mt-0.5">{feature.feature}</div>
                        </div>
                        <div className="space-y-2 pt-3 border-t border-border">
                          <div className="flex items-center justify-between">
                            <span className="text-xs uppercase tracking-wider font-semibold text-foreground">SHAP Impact</span>
                            <span
                              className="text-sm font-bold font-mono"
                              style={{ color: driverColor }}
                            >
                              {isUp ? '+' : ''}{feature.shap_value.toFixed(5)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs uppercase tracking-wider font-semibold text-foreground">Feature Value</span>
                            <span className="text-sm font-mono text-foreground">{feature.feature_value.toFixed(4)}</span>
                          </div>
                          {/* Mini impact bar */}
                          <div style={{
                            width: '100%',
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: 'rgba(128,128,128,0.12)',
                            overflow: 'hidden',
                            marginTop: 4,
                          }}>
                            <div style={{
                              width: `${Math.min(Math.abs(feature.shap_value) / Math.abs(shapData.features[0].shap_value) * 100, 100)}%`,
                              height: '100%',
                              borderRadius: 2,
                              backgroundColor: driverColor,
                              boxShadow: `0 0 6px ${driverColor}40`,
                            }} />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* ═══ ABOUT SHAP ═══ */}
        <Card className="border-border bg-card overflow-hidden">
          <div style={{
            height: 3,
            background: 'linear-gradient(90deg, #6366f1, #6366f100)',
          }} />
          <CardHeader>
            <div className="flex items-center gap-3">
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#6366f118',
                border: '1px solid #6366f130',
              }}>
                <Lightbulb className="size-4" style={{ color: '#6366f1' }} />
              </div>
              <CardTitle className="text-foreground">What is SHAP?</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-foreground leading-relaxed">
            <p>
              <strong className="text-foreground">SHAP (SHapley Additive exPlanations)</strong> is a unified approach to explain
              the output of any machine learning model. It connects optimal credit allocation with local explanations using
              the classic Shapley values from game theory.
            </p>
            <p>
              For each prediction, SHAP computes the contribution of each feature. Positive SHAP values
              (<span style={{ color: CORAL, fontWeight: 600 }}>red bars</span>) push
              the prediction <strong className="text-foreground">toward disruption</strong>, while negative values
              (<span style={{ color: GREEN, fontWeight: 600 }}>green bars</span>)
              push it <strong className="text-foreground">away from disruption</strong>.
            </p>
            <p>
              Unlike black-box models, SHAP allows us to precisely quantify <strong className="text-foreground">why</strong> the
              model predicted high risk during major events like the COVID-19 supply shock or Ukraine invasion.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}