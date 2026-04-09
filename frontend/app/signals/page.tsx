'use client'

import { useEffect, useState } from 'react'
import { Activity, TrendingUp, Lightbulb } from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { api, isBackendOffline } from '@/lib/api/client'
import { c } from '@/lib/theme-colors'

/*
 * CHART COLOR CONSTANTS — hardcoded for SVG compatibility
 */
const CORAL = '#df2531'
const AMBER = '#f59e0b'
const BLUE = '#6366f1'

const AVAILABLE_SIGNALS = [
  { key: 'natural_gas_price', label: 'Natural Gas Price' },
  { key: 'crude_oil_price', label: 'Crude Oil Price' },
  { key: 'copper', label: 'Copper Price' },
  { key: 'import_price_index', label: 'Import Price Index' },
  { key: 'trade_balance', label: 'Trade Balance' },
  { key: 'cpi_all', label: 'CPI (All Items)' },
]

export default function SignalsPage() {
  const [selectedSignal, setSelectedSignal] = useState('natural_gas_price')
  const [forecastData, setForecastData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function fetchForecast() {
      try {
        setLoading(true)
        const data = await api.getSignalForecast(selectedSignal)
        setForecastData(data.points)
      } catch (err) {
        if (!isBackendOffline(err)) console.error('Signal forecast error:', err)
        const today = new Date(); const demoPoints = []
        for (let i = 52; i >= 1; i--) {
          const date = new Date(today); date.setDate(date.getDate() - i * 7)
          const bv = 100 + Math.sin(i / 8) * 20 + Math.random() * 10
          demoPoints.push({ forecast_date: date.toISOString().split('T')[0], yhat: bv, yhat_lower: bv - 5, yhat_upper: bv + 5, is_forecast: false })
        }
        const lv = demoPoints[demoPoints.length - 1].yhat
        for (let i = 1; i <= 12; i++) {
          const date = new Date(today); date.setDate(date.getDate() + i * 7)
          const bv = lv + i * 0.5 + Math.random() * 5
          demoPoints.push({ forecast_date: date.toISOString().split('T')[0], yhat: bv, yhat_lower: bv - 8, yhat_upper: bv + 8, is_forecast: true })
        }
        setForecastData(demoPoints)
      } finally { setLoading(false) }
    }
    fetchForecast()
  }, [selectedSignal])

  const historicalData = forecastData.filter(d => !d.is_forecast)
  const forecastPoints = forecastData.filter(d => d.is_forecast)
  const chartData = [...historicalData, ...(historicalData.length > 0 && forecastPoints.length > 0 ? [historicalData[historicalData.length - 1]] : []), ...forecastPoints]

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DashboardHeader title="Signal Forecasts" description="Prophet time-series forecasting for key economic indicators" />
      
      <main className="flex-1 space-y-6 p-6">

        {/* ═══ SIGNAL SELECTOR ═══ */}
        <Card className="border-border bg-card overflow-hidden">
          <div style={{
            height: 3,
            background: `linear-gradient(90deg, ${AMBER}, ${AMBER}40 50%, transparent)`,
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
                backgroundColor: `${AMBER}12`,
                border: `1px solid ${AMBER}20`,
              }}>
                <Activity className="size-4" style={{ color: AMBER }} />
              </div>
              <div>
                <CardTitle className="text-foreground text-base">Select Signal</CardTitle>
                <CardDescription className="text-xs mt-0.5">Choose an economic indicator to view its forecast</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {AVAILABLE_SIGNALS.map((signal) => {
                const isActive = selectedSignal === signal.key
                return (
                  <button key={signal.key} onClick={() => setSelectedSignal(signal.key)}
                    className="rounded-lg px-4 py-2.5 text-sm font-medium transition-all"
                    style={{
                      backgroundColor: isActive ? `${AMBER}12` : 'transparent',
                      border: `1px solid ${isActive ? `${AMBER}35` : 'rgba(128,128,128,0.15)'}`,
                      color: isActive ? AMBER : undefined,
                      cursor: 'pointer',
                    }}
                  >
                    <span className={isActive ? '' : 'text-muted-foreground'}>{signal.label}</span>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* ═══ CHART ═══ */}
        {loading ? (
          <Card className="border-border bg-card">
            <CardContent className="py-20 text-center text-muted-foreground">Loading forecast data...</CardContent>
          </Card>
        ) : chartData.length > 0 ? (
          <Card className="border-border bg-card overflow-hidden">
            <div style={{
              height: 3,
              background: `linear-gradient(90deg, ${CORAL}, ${AMBER}60 50%, transparent)`,
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
                  backgroundColor: `${CORAL}12`,
                  border: `1px solid ${CORAL}20`,
                }}>
                  <TrendingUp className="size-4" style={{ color: CORAL }} />
                </div>
                <div>
                  <CardTitle className="text-foreground text-base">
                    {AVAILABLE_SIGNALS.find(s => s.key === selectedSignal)?.label} Forecast
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">Historical data + 12-week Prophet forecast with confidence intervals</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="confUp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CORAL} stopOpacity={0.35}/>
                      <stop offset="95%" stopColor={CORAL} stopOpacity={0.08}/>
                    </linearGradient>
                    <linearGradient id="lineGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={AMBER} stopOpacity={0.25}/>
                      <stop offset="95%" stopColor={AMBER} stopOpacity={0.02}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
                  <XAxis dataKey="forecast_date" stroke={c.axis}
                    tick={{ fill: 'currentColor', fontSize: 11, opacity: 0.65 }}
                    tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                  <YAxis stroke={c.axis} tick={{ fill: 'currentColor', fontSize: 11, opacity: 0.65 }} />
                  <Tooltip
                    cursor={{ fill: 'rgba(128,128,128,0.06)' }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.[0]) return null
                      const d = payload[0].payload
                      return (
                        <div style={{
                          backgroundColor: '#1c1c1e',
                          border: 'none',
                          borderRadius: 14,
                          padding: '14px 18px',
                          boxShadow: '0 8px 32px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.25)',
                          minWidth: 200,
                        }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 8 }}>
                            {new Date(label).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Forecast</span>
                              <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'monospace', color: AMBER }}>{Number(d.yhat).toFixed(2)}</span>
                            </div>
                            {d.yhat_upper && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Range</span>
                                <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.7)' }}>
                                  {Number(d.yhat_lower).toFixed(1)} – {Number(d.yhat_upper).toFixed(1)}
                                </span>
                              </div>
                            )}
                            <div style={{
                              marginTop: 2,
                              padding: '3px 8px',
                              borderRadius: 6,
                              backgroundColor: d.is_forecast ? `${AMBER}18` : `${CORAL}18`,
                              display: 'inline-flex',
                              alignSelf: 'flex-start',
                            }}>
                              <span style={{ fontSize: 10, fontWeight: 600, color: d.is_forecast ? AMBER : CORAL }}>
                                {d.is_forecast ? '◆ Forecast' : '● Historical'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    }}
                  />
                  <Area type="monotone" dataKey="yhat_upper" stroke={`${CORAL}50`} strokeWidth={1} fill="url(#confUp)" fillOpacity={1} />
                  <Area type="monotone" dataKey="yhat_lower" stroke={`${CORAL}50`} strokeWidth={1} fill="var(--background)" fillOpacity={0.85} />
                  <Area type="monotone" dataKey="yhat" stroke="none" fill="url(#lineGlow)" fillOpacity={1} />
                  <Line type="monotone" dataKey="yhat" stroke={AMBER} strokeWidth={2.5}
                    dot={(props: any) => {
                      const pt = chartData[props.index]
                      if (!pt) return <></>
                      if (pt.is_forecast) return <circle cx={props.cx} cy={props.cy} r={4} fill={AMBER} stroke="var(--background)" strokeWidth={2} />
                      if (props.index % 4 !== 0) return <></>
                      return <circle cx={props.cx} cy={props.cy} r={3} fill={CORAL} stroke="var(--background)" strokeWidth={1.5} />
                    }}
                    activeDot={{ r: 6, fill: AMBER, stroke: 'var(--background)', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div className="flex items-center justify-center gap-8 mt-5 text-[11px]">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CORAL }} />
                  <span className="text-muted-foreground">Historical</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 rounded" style={{ backgroundColor: AMBER }} />
                  <span className="text-muted-foreground">Forecast</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-3 rounded-sm" style={{ backgroundColor: `${CORAL}20` }} />
                  <span className="text-muted-foreground">Confidence</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border bg-card">
            <CardContent className="py-20 text-center text-muted-foreground">No forecast data available</CardContent>
          </Card>
        )}

        {/* ═══ STATS ═══ */}
        {forecastPoints.length > 0 && (
          <div className="grid gap-4 md:grid-cols-4">
            {(() => {
              const curVal = historicalData.length > 0 ? historicalData[historicalData.length - 1].yhat : null
              const fcVal = forecastPoints[forecastPoints.length - 1]?.yhat ?? null
              const up = curVal && fcVal ? fcVal > curVal : null
              const changePct = curVal && fcVal ? Math.abs(((fcVal - curVal) / curVal) * 100) : null

              const stats = [
                { label: 'Current Value', value: curVal ? curVal.toFixed(2) : 'N/A', color: AMBER },
                { label: '12-Week Forecast', value: fcVal ? fcVal.toFixed(2) : 'N/A', color: BLUE },
                { label: 'Expected Change', value: changePct !== null ? `${up ? '↑' : '↓'} ${changePct.toFixed(1)}%` : 'N/A', color: up ? CORAL : '#22c55e' },
                { label: 'Data Points', value: String(forecastData.length), sub: `${historicalData.length} historical + ${forecastPoints.length} forecast`, color: '#8b5cf6' },
              ]

              return stats.map((s: any) => {
                const isChangeCard = s.label === 'Expected Change'
                return (
                  <Card key={s.label} className="border-border bg-card overflow-hidden">
                    <div style={{
                      height: 3,
                      background: `linear-gradient(90deg, ${s.color}, ${s.color}40 50%, transparent)`,
                    }} />
                    <CardHeader className="pb-2">
                      <CardTitle className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">{s.label}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div
                        className="text-2xl font-bold tabular-nums"
                        style={isChangeCard ? { color: s.color } : undefined}
                      >
                        {isChangeCard ? (
                          <span style={{ color: s.color }}>{s.value}</span>
                        ) : (
                          <span className="text-foreground">{s.value}</span>
                        )}
                      </div>
                      {s.sub && <div className="text-xs text-muted-foreground mt-1">{s.sub}</div>}
                    </CardContent>
                  </Card>
                )
              })
            })()}
          </div>
        )}

        {/* ═══ ABOUT ═══ */}
        <Card className="border-border bg-card overflow-hidden">
          <div style={{
            height: 3,
            background: `linear-gradient(90deg, ${BLUE}, ${BLUE}00)`,
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
                backgroundColor: `${BLUE}12`,
                border: `1px solid ${BLUE}20`,
              }}>
                <Lightbulb className="size-4" style={{ color: BLUE }} />
              </div>
              <CardTitle className="text-foreground text-base">About Prophet Forecasting</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p><strong className="text-foreground">Prophet</strong> is a procedure developed by Facebook's Core Data Science team for forecasting time series data.</p>
            <p>It works best with time series that have strong seasonal effects and several seasons of historical data.</p>
            <p>The <strong className="text-foreground">confidence interval</strong> (<span style={{ color: CORAL, fontWeight: 600 }}>shaded area</span>) represents the range where we expect the actual value to fall with high probability.</p>
            <div className="pt-3 border-t border-border text-xs text-muted-foreground">
              <strong className="text-foreground">Available signals:</strong> Natural Gas, Crude Oil, Copper, Import Price Index, Trade Balance, CPI
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}