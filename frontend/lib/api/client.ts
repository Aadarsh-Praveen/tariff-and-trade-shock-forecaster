/**
 * API Client
 * Central API client for making requests to the backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface DashboardSummary {
  current: {
    date: string
    risk_score: number
    risk_level: string
    disruption_probability: number
    top_signals: Array<{
      feature: string
      label: string
    }>
  }
  trend: {
    direction: string
    change_4w: number
    high_weeks_last4: number
  }
  history: Array<{
    date: string
    risk_score: number
    risk_level: string
  }>
  forecast: Array<{
    date: string
    risk_score: number
    risk_level: string
  }>
  llm: {
    reasoning: string
    risk_score: number
    risk_label: string
    week: string
    model: string
  }
  meta: {
    forecast_horizon_weeks: number
    training_weeks: number
    test_weeks: number
    model_f1: number
    model_precision: number
    model_recall: number
    features_count: number
    data_sources: number
  }
  generated_at: string
}

/**
 * Check if the backend is offline
 */
export async function isBackendOffline(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/`, {
      method: 'GET',
      cache: 'no-store',
    })
    return !response.ok
  } catch (error) {
    return true
  }
}

/**
 * API client with error handling
 */
export const api = {
  /**
   * Get dashboard summary
   */
  async getDashboardSummary(): Promise<DashboardSummary> {
    const response = await fetch(`${API_BASE_URL}/dashboard/summary`, {
      cache: 'no-store',
    })
    if (!response.ok) {
      throw new Error('Failed to fetch dashboard summary')
    }
    return response.json()
  },

  /**
   * Get risk history
   */
  async getRiskHistory(params?: { start?: string; end?: string; limit?: number }) {
    const queryParams = new URLSearchParams()
    if (params?.start) queryParams.append('start', params.start)
    if (params?.end) queryParams.append('end', params.end)
    if (params?.limit) queryParams.append('limit', params.limit.toString())

    const url = `${API_BASE_URL}/risk/history${queryParams.toString() ? `?${queryParams}` : ''}`
    const response = await fetch(url, { cache: 'no-store' })
    
    if (!response.ok) {
      throw new Error('Failed to fetch risk history')
    }
    return response.json()
  },

  /**
   * Get risk forecast
   */
  async getRiskForecast(weeks: number = 12) {
    const response = await fetch(`${API_BASE_URL}/risk/forecast?weeks=${weeks}`, {
      cache: 'no-store',
    })
    if (!response.ok) {
      throw new Error('Failed to fetch risk forecast')
    }
    return response.json()
  },

  /**
   * Get current risk
   */
  async getCurrentRisk() {
    const response = await fetch(`${API_BASE_URL}/risk/current`, {
      cache: 'no-store',
    })
    if (!response.ok) {
      throw new Error('Failed to fetch current risk')
    }
    return response.json()
  },

  /**
   * Get risk for specific date
   */
  async getRiskForDate(date: string) {
    const response = await fetch(`${API_BASE_URL}/risk/date/${date}`, {
      cache: 'no-store',
    })
    if (!response.ok) {
      throw new Error('Failed to fetch risk for date')
    }
    return response.json()
  },

  /**
   * Get top signals
   */
  async getTopSignals(targetDate?: string) {
    const url = targetDate 
      ? `${API_BASE_URL}/signals/top?target_date=${targetDate}`
      : `${API_BASE_URL}/signals/top`
    
    const response = await fetch(url, { cache: 'no-store' })
    if (!response.ok) {
      throw new Error('Failed to fetch top signals')
    }
    return response.json()
  },

  /**
   * Get signal forecast
   */
  async getSignalForecast(signal: string) {
    const response = await fetch(`${API_BASE_URL}/signals/forecast?signal=${signal}`, {
      cache: 'no-store',
    })
    if (!response.ok) {
      throw new Error('Failed to fetch signal forecast')
    }
    return response.json()
  },

  /**
   * Get LLM reasoning
   */
  async getLLMReasoning() {
    const response = await fetch(`${API_BASE_URL}/signals/llm-reasoning`, {
      cache: 'no-store',
    })
    if (!response.ok) {
      throw new Error('Failed to fetch LLM reasoning')
    }
    return response.json()
  },

  /**
   * Get model metrics
   */
  async getModelMetrics() {
    const response = await fetch(`${API_BASE_URL}/model/metrics`, {
      cache: 'no-store',
    })
    if (!response.ok) {
      throw new Error('Failed to fetch model metrics')
    }
    return response.json()
  },

  /**
   * Get feature importance
   */
  async getFeatureImportance() {
    const response = await fetch(`${API_BASE_URL}/model/features`, {
      cache: 'no-store',
    })
    if (!response.ok) {
      throw new Error('Failed to fetch feature importance')
    }
    return response.json()
  },

  /**
   * Get SHAP waterfall data
   */
  async getShapWaterfall(targetDate: string, topN: number = 12) {
    const response = await fetch(
      `${API_BASE_URL}/shap/waterfall/${targetDate}?top_n=${topN}`,
      { cache: 'no-store' }
    )
    if (!response.ok) {
      throw new Error('Failed to fetch SHAP waterfall')
    }
    return response.json()
  },

  /**
   * Get SHAP summary
   */
  async getShapSummary(topN: number = 20) {
    const response = await fetch(`${API_BASE_URL}/shap/summary?top_n=${topN}`, {
      cache: 'no-store',
    })
    if (!response.ok) {
      throw new Error('Failed to fetch SHAP summary')
    }
    return response.json()
  },

  /**
   * Get named events
   */
  async getNamedEvents() {
    const response = await fetch(`${API_BASE_URL}/shap/events`, {
      cache: 'no-store',
    })
    if (!response.ok) {
      throw new Error('Failed to fetch named events')
    }
    return response.json()
  },

  /**
   * Get sector risks
   */
  async getSectorRisks() {
    const response = await fetch(`${API_BASE_URL}/risk/sectors`, {
      cache: 'no-store',
    })
    if (!response.ok) {
      throw new Error('Failed to fetch sector risks')
    }
    return response.json()
  },

  /**
   * Get custom risk
   */
  async getCustomRisk(signals: string, weeks: number = 4) {
    const response = await fetch(
      `${API_BASE_URL}/risk/custom?signals=${signals}&weeks=${weeks}`,
      { cache: 'no-store' }
    )
    if (!response.ok) {
      throw new Error('Failed to fetch custom risk')
    }
    return response.json()
  },

  /**
   * Get comparison events list
   */
  async getComparisonEventsList() {
    const response = await fetch(`${API_BASE_URL}/risk/compare/events/list`, {
      cache: 'no-store',
    })
    if (!response.ok) {
      throw new Error('Failed to fetch comparison events')
    }
    return response.json()
  },

  /**
   * Compare to event
   */
  async compareToEvent(eventKey: string) {
    const response = await fetch(`${API_BASE_URL}/risk/compare/${eventKey}`, {
      cache: 'no-store',
    })
    if (!response.ok) {
      throw new Error('Failed to compare to event')
    }
    return response.json()
  },

  /**
   * Get commodities list
   */
  async getCommoditiesList() {
    const response = await fetch(`${API_BASE_URL}/commodities/list`, {
      cache: 'no-store',
    })
    if (!response.ok) {
      throw new Error('Failed to fetch commodities list')
    }
    return response.json()
  },

  /**
   * Subscribe to alerts
   */
  async subscribeToAlerts(data: {
    email: string
    threshold?: number
    commodities?: string
    frequency?: string
  }) {
    const response = await fetch(`${API_BASE_URL}/alerts/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to subscribe to alerts')
    }
    return response.json()
  },

  /**
   * Unsubscribe from alerts
   */
  async unsubscribeFromAlerts(email: string) {
    const response = await fetch(`${API_BASE_URL}/alerts/unsubscribe?email=${email}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      throw new Error('Failed to unsubscribe from alerts')
    }
    return response.json()
  },

  /**
   * Get settings
   */
  async getSettings() {
    const response = await fetch(`${API_BASE_URL}/settings`, {
      cache: 'no-store',
    })
    if (!response.ok) {
      throw new Error('Failed to fetch settings')
    }
    return response.json()
  },

  /**
   * Update settings
   */
  async updateSettings(settings: Record<string, any>) {
    const response = await fetch(`${API_BASE_URL}/settings/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to update settings')
    }
    return response.json()
  },

  /**
   * Refresh data
   */
  async refreshData() {
    const response = await fetch(`${API_BASE_URL}/settings/refresh`, {
      method: 'POST',
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to refresh data')
    }
    return response.json()
  },
}
