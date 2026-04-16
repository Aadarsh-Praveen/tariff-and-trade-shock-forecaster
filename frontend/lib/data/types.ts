export type RiskSeverity = 'critical' | 'high' | 'medium' | 'low'

export type RiskCategory = 'financial' | 'operational' | 'geopolitical' | 'compliance'

export type SupplierStatus = 'active' | 'under-review' | 'suspended'

export type SupplierTier = 'Tier 1' | 'Tier 2' | 'Tier 3'

export type RiskEventStatus = 'open' | 'mitigating' | 'resolved'

export interface Location {
  country: string
  region: string
  lat: number
  lng: number
}

export interface RiskBreakdown {
  financial: number
  operational: number
  geopolitical: number
  compliance: number
}

export interface Supplier {
  id: string
  name: string
  category: SupplierTier
  location: Location
  riskScore: number
  riskBreakdown: RiskBreakdown
  lastAssessment: Date
  status: SupplierStatus
  incidents: number
  contractValue: number
  criticalParts: number
}

export interface RiskEvent {
  id: string
  supplierId: string
  supplierName: string
  type: RiskCategory
  severity: RiskSeverity
  likelihood: 1 | 2 | 3 | 4 | 5
  impact: 1 | 2 | 3 | 4 | 5
  title: string
  description: string
  createdAt: Date
  status: RiskEventStatus
  mitigationSteps?: string[]
}

export interface MonthlyMetrics {
  month: string
  overallScore: number
  financialScore: number
  operationalScore: number
  geopoliticalScore: number
  complianceScore: number
  incidentCount: number
  suppliersMonitored: number
}

export interface Alert {
  id: string
  title: string
  description: string
  severity: RiskSeverity
  category: RiskCategory
  supplierId?: string
  supplierName?: string
  createdAt: Date
  isRead: boolean
  isAcknowledged: boolean
}

export interface Report {
  id: string
  name: string
  type: 'monthly' | 'quarterly' | 'annual' | 'custom'
  createdAt: Date
  status: 'completed' | 'scheduled' | 'in-progress'
  scheduledFor?: Date
}

export interface DashboardStats {
  overallRiskScore: number
  suppliersMonitored: number
  activeIncidents: number
  avgResponseTime: number
  criticalAlerts: number
  highAlerts: number
  resolvedThisMonth: number
  trendDirection: 'up' | 'down' | 'stable'
  trendPercentage: number
}

export interface TimeRange {
  label: string
  value: '1M' | '3M' | '6M' | '1Y' | 'ALL'
  months: number
}

export const TIME_RANGES: TimeRange[] = [
  { label: '1 Month', value: '1M', months: 1 },
  { label: '3 Months', value: '3M', months: 3 },
  { label: '6 Months', value: '6M', months: 6 },
  { label: '1 Year', value: '1Y', months: 12 },
  { label: 'All Time', value: 'ALL', months: 24 },
]
