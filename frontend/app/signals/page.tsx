'use client'

import { useEffect, useState } from 'react'
import { Activity, TrendingUp } from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { api, isBackendOffline } from '@/lib/api/client'

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
        if (!isBackendOffline(err)) {
          console.error('Signal forecast error:', err)
        }
        // Demo forecast data
        const today = new Date()
        const demoPoints = []
        
        // Historical (last 52 weeks)
        for (let i = 52; i >= 1; i--) {
          const date = new Date(today)
          date.setDate(date.getDate() - i * 7)
          const baseValue = 100 + Math.sin(i / 8) * 20 + Math.random() * 10
          demoPoints.push({
            forecast_date: date.toISOString().split('T')[0],
            yhat: baseValue,
            yhat_lower: baseValue - 5,
            yhat_upper: baseValue + 5,
            is_forecast: false,
          })
        }
        
        // Forecast (next 12 weeks)
        const lastValue = demoPoints[demoPoints.length - 1].yhat
        for (let i = 1; i <= 12; i++) {
          const date = new Date(today)
          date.setDate(date.getDate() + i * 7)
          const trend = i * 0.5
          const baseValue = lastValue + trend + Math.random() * 5
          demoPoints.push({
            forecast_date: date.toISOString().split('T')[0],
            yhat: baseValue,
            yhat_lower: baseValue - 8,
            yhat_upper: baseValue + 8,
            is_forecast: true,
          })
        }
        
        setForecastData(demoPoints)
      } finally {
        setLoading(false)
      }
    }
    fetchForecast()
  }, [selectedSignal])

  const historicalData = forecastData.filter(d => !d.is_forecast)
  const forecastPoints = forecastData.filter(d => d.is_forecast)

  // Combine for chart with overlap
  const chartData = [
    ...historicalData,
    ...(historicalData.length > 0 && forecastPoints.length > 0
      ? [historicalData[historicalData.length - 1]]
      : []),
    ...forecastPoints
  ]

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DashboardHeader
        title="Signal Forecasts"
        description="Prophet time-series forecasting for key economic indicators"
      />
      
      <main className="flex-1 space-y-6 p-6 bg-background">
        {/* Signal Selector */}
        <Card className="border-red-20 bg-red-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-5" />
              Select Signal
            </CardTitle>
            <CardDescription className="text-45">
              Choose an economic indicator to view its forecast
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {AVAILABLE_SIGNALS.map((signal) => (
                <Button
                  key={signal.key}
                  variant={selectedSignal === signal.key ? 'default' : 'outline'}
                  onClick={() => setSelectedSignal(signal.key)}
                  className={`${
                    selectedSignal === signal.key
                      ? 'bg-red-15 border-red-40 hover:bg-red-12'
                      : 'border-red-20 hover:bg-red-8'
                  }`}
                >
                  {signal.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Forecast Chart */}
        {loading ? (
          <Card className="border-red-20 bg-red-4">
            <CardContent className="py-20 text-center">
              <div className="text-70">Loading forecast data...</div>
            </CardContent>
          </Card>
        ) : chartData.length > 0 ? (
          <Card className="border-red-20 bg-red-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="size-5" />
                {AVAILABLE_SIGNALS.find(s => s.key === selectedSignal)?.label} Forecast
              </CardTitle>
              <CardDescription className="text-45">
                Historical data + 12-week Prophet forecast with confidence intervals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#df2531" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#df2531" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="forecast_date"
                    stroke="rgba(255,255,255,0.45)"
                    tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.45)"
                    tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#000000',
                      border: '1px solid rgba(223,37,49,0.3)',
                      borderRadius: '8px',
                      color: '#ffffff'
                    }}
                    formatter={(value: any, name: string) => [
                      Number(value).toFixed(2),
                      name === 'yhat' ? 'Forecast' : name === 'yhat_upper' ? 'Upper Bound' : name === 'yhat_lower' ? 'Lower Bound' : name
                    ]}
                    labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  />
                  
                  {/* Confidence interval */}
                  <Area
                    type="monotone"
                    dataKey="yhat_upper"
                    stroke="none"
                    fill="url(#confidenceGradient)"
                    fillOpacity={0.3}
                  />
                  <Area
                    type="monotone"
                    dataKey="yhat_lower"
                    stroke="none"
                    fill="#000000"
                    fillOpacity={1}
                  />
                  
                  {/* Main forecast line */}
                  <Line
                    type="monotone"
                    dataKey="yhat"
                    stroke="#df2531"
                    strokeWidth={2}
                    dot={(props: any) => {
                      const point = chartData[props.index]
                      if (!point) return null
                      return point.is_forecast ? (
                        <circle
                          cx={props.cx}
                          cy={props.cy}
                          r={4}
                          fill="#f59e0b"
                          stroke="#f59e0b"
                          strokeWidth={2}
                        />
                      ) : (
                        <circle
                          cx={props.cx}
                          cy={props.cy}
                          r={4}
                          fill="#df2531"
                          stroke="#df2531"
                          strokeWidth={2}
                        />
                      )
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#df2531]"></div>
                  <span className="text-70">Historical</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#f59e0b]"></div>
                  <span className="text-70">Forecast</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-2 bg-gradient-to-b from-[rgba(223,37,49,0.2)] to-transparent"></div>
                  <span className="text-70">Confidence Interval</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-red-20 bg-red-4">
            <CardContent className="py-20 text-center">
              <div className="text-70">No forecast data available for this signal</div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        {forecastPoints.length > 0 && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-red-20 bg-red-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-45">Current Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-100">
                  {historicalData.length > 0 ? historicalData[historicalData.length - 1].yhat.toFixed(2) : 'N/A'}
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-20 bg-red-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-45">12-Week Forecast</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-100">
                  {forecastPoints[forecastPoints.length - 1]?.yhat.toFixed(2) || 'N/A'}
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-20 bg-red-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-45">Expected Change</CardTitle>
              </CardHeader>
              <CardContent>
                {historicalData.length > 0 && forecastPoints.length > 0 && (
                  <>
                    <div className={`text-2xl font-bold ${
                      forecastPoints[forecastPoints.length - 1].yhat > historicalData[historicalData.length - 1].yhat
                        ? 'text-[#df2531]'
                        : 'text-[#22c55e]'
                    }`}>
                      {forecastPoints[forecastPoints.length - 1].yhat > historicalData[historicalData.length - 1].yhat ? '↑' : '↓'}
                      {' '}
                      {Math.abs(
                        ((forecastPoints[forecastPoints.length - 1].yhat - historicalData[historicalData.length - 1].yhat) /
                          historicalData[historicalData.length - 1].yhat) * 100
                      ).toFixed(1)}%
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-red-20 bg-red-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-45">Data Points</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-100">
                  {forecastData.length}
                </div>
                <div className="text-xs text-45 mt-1">
                  {historicalData.length} historical + {forecastPoints.length} forecast
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* About Prophet */}
        <Card className="border-red-20 bg-red-4">
          <CardHeader>
            <CardTitle>About Prophet Forecasting</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-70">
            <p>
              <strong className="text-100">Prophet</strong> is a procedure developed by Facebook's Core Data Science team
              for forecasting time series data based on an additive model where non-linear trends are fit with yearly,
              weekly, and daily seasonality, plus holiday effects.
            </p>
            <p>
              It works best with time series that have strong seasonal effects and several seasons of historical data.
              Prophet is robust to missing data and shifts in the trend, and typically handles outliers well.
            </p>
            <p>
              The <strong className="text-100">confidence interval</strong> (shaded area) represents the range where we
              expect the actual value to fall with high probability. Wider intervals indicate greater uncertainty.
            </p>
            <div className="pt-2 border-t border-red-20 text-xs text-45">
              <strong className="text-100">Available signals:</strong> Natural Gas Price, Crude Oil Price, Copper,
              Import Price Index, Trade Balance, CPI (All Items)
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
