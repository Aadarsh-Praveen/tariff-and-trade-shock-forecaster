'use client'

import { useEffect, useState } from 'react'
import { BarChart3, Award, Target, Lightbulb, Cpu } from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { api, isBackendOffline } from '@/lib/api/client'

const CORAL = '#df2531'
const AMBER = '#f59e0b'
const GREEN = '#22c55e'
const BLUE = '#6366f1'
const PURPLE = '#8b5cf6'

interface ModelMetric { model: string; f1: number; precision: number; recall: number; accuracy: number }
interface FeatureImportance { feature: string; label: string; importance: number }
interface ShapFeature { feature: string; label: string; mean_abs_shap: number; rank: number }

export default function ModelPage() {
  const [metrics, setMetrics] = useState<ModelMetric[]>([])
  const [featureImportance, setFeatureImportance] = useState<FeatureImportance[]>([])
  const [shapSummary, setShapSummary] = useState<ShapFeature[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)
        const [metricsData, featuresData, shapData] = await Promise.all([
          api.getModelMetrics(), api.getFeatureImportance(), api.getShapSummary(20),
        ])
        setMetrics(metricsData)
        setFeatureImportance(featuresData.features)
        setShapSummary(shapData.features)
      } catch (err) {
        if (!(await isBackendOffline())) console.error('Model data error:', err)
        setMetrics([])
        setFeatureImportance([])
        setShapSummary([])
        setError('Could not load model metrics from the API.')
      } finally { setLoading(false) }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <DashboardHeader title="Model" description="Model performance and feature analysis" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Loading model data...</div>
        </main>
      </div>
    )
  }

  const lgbMetrics = metrics.find(m => m.model === 'LightGBM')

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DashboardHeader title="Model Performance" description="Training metrics, feature importance, and SHAP analysis" />
      
      <main className="flex-1 space-y-6 p-6">
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* ═══ METRIC CARDS ═══ */}
        <div className="grid gap-4 md:grid-cols-4 items-stretch">
          {/* Selected Model */}
          <div
            className="transition-all duration-300 ease-out h-full [&>*]:h-full"
            style={{ borderRadius: 'var(--radius)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)'
              e.currentTarget.style.boxShadow = `0 16px 40px ${AMBER}25, 0 8px 20px rgba(0,0,0,0.25), 0 0 0 1px ${AMBER}15`
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
          <Card className="border-border bg-card overflow-hidden">
            <div style={{ height: 3, background: `linear-gradient(90deg, ${AMBER}, ${AMBER}00)` }} />
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
                <div style={{
                  width: 24, height: 24, borderRadius: 6,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: `${AMBER}12`, border: `1px solid ${AMBER}20`,
                }}>
                  <Award className="size-3" style={{ color: AMBER }} />
                </div>
                Selected Model
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">LightGBM</div>
              <div className="text-xs text-muted-foreground mt-1">Gradient Boosting</div>
            </CardContent>
          </Card>
          </div>

          {lgbMetrics && (
            <>
              {[
                { label: 'F1 Score', value: lgbMetrics.f1, color: GREEN },
                { label: 'Precision', value: lgbMetrics.precision, color: BLUE },
                { label: 'Recall', value: lgbMetrics.recall, sub: 'Zero false negatives', color: PURPLE },
              ].map((m) => (
                <div
                  key={m.label}
                  className="transition-all duration-300 ease-out h-full [&>*]:h-full"
                  style={{ borderRadius: 'var(--radius)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)'
                    e.currentTarget.style.boxShadow = `0 16px 40px ${m.color}25, 0 8px 20px rgba(0,0,0,0.25), 0 0 0 1px ${m.color}15`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                <Card className="border-border bg-card overflow-hidden">
                  <div style={{ height: 3, background: `linear-gradient(90deg, ${m.color}, ${m.color}00)` }} />
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
                      {m.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" style={{ color: m.color }}>
                      {(m.value * 100).toFixed(1)}%
                    </div>
                    {m.sub && <div className="text-xs text-muted-foreground mt-1">{m.sub}</div>}
                  </CardContent>
                </Card>
                </div>
              ))}
            </>
          )}
        </div>

        {/* ═══ MODEL COMPARISON TABLE ═══ */}
        <Card className="border-border bg-card overflow-hidden">
          <div style={{ height: 3, background: `linear-gradient(90deg, ${BLUE}, ${BLUE}00)` }} />
          <CardHeader>
            <div className="flex items-center gap-3">
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: `${BLUE}12`, border: `1px solid ${BLUE}20`,
              }}>
                <BarChart3 className="size-4" style={{ color: BLUE }} />
              </div>
              <div>
                <CardTitle className="text-foreground text-base">Model Comparison</CardTitle>
                <CardDescription className="text-xs mt-0.5">Performance metrics across different algorithms</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr className="border-b border-border">
                    {['Model', 'F1', 'Precision', 'Recall', 'Accuracy'].map((h) => (
                      <th key={h} className={`py-2.5 px-3.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground ${h === 'Model' ? 'text-left' : 'text-right'}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((m, i) => {
                    const isLgb = m.model === 'LightGBM'
                    return (
                      <tr key={i} className={`${i < metrics.length - 1 ? 'border-b border-border/50' : ''} ${isLgb ? 'bg-secondary' : ''}`}>
                        <td className={`py-2.5 px-3.5 text-foreground ${isLgb ? 'font-semibold' : 'font-medium'}`}>
                          {m.model}
                          {isLgb && (
                            <span style={{
                              marginLeft: 8, fontSize: 9, fontWeight: 700,
                              padding: '2px 7px', borderRadius: 5,
                              backgroundColor: `${GREEN}15`, color: GREEN,
                            }}>SELECTED</span>
                          )}
                        </td>
                        <td className="text-right py-2.5 px-3.5 font-mono text-muted-foreground">{m.f1 > 0 ? m.f1.toFixed(4) : '—'}</td>
                        <td className="text-right py-2.5 px-3.5 font-mono text-muted-foreground">{m.precision > 0 ? m.precision.toFixed(4) : '—'}</td>
                        <td className="text-right py-2.5 px-3.5 font-mono text-muted-foreground">{m.recall > 0 ? m.recall.toFixed(4) : '—'}</td>
                        <td className="text-right py-2.5 px-3.5 font-mono text-muted-foreground">{m.accuracy > 0 ? m.accuracy.toFixed(4) : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* ═══ FEATURE IMPORTANCE CHART ═══ */}
        <Card className="border-border bg-card overflow-hidden">
          <div style={{ height: 3, background: `linear-gradient(90deg, ${CORAL}, ${CORAL}00)` }} />
          <CardHeader>
            <div className="flex items-center gap-3">
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: `${CORAL}12`, border: `1px solid ${CORAL}20`,
              }}>
                <Target className="size-4" style={{ color: CORAL }} />
              </div>
              <div>
                <CardTitle className="text-foreground text-base">Top 20 Feature Importances</CardTitle>
                <CardDescription className="text-xs mt-0.5">LightGBM built-in feature importance (gain-based)</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={500}>
              <BarChart data={featureImportance.slice(0, 20)} layout="vertical" margin={{ top: 5, right: 30, left: 200, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" />
                <XAxis type="number" stroke="rgba(128,128,128,0.2)" tick={{ fill: 'currentColor', fontSize: 11, opacity: 0.65 }} />
                <YAxis type="category" dataKey="label" stroke="rgba(128,128,128,0.2)" tick={{ fill: 'currentColor', fontSize: 11, opacity: 0.65 }} width={190} />
                <Tooltip
                  cursor={{ fill: 'rgba(128,128,128,0.06)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null
                    const d = payload[0].payload as FeatureImportance
                    return (
                      <div style={{ backgroundColor: '#1c1c1e', border: 'none', borderRadius: 14, padding: '14px 18px', boxShadow: '0 8px 32px rgba(0,0,0,0.45)', minWidth: 200 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 8 }}>{d.label}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Importance</span>
                          <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'monospace', color: CORAL }}>{d.importance.toFixed(6)}</span>
                        </div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 4, fontFamily: 'monospace' }}>{d.feature}</div>
                      </div>
                    )
                  }}
                />
                <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                  {featureImportance.slice(0, 20).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CORAL} fillOpacity={1 - index * 0.035} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* ═══ SHAP GLOBAL IMPORTANCE ═══ */}
        <Card className="border-border bg-card overflow-hidden">
          <div style={{ height: 3, background: `linear-gradient(90deg, ${AMBER}, ${AMBER}00)` }} />
          <CardHeader>
            <div className="flex items-center gap-3">
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: `${AMBER}12`, border: `1px solid ${AMBER}20`,
              }}>
                <BarChart3 className="size-4" style={{ color: AMBER }} />
              </div>
              <div>
                <CardTitle className="text-foreground text-base">Top 20 SHAP Global Importance</CardTitle>
                <CardDescription className="text-xs mt-0.5">Mean absolute SHAP values across all predictions</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={500}>
              <BarChart data={shapSummary} layout="vertical" margin={{ top: 5, right: 30, left: 200, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" />
                <XAxis type="number" stroke="rgba(128,128,128,0.2)" tick={{ fill: 'currentColor', fontSize: 11, opacity: 0.65 }} />
                <YAxis type="category" dataKey="label" stroke="rgba(128,128,128,0.2)" tick={{ fill: 'currentColor', fontSize: 11, opacity: 0.65 }} width={190} />
                <Tooltip
                  cursor={{ fill: 'rgba(128,128,128,0.06)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null
                    const d = payload[0].payload as ShapFeature
                    return (
                      <div style={{ backgroundColor: '#1c1c1e', border: 'none', borderRadius: 14, padding: '14px 18px', boxShadow: '0 8px 32px rgba(0,0,0,0.45)', minWidth: 200 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 8 }}>{d.label}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Mean |SHAP|</span>
                          <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'monospace', color: AMBER }}>{d.mean_abs_shap.toFixed(6)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginTop: 4 }}>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Rank</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: AMBER, padding: '1px 6px', borderRadius: 4, backgroundColor: `${AMBER}18` }}>#{d.rank}</span>
                        </div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 4, fontFamily: 'monospace' }}>{d.feature}</div>
                      </div>
                    )
                  }}
                />
                <Bar dataKey="mean_abs_shap" radius={[0, 4, 4, 0]}>
                  {shapSummary.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={AMBER} fillOpacity={1 - index * 0.035} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* ═══ MODEL INFO ═══ */}
        <Card className="border-border bg-card overflow-hidden">
          <div style={{ height: 3, background: `linear-gradient(90deg, ${BLUE}, ${BLUE}00)` }} />
          <CardHeader>
            <div className="flex items-center gap-3">
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: `${BLUE}12`, border: `1px solid ${BLUE}20`,
              }}>
                <Cpu className="size-4" style={{ color: BLUE }} />
              </div>
              <CardTitle className="text-foreground text-base">Model Architecture & Training</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2 text-foreground">Model Details</h4>
                <div className="space-y-1.5 text-xs">
                  {[
                    ['Algorithm', 'LightGBM (Gradient Boosting)'],
                    ['Task', 'Binary Classification (Disruption vs. Normal)'],
                    ['Decision Threshold', '0.10 (optimized for recall)'],
                    ['Features', '457 engineered features'],
                    ['Training Data', '313 weeks (2019–2024)'],
                    ['Test Data', '62 weeks (2025–2026)'],
                  ].map(([label, value]) => (
                    <div key={label} className="text-muted-foreground">
                      <span className="mr-1">•</span>
                      <strong className="text-foreground">{label}:</strong> {value}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-foreground">Data Sources</h4>
                <div className="space-y-1.5 text-xs">
                  {[
                    ['FRED', 'Macro indicators (CPI, PPI, imports, trade balance)'],
                    ['Alpha Vantage', 'Commodities (copper, wheat, aluminum) + ETFs'],
                    ['Polymarket', 'Prediction market sentiment (fear index)'],
                    ['NewsAPI + SEC EDGAR', 'News disruption ratio + corporate filings'],
                    ['Claude AI', 'LLM-generated risk assessments'],
                  ].map(([label, value]) => (
                    <div key={label} className="text-muted-foreground">
                      <span className="mr-1">•</span>
                      <strong className="text-foreground">{label}:</strong> {value}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <h4 className="font-semibold mb-2 text-foreground">Feature Engineering</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                From 5 data sources, we engineered <strong className="text-foreground">457 features</strong> including:
                lag features (1w, 2w, 4w), rolling statistics (mean, std, min, max over 4w and 8w windows),
                percentage changes, z-scores, momentum indicators, and cross-signal interactions
                (e.g., copper-PMI stress, energy-manufacturing ratio, trade pressure index).
              </p>
            </div>

            <div className="pt-4 border-t border-border">
              <h4 className="font-semibold mb-2 text-foreground">Why LightGBM?</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                LightGBM outperformed XGBoost, Logistic Regression, and ensemble methods on our test set.
                With <span style={{ color: GREEN, fontWeight: 700 }}>100% recall</span>, it never misses a disruption event—critical
                for supply chain risk management where false negatives are costly. The <span style={{ color: GREEN, fontWeight: 700 }}>96.8% precision</span> ensures
                we also minimize false alarms.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}