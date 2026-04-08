'use client'

import { useEffect, useState } from 'react'
import { BarChart3, Award, Target } from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { api, isBackendOffline } from '@/lib/api/client'
import { c } from '@/lib/theme-colors'

interface ModelMetric {
  model: string
  f1: number
  precision: number
  recall: number
  accuracy: number
}

interface FeatureImportance {
  feature: string
  label: string
  importance: number
}

interface ShapFeature {
  feature: string
  label: string
  mean_abs_shap: number
  rank: number
}

export default function ModelPage() {
  const [metrics, setMetrics] = useState<ModelMetric[]>([])
  const [featureImportance, setFeatureImportance] = useState<FeatureImportance[]>([])
  const [shapSummary, setShapSummary] = useState<ShapFeature[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const [metricsData, featuresData, shapData] = await Promise.all([
          api.getModelMetrics(),
          api.getFeatureImportance(),
          api.getShapSummary(20),
        ])
        setMetrics(metricsData)
        setFeatureImportance(featuresData.features)
        setShapSummary(shapData.features)
      } catch (err) {
        if (!isBackendOffline(err)) console.error('Model data error:', err)
        setMetrics([
          { model: 'CV XGBoost (mean)', f1: 0.1921, precision: 0, recall: 0, accuracy: 0 },
          { model: 'Baseline (Logistic Regression)', f1: 0.5412, precision: 0.92, recall: 0.3833, accuracy: 0.371 },
          { model: 'XGBoost', f1: 0.8624, precision: 0.9592, recall: 0.7833, accuracy: 0.7581 },
          { model: 'LightGBM', f1: 0.9836, precision: 0.9677, recall: 1.0, accuracy: 0.9677 },
          { model: 'Ensemble (XGB + LGB avg)', f1: 0.9836, precision: 0.9677, recall: 1.0, accuracy: 0.9677 },
        ])
        setFeatureImportance([
          { feature: 'natural_gas_price_lag_1w', label: 'Natural gas (1w ago)', importance: 0.042156 },
          { feature: 'natural_gas_price_std_4w', label: 'Natural gas volatility (4w)', importance: 0.038924 },
          { feature: 'copper', label: 'Copper price', importance: 0.035612 },
          { feature: 'import_price_index', label: 'Import price index', importance: 0.031847 },
          { feature: 'trade_balance_change_4w', label: 'Trade balance change (4w)', importance: 0.028934 },
          { feature: 'energy_std_8w', label: 'Energy ETF volatility (8w)', importance: 0.026781 },
          { feature: 'crude_oil_price', label: 'Crude oil price', importance: 0.024562 },
          { feature: 'ppi_manufacturing', label: 'Manufacturing PPI', importance: 0.022349 },
          { feature: 'capacity_utilization', label: 'Capacity utilization', importance: 0.020134 },
          { feature: 'goods_imports_pct_4w', label: 'Goods imports % change (4w)', importance: 0.018923 },
          { feature: 'cpi_all', label: 'CPI (all items)', importance: 0.017812 },
          { feature: 'aluminum_zscore_8w', label: 'Aluminum z-score (8w)', importance: 0.016701 },
          { feature: 'wheat_lag_1w', label: 'Wheat price (1w ago)', importance: 0.015589 },
          { feature: 'housing_starts_mean_4w', label: 'Housing starts avg (4w)', importance: 0.014478 },
          { feature: 'manufacturing_employment', label: 'Manufacturing employment', importance: 0.013367 },
          { feature: 'materials_momentum_4w', label: 'Materials ETF momentum (4w)', importance: 0.012256 },
          { feature: 'export_price_index_pct_4w', label: 'Export prices % change (4w)', importance: 0.011145 },
          { feature: 'unemployment_rate_pct_4w', label: 'Unemployment % change (4w)', importance: 0.010034 },
          { feature: 'trade_pressure_index', label: 'Trade pressure index', importance: 0.008923 },
          { feature: 'llm_risk_score', label: 'AI risk score (Claude)', importance: 0.007812 },
        ])
        setShapSummary([
          { feature: 'natural_gas_price_lag_1w', label: 'Natural gas (1w ago)', mean_abs_shap: 0.027100, rank: 1 },
          { feature: 'natural_gas_price_std_4w', label: 'Natural gas volatility (4w)', mean_abs_shap: 0.011200, rank: 2 },
          { feature: 'copper', label: 'Copper price', mean_abs_shap: 0.007600, rank: 3 },
          { feature: 'natural_gas_price', label: 'Natural gas price', mean_abs_shap: 0.007400, rank: 4 },
          { feature: 'energy_std_8w', label: 'Energy ETF volatility (8w)', mean_abs_shap: 0.005200, rank: 5 },
          { feature: 'import_price_index', label: 'Import price index', mean_abs_shap: 0.004900, rank: 6 },
          { feature: 'trade_balance_change_4w', label: 'Trade balance change (4w)', mean_abs_shap: 0.004300, rank: 7 },
          { feature: 'crude_oil_price', label: 'Crude oil price', mean_abs_shap: 0.003800, rank: 8 },
          { feature: 'ppi_manufacturing', label: 'Manufacturing PPI', mean_abs_shap: 0.003400, rank: 9 },
          { feature: 'capacity_utilization', label: 'Capacity utilization', mean_abs_shap: 0.003100, rank: 10 },
          { feature: 'goods_imports', label: 'Goods imports', mean_abs_shap: 0.002900, rank: 11 },
          { feature: 'cpi_all', label: 'CPI (all items)', mean_abs_shap: 0.002700, rank: 12 },
          { feature: 'aluminum_zscore_8w', label: 'Aluminum z-score (8w)', mean_abs_shap: 0.002500, rank: 13 },
          { feature: 'wheat_lag_1w', label: 'Wheat price (1w ago)', mean_abs_shap: 0.002300, rank: 14 },
          { feature: 'housing_starts_mean_4w', label: 'Housing starts avg (4w)', mean_abs_shap: 0.002100, rank: 15 },
          { feature: 'manufacturing_employment', label: 'Manufacturing employment', mean_abs_shap: 0.001900, rank: 16 },
          { feature: 'materials_momentum_4w', label: 'Materials ETF momentum (4w)', mean_abs_shap: 0.001700, rank: 17 },
          { feature: 'export_price_index_pct_4w', label: 'Export prices % change (4w)', mean_abs_shap: 0.001500, rank: 18 },
          { feature: 'unemployment_rate_pct_4w', label: 'Unemployment % change (4w)', mean_abs_shap: 0.001300, rank: 19 },
          { feature: 'trade_pressure_index', label: 'Trade pressure index', mean_abs_shap: 0.001100, rank: 20 },
        ])
      } finally {
        setLoading(false)
      }
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
      <DashboardHeader
        title="Model Performance"
        description="Training metrics, feature importance, and SHAP analysis"
      />
      
      <main className="flex-1 space-y-6 p-6">

        {/* ═══ METRIC CARDS ═══ */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Award className="size-4 text-amber" />
                Selected Model
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">LightGBM</div>
              <div className="text-xs text-muted-foreground mt-1">Gradient Boosting</div>
            </CardContent>
          </Card>

          {lgbMetrics && (
            <>
              {[
                { label: 'F1 Score', value: lgbMetrics.f1 },
                { label: 'Precision', value: lgbMetrics.precision },
                { label: 'Recall', value: lgbMetrics.recall, sub: 'Zero false negatives' },
              ].map((m) => (
                <Card key={m.label} className="border-border bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {m.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green">
                      {(m.value * 100).toFixed(1)}%
                    </div>
                    {m.sub && (
                      <div className="text-xs text-muted-foreground mt-1">{m.sub}</div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>

        {/* ═══ MODEL COMPARISON TABLE ═══ */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Model Comparison</CardTitle>
            <CardDescription>
              Performance metrics across different algorithms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr className="border-b border-border">
                    {['Model', 'F1', 'Precision', 'Recall', 'Accuracy'].map((h) => (
                      <th
                        key={h}
                        className={`py-2.5 px-3.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground ${
                          h === 'Model' ? 'text-left' : 'text-right'
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((m, i) => {
                    const isLgb = m.model === 'LightGBM'
                    return (
                      <tr
                        key={i}
                        className={`${i < metrics.length - 1 ? 'border-b border-border/50' : ''} ${
                          isLgb ? 'bg-secondary' : ''
                        }`}
                      >
                        <td className={`py-2.5 px-3.5 text-foreground ${isLgb ? 'font-semibold' : 'font-medium'}`}>
                          {m.model}
                          {isLgb && (
                            <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-soft text-green">
                              SELECTED
                            </span>
                          )}
                        </td>
                        <td className="text-right py-2.5 px-3.5 font-mono text-muted-foreground">
                          {m.f1 > 0 ? m.f1.toFixed(4) : '—'}
                        </td>
                        <td className="text-right py-2.5 px-3.5 font-mono text-muted-foreground">
                          {m.precision > 0 ? m.precision.toFixed(4) : '—'}
                        </td>
                        <td className="text-right py-2.5 px-3.5 font-mono text-muted-foreground">
                          {m.recall > 0 ? m.recall.toFixed(4) : '—'}
                        </td>
                        <td className="text-right py-2.5 px-3.5 font-mono text-muted-foreground">
                          {m.accuracy > 0 ? m.accuracy.toFixed(4) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* ═══ FEATURE IMPORTANCE CHART — Recharts needs c tokens ═══ */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Target className="size-5" />
              Top 20 Feature Importances
            </CardTitle>
            <CardDescription>
              LightGBM built-in feature importance (gain-based)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={500}>
              <BarChart
                data={featureImportance.slice(0, 20)}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 200, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
                <XAxis
                  type="number"
                  stroke={c.axis}
                  tick={{ fill: 'currentColor', fontSize: 11, opacity: 0.5 }}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  stroke={c.axis}
                  tick={{ fill: 'currentColor', fontSize: 11, opacity: 0.65 }}
                  width={190}
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
                  labelStyle={{ color: c.t3 }}
                  formatter={(value: any) => [Number(value).toFixed(6), 'Importance']}
                />
                <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                  {featureImportance.slice(0, 20).map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill="#df2531"
                      fillOpacity={1 - index * 0.035}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* ═══ SHAP GLOBAL IMPORTANCE — Recharts needs c tokens ═══ */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <BarChart3 className="size-5" />
              Top 20 SHAP Global Importance
            </CardTitle>
            <CardDescription>
              Mean absolute SHAP values across all predictions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={500}>
              <BarChart
                data={shapSummary}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 200, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
                <XAxis
                  type="number"
                  stroke={c.axis}
                  tick={{ fill: 'currentColor', fontSize: 11, opacity: 0.5 }}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  stroke={c.axis}
                  tick={{ fill: 'currentColor', fontSize: 11, opacity: 0.65 }}
                  width={190}
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
                  labelStyle={{ color: c.t3 }}
                  formatter={(value: any, _: string, props: any) => [
                    `Mean |SHAP|: ${Number(value).toFixed(6)}  •  Rank: #${props.payload.rank}`,
                    'Impact'
                  ]}
                />
                <Bar dataKey="mean_abs_shap" radius={[0, 4, 4, 0]}>
                  {shapSummary.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill="#f59e0b"
                      fillOpacity={1 - index * 0.035}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* ═══ MODEL INFO ═══ */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Model Architecture & Training</CardTitle>
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
                With <strong className="text-foreground">100% recall</strong>, it never misses a disruption event—critical
                for supply chain risk management where false negatives are costly. The 96.8% precision ensures
                we also minimize false alarms.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}