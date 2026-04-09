'use client'

import { useEffect, useState } from 'react'
import { Grid3X3, Zap, Factory, Ship, Lightbulb, BarChart3 } from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { RiskScoreGauge } from '@/components/risk/risk-score-gauge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { api, isBackendOffline } from '@/lib/api/client'

const CORAL = '#df2531'
const AMBER = '#f59e0b'
const GREEN = '#22c55e'
const BLUE = '#6366f1'

interface SectorData {
  sector: string
  label: string
  risk_score: number
  risk_level: string
  top_signals: Array<{ feature: string; label: string; mean_abs_shap: number }>
}

function riskHex(level: string): string {
  if (level === 'high') return CORAL
  if (level === 'medium') return AMBER
  return GREEN
}

const SECTOR_STYLE: Record<string, { color: string; icon: typeof Zap }> = {
  energy: { color: CORAL, icon: Zap },
  manufacturing: { color: AMBER, icon: Factory },
  trade: { color: BLUE, icon: Ship },
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
        <Card className="border-border bg-card overflow-hidden relative">
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '100%',
            background: `radial-gradient(ellipse at 50% 0%, ${riskHex(overallLevel)}10 0%, transparent 60%)`,
            pointerEvents: 'none',
          }} />
          <div style={{
            height: 3,
            background: `linear-gradient(90deg, ${riskHex(overallLevel)}, ${riskHex(overallLevel)}40 50%, transparent)`,
          }} />
          <CardHeader className="relative">
            <div className="flex items-center gap-3">
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: `${riskHex(overallLevel)}12`, border: `1px solid ${riskHex(overallLevel)}20`,
              }}>
                <BarChart3 className="size-4" style={{ color: riskHex(overallLevel) }} />
              </div>
              <div>
                <CardTitle className="text-foreground text-base">Overall Risk Score</CardTitle>
                <CardDescription className="text-xs mt-0.5">Aggregated across all sectors</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative flex flex-col items-center justify-center pb-6 space-y-3">
            <RiskScoreGauge score={overallScore} size="lg" />
            <span style={{
              fontSize: 10, fontWeight: 700,
              padding: '3px 10px', borderRadius: 6,
              backgroundColor: `${riskHex(overallLevel)}15`,
              color: riskHex(overallLevel),
              letterSpacing: '0.8px',
            }}>
              {overallLevel.toUpperCase()} RISK
            </span>
          </CardContent>
        </Card>

        {/* ═══ SECTOR CARDS ═══ */}
        <div className="grid gap-6 md:grid-cols-3">
          {sectors.map((sector) => {
            const rc = riskHex(sector.risk_level)
            const sc = SECTOR_STYLE[sector.sector] || { color: BLUE, icon: Grid3X3 }
            const SectorIcon = sc.icon
            const diff = sector.risk_score - overallScore
            const diffColor = diff > 0 ? CORAL : diff < 0 ? GREEN : undefined
            const maxShap = sector.top_signals.length > 0 ? sector.top_signals[0].mean_abs_shap : 1

            return (
              <Card key={sector.sector} className="border-border bg-card overflow-hidden relative">
                {/* Background glow */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: '100%',
                  background: `radial-gradient(ellipse at 50% 0%, ${sc.color}10 0%, transparent 60%)`,
                  pointerEvents: 'none',
                }} />
                {/* Accent strip */}
                <div style={{
                  height: 3,
                  background: `linear-gradient(90deg, ${sc.color}, ${sc.color}40 60%, transparent)`,
                }} />
                <CardHeader className="relative">
                  <div className="flex items-center gap-3">
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      backgroundColor: `${sc.color}12`, border: `1px solid ${sc.color}25`,
                    }}>
                      <SectorIcon className="size-5" style={{ color: sc.color }} />
                    </div>
                    <div>
                      <CardTitle className="text-base text-foreground">{sector.label}</CardTitle>
                      <CardDescription className="text-[10px] uppercase tracking-wider mt-0.5">{sector.sector}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative space-y-4">
                  {/* Risk Gauge */}
                  <div className="flex items-center justify-center py-2">
                    <RiskScoreGauge score={sector.risk_score} size="md" />
                  </div>

                  {/* Risk Level Badge */}
                  <div className="text-center">
                    <span style={{
                      display: 'inline-block',
                      fontSize: 10, fontWeight: 700,
                      padding: '3px 12px', borderRadius: 6,
                      backgroundColor: `${rc}15`,
                      color: rc,
                      letterSpacing: '0.5px',
                    }}>
                      {sector.risk_level.toUpperCase()} RISK
                    </span>
                  </div>

                  {/* Top Signals */}
                  <div className="pt-4 border-t border-border">
                    <h4 className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-3">Top Driving Signals</h4>
                    <div className="space-y-3">
                      {sector.top_signals.map((signal, i) => {
                        const barWidth = (signal.mean_abs_shap / maxShap) * 100
                        return (
                          <div key={i}>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-foreground font-medium">{signal.label}</span>
                              <span className="font-mono text-muted-foreground">
                                {signal.mean_abs_shap.toFixed(4)}
                              </span>
                            </div>
                            <div style={{
                              width: '100%', height: 4, borderRadius: 2,
                              backgroundColor: 'rgba(128,128,128,0.12)',
                              overflow: 'hidden',
                            }}>
                              <div style={{
                                width: `${barWidth}%`, height: '100%', borderRadius: 2,
                                backgroundColor: sc.color,
                                boxShadow: `0 0 4px ${sc.color}40`,
                              }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Comparison to overall */}
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">vs. Overall Risk</span>
                      <span style={{
                        fontWeight: 700,
                        color: diffColor,
                        padding: '2px 8px',
                        borderRadius: 6,
                        backgroundColor: diffColor ? `${diffColor}15` : undefined,
                      }}>
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
        <Card className="border-border bg-card overflow-hidden">
          <div style={{
            height: 3,
            background: `linear-gradient(90deg, ${BLUE}, ${BLUE}00)`,
          }} />
          <CardHeader>
            <div className="flex items-center gap-3">
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: `${BLUE}12`, border: `1px solid ${BLUE}20`,
              }}>
                <Lightbulb className="size-4" style={{ color: BLUE }} />
              </div>
              <CardTitle className="text-foreground text-base">Sector Risk Methodology</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              Sector risk scores are derived from <strong className="text-foreground">SHAP (SHapley Additive exPlanations)</strong> values,
              which quantify each feature's contribution to the model's prediction.
            </p>
            <p>
              For each sector, we aggregate SHAP values from relevant signals (e.g., crude oil and natural gas prices for Energy)
              and compute a weighted risk score based on their collective impact.
            </p>
            <div className="grid md:grid-cols-3 gap-4 pt-4 border-t border-border">
              {[
                { key: 'energy', title: 'Energy & Fuel Supply', desc: 'Crude oil, natural gas, energy ETF volatility, and fuel-related supply chain signals' },
                { key: 'manufacturing', title: 'Manufacturing & Industrials', desc: 'PPI, industrial production, capacity utilization, new orders, and commodity metals' },
                { key: 'trade', title: 'Trade & Imports', desc: 'Import/export price indices, trade balance, goods imports, and trade pressure indicators' },
              ].map((item) => {
                const style = SECTOR_STYLE[item.key] || { color: BLUE, icon: Grid3X3 }
                const Icon = style.icon
                return (
                  <div key={item.key}>
                    <h4 className="font-semibold mb-2 flex items-center gap-2 text-foreground text-sm">
                      <div style={{
                        width: 24, height: 24, borderRadius: 6,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: `${style.color}12`, border: `1px solid ${style.color}20`,
                      }}>
                        <Icon className="size-3" style={{ color: style.color }} />
                      </div>
                      {item.title}
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}