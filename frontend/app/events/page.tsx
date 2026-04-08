'use client'

import { useEffect, useState } from 'react'
import { Lightbulb, Calendar, TrendingUp, TrendingDown } from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { api, isBackendOffline } from '@/lib/api/client'
import { c, getRiskColor } from '@/lib/theme-colors'

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

  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoading(true)
        const data = await api.getNamedEvents()
        setEvents(data.events)
        if (data.events.length > 0) setSelectedEvent(data.events[0])
      } catch (err) {
        if (!isBackendOffline(err)) console.error('Events error:', err)
        const demoEvents: HistoricalEvent[] = [
          { date: '2020-03-20', event: 'COVID-19 peak supply shock', period: 'Feb–Jun 2020', risk_score: 84.5, risk_level: 'high', actual_date: '2020-03-20' },
          { date: '2021-03-26', event: 'Suez Canal blockage', period: 'Mar–Apr 2021', risk_score: 78.2, risk_level: 'high', actual_date: '2021-03-26' },
          { date: '2022-03-04', event: 'Ukraine invasion — week 1', period: 'Feb–Jun 2022', risk_score: 89.3, risk_level: 'high', actual_date: '2022-03-04' },
          { date: '2022-10-07', event: 'Port congestion crisis peak', period: 'Sep–Dec 2022', risk_score: 76.8, risk_level: 'high', actual_date: '2022-10-07' },
          { date: '2025-03-07', event: '2025 tariff wave', period: 'Jan 2025–present', risk_score: 72.3, risk_level: 'high', actual_date: '2025-03-07' },
        ]
        setEvents(demoEvents)
        if (demoEvents.length > 0) setSelectedEvent(demoEvents[0])
      } finally {
        setLoading(false)
      }
    }
    fetchEvents()
  }, [])

  useEffect(() => {
    if (!selectedEvent) return
    async function fetchShap() {
      try {
        const data = await api.getShapWaterfall(selectedEvent!.date, 12)
        setShapData({ features: data.features, base_value: data.base_value, prediction: data.prediction, risk_score: data.risk_score })
      } catch (err) {
        if (!isBackendOffline(err)) console.error('SHAP error:', err)
        setShapData({
          features: [
            { feature: 'natural_gas_price_lag_1w', label: 'Natural gas (1w ago)', shap_value: 0.0727, feature_value: 3.42, direction: 'increases_risk' },
            { feature: 'copper', label: 'Copper price', shap_value: 0.0459, feature_value: 4.18, direction: 'increases_risk' },
            { feature: 'natural_gas_price_std_4w', label: 'Natural gas volatility (4w)', shap_value: 0.0403, feature_value: 0.89, direction: 'increases_risk' },
            { feature: 'import_price_index', label: 'Import price index', shap_value: 0.0312, feature_value: 128.4, direction: 'increases_risk' },
            { feature: 'trade_balance_change_4w', label: 'Trade balance change (4w)', shap_value: 0.0161, feature_value: -2.3, direction: 'increases_risk' },
            { feature: 'energy_std_8w', label: 'Energy ETF volatility (8w)', shap_value: 0.0158, feature_value: 0.67, direction: 'increases_risk' },
            { feature: 'crude_oil_price', label: 'Crude oil price', shap_value: -0.0084, feature_value: 78.2, direction: 'decreases_risk' },
            { feature: 'ppi_manufacturing', label: 'Manufacturing PPI', shap_value: -0.0051, feature_value: 112.3, direction: 'decreases_risk' },
            { feature: 'capacity_utilization', label: 'Capacity utilization', shap_value: 0.0047, feature_value: 76.8, direction: 'increases_risk' },
            { feature: 'goods_imports', label: 'Goods imports', shap_value: 0.0038, feature_value: 245.6, direction: 'increases_risk' },
            { feature: 'cpi_all', label: 'CPI (all items)', shap_value: -0.0032, feature_value: 298.4, direction: 'decreases_risk' },
            { feature: 'aluminum_zscore_8w', label: 'Aluminum z-score (8w)', shap_value: 0.0027, feature_value: 1.2, direction: 'increases_risk' },
          ],
          base_value: 0.35,
          prediction: 0.723,
          risk_score: selectedEvent!.risk_score,
        })
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

        {/* ═══ EVENT TIMELINE ═══ */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Calendar className="size-5" />
              Major Disruption Events
            </CardTitle>
            <CardDescription>Select an event to view detailed SHAP analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => {
                const isActive = selectedEvent?.date === event.date
                return (
                  <button
                    key={event.date}
                    onClick={() => setSelectedEvent(event)}
                    className="h-auto p-4 flex flex-col items-start text-left rounded-lg transition-all"
                    style={{
                      backgroundColor: isActive ? c.coralSoft : 'transparent',
                      border: `1px solid ${isActive ? c.coralBorder : c.border}`,
                      cursor: 'pointer',
                    }}
                  >
                    <div className="font-semibold text-sm mb-1 text-foreground">{event.event}</div>
                    <div className="text-xs mb-2 text-muted-foreground">{event.period}</div>
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs text-muted-foreground">{event.date}</span>
                      <span className="text-lg font-bold" style={{ color: getRiskColor(event.risk_level) }}>
                        {event.risk_score.toFixed(0)}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* ═══ SELECTED EVENT ═══ */}
        {selectedEvent && shapData && (
          <>
            {/* Event Header */}
            <Card className="border-border bg-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">{selectedEvent.event}</h2>
                    <p className="text-sm mt-1 text-muted-foreground">{selectedEvent.period}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold" style={{ color: getRiskColor(selectedEvent.risk_level) }}>
                      {selectedEvent.risk_score.toFixed(1)}
                    </div>
                    <div className="text-sm mt-1 text-muted-foreground">
                      {selectedEvent.risk_level.toUpperCase()} RISK
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ═══ SHAP WATERFALL — Recharts needs c tokens ═══ */}
            <Card className="border-border bg-card">
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
                      tick={{ fill: c.tick, fontSize: 11 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      stroke={c.axis}
                      tick={{ fill: c.tickLabel, fontSize: 11 }}
                      width={140}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: c.cardBg,
                        border: `1px solid ${c.border}`,
                        borderRadius: 10,
                        color: c.t1,
                        fontSize: 12,
                      }}
                      itemStyle={{ color: c.t1 }}
                      labelStyle={{ color: c.t3, marginBottom: 4 }}
                      formatter={(value: any, _: string, props: any) => {
                        const dir = props.payload.direction === 'increases_risk' ? '↑ Increases risk' : '↓ Decreases risk'
                        return [
                          `SHAP: ${Number(value).toFixed(5)} | Value: ${props.payload.feature_value.toFixed(4)} | ${dir}`,
                          'Impact'
                        ]
                      }}
                    />
                    <Bar dataKey="shap_value" radius={[0, 4, 4, 0]}>
                      {shapData.features.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.direction === 'increases_risk' ? c.coral : c.green}
                          fillOpacity={0.85}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                {/* Legend — Tailwind classes */}
                <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-coral" />
                    <TrendingUp className="size-4 text-coral" />
                    <span className="text-t2">Increases Risk</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green" />
                    <TrendingDown className="size-4 text-green" />
                    <span className="text-t2">Decreases Risk</span>
                  </div>
                </div>

                {/* Model Stats — Tailwind classes */}
                <div className="grid grid-cols-3 gap-4 mt-6 pt-6 text-center border-t border-border">
                  <div>
                    <div className="text-sm text-muted-foreground">Base Value</div>
                    <div className="text-xl font-bold text-foreground">{shapData.base_value.toFixed(4)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Prediction</div>
                    <div className="text-xl font-bold text-foreground">{shapData.prediction.toFixed(4)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Risk Score</div>
                    <div className="text-xl font-bold" style={{ color: getRiskColor(selectedEvent.risk_level) }}>
                      {shapData.risk_score.toFixed(1)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ═══ TOP 3 DRIVERS — Tailwind classes ═══ */}
            <div className="grid gap-4 md:grid-cols-3">
              {shapData.features.slice(0, 3).map((feature, i) => (
                <Card key={i} className="border-border bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      #{i + 1} Driver
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-lg font-semibold text-foreground">{feature.label}</div>
                      <div className="text-xs font-mono text-muted-foreground">{feature.feature}</div>
                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <span className="text-xs text-muted-foreground">SHAP Value</span>
                        <span
                          className="text-sm font-bold"
                          style={{ color: feature.direction === 'increases_risk' ? c.coral : c.green }}
                        >
                          {feature.direction === 'increases_risk' ? '↑' : '↓'}{' '}
                          {Math.abs(feature.shap_value).toFixed(5)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Feature Value</span>
                        <span className="text-sm font-mono text-t2">{feature.feature_value.toFixed(4)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* ═══ ABOUT SHAP — Tailwind classes ═══ */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Lightbulb className="size-5" />
              What is SHAP?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-t2">
            <p>
              <strong className="text-foreground">SHAP (SHapley Additive exPlanations)</strong> is a unified approach to explain
              the output of any machine learning model. It connects optimal credit allocation with local explanations using
              the classic Shapley values from game theory.
            </p>
            <p>
              For each prediction, SHAP computes the contribution of each feature. Positive SHAP values (red bars) push
              the prediction <strong className="text-foreground">toward disruption</strong>, while negative values (green bars)
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