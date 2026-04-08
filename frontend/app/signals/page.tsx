'use client'

import { useEffect, useState } from 'react'
import { Activity, TrendingUp } from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { api, isBackendOffline } from '@/lib/api/client'
import { c } from '@/lib/theme-colors'

/*
 * PATTERN FOR CHART PAGES:
 * - Card/text: Use Tailwind classes (text-foreground, bg-card, etc.) — they now work in both themes
 * - Recharts: Use `c` tokens from theme-colors.ts — Recharts needs inline style values
 * - SVG gradient stops: Use hardcoded hsl() — var() can fail in some browsers
 * - Buttons: Use Tailwind where possible, inline style for custom states
 */

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

        {/* Signal Selector — Tailwind classes for card, inline for buttons */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Activity className="size-5" />Select Signal
            </CardTitle>
            <CardDescription>Choose an economic indicator to view its forecast</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {AVAILABLE_SIGNALS.map((signal) => {
                const isActive = selectedSignal === signal.key
                return (
                  <button key={signal.key} onClick={() => setSelectedSignal(signal.key)}
                    className="rounded-md px-4 py-2 text-sm font-medium transition-all"
                    style={{
                      backgroundColor: isActive ? c.coralSoft : 'transparent',
                      border: `1px solid ${isActive ? c.coralBorder : c.border}`,
                      color: isActive ? c.coral : c.t2, cursor: 'pointer',
                    }}
                  >{signal.label}</button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Chart — Recharts needs inline styles via `c` tokens */}
        {loading ? (
          <Card className="border-border bg-card">
            <CardContent className="py-20 text-center text-muted-foreground">Loading forecast data...</CardContent>
          </Card>
        ) : chartData.length > 0 ? (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <TrendingUp className="size-5" />
                {AVAILABLE_SIGNALS.find(s => s.key === selectedSignal)?.label} Forecast
              </CardTitle>
              <CardDescription>Historical data + 12-week Prophet forecast with confidence intervals</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={chartData}>
                  <defs>
                    {/* SVG gradient stops: hardcoded hsl() — var() can fail in some browsers */}
                    <linearGradient id="confUp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(8 77% 61%)" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="hsl(8 77% 61%)" stopOpacity={0.08}/>
                    </linearGradient>
                    <linearGradient id="lineGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(38 92% 60%)" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="hsl(38 92% 60%)" stopOpacity={0.02}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
                  <XAxis dataKey="forecast_date" stroke={c.axis} tick={{ fill: c.tick, fontSize: 11 }}
                    tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                  <YAxis stroke={c.axis} tick={{ fill: c.tick, fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: c.cardBg, border: `1px solid ${c.border}`, borderRadius: 10, color: c.t1, fontSize: 12 }}
                    itemStyle={{ color: c.t1 }} labelStyle={{ color: c.t3 }}
                    formatter={(v: any, name: string) => [Number(v).toFixed(2), name === 'yhat' ? 'Forecast' : name === 'yhat_upper' ? 'Upper' : name === 'yhat_lower' ? 'Lower' : name]}
                    labelFormatter={(l) => new Date(l).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  />
                  <Area type="monotone" dataKey="yhat_upper" stroke={c.coralBorder} strokeWidth={1} fill="url(#confUp)" fillOpacity={1} />
                  <Area type="monotone" dataKey="yhat_lower" stroke={c.coralBorder} strokeWidth={1} fill={c.pageBg} fillOpacity={0.85} />
                  <Area type="monotone" dataKey="yhat" stroke="none" fill="url(#lineGlow)" fillOpacity={1} />
                  <Line type="monotone" dataKey="yhat" stroke={c.amber} strokeWidth={2.5}
                    dot={(props: any) => {
                      const pt = chartData[props.index]
                      if (!pt) return <></>
                      if (pt.is_forecast) return <circle cx={props.cx} cy={props.cy} r={4} fill={c.amber} stroke={c.pageBg} strokeWidth={2} />
                      if (props.index % 4 !== 0) return <></>
                      return <circle cx={props.cx} cy={props.cy} r={2.5} fill={c.coral} stroke="none" />
                    }}
                    activeDot={{ r: 6, fill: c.amber, stroke: c.pageBg, strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
              {/* Legend — use inline style for color swatches, Tailwind for text */}
              <div className="flex items-center justify-center gap-6 mt-4 text-[11px]">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.coral }} /><span className="text-muted-foreground">Historical</span></div>
                <div className="flex items-center gap-2"><div className="w-8 h-0.5 rounded" style={{ backgroundColor: c.amber }} /><span className="text-muted-foreground">Forecast</span></div>
                <div className="flex items-center gap-2"><div className="w-8 h-3 rounded-sm" style={{ backgroundColor: c.coralFaint }} /><span className="text-muted-foreground">Confidence</span></div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border bg-card">
            <CardContent className="py-20 text-center text-muted-foreground">No forecast data available</CardContent>
          </Card>
        )}

        {/* Stats — pure Tailwind, no inline styles needed */}
        {forecastPoints.length > 0 && (
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { label: 'Current Value', value: historicalData.length > 0 ? historicalData[historicalData.length - 1].yhat.toFixed(2) : 'N/A' },
              { label: '12-Week Forecast', value: forecastPoints[forecastPoints.length - 1]?.yhat.toFixed(2) || 'N/A' },
            ].map((s) => (
              <Card key={s.label} className="border-border bg-card">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold text-foreground">{s.value}</div></CardContent>
              </Card>
            ))}
            <Card className="border-border bg-card">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Expected Change</CardTitle></CardHeader>
              <CardContent>
                {historicalData.length > 0 && forecastPoints.length > 0 && (() => {
                  const cur = historicalData[historicalData.length - 1].yhat
                  const fc = forecastPoints[forecastPoints.length - 1].yhat
                  const up = fc > cur
                  return <div className={`text-2xl font-bold ${up ? 'text-coral' : 'text-green'}`}>{up ? '↑' : '↓'} {Math.abs(((fc - cur) / cur) * 100).toFixed(1)}%</div>
                })()}
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Data Points</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{forecastData.length}</div>
                <div className="text-xs text-muted-foreground mt-1">{historicalData.length} historical + {forecastPoints.length} forecast</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* About — pure Tailwind */}
        <Card className="border-border bg-card">
          <CardHeader><CardTitle className="text-foreground">About Prophet Forecasting</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p><strong className="text-foreground">Prophet</strong> is a procedure developed by Facebook's Core Data Science team for forecasting time series data.</p>
            <p>It works best with time series that have strong seasonal effects and several seasons of historical data.</p>
            <p>The <strong className="text-foreground">confidence interval</strong> (shaded area) represents the range where we expect the actual value to fall with high probability.</p>
            <div className="pt-2 border-t border-border text-xs text-muted-foreground">
              <strong className="text-foreground">Available signals:</strong> Natural Gas, Crude Oil, Copper, Import Price Index, Trade Balance, CPI
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}