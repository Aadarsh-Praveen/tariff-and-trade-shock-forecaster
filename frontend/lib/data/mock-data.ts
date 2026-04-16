import type {
  Supplier,
  RiskEvent,
  MonthlyMetrics,
  Alert,
  Report,
  DashboardStats,
  RiskSeverity,
  RiskCategory,
} from './types'

// Seeded random number generator for deterministic data
function seededRandom(seed: number): () => number {
  return function() {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
}

// Use a fixed seed for consistent data across server/client
const random = seededRandom(12345)

// Fixed base date to avoid hydration issues with Date()
const BASE_DATE = new Date('2026-04-03T00:00:00Z')

// Helper to generate dates relative to base date
const daysAgo = (days: number) => {
  const date = new Date(BASE_DATE)
  date.setDate(date.getDate() - days)
  return date
}

const monthsAgo = (months: number) => {
  const date = new Date(BASE_DATE)
  date.setMonth(date.getMonth() - months)
  return date
}

// 25 Suppliers with realistic supply chain data
export const suppliers: Supplier[] = [
  {
    id: 'sup-001',
    name: 'GlobalTech Components',
    category: 'Tier 1',
    location: { country: 'China', region: 'Asia Pacific', lat: 31.2, lng: 121.5 },
    riskScore: 78,
    riskBreakdown: { financial: 65, operational: 82, geopolitical: 88, compliance: 72 },
    lastAssessment: daysAgo(5),
    status: 'active',
    incidents: 3,
    contractValue: 12500000,
    criticalParts: 45,
  },
  {
    id: 'sup-002',
    name: 'EuroLogistics GmbH',
    category: 'Tier 1',
    location: { country: 'Germany', region: 'Europe', lat: 52.5, lng: 13.4 },
    riskScore: 32,
    riskBreakdown: { financial: 28, operational: 35, geopolitical: 25, compliance: 38 },
    lastAssessment: daysAgo(12),
    status: 'active',
    incidents: 0,
    contractValue: 8200000,
    criticalParts: 28,
  },
  {
    id: 'sup-003',
    name: 'Pacific Rim Electronics',
    category: 'Tier 1',
    location: { country: 'Taiwan', region: 'Asia Pacific', lat: 25.0, lng: 121.5 },
    riskScore: 65,
    riskBreakdown: { financial: 45, operational: 58, geopolitical: 92, compliance: 55 },
    lastAssessment: daysAgo(3),
    status: 'under-review',
    incidents: 2,
    contractValue: 15800000,
    criticalParts: 67,
  },
  {
    id: 'sup-004',
    name: 'AmeriSteel Industries',
    category: 'Tier 1',
    location: { country: 'USA', region: 'North America', lat: 41.8, lng: -87.6 },
    riskScore: 28,
    riskBreakdown: { financial: 32, operational: 25, geopolitical: 18, compliance: 35 },
    lastAssessment: daysAgo(8),
    status: 'active',
    incidents: 0,
    contractValue: 6500000,
    criticalParts: 15,
  },
  {
    id: 'sup-005',
    name: 'Bangalore Tech Solutions',
    category: 'Tier 2',
    location: { country: 'India', region: 'Asia Pacific', lat: 12.9, lng: 77.6 },
    riskScore: 52,
    riskBreakdown: { financial: 48, operational: 62, geopolitical: 45, compliance: 52 },
    lastAssessment: daysAgo(15),
    status: 'active',
    incidents: 1,
    contractValue: 3200000,
    criticalParts: 22,
  },
  {
    id: 'sup-006',
    name: 'Nordic Precision AB',
    category: 'Tier 2',
    location: { country: 'Sweden', region: 'Europe', lat: 59.3, lng: 18.1 },
    riskScore: 22,
    riskBreakdown: { financial: 18, operational: 25, geopolitical: 15, compliance: 28 },
    lastAssessment: daysAgo(20),
    status: 'active',
    incidents: 0,
    contractValue: 2800000,
    criticalParts: 12,
  },
  {
    id: 'sup-007',
    name: 'Shenzhen Manufacturing Co',
    category: 'Tier 1',
    location: { country: 'China', region: 'Asia Pacific', lat: 22.5, lng: 114.1 },
    riskScore: 85,
    riskBreakdown: { financial: 72, operational: 88, geopolitical: 95, compliance: 78 },
    lastAssessment: daysAgo(2),
    status: 'under-review',
    incidents: 5,
    contractValue: 18500000,
    criticalParts: 89,
  },
  {
    id: 'sup-008',
    name: 'Brazilian Raw Materials',
    category: 'Tier 2',
    location: { country: 'Brazil', region: 'South America', lat: -23.5, lng: -46.6 },
    riskScore: 58,
    riskBreakdown: { financial: 65, operational: 52, geopolitical: 55, compliance: 62 },
    lastAssessment: daysAgo(18),
    status: 'active',
    incidents: 2,
    contractValue: 4100000,
    criticalParts: 18,
  },
  {
    id: 'sup-009',
    name: 'UK Aerospace Parts Ltd',
    category: 'Tier 1',
    location: { country: 'UK', region: 'Europe', lat: 51.5, lng: -0.1 },
    riskScore: 35,
    riskBreakdown: { financial: 38, operational: 32, geopolitical: 28, compliance: 42 },
    lastAssessment: daysAgo(10),
    status: 'active',
    incidents: 0,
    contractValue: 7200000,
    criticalParts: 34,
  },
  {
    id: 'sup-010',
    name: 'Vietnam Assembly Corp',
    category: 'Tier 2',
    location: { country: 'Vietnam', region: 'Asia Pacific', lat: 10.8, lng: 106.6 },
    riskScore: 48,
    riskBreakdown: { financial: 42, operational: 55, geopolitical: 38, compliance: 58 },
    lastAssessment: daysAgo(7),
    status: 'active',
    incidents: 1,
    contractValue: 2900000,
    criticalParts: 25,
  },
  {
    id: 'sup-011',
    name: 'Mexican Auto Parts SA',
    category: 'Tier 2',
    location: { country: 'Mexico', region: 'North America', lat: 19.4, lng: -99.1 },
    riskScore: 42,
    riskBreakdown: { financial: 45, operational: 38, geopolitical: 35, compliance: 52 },
    lastAssessment: daysAgo(14),
    status: 'active',
    incidents: 1,
    contractValue: 3800000,
    criticalParts: 20,
  },
  {
    id: 'sup-012',
    name: 'Japanese Precision Motors',
    category: 'Tier 1',
    location: { country: 'Japan', region: 'Asia Pacific', lat: 35.7, lng: 139.7 },
    riskScore: 25,
    riskBreakdown: { financial: 22, operational: 28, geopolitical: 20, compliance: 30 },
    lastAssessment: daysAgo(6),
    status: 'active',
    incidents: 0,
    contractValue: 9800000,
    criticalParts: 42,
  },
  {
    id: 'sup-013',
    name: 'Polish Metalworks Sp',
    category: 'Tier 3',
    location: { country: 'Poland', region: 'Europe', lat: 52.2, lng: 21.0 },
    riskScore: 38,
    riskBreakdown: { financial: 42, operational: 35, geopolitical: 32, compliance: 45 },
    lastAssessment: daysAgo(22),
    status: 'active',
    incidents: 0,
    contractValue: 1500000,
    criticalParts: 8,
  },
  {
    id: 'sup-014',
    name: 'Australian Mining Resources',
    category: 'Tier 2',
    location: { country: 'Australia', region: 'Oceania', lat: -33.9, lng: 151.2 },
    riskScore: 30,
    riskBreakdown: { financial: 28, operational: 32, geopolitical: 22, compliance: 38 },
    lastAssessment: daysAgo(11),
    status: 'active',
    incidents: 0,
    contractValue: 5200000,
    criticalParts: 14,
  },
  {
    id: 'sup-015',
    name: 'Turkish Textiles Co',
    category: 'Tier 3',
    location: { country: 'Turkey', region: 'Europe', lat: 41.0, lng: 29.0 },
    riskScore: 62,
    riskBreakdown: { financial: 58, operational: 55, geopolitical: 78, compliance: 55 },
    lastAssessment: daysAgo(25),
    status: 'active',
    incidents: 2,
    contractValue: 1800000,
    criticalParts: 6,
  },
  {
    id: 'sup-016',
    name: 'South Korean Semiconductors',
    category: 'Tier 1',
    location: { country: 'South Korea', region: 'Asia Pacific', lat: 37.5, lng: 127.0 },
    riskScore: 35,
    riskBreakdown: { financial: 30, operational: 38, geopolitical: 42, compliance: 28 },
    lastAssessment: daysAgo(4),
    status: 'active',
    incidents: 0,
    contractValue: 14200000,
    criticalParts: 58,
  },
  {
    id: 'sup-017',
    name: 'Canadian Lumber Co',
    category: 'Tier 3',
    location: { country: 'Canada', region: 'North America', lat: 45.4, lng: -75.7 },
    riskScore: 20,
    riskBreakdown: { financial: 18, operational: 22, geopolitical: 12, compliance: 28 },
    lastAssessment: daysAgo(30),
    status: 'active',
    incidents: 0,
    contractValue: 980000,
    criticalParts: 4,
  },
  {
    id: 'sup-018',
    name: 'Russian Rare Metals',
    category: 'Tier 2',
    location: { country: 'Russia', region: 'Europe', lat: 55.8, lng: 37.6 },
    riskScore: 92,
    riskBreakdown: { financial: 75, operational: 82, geopolitical: 98, compliance: 88 },
    lastAssessment: daysAgo(1),
    status: 'suspended',
    incidents: 8,
    contractValue: 0,
    criticalParts: 12,
  },
  {
    id: 'sup-019',
    name: 'Singapore Logistics Hub',
    category: 'Tier 2',
    location: { country: 'Singapore', region: 'Asia Pacific', lat: 1.3, lng: 103.8 },
    riskScore: 18,
    riskBreakdown: { financial: 15, operational: 20, geopolitical: 12, compliance: 25 },
    lastAssessment: daysAgo(9),
    status: 'active',
    incidents: 0,
    contractValue: 4500000,
    criticalParts: 0,
  },
  {
    id: 'sup-020',
    name: 'French Aerospace Components',
    category: 'Tier 1',
    location: { country: 'France', region: 'Europe', lat: 48.9, lng: 2.3 },
    riskScore: 28,
    riskBreakdown: { financial: 25, operational: 30, geopolitical: 22, compliance: 35 },
    lastAssessment: daysAgo(13),
    status: 'active',
    incidents: 0,
    contractValue: 8900000,
    criticalParts: 38,
  },
  {
    id: 'sup-021',
    name: 'Indonesian Palm Derivatives',
    category: 'Tier 3',
    location: { country: 'Indonesia', region: 'Asia Pacific', lat: -6.2, lng: 106.8 },
    riskScore: 68,
    riskBreakdown: { financial: 55, operational: 62, geopolitical: 58, compliance: 85 },
    lastAssessment: daysAgo(19),
    status: 'under-review',
    incidents: 3,
    contractValue: 2100000,
    criticalParts: 0,
  },
  {
    id: 'sup-022',
    name: 'Italian Design Works',
    category: 'Tier 2',
    location: { country: 'Italy', region: 'Europe', lat: 45.5, lng: 9.2 },
    riskScore: 32,
    riskBreakdown: { financial: 38, operational: 28, geopolitical: 25, compliance: 38 },
    lastAssessment: daysAgo(16),
    status: 'active',
    incidents: 0,
    contractValue: 3400000,
    criticalParts: 16,
  },
  {
    id: 'sup-023',
    name: 'Philippine Electronics Assembly',
    category: 'Tier 3',
    location: { country: 'Philippines', region: 'Asia Pacific', lat: 14.6, lng: 121.0 },
    riskScore: 55,
    riskBreakdown: { financial: 52, operational: 62, geopolitical: 45, compliance: 58 },
    lastAssessment: daysAgo(21),
    status: 'active',
    incidents: 1,
    contractValue: 1200000,
    criticalParts: 10,
  },
  {
    id: 'sup-024',
    name: 'Swiss Precision Instruments',
    category: 'Tier 1',
    location: { country: 'Switzerland', region: 'Europe', lat: 47.4, lng: 8.5 },
    riskScore: 15,
    riskBreakdown: { financial: 12, operational: 18, geopolitical: 10, compliance: 20 },
    lastAssessment: daysAgo(7),
    status: 'active',
    incidents: 0,
    contractValue: 11200000,
    criticalParts: 52,
  },
  {
    id: 'sup-025',
    name: 'Thai Rubber Products',
    category: 'Tier 3',
    location: { country: 'Thailand', region: 'Asia Pacific', lat: 13.8, lng: 100.5 },
    riskScore: 45,
    riskBreakdown: { financial: 42, operational: 48, geopolitical: 38, compliance: 52 },
    lastAssessment: daysAgo(17),
    status: 'active',
    incidents: 1,
    contractValue: 890000,
    criticalParts: 0,
  },
]

// 50 Risk Events
export const riskEvents: RiskEvent[] = [
  {
    id: 'evt-001',
    supplierId: 'sup-007',
    supplierName: 'Shenzhen Manufacturing Co',
    type: 'geopolitical',
    severity: 'critical',
    likelihood: 5,
    impact: 5,
    title: 'Trade Tariff Escalation',
    description: 'New tariffs imposed may increase component costs by 25% and cause supply disruptions.',
    createdAt: daysAgo(2),
    status: 'open',
    mitigationSteps: ['Identify alternative suppliers', 'Negotiate bulk pre-orders', 'Review inventory levels'],
  },
  {
    id: 'evt-002',
    supplierId: 'sup-018',
    supplierName: 'Russian Rare Metals',
    type: 'geopolitical',
    severity: 'critical',
    likelihood: 5,
    impact: 5,
    title: 'Sanctions Compliance Risk',
    description: 'International sanctions require immediate suspension of supplier relationship.',
    createdAt: daysAgo(1),
    status: 'mitigating',
    mitigationSteps: ['Suspend all orders', 'Find alternative rare metal sources', 'Legal compliance review'],
  },
  {
    id: 'evt-003',
    supplierId: 'sup-003',
    supplierName: 'Pacific Rim Electronics',
    type: 'geopolitical',
    severity: 'high',
    likelihood: 4,
    impact: 5,
    title: 'Regional Tension Impact',
    description: 'Increased regional tensions may affect shipping routes and production capacity.',
    createdAt: daysAgo(5),
    status: 'open',
  },
  {
    id: 'evt-004',
    supplierId: 'sup-001',
    supplierName: 'GlobalTech Components',
    type: 'operational',
    severity: 'high',
    likelihood: 4,
    impact: 4,
    title: 'Production Capacity Reduction',
    description: 'Factory operating at 70% capacity due to equipment maintenance.',
    createdAt: daysAgo(8),
    status: 'mitigating',
  },
  {
    id: 'evt-005',
    supplierId: 'sup-008',
    supplierName: 'Brazilian Raw Materials',
    type: 'financial',
    severity: 'medium',
    likelihood: 3,
    impact: 4,
    title: 'Currency Volatility',
    description: 'BRL depreciation increasing effective procurement costs by 12%.',
    createdAt: daysAgo(12),
    status: 'open',
  },
  {
    id: 'evt-006',
    supplierId: 'sup-021',
    supplierName: 'Indonesian Palm Derivatives',
    type: 'compliance',
    severity: 'high',
    likelihood: 4,
    impact: 4,
    title: 'Environmental Compliance Audit',
    description: 'Pending audit for deforestation compliance under EU regulations.',
    createdAt: daysAgo(10),
    status: 'open',
  },
  {
    id: 'evt-007',
    supplierId: 'sup-015',
    supplierName: 'Turkish Textiles Co',
    type: 'geopolitical',
    severity: 'medium',
    likelihood: 3,
    impact: 3,
    title: 'Regional Currency Crisis',
    description: 'Lira instability affecting supplier pricing stability.',
    createdAt: daysAgo(15),
    status: 'mitigating',
  },
  {
    id: 'evt-008',
    supplierId: 'sup-005',
    supplierName: 'Bangalore Tech Solutions',
    type: 'operational',
    severity: 'medium',
    likelihood: 3,
    impact: 3,
    title: 'Skilled Labor Shortage',
    description: 'Difficulty retaining key technical staff affecting delivery timelines.',
    createdAt: daysAgo(18),
    status: 'open',
  },
  {
    id: 'evt-009',
    supplierId: 'sup-010',
    supplierName: 'Vietnam Assembly Corp',
    type: 'operational',
    severity: 'low',
    likelihood: 2,
    impact: 3,
    title: 'Quality Control Update',
    description: 'Minor quality variance detected in recent batch, under review.',
    createdAt: daysAgo(7),
    status: 'resolved',
  },
  {
    id: 'evt-010',
    supplierId: 'sup-011',
    supplierName: 'Mexican Auto Parts SA',
    type: 'operational',
    severity: 'medium',
    likelihood: 3,
    impact: 3,
    title: 'Logistics Delay',
    description: 'Border crossing delays adding 3-5 days to delivery times.',
    createdAt: daysAgo(14),
    status: 'open',
  },
  ...generateAdditionalRiskEvents(),
]

function generateAdditionalRiskEvents(): RiskEvent[] {
  const events: RiskEvent[] = []
  const eventTypes: RiskCategory[] = ['financial', 'operational', 'geopolitical', 'compliance']
  const severities: RiskSeverity[] = ['critical', 'high', 'medium', 'low']
  
  const titles: Record<RiskCategory, string[]> = {
    financial: [
      'Credit Rating Downgrade',
      'Payment Delay Risk',
      'Liquidity Concerns',
      'Cost Overrun',
      'Insurance Coverage Gap',
    ],
    operational: [
      'Equipment Failure',
      'Workforce Strike',
      'IT System Outage',
      'Supply Shortage',
      'Quality Defect',
    ],
    geopolitical: [
      'Regulatory Change',
      'Export Restriction',
      'Political Instability',
      'Trade Agreement Change',
      'Customs Policy Update',
    ],
    compliance: [
      'Audit Finding',
      'Certification Expiry',
      'Safety Violation',
      'Data Privacy Concern',
      'Labor Practice Review',
    ],
  }
  
  const suppliersSubset = suppliers.slice(0, 15)
  
  for (let i = 11; i <= 50; i++) {
    const type = eventTypes[Math.floor(random() * eventTypes.length)]
    const severity = severities[Math.floor(random() * severities.length)]
    const supplier = suppliersSubset[Math.floor(random() * suppliersSubset.length)]
    const titleOptions = titles[type]
    
    events.push({
      id: `evt-${String(i).padStart(3, '0')}`,
      supplierId: supplier.id,
      supplierName: supplier.name,
      type,
      severity,
      likelihood: (Math.floor(random() * 5) + 1) as 1 | 2 | 3 | 4 | 5,
      impact: (Math.floor(random() * 5) + 1) as 1 | 2 | 3 | 4 | 5,
      title: titleOptions[Math.floor(random() * titleOptions.length)],
      description: `Risk event requiring attention for ${supplier.name}.`,
      createdAt: daysAgo(Math.floor(random() * 60)),
      status: ['open', 'mitigating', 'resolved'][Math.floor(random() * 3)] as RiskEventStatus,
    })
  }
  
  return events
}

// Month names for deterministic formatting
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// 12 Months Historical Metrics
export const monthlyMetrics: MonthlyMetrics[] = Array.from({ length: 12 }, (_, i) => {
  const date = monthsAgo(11 - i)
  const month = `${MONTH_NAMES[date.getMonth()]} ${String(date.getFullYear()).slice(-2)}`
  
  // Create realistic trend with some volatility
  const baseScore = 45 + Math.sin(i / 2) * 10 + random() * 5
  
  return {
    month,
    overallScore: Math.round(baseScore),
    financialScore: Math.round(baseScore - 5 + random() * 10),
    operationalScore: Math.round(baseScore + random() * 8),
    geopoliticalScore: Math.round(baseScore + 10 + random() * 15),
    complianceScore: Math.round(baseScore - 8 + random() * 6),
    incidentCount: Math.floor(3 + random() * 8),
    suppliersMonitored: 22 + Math.floor(i / 4),
  }
})

// Alerts
export const alerts: Alert[] = [
  {
    id: 'alert-001',
    title: 'Critical: Sanctions Compliance',
    description: 'Russian Rare Metals supplier requires immediate suspension due to new sanctions.',
    severity: 'critical',
    category: 'compliance',
    supplierId: 'sup-018',
    supplierName: 'Russian Rare Metals',
    createdAt: daysAgo(0),
    isRead: false,
    isAcknowledged: false,
  },
  {
    id: 'alert-002',
    title: 'High Risk: Trade Tariff Impact',
    description: 'New tariffs on Chinese imports may affect 3 Tier 1 suppliers.',
    severity: 'critical',
    category: 'geopolitical',
    createdAt: daysAgo(1),
    isRead: false,
    isAcknowledged: false,
  },
  {
    id: 'alert-003',
    title: 'Supplier Under Review',
    description: 'Shenzhen Manufacturing Co exceeds risk threshold of 80.',
    severity: 'high',
    category: 'operational',
    supplierId: 'sup-007',
    supplierName: 'Shenzhen Manufacturing Co',
    createdAt: daysAgo(2),
    isRead: true,
    isAcknowledged: false,
  },
  {
    id: 'alert-004',
    title: 'Compliance Audit Required',
    description: 'Indonesian Palm Derivatives requires environmental compliance verification.',
    severity: 'high',
    category: 'compliance',
    supplierId: 'sup-021',
    supplierName: 'Indonesian Palm Derivatives',
    createdAt: daysAgo(3),
    isRead: true,
    isAcknowledged: true,
  },
  {
    id: 'alert-005',
    title: 'Currency Risk Alert',
    description: 'Brazilian Real depreciation affecting procurement costs.',
    severity: 'medium',
    category: 'financial',
    supplierId: 'sup-008',
    supplierName: 'Brazilian Raw Materials',
    createdAt: daysAgo(5),
    isRead: true,
    isAcknowledged: true,
  },
  {
    id: 'alert-006',
    title: 'Geopolitical Tension Monitor',
    description: 'Increased monitoring for Pacific Rim Electronics due to regional tensions.',
    severity: 'medium',
    category: 'geopolitical',
    supplierId: 'sup-003',
    supplierName: 'Pacific Rim Electronics',
    createdAt: daysAgo(6),
    isRead: true,
    isAcknowledged: true,
  },
  {
    id: 'alert-007',
    title: 'Quality Control Notice',
    description: 'Minor quality variance resolved at Vietnam Assembly Corp.',
    severity: 'low',
    category: 'operational',
    supplierId: 'sup-010',
    supplierName: 'Vietnam Assembly Corp',
    createdAt: daysAgo(8),
    isRead: true,
    isAcknowledged: true,
  },
  {
    id: 'alert-008',
    title: 'Contract Renewal Reminder',
    description: 'Swiss Precision Instruments contract expires in 30 days.',
    severity: 'low',
    category: 'financial',
    supplierId: 'sup-024',
    supplierName: 'Swiss Precision Instruments',
    createdAt: daysAgo(10),
    isRead: true,
    isAcknowledged: true,
  },
]

// Reports
export const reports: Report[] = [
  {
    id: 'rpt-001',
    name: 'Q1 2024 Risk Assessment Summary',
    type: 'quarterly',
    createdAt: daysAgo(5),
    status: 'completed',
  },
  {
    id: 'rpt-002',
    name: 'March 2024 Supplier Risk Report',
    type: 'monthly',
    createdAt: daysAgo(10),
    status: 'completed',
  },
  {
    id: 'rpt-003',
    name: 'April 2024 Supplier Risk Report',
    type: 'monthly',
    status: 'scheduled',
    createdAt: new Date(),
    scheduledFor: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'rpt-004',
    name: 'Annual Compliance Review 2023',
    type: 'annual',
    createdAt: daysAgo(90),
    status: 'completed',
  },
  {
    id: 'rpt-005',
    name: 'Geopolitical Risk Analysis',
    type: 'custom',
    createdAt: daysAgo(15),
    status: 'completed',
  },
  {
    id: 'rpt-006',
    name: 'Q2 2024 Risk Assessment',
    type: 'quarterly',
    status: 'scheduled',
    createdAt: new Date(),
    scheduledFor: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
  },
]

// Dashboard Stats
export const dashboardStats: DashboardStats = {
  overallRiskScore: 47,
  suppliersMonitored: 25,
  activeIncidents: 12,
  avgResponseTime: 4.2,
  criticalAlerts: 2,
  highAlerts: 4,
  resolvedThisMonth: 8,
  trendDirection: 'up',
  trendPercentage: 5.2,
}

// Utility functions
export function getSupplierById(id: string): Supplier | undefined {
  return suppliers.find((s) => s.id === id)
}

export function getRiskEventsBySupplier(supplierId: string): RiskEvent[] {
  return riskEvents.filter((e) => e.supplierId === supplierId)
}

export function getAlertsBySeverity(severity: RiskSeverity): Alert[] {
  return alerts.filter((a) => a.severity === severity)
}

export function getUnreadAlerts(): Alert[] {
  return alerts.filter((a) => !a.isRead)
}

export function getSuppliersByRiskLevel(minScore: number, maxScore: number): Supplier[] {
  return suppliers.filter((s) => s.riskScore >= minScore && s.riskScore <= maxScore)
}

export function getCategoryAverages(): Record<RiskCategory, number> {
  const totals = { financial: 0, operational: 0, geopolitical: 0, compliance: 0 }
  
  suppliers.forEach((s) => {
    totals.financial += s.riskBreakdown.financial
    totals.operational += s.riskBreakdown.operational
    totals.geopolitical += s.riskBreakdown.geopolitical
    totals.compliance += s.riskBreakdown.compliance
  })
  
  return {
    financial: Math.round(totals.financial / suppliers.length),
    operational: Math.round(totals.operational / suppliers.length),
    geopolitical: Math.round(totals.geopolitical / suppliers.length),
    compliance: Math.round(totals.compliance / suppliers.length),
  }
}

export function getMetricsForTimeRange(months: number): MonthlyMetrics[] {
  return monthlyMetrics.slice(-months)
}
