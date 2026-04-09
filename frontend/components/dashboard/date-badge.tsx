'use client'

import { Calendar, Clock, TrendingUp, RefreshCw } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'

export function DateBadge() {
  const currentDate = new Date()
  
  const formattedDate = currentDate.toLocaleDateString('en-US', { 
    weekday: 'short',
    year: 'numeric',
    month: 'short', 
    day: 'numeric' 
  })

  const formattedTime = currentDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary border border-border hover:bg-secondary/80 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20">
          <Calendar className="size-3.5 text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground">{formattedDate}</span>
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-[220px] bg-card border-border"
        sideOffset={8}
      >
        <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Current Time
        </DropdownMenuLabel>
        
        <div className="px-2 py-2">
          <div className="flex items-center gap-2 text-foreground">
            <Clock className="size-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-semibold">{formattedTime}</div>
              <div className="text-xs text-muted-foreground">{formattedDate}</div>
            </div>
          </div>
        </div>

        <DropdownMenuSeparator className="bg-border" />

        <DropdownMenuItem 
          onClick={handleRefresh}
          className="cursor-pointer text-[12px]"
        >
          <RefreshCw className="mr-2 size-4" />
          Refresh Dashboard
        </DropdownMenuItem>

        <DropdownMenuItem 
          onClick={() => window.open('/forecast', '_self')}
          className="cursor-pointer text-[12px]"
        >
          <TrendingUp className="mr-2 size-4" />
          View Forecast
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-border" />

        <div className="px-2 py-2">
          <div className="text-[10px] text-muted-foreground">
            Dashboard last updated: Just now
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
