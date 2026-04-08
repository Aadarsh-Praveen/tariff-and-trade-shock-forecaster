'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, TrendingUp, Grid3X3, Target, Lightbulb,
  Activity, BarChart3, Bell, Settings, Shield, ChevronDown, AlertCircle,
} from 'lucide-react'
import { useDashboard } from './dashboard-context'
import { c } from '@/lib/theme-colors'
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarMenuBadge, SidebarFooter, SidebarSeparator,
} from '@/components/ui/sidebar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

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

export function AppSidebar() {
  const pathname = usePathname()
  const { unreadAlertCount } = useDashboard()
  
  return (
    <Sidebar variant="inset" className="border-r border-sidebar-border overflow-x-hidden">
      {/* Header */}
      <SidebarHeader className="border-b border-sidebar-border pb-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="hover:bg-transparent">
              <Link href="/">
                <div className="flex size-10 items-center justify-center rounded-lg bg-coral-soft">
                  <Shield className="size-5 text-coral" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold text-foreground text-[14px]">Tariff Forecaster</span>
                  <span className="text-[10px] text-muted-foreground">Supply Chain Risk</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        
        {/* Callout */}
        <div className="mt-4 mx-2 p-3 rounded-lg bg-coral-faint border border-coral">
          <div className="flex items-start gap-2">
            <AlertCircle className="size-4 text-coral mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-[11px] font-semibold text-coral mb-1">Current Status</div>
              <div className="text-[10px] text-muted-foreground leading-relaxed">
                Risk score elevated. 3 high-risk weeks in last 4.
              </div>
            </div>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="overflow-x-hidden">
        <SidebarGroup>
          <SidebarGroupLabel className="section-label" style={{ color: c.t4 }}>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild isActive={isActive} tooltip={item.title}
                      style={{
                        backgroundColor: isActive ? c.coralSoft : 'transparent',
                        color: isActive ? c.coral : c.t3,
                        boxShadow: isActive ? `inset 2px 0 0 0 ${c.coral}` : 'none',
                        borderRadius: isActive ? '0 8px 8px 0' : '8px',
                      }}
                    >
                      <Link href={item.href}>
                        <item.icon className="size-4" />
                        <span className="text-[13px] font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.badge && unreadAlertCount > 0 && (
                      <SidebarMenuBadge
                        style={{
                          backgroundColor: c.coral, color: 'white',
                          fontSize: 9, fontWeight: 700, borderRadius: 999,
                          minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        {unreadAlertCount}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarSeparator className="bg-border" />
        
        <SidebarGroup>
          <SidebarGroupLabel className="section-label" style={{ color: c.t4 }}>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsNavItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild isActive={isActive} tooltip={item.title}
                      style={{
                        backgroundColor: isActive ? c.coralSoft : 'transparent',
                        color: isActive ? c.coral : c.t3,
                        boxShadow: isActive ? `inset 2px 0 0 0 ${c.coral}` : 'none',
                        borderRadius: isActive ? '0 8px 8px 0' : '8px',
                      }}
                    >
                      <Link href={item.href}>
                        <item.icon className="size-4" />
                        <span className="text-[13px] font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="hover:bg-secondary w-full">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-coral-soft text-coral text-[11px] font-semibold border border-coral">
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