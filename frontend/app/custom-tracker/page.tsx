'use client'

import { useEffect, useState } from 'react'
import { Target, Check } from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { RiskScoreGauge } from '@/components/risk/risk-score-gauge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { api, isBackendOffline } from '@/lib/api/client'
import { c, getRiskColor } from '@/lib/theme-colors'

interface Commodity { key: string; label: string }

// Rank badge colors — use theme-aware tokens
const rankStyles = [
  { bg: c.coralSoft, text: c.coral },
  { bg: c.amberSoft, text: c.amber },
  { bg: c.greenSoft, text: c.green },
  { bg: c.secondary, text: c.t2 },
  { bg: c.secondary, text: c.t2 },
]

export default function CustomTrackerPage() {
  const [commodities, setCommodities] = useState<Commodity[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [customRisk, setCustomRisk] = useState<number | null>(null)
  const [customLevel, setCustomLevel] = useState<string>('')
  const [overallRisk, setOverallRisk] = useState<number | null>(null)
  const [topSignals, setTopSignals] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function fetchCommodities() {
      try {
        const data = await api.listCommodities()
        setCommodities(data.commodities)
        setSelected(['copper', 'natural_gas', 'crude_oil'])
      } catch (err) {
        if (!isBackendOffline(err)) console.error('Commodities error:', err)
        setCommodities([
          { key: 'copper', label: 'Copper' },
          { key: 'natural_gas', label: 'Natural Gas' },
          { key: 'crude_oil', label: 'Crude Oil' },
          { key: 'wheat', label: 'Wheat' },
          { key: 'aluminum', label: 'Aluminum' },
          { key: 'import_prices', label: 'Import Prices' },
          { key: 'trade_balance', label: 'Trade Balance' },
          { key: 'energy_sector', label: 'Energy Sector' },
          { key: 'industrials', label: 'Industrials' },
          { key: 'manufacturing', label: 'Manufacturing' },
          { key: 'cpi', label: 'CPI' },
          { key: 'materials', label: 'Materials' },
        ])
        setSelected(['copper', 'natural_gas', 'crude_oil'])
      }
    }
    fetchCommodities()
  }, [])

  useEffect(() => {
    if (selected.length === 0) return
    async function fetchCustomRisk() {
      try {
        setLoading(true)
        const data = await api.getCustomRisk(selected, 4)
        setCustomRisk(data.custom_risk_score)
        setCustomLevel(data.custom_risk_level)
        setOverallRisk(data.overall_risk_score)
        setTopSignals(data.top_signals)
      } catch (err) {
        if (!isBackendOffline(err)) console.error('Custom risk error:', err)
        const baseRisk = 72.3
        const adj = selected.length > 6 ? -5 : selected.length > 3 ? -3 : 0
        setCustomRisk(baseRisk + adj)
        setCustomLevel(baseRisk + adj > 65 ? 'high' : 'medium')
        setOverallRisk(baseRisk)
        setTopSignals([
          { feature: 'copper', label: 'Copper price', mean_abs_shap: 0.0076 },
          { feature: 'natural_gas_price_lag_1w', label: 'Natural gas (1w ago)', mean_abs_shap: 0.0271 },
          { feature: 'crude_oil_price', label: 'Crude oil price', mean_abs_shap: 0.0189 },
          { feature: 'import_price_index', label: 'Import price index', mean_abs_shap: 0.0062 },
          { feature: 'trade_balance_change_4w', label: 'Trade balance change (4w)', mean_abs_shap: 0.0049 },
        ])
      } finally { setLoading(false) }
    }
    fetchCustomRisk()
  }, [selected])

  const toggleCommodity = (key: string) => {
    setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DashboardHeader
        title="Custom Commodity Tracker"
        description="Personalized risk scores based on your selected commodities"
      />
      
      <main className="flex-1 space-y-6 p-6">

        {/* ═══ COMMODITY SELECTION ═══ */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Target className="size-5" />
              Select Commodities to Track
            </CardTitle>
            <CardDescription>
              Choose the commodities most relevant to your supply chain
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {commodities.map((commodity) => {
                const isActive = selected.includes(commodity.key)
                return (
                  <button
                    key={commodity.key}
                    onClick={() => toggleCommodity(commodity.key)}
                    className="flex items-center justify-start gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-all"
                    style={{
                      backgroundColor: isActive ? c.coralSoft : 'transparent',
                      border: `1px solid ${isActive ? c.coralBorder : c.border}`,
                      color: isActive ? c.coral : c.t2,
                      cursor: 'pointer',
                    }}
                  >
                    {isActive && <Check className="size-4" />}
                    {commodity.label}
                  </button>
                )
              })}
            </div>
            {selected.length === 0 && (
              <p className="text-sm mt-4 text-center text-muted-foreground">
                Select at least one commodity to see your custom risk score
              </p>
            )}
          </CardContent>
        </Card>

        {/* ═══ RISK COMPARISON ═══ */}
        {customRisk !== null && overallRisk !== null && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-foreground">Your Custom Risk Score</CardTitle>
                <CardDescription>
                  Based on {selected.length} selected commodit{selected.length === 1 ? 'y' : 'ies'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center pb-6 space-y-4">
                <RiskScoreGauge score={customRisk} size="lg" />
                <div className="text-center">
                  <span className="text-sm text-t2">
                    Risk Level:{' '}
                    <span className="font-semibold" style={{ color: getRiskColor(customLevel) }}>
                      {customLevel.toUpperCase()}
                    </span>
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-foreground">Overall Market Risk</CardTitle>
                <CardDescription>All commodities and signals combined</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center pb-6 space-y-4">
                <RiskScoreGauge score={overallRisk} size="lg" />
                <div className="text-center">
                  <span className="text-sm text-t2">
                    Difference:{' '}
                    <span
                      className="font-semibold"
                      style={{
                        color: customRisk > overallRisk ? c.coral
                          : customRisk < overallRisk ? c.green
                          : c.t2
                      }}
                    >
                      {customRisk > overallRisk ? '↑' : customRisk < overallRisk ? '↓' : '→'}
                      {' '}{Math.abs(customRisk - overallRisk).toFixed(1)} pts
                    </span>
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ TOP SIGNALS ═══ */}
        {topSignals.length > 0 && (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">Top Driving Signals</CardTitle>
              <CardDescription>Most influential factors from your selected commodities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {topSignals.map((signal, i) => {
                  const rs = rankStyles[i] || rankStyles[rankStyles.length - 1]
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between py-3 border-b border-border last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                          style={{ backgroundColor: rs.bg, color: rs.text }}
                        >
                          {i + 1}
                        </div>
                        <div>
                          <div className="text-sm text-foreground">{signal.label}</div>
                          <div className="text-xs font-mono text-muted-foreground">{signal.feature}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-mono text-t2">{signal.mean_abs_shap.toFixed(5)}</div>
                        <div className="text-xs text-muted-foreground">SHAP value</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ SELECTED PILLS ═══ */}
        {selected.length > 0 && (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">Your Selection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {selected.map(key => {
                  const commodity = commodities.find(cm => cm.key === key)
                  return commodity ? (
                    <div
                      key={key}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
                      style={{ backgroundColor: c.coralSoft, border: `1px solid ${c.coralBorder}` }}
                    >
                      <span className="text-sm text-foreground">{commodity.label}</span>
                      <button
                        onClick={() => toggleCommodity(key)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer' }}
                      >
                        ×
                      </button>
                    </div>
                  ) : null
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ HOW IT WORKS ═══ */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">How Custom Risk Scoring Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-t2">
            <p>
              Your custom risk score is calculated by analyzing <strong className="text-foreground">SHAP contributions</strong> from
              features related to your selected commodities only.
            </p>
            <p>
              The model uses the last <strong className="text-foreground">4 weeks</strong> of data to compute average SHAP values for
              each relevant feature, then weights them to produce a personalized risk score.
            </p>
            <p>
              <strong className="text-foreground">Example:</strong> If you select "Copper" and "Natural Gas", your score will be
              influenced primarily by copper prices, natural gas volatility, and related downstream indicators like
              manufacturing PPI and energy sector performance.
            </p>
            <p className="pt-2 border-t border-border text-xs text-muted-foreground">
              <strong className="text-foreground">Available commodities:</strong>{' '}
              {commodities.map(cm => cm.label).join(', ')}
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}