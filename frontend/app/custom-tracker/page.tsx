'use client'

import { useEffect, useState } from 'react'
import { Target, Check, Lightbulb, TrendingUp, BarChart3 } from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { RiskScoreGauge } from '@/components/risk/risk-score-gauge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { api, isBackendOffline } from '@/lib/api/client'
import { getRiskColor } from '@/lib/theme-colors'

const CORAL = '#df2531'
const AMBER = '#f59e0b'
const GREEN = '#22c55e'
const BLUE = '#6366f1'
const PURPLE = '#8b5cf6'

interface Commodity { key: string; label: string }

function riskHex(level: string): string {
  if (level === 'high') return CORAL
  if (level === 'medium') return AMBER
  return GREEN
}

const RANK_COLORS = [CORAL, AMBER, GREEN, BLUE, PURPLE]

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

  const maxShap = topSignals.length > 0 ? topSignals[0].mean_abs_shap : 1

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DashboardHeader
        title="Custom Commodity Tracker"
        description="Personalized risk scores based on your selected commodities"
      />
      
      <main className="flex-1 space-y-6 p-6">

        {/* ═══ COMMODITY SELECTION ═══ */}
        <Card className="border-border bg-card overflow-hidden">
          <div style={{
            height: 3,
            background: `linear-gradient(90deg, ${AMBER}, ${AMBER}40 50%, transparent)`,
          }} />
          <CardHeader>
            <div className="flex items-center gap-3">
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: `${AMBER}12`, border: `1px solid ${AMBER}20`,
              }}>
                <Target className="size-4" style={{ color: AMBER }} />
              </div>
              <div>
                <CardTitle className="text-foreground text-base">Select Commodities to Track</CardTitle>
                <CardDescription className="text-xs mt-0.5">Choose the commodities most relevant to your supply chain</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {commodities.map((commodity) => {
                const isActive = selected.includes(commodity.key)
                return (
                  <button
                    key={commodity.key}
                    onClick={() => toggleCommodity(commodity.key)}
                    className="flex items-center justify-start gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all"
                    style={{
                      backgroundColor: isActive ? `${AMBER}12` : 'transparent',
                      border: `1px solid ${isActive ? `${AMBER}35` : 'rgba(128,128,128,0.15)'}`,
                      cursor: 'pointer',
                    }}
                  >
                    {isActive && (
                      <div style={{
                        width: 18, height: 18, borderRadius: 5,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: AMBER, flexShrink: 0,
                      }}>
                        <Check className="size-3" style={{ color: '#fff' }} />
                      </div>
                    )}
                    <span style={isActive ? { color: AMBER, fontWeight: 600 } : undefined}
                      className={isActive ? '' : 'text-muted-foreground'}>
                      {commodity.label}
                    </span>
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
            {/* Custom Risk */}
            <Card className="border-border bg-card overflow-hidden relative">
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '100%',
                background: `radial-gradient(ellipse at 50% 0%, ${riskHex(customLevel)}10 0%, transparent 60%)`,
                pointerEvents: 'none',
              }} />
              <div style={{
                height: 3,
                background: `linear-gradient(90deg, ${riskHex(customLevel)}, ${riskHex(customLevel)}40 50%, transparent)`,
              }} />
              <CardHeader className="relative">
                <div className="flex items-center gap-3">
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: `${riskHex(customLevel)}12`, border: `1px solid ${riskHex(customLevel)}20`,
                  }}>
                    <TrendingUp className="size-4" style={{ color: riskHex(customLevel) }} />
                  </div>
                  <div>
                    <CardTitle className="text-foreground text-base">Your Custom Risk Score</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Based on {selected.length} selected commodit{selected.length === 1 ? 'y' : 'ies'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative flex flex-col items-center justify-center pb-6 space-y-4">
                <RiskScoreGauge score={customRisk} size="lg" />
                <div className="text-center">
                  <span className="text-sm text-muted-foreground">
                    Risk Level:{' '}
                    <span style={{
                      fontWeight: 700,
                      color: riskHex(customLevel),
                      padding: '2px 8px',
                      borderRadius: 6,
                      backgroundColor: `${riskHex(customLevel)}15`,
                    }}>
                      {customLevel.toUpperCase()}
                    </span>
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Overall Risk */}
            <Card className="border-border bg-card overflow-hidden relative">
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '100%',
                background: `radial-gradient(ellipse at 50% 0%, ${BLUE}10 0%, transparent 60%)`,
                pointerEvents: 'none',
              }} />
              <div style={{
                height: 3,
                background: `linear-gradient(90deg, ${BLUE}, ${BLUE}40 50%, transparent)`,
              }} />
              <CardHeader className="relative">
                <div className="flex items-center gap-3">
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: `${BLUE}12`, border: `1px solid ${BLUE}20`,
                  }}>
                    <BarChart3 className="size-4" style={{ color: BLUE }} />
                  </div>
                  <div>
                    <CardTitle className="text-foreground text-base">Overall Market Risk</CardTitle>
                    <CardDescription className="text-xs mt-0.5">All commodities and signals combined</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative flex flex-col items-center justify-center pb-6 space-y-4">
                <RiskScoreGauge score={overallRisk} size="lg" />
                <div className="text-center">
                  <span className="text-sm text-muted-foreground">
                    Difference:{' '}
                    {(() => {
                      const diff = customRisk - overallRisk
                      const diffColor = diff > 0 ? CORAL : diff < 0 ? GREEN : undefined
                      return (
                        <span style={{
                          fontWeight: 700,
                          color: diffColor,
                          padding: '2px 8px',
                          borderRadius: 6,
                          backgroundColor: diffColor ? `${diffColor}15` : undefined,
                        }}>
                          {diff > 0 ? '↑' : diff < 0 ? '↓' : '→'} {Math.abs(diff).toFixed(1)} pts
                        </span>
                      )
                    })()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ TOP SIGNALS ═══ */}
        {topSignals.length > 0 && (
          <Card className="border-border bg-card overflow-hidden">
            <div style={{
              height: 3,
              background: `linear-gradient(90deg, ${CORAL}, ${AMBER}60 50%, transparent)`,
            }} />
            <CardHeader>
              <div className="flex items-center gap-3">
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: `${CORAL}12`, border: `1px solid ${CORAL}20`,
                }}>
                  <TrendingUp className="size-4" style={{ color: CORAL }} />
                </div>
                <div>
                  <CardTitle className="text-foreground text-base">Top Driving Signals</CardTitle>
                  <CardDescription className="text-xs mt-0.5">Most influential factors from your selected commodities</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {topSignals.map((signal, i) => {
                  const rankColor = RANK_COLORS[i] || RANK_COLORS[RANK_COLORS.length - 1]
                  const barWidth = (signal.mean_abs_shap / maxShap) * 100
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between py-3.5 border-b border-border last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          backgroundColor: `${rankColor}15`,
                          border: `1px solid ${rankColor}25`,
                          fontSize: 13, fontWeight: 700, color: rankColor,
                        }}>
                          {i + 1}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-foreground">{signal.label}</div>
                          <div className="text-[10px] font-mono text-muted-foreground">{signal.feature}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {/* Mini bar */}
                        <div style={{
                          width: 80, height: 4, borderRadius: 2,
                          backgroundColor: 'rgba(128,128,128,0.12)',
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            width: `${barWidth}%`, height: '100%', borderRadius: 2,
                            backgroundColor: rankColor,
                            boxShadow: `0 0 4px ${rankColor}40`,
                          }} />
                        </div>
                        <div className="text-right" style={{ minWidth: 80 }}>
                          <div className="text-sm font-mono font-medium" style={{ color: rankColor }}>
                            {signal.mean_abs_shap.toFixed(5)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">SHAP value</div>
                        </div>
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
          <Card className="border-border bg-card overflow-hidden">
            <div style={{
              height: 3,
              background: `linear-gradient(90deg, ${PURPLE}, ${PURPLE}00)`,
            }} />
            <CardHeader>
              <CardTitle className="text-foreground text-base">Your Selection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {selected.map(key => {
                  const commodity = commodities.find(cm => cm.key === key)
                  return commodity ? (
                    <div
                      key={key}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
                      style={{
                        backgroundColor: `${AMBER}12`,
                        border: `1px solid ${AMBER}25`,
                      }}
                    >
                      <span className="text-sm font-medium" style={{ color: AMBER }}>{commodity.label}</span>
                      <button
                        onClick={() => toggleCommodity(key)}
                        className="transition-colors"
                        style={{
                          background: 'none', border: 'none', fontSize: 16,
                          cursor: 'pointer', color: AMBER, opacity: 0.6,
                          lineHeight: 1,
                        }}
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
              <CardTitle className="text-foreground text-base">How Custom Risk Scoring Works</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
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
            <div className="pt-3 border-t border-border text-xs text-muted-foreground">
              <strong className="text-foreground">Available commodities:</strong>{' '}
              {commodities.map(cm => cm.label).join(', ')}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}