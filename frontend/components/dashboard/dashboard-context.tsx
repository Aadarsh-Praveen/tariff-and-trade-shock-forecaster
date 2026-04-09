'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import type { TimeRange } from '@/lib/data/types'

type RiskCategory = 'financial' | 'operational' | 'geopolitical' | 'compliance'

interface DashboardContextType {
  timeRange: TimeRange
  setTimeRange: (range: TimeRange) => void
  selectedCategories: RiskCategory[]
  toggleCategory: (category: RiskCategory) => void
  unreadAlertCount: number
  setUnreadAlertCount: (count: number) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [timeRange, setTimeRange] = useState<TimeRange>({ months: 6, label: '6 Months', value: '6M' })
  const [selectedCategories, setSelectedCategories] = useState<RiskCategory[]>([])
  const [unreadAlertCount, setUnreadAlertCount] = useState(3)
  const [searchQuery, setSearchQuery] = useState('')

  const toggleCategory = (category: RiskCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    )
  }

  return (
    <DashboardContext.Provider
      value={{
        timeRange,
        setTimeRange,
        selectedCategories,
        toggleCategory,
        unreadAlertCount,
        setUnreadAlertCount,
        searchQuery,
        setSearchQuery,
      }}
    >
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const context = useContext(DashboardContext)
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider')
  }
  return context
}
