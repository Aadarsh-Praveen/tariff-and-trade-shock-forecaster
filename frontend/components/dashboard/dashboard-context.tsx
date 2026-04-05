'use client'

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'
import type { Supplier, RiskCategory, TimeRange } from '@/lib/data/types'
import { TIME_RANGES } from '@/lib/data/types'

interface DashboardContextValue {
  // Selected supplier for detail views
  selectedSupplier: Supplier | null
  setSelectedSupplier: (supplier: Supplier | null) => void
  
  // Time range filter
  timeRange: TimeRange
  setTimeRange: (range: TimeRange) => void
  
  // Risk category filter
  selectedCategories: RiskCategory[]
  toggleCategory: (category: RiskCategory) => void
  clearCategories: () => void
  
  // Search query
  searchQuery: string
  setSearchQuery: (query: string) => void
  
  // Alert state
  unreadAlertCount: number
  setUnreadAlertCount: (count: number) => void
}

const DashboardContext = createContext<DashboardContextValue | null>(null)

export function useDashboard() {
  const context = useContext(DashboardContext)
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider')
  }
  return context
}

interface DashboardProviderProps {
  children: ReactNode
}

export function DashboardProvider({ children }: DashboardProviderProps) {
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [timeRange, setTimeRange] = useState<TimeRange>(TIME_RANGES[3]) // Default to 1 Year
  const [selectedCategories, setSelectedCategories] = useState<RiskCategory[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [unreadAlertCount, setUnreadAlertCount] = useState(3)
  
  const toggleCategory = useCallback((category: RiskCategory) => {
    setSelectedCategories((prev) => {
      if (prev.includes(category)) {
        return prev.filter((c) => c !== category)
      }
      return [...prev, category]
    })
  }, [])
  
  const clearCategories = useCallback(() => {
    setSelectedCategories([])
  }, [])
  
  const value = useMemo<DashboardContextValue>(
    () => ({
      selectedSupplier,
      setSelectedSupplier,
      timeRange,
      setTimeRange,
      selectedCategories,
      toggleCategory,
      clearCategories,
      searchQuery,
      setSearchQuery,
      unreadAlertCount,
      setUnreadAlertCount,
    }),
    [
      selectedSupplier,
      timeRange,
      selectedCategories,
      toggleCategory,
      clearCategories,
      searchQuery,
      unreadAlertCount,
    ]
  )
  
  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  )
}
