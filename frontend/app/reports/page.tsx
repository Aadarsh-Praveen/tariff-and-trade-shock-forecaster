'use client'

import { useMemo } from 'react'
import {
  FileText,
  Calendar,
  Clock,
  Download,
  Plus,
  ChevronRight,
} from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { reports } from '@/lib/data/mock-data'
import { formatDate } from '@/lib/data/utils'
import { cn } from '@/lib/utils'

const reportTypeConfig = {
  monthly: { label: 'Monthly', className: 'border-primary/30 bg-primary/10 text-primary' },
  quarterly: { label: 'Quarterly', className: 'border-chart-2/30 bg-chart-2/10 text-chart-2' },
  annual: { label: 'Annual', className: 'border-chart-3/30 bg-chart-3/10 text-chart-3' },
  custom: { label: 'Custom', className: 'border-muted-foreground/30 bg-muted/50 text-muted-foreground' },
}

const statusConfig = {
  completed: { label: 'Completed', className: 'border-risk-low/30 bg-risk-low/10 text-risk-low' },
  scheduled: { label: 'Scheduled', className: 'border-risk-medium/30 bg-risk-medium/10 text-risk-medium' },
  'in-progress': { label: 'In Progress', className: 'border-primary/30 bg-primary/10 text-primary' },
}

const reportTemplates = [
  {
    id: 'tpl-1',
    name: 'Executive Summary',
    description: 'High-level overview for leadership',
    icon: FileText,
  },
  {
    id: 'tpl-2',
    name: 'Supplier Risk Assessment',
    description: 'Detailed supplier-by-supplier analysis',
    icon: FileText,
  },
  {
    id: 'tpl-3',
    name: 'Compliance Report',
    description: 'Regulatory compliance status',
    icon: FileText,
  },
  {
    id: 'tpl-4',
    name: 'Incident Analysis',
    description: 'Historical incident trends',
    icon: FileText,
  },
]

export default function ReportsPage() {
  const completedReports = useMemo(() => 
    reports.filter((r) => r.status === 'completed').sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    []
  )
  
  const scheduledReports = useMemo(() =>
    reports.filter((r) => r.status === 'scheduled').sort((a, b) => (a.scheduledFor?.getTime() ?? 0) - (b.scheduledFor?.getTime() ?? 0)),
    []
  )
  
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DashboardHeader
        title="Reports"
        description="Generate and manage risk reports"
      />
      
      <main className="flex-1 space-y-6 p-6">
        {/* Report Templates */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Report Templates</h2>
            <Button>
              <Plus className="mr-2 size-4" />
              Create Custom Report
            </Button>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {reportTemplates.map((template) => (
              <Card key={template.id} className="cursor-pointer transition-colors hover:border-primary/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <template.icon className="size-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{template.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {template.description}
                      </p>
                    </div>
                    <ChevronRight className="size-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        
        {/* Scheduled Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-5" />
              Scheduled Reports
            </CardTitle>
            <CardDescription>Upcoming automated report generation</CardDescription>
          </CardHeader>
          <CardContent>
            {scheduledReports.length > 0 ? (
              <div className="space-y-3">
                {scheduledReports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-secondary p-2">
                        <Calendar className="size-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-medium">{report.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Scheduled for {report.scheduledFor ? formatDate(report.scheduledFor) : 'TBD'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={reportTypeConfig[report.type].className}>
                        {reportTypeConfig[report.type].label}
                      </Badge>
                      <Badge variant="outline" className={statusConfig[report.status].className}>
                        {statusConfig[report.status].label}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-8">
                No scheduled reports
              </p>
            )}
          </CardContent>
        </Card>
        
        {/* Historical Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-5" />
              Historical Reports
            </CardTitle>
            <CardDescription>Previously generated reports</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completedReports.map((report) => (
                <div
                  key={report.id}
                  className="group flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-secondary/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-secondary p-2">
                      <FileText className="size-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium">{report.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Generated on {formatDate(report.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={reportTypeConfig[report.type].className}>
                      {reportTypeConfig[report.type].label}
                    </Badge>
                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button variant="ghost" size="icon">
                        <Download className="size-4" />
                        <span className="sr-only">Download PDF</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Export Options */}
        <Card>
          <CardHeader>
            <CardTitle>Export Options</CardTitle>
            <CardDescription>Download reports in various formats</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline">
                <Download className="mr-2 size-4" />
                Export as PDF
              </Button>
              <Button variant="outline">
                <Download className="mr-2 size-4" />
                Export as CSV
              </Button>
              <Button variant="outline">
                <Download className="mr-2 size-4" />
                Export as Excel
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
