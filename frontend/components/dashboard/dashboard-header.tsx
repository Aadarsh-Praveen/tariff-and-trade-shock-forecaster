'use client'

import { useDashboard } from './dashboard-context'
import { SearchBar } from './search-bar'
import { NotificationDropdown } from './notification-dropdown'
import { DateBadge } from './date-badge'
import { TIME_RANGES } from '@/lib/data/types'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface DashboardHeaderProps {
  title: string
  description?: string
}

export function DashboardHeader({ title, description }: DashboardHeaderProps) {
  const { timeRange, setTimeRange } = useDashboard()
  
  return (
    <header className="top-bar-blur sticky top-0 z-10 flex h-16 shrink-0 items-center gap-4 px-6 border-b border-border">
      <SidebarTrigger className="-ml-1 text-muted-foreground" />

      <div className="w-px h-6 bg-border" />
      
      <div className="flex flex-1 items-center gap-4">
        {/* Title block */}
        <div className="flex flex-col gap-1">
          <h1 className="text-[14px] font-bold leading-none tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        
        <div className="ml-auto flex items-center gap-3">

          {/* Search */}
          <SearchBar />
          
          {/* Date badge */}
          <DateBadge />
          
          {/* Time range */}
          <Select
            value={timeRange.value}
            onValueChange={(value) => {
              const range = TIME_RANGES.find((r) => r.value === value)
              if (range) setTimeRange(range)
            }}
          >
            <SelectTrigger className="w-32 h-9 text-[12px] text-muted-foreground bg-input border-border">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {TIME_RANGES.map((range) => (
                <SelectItem 
                  key={range.value} 
                  value={range.value}
                  className="text-[12px] text-muted-foreground"
                >
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Theme toggle */}
          <ThemeToggle />
          
          {/* Notifications */}
          <NotificationDropdown />
        </div>
      </div>
    </header>
  )
}