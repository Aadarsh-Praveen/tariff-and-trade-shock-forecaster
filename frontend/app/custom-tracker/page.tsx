'use client'

import { useEffect, useState } from 'react'
import { Target, Check } from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { RiskScoreGauge } from '@/components/risk/risk-score-gauge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api, isBackendOffline } from '@/lib/api/client'

interface Commodity {
  key: string
  label: string
}

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
        // Default selection
        setSelected(['copper', 'natural_gas', 'crude_oil'])
      } catch (err) {
        if (!isBackendOffline(err)) {
          console.error('Commodities error:', err)
        }
        // Demo commodities
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
        if (!isBackendOffline(err)) {
          console.error('Custom risk error:', err)
        }
        // Demo data based on selection
        const baseRisk = 72.3
        const adjustment = selected.length > 6 ? -5 : selected.length > 3 ? -3 : 0
        setCustomRisk(baseRisk + adjustment)
        setCustomLevel(baseRisk + adjustment > 65 ? 'high' : 'medium')
        setOverallRisk(baseRisk)
        setTopSignals([
          { feature: 'copper', label: 'Copper price', mean_abs_shap: 0.0076 },
          { feature: 'natural_gas_price_lag_1w', label: 'Natural gas (1w ago)', mean_abs_shap: 0.0271 },
          { feature: 'crude_oil_price', label: 'Crude oil price', mean_abs_shap: 0.0189 },
          { feature: 'import_price_index', label: 'Import price index', mean_abs_shap: 0.0062 },
          { feature: 'trade_balance_change_4w', label: 'Trade balance change (4w)', mean_abs_shap: 0.0049 },
        ])
      } finally {
        setLoading(false)
      }
    }
    fetchCustomRisk()
  }, [selected])

  const toggleCommodity = (key: string) => {
    setSelected(prev => 
      prev.includes(key) 
        ? prev.filter(k => k !== key)
        : [...prev, key]
    )
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return '#df2531'
      case 'medium': return '#f59e0b'
      case 'low': return '#22c55e'
      default: return 'rgba(255,255,255,0.7)'
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DashboardHeader
        title="Custom Commodity Tracker"
        description="Personalized risk scores based on your selected commodities"
      />
      
      <main className="flex-1 space-y-6 p-6 bg-background">
        {/* Commodity Selection */}
        <Card className="border-red-20 bg-red-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="size-5" />
              Select Commodities to Track
            </CardTitle>
            <CardDescription className="text-45">
              Choose the commodities most relevant to your supply chain
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {commodities.map((commodity) => (
                <Button
                  key={commodity.key}
                  variant={selected.includes(commodity.key) ? 'default' : 'outline'}
                  onClick={() => toggleCommodity(commodity.key)}
                  className={`justify-start ${
                    selected.includes(commodity.key)
                      ? 'bg-red-15 border-red-40 hover:bg-red-12'
                      : 'border-red-20 hover:bg-red-8'
                  }`}
                >
                  {selected.includes(commodity.key) && (
                    <Check className="size-4 mr-2" />
                  )}
                  {commodity.label}
                </Button>
              ))}
            </div>
            {selected.length === 0 && (
              <p className="text-sm text-45 mt-4 text-center">
                Select at least one commodity to see your custom risk score
              </p>
            )}
          </CardContent>
        </Card>

        {/* Risk Comparison */}
        {customRisk !== null && overallRisk !== null && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Custom Risk */}
            <Card className="border-red-20 bg-red-4">
              <CardHeader>
                <CardTitle>Your Custom Risk Score</CardTitle>
                <CardDescription className="text-45">
                  Based on {selected.length} selected commodit{selected.length === 1 ? 'y' : 'ies'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center pb-6 space-y-4">
                <RiskScoreGauge score={customRisk} size="lg" />
                <div className="text-center">
                  <div className="text-sm text-70">
                    Risk Level: <span className="font-semibold" style={{ color: getRiskColor(customLevel) }}>
                      {customLevel.toUpperCase()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Overall Risk */}
            <Card className="border-red-20 bg-red-4">
              <CardHeader>
                <CardTitle>Overall Market Risk</CardTitle>
                <CardDescription className="text-45">
                  All commodities and signals combined
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center pb-6 space-y-4">
                <RiskScoreGauge score={overallRisk} size="lg" />
                <div className="text-center">
                  <div className="text-sm text-70">
                    Difference: <span className={`font-semibold ${
                      customRisk > overallRisk ? 'text-[#df2531]' :
                      customRisk < overallRisk ? 'text-[#22c55e]' :
                      'text-70'
                    }`}>
                      {customRisk > overallRisk ? '↑' : customRisk < overallRisk ? '↓' : '→'}
                      {' '}
                      {Math.abs(customRisk - overallRisk).toFixed(1)} pts
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Top Signals */}
        {topSignals.length > 0 && (
          <Card className="border-red-20 bg-red-4">
            <CardHeader>
              <CardTitle>Top Driving Signals</CardTitle>
              <CardDescription className="text-45">
                Most influential factors from your selected commodities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topSignals.map((signal, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-red-20 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        i === 0 ? 'bg-red-15 text-[#df2531]' :
                        i === 1 ? 'bg-[rgba(245,158,11,0.15)] text-[#f59e0b]' :
                        i === 2 ? 'bg-[rgba(34,197,94,0.15)] text-[#22c55e]' :
                        'bg-red-8 text-70'
                      }`}>
                        {i + 1}
                      </div>
                      <div>
                        <div className="text-sm text-100">{signal.label}</div>
                        <div className="text-xs text-45 font-mono">{signal.feature}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono text-70">
                        {signal.mean_abs_shap.toFixed(5)}
                      </div>
                      <div className="text-xs text-45">SHAP value</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Selected Commodities Summary */}
        {selected.length > 0 && (
          <Card className="border-red-20 bg-red-4">
            <CardHeader>
              <CardTitle>Your Selection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {selected.map(key => {
                  const commodity = commodities.find(c => c.key === key)
                  return commodity ? (
                    <div
                      key={key}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-12 border border-red-30"
                    >
                      <span className="text-sm text-100">{commodity.label}</span>
                      <button
                        onClick={() => toggleCommodity(key)}
                        className="text-45 hover:text-100"
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

        {/* How It Works */}
        <Card className="border-red-20 bg-red-4">
          <CardHeader>
            <CardTitle>How Custom Risk Scoring Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-70">
            <p>
              Your custom risk score is calculated by analyzing <strong className="text-100">SHAP contributions</strong> from
              features related to your selected commodities only.
            </p>
            <p>
              The model uses the last <strong className="text-100">4 weeks</strong> of data to compute average SHAP values for
              each relevant feature, then weights them to produce a personalized risk score.
            </p>
            <p>
              <strong className="text-100">Example:</strong> If you select "Copper" and "Natural Gas", your score will be
              influenced primarily by copper prices, natural gas volatility, and related downstream indicators like
              manufacturing PPI and energy sector performance.
            </p>
            <p className="pt-2 border-t border-red-20 text-xs text-45">
              Available commodities: {commodities.map(c => c.label).join(', ')}
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
