'use client'

import type { ReactNode } from 'react'
import { DashboardProvider } from './dashboard-context'
import { AppSidebar } from './app-sidebar'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'

interface DashboardLayoutProps {
  children: ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <DashboardProvider>
      <SidebarProvider>
        <div className="flex h-screen overflow-hidden w-full">
          <AppSidebar />
          <SidebarInset
            className="flex-1 overflow-y-auto !mr-0 !pr-0 !max-w-none w-full"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(128,128,128,0.25) transparent' }}
          >
            {children}
          </SidebarInset>
        </div>
      </SidebarProvider>
    </DashboardProvider>
  )
}