'use client'

import { useEffect, useState } from 'react'
import { Grid3X3, Zap, Factory, Ship } from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { RiskScoreGauge } from '@/components/risk/risk-score-gauge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { api, isBackendOffline } from '@/lib/api/client'
import { c, getRiskColor } from '@/lib/theme-colors'

interface SectorData {
  sector: string
  label: string
  risk_score: number
  risk_level: string
  top_signals: Array<{ feature: string; label: string; mean_abs_shap: number }>
}

// Uses theme-aware c tokens for inline styles on dynamic elements
const getRiskBg = (level: string) => {
  switch (level) {
    case 'high': return c.coralSoft
    case 'medium': return c.amberSoft
    case 'low': return c.greenSoft
    default: return c.secondary
  }
}

const getSectorIcon = (sector: string) => {
  switch (sector) {
    case 'energy': return <Zap className="size-6 text-foreground" />
    case 'manufacturing': return <Factory className="size-6 text-foreground" />
    case 'trade': return <Ship className="size-6 text-foreground" />
    default: return <Grid3X3 className="size-6 text-foreground" />
  }
}

export default function SectorsPage() {
  const [sectors, setSectors] = useState<SectorData[]>([])
  const [overallScore, setOverallScore] = useState(0)
  const [overallLevel, setOverallLevel] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const data = await api.getSectorRisks()
        setSectors(data.sectors)
        setOverallScore(data.overall_risk_score)
        setOverallLevel(data.overall_risk_level)
      } catch (err) {
        if (!isBackendOffline(err)) console.error('Sectors error:', err)
        setSectors([
          { sector: 'energy', label: 'Energy & Fuel Supply', risk_score: 75.2, risk_level: 'high',
            top_signals: [
              { feature: 'natural_gas_price_lag_1w', label: 'Natural gas (1w ago)', mean_abs_shap: 0.0271 },
              { feature: 'crude_oil_price', label: 'Crude oil price', mean_abs_shap: 0.0189 },
              { feature: 'energy_std_8w', label: 'Energy ETF volatility (8w)', mean_abs_shap: 0.0052 },
            ]},
          { sector: 'manufacturing', label: 'Manufacturing & Industrials', risk_score: 68.4, risk_level: 'high',
            top_signals: [
              { feature: 'copper', label: 'Copper price', mean_abs_shap: 0.0076 },
              { feature: 'ppi_manufacturing', label: 'Manufacturing PPI', mean_abs_shap: 0.0043 },
              { feature: 'capacity_utilization', label: 'Capacity utilization', mean_abs_shap: 0.0038 },
            ]},
          { sector: 'trade', label: 'Trade & Imports', risk_score: 71.8, risk_level: 'high',
            top_signals: [
              { feature: 'import_price_index', label: 'Import price index', mean_abs_shap: 0.0062 },
              { feature: 'trade_balance_change_4w', label: 'Trade balance change (4w)', mean_abs_shap: 0.0049 },
              { feature: 'goods_imports_pct_4w', label: 'Goods imports % change (4w)', mean_abs_shap: 0.0037 },
            ]},
        ])
        setOverallScore(72.3)
        setOverallLevel('high')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <DashboardHeader title="Sectors" description="Risk breakdown by sector" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Loading sector data...</div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DashboardHeader
        title="Sector Risk Breakdown"
        description="Risk analysis across Energy, Manufacturing, and Trade sectors"
      />
      
      <main className="flex-1 space-y-6 p-6">

        {/* ═══ OVERALL RISK ═══ */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Overall Risk Score</CardTitle>
            <CardDescription>Aggregated across all sectors</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center pb-6">
            <RiskScoreGauge score={overallScore} size="lg" />
          </CardContent>
        </Card>

        {/* ═══ SECTOR CARDS ═══ */}
        <div className="grid gap-6 md:grid-cols-3">
          {sectors.map((sector) => {
            const riskColor = getRiskColor(sector.risk_level)
            const riskBg = getRiskBg(sector.risk_level)
            const diff = sector.risk_score - overallScore
            const diffColor = diff > 0 ? c.coral : diff < 0 ? c.green : c.t2

            return (
              <Card key={sector.sector} className="border-border bg-card">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg" style={{ backgroundColor: riskBg }}>
                      {getSectorIcon(sector.sector)}
                    </div>
                    <div>
                      <CardTitle className="text-lg text-foreground">{sector.label}</CardTitle>
                      <CardDescription className="text-xs">{sector.sector}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Risk Gauge */}
                  <div className="flex items-center justify-center py-4">
                    <RiskScoreGauge score={sector.risk_score} size="md" />
                  </div>

                  {/* Risk Level Badge */}
                  <div className="text-center">
                    <span
                      className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
                      style={{ backgroundColor: riskBg, color: riskColor }}
                    >
                      {sector.risk_level.toUpperCase()} RISK
                    </span>
                  </div>

                  {/* Top Signals */}
                  <div className="pt-4 border-t border-border">
                    <h4 className="text-sm font-semibold mb-3 text-foreground">Top Driving Signals</h4>
                    <div className="space-y-2">
                      {sector.top_signals.map((signal, i) => (
                        <div key={i} className="flex items-start justify-between text-xs">
                          <span className="text-t2 flex-1">{signal.label}</span>
                          <span className="font-mono ml-2 text-muted-foreground">
                            {signal.mean_abs_shap.toFixed(4)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Comparison to overall */}
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">vs. Overall Risk</span>
                      <span style={{ color: diffColor, fontWeight: 600 }}>
                        {diff > 0 ? '↑' : diff < 0 ? '↓' : '→'}{' '}
                        {Math.abs(diff).toFixed(1)} pts
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* ═══ METHODOLOGY ═══ */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Sector Risk Methodology</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-t2">
            <p>
              Sector risk scores are derived from <strong className="text-foreground">SHAP (SHapley Additive exPlanations)</strong> values,
              which quantify each feature's contribution to the model's prediction.
            </p>
            <p>
              For each sector, we aggregate SHAP values from relevant signals (e.g., crude oil and natural gas prices for Energy)
              and compute a weighted risk score based on their collective impact.
            </p>
            <div className="grid md:grid-cols-3 gap-4 pt-4">
              {[
                { icon: <Zap className="size-4 text-coral" />, title: 'Energy & Fuel Supply', desc: 'Crude oil, natural gas, energy ETF volatility, and fuel-related supply chain signals' },
                { icon: <Factory className="size-4 text-coral" />, title: 'Manufacturing & Industrials', desc: 'PPI, industrial production, capacity utilization, new orders, and commodity metals' },
                { icon: <Ship className="size-4 text-coral" />, title: 'Trade & Imports', desc: 'Import/export price indices, trade balance, goods imports, and trade pressure indicators' },
              ].map((item, i) => (
                <div key={i}>
                  <h4 className="font-semibold mb-2 flex items-center gap-2 text-foreground">
                    {item.icon}
                    {item.title}
                  </h4>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}