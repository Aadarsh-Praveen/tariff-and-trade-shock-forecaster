'use client'

import { useDashboard } from './dashboard-context'
import { SearchBar } from './search-bar'
import { NotificationDropdown } from './notification-dropdown'
import { DateBadge } from './date-badge'
import { TIME_RANGES } from '@/lib/data/types'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

interface DashboardHeaderProps {
  title: string
  description?: string
}

export function DashboardHeader({ title, description }: DashboardHeaderProps) {
  const { timeRange, setTimeRange } = useDashboard()

  return (
    <header className="sticky top-0 z-10 shrink-0 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex h-14 items-center gap-4 px-6">
        <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground transition-colors" />

        <div className="w-px h-5 bg-border" />

        <div className="flex flex-1 items-center gap-4">
          {/* Title */}
          <span className="text-[14px] font-bold text-foreground tracking-tight">{title}</span>

          <div className="ml-auto flex items-center gap-2">
            <SearchBar />

            <div className="w-px h-5 bg-border hidden md:block" />

            <DateBadge />

            <Select
              value={timeRange.value}
              onValueChange={(value) => {
                const range = TIME_RANGES.find((r) => r.value === value)
                if (range) setTimeRange(range)
              }}
            >
              <SelectTrigger
                className="w-28 h-8 text-[11px] text-muted-foreground border-border rounded-lg"
                style={{ backgroundColor: 'rgba(128,128,128,0.06)' }}
              >
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border rounded-lg">
                {TIME_RANGES.map((range) => (
                  <SelectItem key={range.value} value={range.value} className="text-[11px] text-foreground">
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="w-px h-5 bg-border hidden md:block" />

            <ThemeToggle />
            <NotificationDropdown />
          </div>
        </div>
      </div>
    </header>
  )
}