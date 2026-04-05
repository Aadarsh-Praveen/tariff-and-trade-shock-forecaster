'use client'

import { Bell, Search } from 'lucide-react'
import { useDashboard } from './dashboard-context'
import { TIME_RANGES } from '@/lib/data/types'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

interface DashboardHeaderProps {
  title: string
  description?: string
}

export function DashboardHeader({ title, description }: DashboardHeaderProps) {
  const { timeRange, setTimeRange, searchQuery, setSearchQuery, unreadAlertCount } = useDashboard()
  
  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-4 border-b border-sidebar-border bg-background px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1 text-foreground" />
      <Separator orientation="vertical" className="h-6 bg-sidebar-border" />
      
      <div className="flex flex-1 items-center gap-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-lg font-semibold leading-none tracking-tight text-100">{title}</h1>
          {description && (
            <p className="text-sm text-45">{description}</p>
          )}
        </div>
        
        <div className="ml-auto flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-45" />
            <Input
              type="search"
              placeholder="Search suppliers, alerts..."
              className="w-64 pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Select
            value={timeRange.value}
            onValueChange={(value) => {
              const range = TIME_RANGES.find((r) => r.value === value)
              if (range) setTimeRange(range)
            }}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent className="bg-background border-sidebar-border">
              {TIME_RANGES.map((range) => (
                <SelectItem key={range.value} value={range.value} className="text-foreground focus:bg-neutral-hover">
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <ThemeToggle />
          
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="size-5" />
            {unreadAlertCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-[#df2531] text-[10px] font-medium text-white shadow-[0_0_8px_rgba(223,37,49,0.6)]">
                {unreadAlertCount}
              </span>
            )}
            <span className="sr-only">Notifications</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
