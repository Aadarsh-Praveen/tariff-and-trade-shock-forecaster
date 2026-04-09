'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, TrendingUp, Grid3X3, Target, Lightbulb,
  Activity, BarChart3, Bell, Settings, Shield, ChevronDown,
} from 'lucide-react'
import { useDashboard } from './dashboard-context'
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarMenuBadge, SidebarFooter, SidebarSeparator,
} from '@/components/ui/sidebar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const CORAL = '#df2531'

const mainNavItems = [
  { title: 'Dashboard', href: '/', icon: LayoutDashboard },
  { title: 'Forecast', href: '/forecast', icon: TrendingUp },
  { title: 'Sectors', href: '/sectors', icon: Grid3X3 },
  { title: 'Custom Tracker', href: '/custom-tracker', icon: Target },
  { title: 'Events', href: '/events', icon: Lightbulb },
  { title: 'Signals', href: '/signals', icon: Activity },
  { title: 'Model', href: '/model', icon: BarChart3 },
  { title: 'Alerts', href: '/alerts', icon: Bell, badge: true },
]

const settingsNavItems = [
  { title: 'Settings', href: '/settings', icon: Settings },
]

function NavButton({ item, isActive }: { item: typeof mainNavItems[0]; isActive: boolean }) {
  const [hovered, setHovered] = useState(false)

  return (
    <Link
      href={item.href}
      className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium rounded-lg"
      style={{
        backgroundColor: isActive
          ? `${CORAL}12`
          : hovered
            ? 'rgba(128,128,128,0.08)'
            : 'transparent',
        color: isActive ? CORAL : undefined,
        boxShadow: isActive ? `inset 3px 0 0 0 ${CORAL}` : 'none',
        borderRadius: isActive ? '0 8px 8px 0' : '8px',
        transition: 'background-color 0.2s ease, color 0.15s ease, box-shadow 0.2s ease',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <item.icon
        className="size-4"
        style={{
          color: isActive ? CORAL : hovered ? undefined : undefined,
          opacity: isActive ? 1 : hovered ? 0.85 : 0.55,
          transition: 'opacity 0.2s ease',
        }}
      />
      <span
        style={{
          opacity: isActive ? 1 : hovered ? 1 : 0.65,
          transition: 'opacity 0.2s ease',
        }}
        className={isActive ? '' : 'text-muted-foreground'}
      >
        {item.title}
      </span>
    </Link>
  )
}

export function AppSidebar() {
  const pathname = usePathname()
  const { unreadAlertCount } = useDashboard()

  return (
    <Sidebar variant="inset" className="border-r border-sidebar-border overflow-x-hidden relative">
      {/* Subtle gradient background */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `linear-gradient(180deg, ${CORAL}06 0%, transparent 30%, transparent 70%, ${CORAL}04 100%)`,
        pointerEvents: 'none',
        zIndex: 0,
      }} />
      {/* Header */}
      <SidebarHeader className="border-b border-sidebar-border pb-4 relative z-[1]">
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/" className="flex items-center gap-3 px-2 py-1 group">
              {/* Glowing icon */}
              <div style={{
                width: 42, height: 42, borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `linear-gradient(135deg, ${CORAL}, ${CORAL}cc)`,
                boxShadow: `0 4px 16px ${CORAL}40, 0 0 0 1px ${CORAL}20`,
                transition: 'box-shadow 0.3s ease, transform 0.2s ease',
              }}>
                <Shield className="size-5" style={{ color: '#fff' }} />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-bold text-foreground text-[15px] tracking-tight">
                  Tariff<span style={{ color: CORAL }}>.</span>Forecaster
                </span>
                <span className="text-[10px] text-muted-foreground tracking-wider uppercase" style={{ letterSpacing: '1.5px' }}>
                  Supply Chain Risk
                </span>
              </div>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="overflow-x-hidden relative z-[1]">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-0.5 px-1">
              {mainNavItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <div key={item.href} className="relative">
                    <NavButton item={item} isActive={isActive} />
                    {item.badge && unreadAlertCount > 0 && (
                      <span
                        className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full text-[9px] font-bold"
                        style={{
                          backgroundColor: CORAL, color: '#fff',
                          minWidth: 18, height: 18,
                        }}
                      >
                        {unreadAlertCount}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="bg-border" />

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
            System
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-0.5 px-1">
              {settingsNavItems.map((item) => {
                const isActive = pathname === item.href
                return <NavButton key={item.href} item={item} isActive={isActive} />
              })}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border relative z-[1]">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="hover:bg-secondary w-full">
                  <Avatar className="size-8">
                    <AvatarFallback className="text-[11px] font-semibold"
                      style={{ backgroundColor: `${CORAL}12`, color: CORAL, border: `1px solid ${CORAL}25` }}>
                      JD
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-medium text-[13px] text-foreground">John Doe</span>
                    <span className="text-[10px] text-muted-foreground">Risk Manager</span>
                  </div>
                  <ChevronDown className="ml-auto size-4 text-muted-foreground" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top" align="start"
                className="w-[--radix-dropdown-menu-trigger-width] bg-card border-border"
              >
                {['Profile', 'Preferences', 'Sign out'].map((label) => (
                  <DropdownMenuItem key={label} className="text-[12px]">{label}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}