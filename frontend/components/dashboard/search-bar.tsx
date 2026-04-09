'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, TrendingUp, Bell, Building2, FileText, X } from 'lucide-react'
import { useDashboard } from './dashboard-context'
import { suppliers, alerts } from '@/lib/data/mock-data'
import { cn } from '@/lib/utils'

interface SearchResult {
  type: 'supplier' | 'alert' | 'page'
  id: string
  title: string
  subtitle: string
  href: string
  icon: React.ReactNode
  riskScore?: number
}

interface SearchResultsProps {
  query: string
  onClose: () => void
}

function SearchResults({ query, onClose }: SearchResultsProps) {
  const router = useRouter()
  const [results, setResults] = useState<SearchResult[]>([])
  
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([])
      return
    }

    const searchLower = query.toLowerCase()
    const newResults: SearchResult[] = []

    // Search suppliers
    suppliers
      .filter(s => 
        s.name.toLowerCase().includes(searchLower) ||
        s.location.country.toLowerCase().includes(searchLower) ||
        s.location.region.toLowerCase().includes(searchLower) ||
        s.id.toLowerCase().includes(searchLower)
      )
      .slice(0, 5)
      .forEach(supplier => {
        newResults.push({
          type: 'supplier',
          id: supplier.id,
          title: supplier.name,
          subtitle: `${supplier.location.country} • ${supplier.category} • Risk: ${supplier.riskScore}`,
          href: '/suppliers',
          icon: <Building2 className="size-4" />,
          riskScore: supplier.riskScore,
        })
      })

    // Search alerts
    alerts
      .filter(a => 
        a.title.toLowerCase().includes(searchLower) ||
        a.description.toLowerCase().includes(searchLower) ||
        (a.supplierName && a.supplierName.toLowerCase().includes(searchLower))
      )
      .slice(0, 5)
      .forEach(alert => {
        newResults.push({
          type: 'alert',
          id: alert.id,
          title: alert.title,
          subtitle: alert.supplierName ? `${alert.supplierName} • ${alert.severity}` : alert.severity,
          href: '/alerts',
          icon: <Bell className="size-4" />,
        })
      })

    // Search pages
    const pages = [
      { title: 'Dashboard', subtitle: 'Supply chain risk overview', href: '/', keywords: ['home', 'overview', 'main', 'dashboard'] },
      { title: 'Forecast', subtitle: '12-week risk prediction', href: '/forecast', keywords: ['forecast', 'prediction', 'future', 'prophet'] },
      { title: 'Signals', subtitle: 'Economic indicators', href: '/signals', keywords: ['signals', 'indicators', 'economic', 'commodities'] },
      { title: 'Events', subtitle: 'Risk event tracking', href: '/events', keywords: ['events', 'incidents', 'disruptions'] },
      { title: 'Model', subtitle: 'ML model insights', href: '/model', keywords: ['model', 'machine learning', 'ml', 'ai', 'features'] },
      { title: 'Alerts', subtitle: 'Risk notifications', href: '/alerts', keywords: ['alerts', 'notifications', 'warnings'] },
      { title: 'Suppliers', subtitle: 'Supplier analysis', href: '/suppliers', keywords: ['suppliers', 'vendors', 'partners'] },
      { title: 'Settings', subtitle: 'Dashboard configuration', href: '/settings', keywords: ['settings', 'config', 'preferences'] },
      { title: 'Sectors', subtitle: 'Industry sectors', href: '/sectors', keywords: ['sectors', 'industries', 'categories'] },
      { title: 'Custom Tracker', subtitle: 'Track custom metrics', href: '/custom-tracker', keywords: ['custom', 'tracker', 'tracking'] },
    ]

    pages
      .filter(p => 
        p.title.toLowerCase().includes(searchLower) ||
        p.subtitle.toLowerCase().includes(searchLower) ||
        p.keywords.some(k => k.includes(searchLower))
      )
      .slice(0, 3)
      .forEach(page => {
        newResults.push({
          type: 'page',
          id: page.href,
          title: page.title,
          subtitle: page.subtitle,
          href: page.href,
          icon: <FileText className="size-4" />,
        })
      })

    setResults(newResults.slice(0, 10))
  }, [query])

  const handleResultClick = (result: SearchResult) => {
    router.push(result.href)
    onClose()
  }

  const getRiskColor = (score?: number) => {
    if (!score) return ''
    if (score >= 70) return 'text-coral'
    if (score >= 40) return 'text-amber'
    return 'text-green'
  }

  if (!query || query.length < 2) return null

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg max-h-[400px] overflow-y-auto z-50">
      {results.length === 0 ? (
        <div className="p-4 text-center text-muted-foreground text-sm">
          No results found for "{query}"
        </div>
      ) : (
        <div className="py-2">
          {results.map((result) => (
            <button
              key={`${result.type}-${result.id}`}
              onClick={() => handleResultClick(result)}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-secondary transition-colors text-left"
            >
              <div className="flex-shrink-0 text-muted-foreground">
                {result.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground text-sm truncate">
                  {result.title}
                </div>
                <div className={cn(
                  "text-xs truncate",
                  result.riskScore ? getRiskColor(result.riskScore) : "text-muted-foreground"
                )}>
                  {result.subtitle}
                </div>
              </div>
              <div className="flex-shrink-0 text-xs text-t4 uppercase">
                {result.type}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function SearchBar() {
  const { searchQuery, setSearchQuery } = useDashboard()
  const [showResults, setShowResults] = useState(false)
  const [localQuery, setLocalQuery] = useState(searchQuery)
  const searchRef = useRef<HTMLDivElement>(null)

  // Handle click outside to close results
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Update context when local query changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [localQuery, setSearchQuery])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setLocalQuery(value)
    setShowResults(value.length >= 2)
  }

  const handleClear = () => {
    setLocalQuery('')
    setSearchQuery('')
    setShowResults(false)
  }

  const handleFocus = () => {
    if (localQuery.length >= 2) {
      setShowResults(true)
    }
  }

  return (
    <div ref={searchRef} className="relative hidden md:block">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-t4 pointer-events-none" />
      <input
        type="search"
        placeholder="Search suppliers, alerts, pages..."
        className="w-64 h-9 pl-9 pr-9 rounded-md text-[12px] text-t2 bg-input border border-border focus:bg-card placeholder:text-t4 outline-none transition-colors"
        value={localQuery}
        onChange={handleInputChange}
        onFocus={handleFocus}
      />
      {localQuery && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-t4 hover:text-t2 transition-colors"
        >
          <X className="size-3" />
        </button>
      )}
      {showResults && (
        <SearchResults
          query={localQuery}
          onClose={() => setShowResults(false)}
        />
      )}
    </div>
  )
}
