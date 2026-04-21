'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Factory, CalendarDays, GitCompare, LineChart, X } from 'lucide-react'
import { useDashboard } from './dashboard-context'
import { api } from '@/lib/api/client'
import { cn } from '@/lib/utils'

type SearchCorpus = {
  commodities: Array<{ key: string; label: string }>
  events: Array<{
    date: string
    event: string
    period: string
    risk_score?: number
    risk_level?: string
    actual_date?: string
  }>
  sectors: Array<{
    sector: string
    label: string
    risk_score: number
    risk_level: string
  }>
  compareEvents: Array<{ key: string; label: string; date: string }>
}

type SearchResultType = 'commodity' | 'event' | 'sector' | 'compare'

interface SearchResult {
  type: SearchResultType
  id: string
  title: string
  subtitle: string
  href: string
  icon: React.ReactNode
  riskScore?: number
}

interface SearchResultsProps {
  query: string
  corpus: SearchCorpus | null
  corpusError: boolean
  onClose: () => void
}

function matches(query: string, ...fields: (string | number | undefined | null)[]): boolean {
  const q = query.toLowerCase().trim()
  if (!q) return false
  return fields.some((f) => {
    if (f === undefined || f === null) return false
    return String(f).toLowerCase().includes(q)
  })
}

function SearchResults({ query, corpus, corpusError, onClose }: SearchResultsProps) {
  const router = useRouter()
  const [results, setResults] = useState<SearchResult[]>([])

  useEffect(() => {
    if (!query || query.length < 1) {
      setResults([])
      return
    }

    if (!corpus) {
      setResults([])
      return
    }

    const searchLower = query.toLowerCase()
    const newResults: SearchResult[] = []

    corpus.events
      .filter((e) =>
        matches(searchLower, e.event, e.period, e.date, e.actual_date, e.risk_level)
      )
      .slice(0, 4)
      .forEach((e) => {
        newResults.push({
          type: 'event',
          id: `event-${e.date}-${e.event}`,
          title: e.event,
          subtitle: `${e.period} • ${e.actual_date ?? e.date} • Risk ${e.risk_score ?? '—'}`,
          href: '/events',
          icon: <CalendarDays className="size-4" />,
          riskScore: e.risk_score,
        })
      })

    corpus.sectors
      .filter((s) =>
        matches(searchLower, s.label, s.sector, s.risk_level, s.risk_score)
      )
      .slice(0, 3)
      .forEach((s) => {
        newResults.push({
          type: 'sector',
          id: `sector-${s.sector}`,
          title: s.label,
          subtitle: `${s.sector} • ${s.risk_level} • ${s.risk_score.toFixed(1)}`,
          href: '/sectors',
          icon: <Factory className="size-4" />,
          riskScore: s.risk_score,
        })
      })

    corpus.commodities
      .filter((c) => matches(searchLower, c.key, c.label))
      .slice(0, 4)
      .forEach((c) => {
        newResults.push({
          type: 'commodity',
          id: `commodity-${c.key}`,
          title: c.label,
          subtitle: `Commodity signal • ${c.key}`,
          href: '/custom-tracker',
          icon: <LineChart className="size-4" />,
        })
      })

    corpus.compareEvents
      .filter((ce) => matches(searchLower, ce.label, ce.key, ce.date))
      .slice(0, 3)
      .forEach((ce) => {
        newResults.push({
          type: 'compare',
          id: `compare-${ce.key}`,
          title: ce.label,
          subtitle: `Compare event • ${ce.date}`,
          href: '/events',
          icon: <GitCompare className="size-4" />,
        })
      })

    setResults(newResults.slice(0, 10))
  }, [query, corpus])

  const handleResultClick = (result: SearchResult) => {
    router.push(result.href)
    onClose()
  }

  const getRiskColor = (score?: number) => {
    if (score === undefined) return ''
    if (score >= 70) return 'text-coral'
    if (score >= 40) return 'text-amber'
    return 'text-green'
  }

  if (!query || query.length < 1) return null

  if (!corpus && !corpusError) {
    return (
      <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-50 p-4 text-center text-muted-foreground text-sm">
        Loading search…
      </div>
    )
  }

  if (corpusError && (!corpus || results.length === 0)) {
    return (
      <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-50 p-4 text-center text-muted-foreground text-sm">
        Search unavailable — connect to the API at{' '}
        <span className="font-mono text-xs">NEXT_PUBLIC_API_URL</span>
      </div>
    )
  }

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg max-h-[400px] overflow-y-auto z-50">
      {results.length === 0 ? (
        <div className="p-4 text-center text-muted-foreground text-sm">
          No API results for &quot;{query}&quot;
        </div>
      ) : (
        <div className="py-2">
          {results.map((result) => (
            <button
              key={`${result.type}-${result.id}`}
              onClick={() => handleResultClick(result)}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-secondary transition-colors text-left"
            >
              <div className="flex-shrink-0 text-muted-foreground">{result.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground text-sm truncate">{result.title}</div>
                <div
                  className={cn(
                    'text-xs truncate',
                    result.riskScore !== undefined ? getRiskColor(result.riskScore) : 'text-muted-foreground'
                  )}
                >
                  {result.subtitle}
                </div>
              </div>
              <div className="flex-shrink-0 text-xs text-t4 uppercase">{result.type}</div>
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
  const [corpus, setCorpus] = useState<SearchCorpus | null>(null)
  const [corpusError, setCorpusError] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    async function loadCorpus() {
      setCorpusError(false)
      try {
        const [comm, named, sectors, compare] = await Promise.all([
          api.getCommoditiesList(),
          api.getNamedEvents(),
          api.getSectorRisks(),
          api.getComparisonEventsList(),
        ])
        if (cancelled) return
        setCorpus({
          commodities: comm.commodities ?? [],
          events: named.events ?? [],
          sectors: sectors.sectors ?? [],
          compareEvents: compare.events ?? [],
        })
      } catch {
        if (!cancelled) {
          setCorpus(null)
          setCorpusError(true)
        }
      }
    }
    loadCorpus()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [localQuery, setSearchQuery])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setLocalQuery(value)
    setShowResults(value.length >= 1)
  }

  const handleClear = () => {
    setLocalQuery('')
    setSearchQuery('')
    setShowResults(false)
  }

  const handleFocus = () => {
    if (localQuery.length >= 1) {
      setShowResults(true)
    }
  }

  return (
    <div ref={searchRef} className="relative hidden md:block">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-t4 pointer-events-none" />
      <input
        type="search"
        placeholder="Search commodities, events, sectors…"
        className="w-64 h-9 pl-9 pr-9 rounded-md text-[12px] text-t2 bg-input border border-border focus:bg-card placeholder:text-t4 outline-none transition-colors"
        value={localQuery}
        onChange={handleInputChange}
        onFocus={handleFocus}
      />
      {localQuery && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-t4 hover:text-t2 transition-colors"
        >
          <X className="size-3" />
        </button>
      )}
      {showResults && (
        <SearchResults
          query={localQuery}
          corpus={corpus}
          corpusError={corpusError}
          onClose={() => setShowResults(false)}
        />
      )}
    </div>
  )
}
