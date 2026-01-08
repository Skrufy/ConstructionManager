import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST /api/reports/generate - Generate a report
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult

    const body = await request.json()
    const { type, period, project_id, projectId, start_date, startDate, end_date, endDate } = body

    const reportType = type || 'LABOR'
    const reportPeriod = period || 'THIS_MONTH'
    const projId = project_id || projectId || null
    const reportStartDate = start_date || startDate || null
    const reportEndDate = end_date || endDate || null

    // Calculate date range based on period
    const { start, end } = getDateRange(reportPeriod, reportStartDate, reportEndDate)

    const dateFilter: Record<string, unknown> = {}
    if (start) dateFilter.gte = start
    if (end) dateFilter.lte = end

    // Generate report based on type
    let reportData: ReportData

    switch (reportType) {
      case 'SAFETY':
      case 'SAFETY_MEETINGS':
        reportData = await generateSafetyReport(projId, dateFilter)
        break
      case 'LABOR':
        reportData = await generateLaborReport(projId, dateFilter)
        break
      case 'EQUIPMENT':
        reportData = await generateEquipmentReport(projId, dateFilter)
        break
      case 'FINANCIAL':
        reportData = await generateFinancialReport(projId, dateFilter)
        break
      case 'PROJECT':
        reportData = await generateProjectReport(projId, dateFilter)
        break
      case 'DAILY_LOG':
        reportData = await generateDailyLogReport(projId, dateFilter)
        break
      default:
        reportData = await generateLaborReport(projId, dateFilter)
    }

    // Get project name if filtering by project
    let projectName = null
    if (projId) {
      const project = await prisma.project.findUnique({
        where: { id: projId },
        select: { name: true }
      })
      projectName = project?.name || null
    }

    // Save the report to the database
    const savedReport = await prisma.generatedReport.create({
      data: {
        name: getReportName(reportType),
        type: reportType,
        status: 'READY',
        format: 'JSON',
        description: getReportDescription(reportType, reportPeriod),
        projectId: projId,
        projectName: projectName,
        period: reportPeriod,
        startDate: start || null,
        endDate: end || null,
        fileUrl: null,
        chartType: reportData.chartType,
        stats: reportData.stats as unknown as undefined,
        data: reportData.data as unknown as undefined,
        generatedById: authResult.user.id
      }
    })

    // Build GeneratedReport compatible response for Android
    const report = {
      id: savedReport.id,
      name: savedReport.name,
      type: savedReport.type,
      status: savedReport.status,
      format: savedReport.format,
      description: savedReport.description,
      projectId: savedReport.projectId,
      projectName: savedReport.projectName,
      period: savedReport.period,
      startDate: savedReport.startDate?.toISOString() || null,
      endDate: savedReport.endDate?.toISOString() || null,
      fileUrl: savedReport.fileUrl,
      chartType: savedReport.chartType,
      stats: savedReport.stats,
      data: savedReport.data,
      createdAt: savedReport.createdAt.toISOString(),
      generatedBy: authResult.user.email || null
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

interface ReportStat {
  id: string
  label: string
  value: string
  change: number | null
  change_label: string | null
}

interface ReportDataPoint {
  id: string
  label: string
  value: number
  category: string | null
}

interface ReportData {
  chartType: string
  stats: ReportStat[]
  data: ReportDataPoint[]
}

function getDateRange(period: string, startDate: string | null, endDate: string | null): { start: Date | null; end: Date | null } {
  const now = new Date()

  if (period === 'CUSTOM' && startDate && endDate) {
    return { start: new Date(startDate), end: new Date(endDate) }
  }

  switch (period) {
    case 'TODAY':
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      return { start: todayStart, end: now }
    case 'THIS_WEEK':
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - now.getDay())
      weekStart.setHours(0, 0, 0, 0)
      return { start: weekStart, end: now }
    case 'THIS_MONTH':
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      return { start: monthStart, end: now }
    case 'THIS_QUARTER':
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3
      const quarterStart = new Date(now.getFullYear(), quarterMonth, 1)
      return { start: quarterStart, end: now }
    case 'THIS_YEAR':
      const yearStart = new Date(now.getFullYear(), 0, 1)
      return { start: yearStart, end: now }
    case 'LAST_WEEK':
      const lastWeekEnd = new Date(now)
      lastWeekEnd.setDate(now.getDate() - now.getDay() - 1)
      lastWeekEnd.setHours(23, 59, 59, 999)
      const lastWeekStart = new Date(lastWeekEnd)
      lastWeekStart.setDate(lastWeekEnd.getDate() - 6)
      lastWeekStart.setHours(0, 0, 0, 0)
      return { start: lastWeekStart, end: lastWeekEnd }
    case 'LAST_MONTH':
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      return { start: lastMonthStart, end: lastMonthEnd }
    case 'LAST_QUARTER':
      const currentQuarter = Math.floor(now.getMonth() / 3)
      const lastQuarterEnd = new Date(now.getFullYear(), currentQuarter * 3, 0)
      const lastQuarterStart = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1)
      return { start: lastQuarterStart, end: lastQuarterEnd }
    default:
      return { start: null, end: null }
  }
}

function getReportName(type: string): string {
  const names: Record<string, string> = {
    'SAFETY': 'Safety Report',
    'SAFETY_MEETINGS': 'Safety Meetings Report',
    'LABOR': 'Labor Productivity Report',
    'EQUIPMENT': 'Equipment Utilization Report',
    'FINANCIAL': 'Financial Report',
    'PROJECT': 'Project Status Report',
    'DAILY_LOG': 'Daily Log Summary'
  }
  return names[type] || 'Report'
}

function getReportDescription(type: string, period: string): string {
  const typeDesc: Record<string, string> = {
    'SAFETY': 'Safety incidents, inspections, and meetings overview',
    'SAFETY_MEETINGS': 'Summary of safety meetings and attendance',
    'LABOR': 'Labor hours and productivity metrics',
    'EQUIPMENT': 'Equipment usage and maintenance status',
    'FINANCIAL': 'Budget, expenses, and financial health',
    'PROJECT': 'Project progress and milestone tracking',
    'DAILY_LOG': 'Summary of daily log entries'
  }
  const periodDesc: Record<string, string> = {
    'TODAY': 'today',
    'THIS_WEEK': 'this week',
    'THIS_MONTH': 'this month',
    'THIS_QUARTER': 'this quarter',
    'THIS_YEAR': 'this year',
    'LAST_WEEK': 'last week',
    'LAST_MONTH': 'last month',
    'LAST_QUARTER': 'last quarter',
    'CUSTOM': 'custom date range'
  }
  return `${typeDesc[type] || 'Report data'} for ${periodDesc[period] || 'selected period'}`
}

async function generateSafetyReport(projectId: string | null, dateFilter: Record<string, unknown>): Promise<ReportData> {
  const [incidents, inspections, meetings] = await Promise.all([
    prisma.incidentReport.findMany({
      where: {
        ...(projectId ? { projectId } : {}),
        ...(Object.keys(dateFilter).length ? { incidentDate: dateFilter } : {})
      }
    }),
    prisma.inspection.findMany({
      where: {
        ...(projectId ? { projectId } : {}),
        ...(Object.keys(dateFilter).length ? { date: dateFilter } : {})
      }
    }),
    prisma.safetyMeeting.findMany({
      where: {
        ...(projectId ? { projectId } : {}),
        ...(Object.keys(dateFilter).length ? { date: dateFilter } : {})
      }
    })
  ])

  const totalAttendees = meetings.reduce((sum, m) => {
    return sum + (Array.isArray(m.attendees) ? m.attendees.length : 0)
  }, 0)

  const stats: ReportStat[] = [
    { id: 'stat-1', label: 'Total Incidents', value: incidents.length.toString(), change: null, change_label: null },
    { id: 'stat-2', label: 'Inspections', value: inspections.length.toString(), change: null, change_label: null },
    { id: 'stat-3', label: 'Safety Meetings', value: meetings.length.toString(), change: null, change_label: null },
    { id: 'stat-4', label: 'Total Attendees', value: totalAttendees.toString(), change: null, change_label: null }
  ]

  // Group incidents by type
  const incidentsByType: Record<string, number> = {}
  incidents.forEach(i => {
    incidentsByType[i.incidentType] = (incidentsByType[i.incidentType] || 0) + 1
  })

  const data: ReportDataPoint[] = Object.entries(incidentsByType).map(([type, count], idx) => ({
    id: `data-${idx}`,
    label: type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
    value: count,
    category: 'Incidents'
  }))

  // Add meeting data
  data.push({
    id: `data-meetings`,
    label: 'Safety Meetings',
    value: meetings.length,
    category: 'Meetings'
  })

  return { chartType: 'BAR', stats, data }
}

async function generateLaborReport(projectId: string | null, dateFilter: Record<string, unknown>): Promise<ReportData> {
  const timeEntries = await prisma.timeEntry.findMany({
    where: {
      ...(projectId ? { projectId } : {}),
      clockOut: { not: null },
      ...(Object.keys(dateFilter).length ? { clockIn: dateFilter } : {})
    },
    include: {
      user: { select: { name: true } },
      project: { select: { name: true } }
    }
  })

  let totalHours = 0
  const projectHours: Record<string, { name: string; hours: number }> = {}

  timeEntries.forEach(entry => {
    if (!entry.clockOut) return
    const hours = (new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / (1000 * 60 * 60)
    totalHours += hours

    if (!projectHours[entry.projectId]) {
      projectHours[entry.projectId] = { name: entry.project.name, hours: 0 }
    }
    projectHours[entry.projectId].hours += hours
  })

  const uniqueWorkers = new Set(timeEntries.map(e => e.userId)).size

  const stats: ReportStat[] = [
    { id: 'stat-1', label: 'Total Hours', value: totalHours.toFixed(1), change: null, change_label: null },
    { id: 'stat-2', label: 'Time Entries', value: timeEntries.length.toString(), change: null, change_label: null },
    { id: 'stat-3', label: 'Workers', value: uniqueWorkers.toString(), change: null, change_label: null },
    { id: 'stat-4', label: 'Avg Hours/Entry', value: timeEntries.length > 0 ? (totalHours / timeEntries.length).toFixed(1) : '0', change: null, change_label: null }
  ]

  const data: ReportDataPoint[] = Object.entries(projectHours)
    .sort((a, b) => b[1].hours - a[1].hours)
    .slice(0, 10)
    .map(([id, proj], idx) => ({
      id: `data-${idx}`,
      label: proj.name,
      value: Math.round(proj.hours * 10) / 10,
      category: 'Hours by Project'
    }))

  return { chartType: 'BAR', stats, data }
}

async function generateEquipmentReport(projectId: string | null, dateFilter: Record<string, unknown>): Promise<ReportData> {
  const equipment = await prisma.equipment.findMany({
    include: {
      logs: {
        where: Object.keys(dateFilter).length ? { date: dateFilter } : {}
      },
      assignments: projectId ? {
        where: { projectId }
      } : true
    }
  })

  const available = equipment.filter(e => e.status === 'AVAILABLE').length
  const inUse = equipment.filter(e => e.status === 'IN_USE').length
  const maintenance = equipment.filter(e => e.status === 'MAINTENANCE').length

  const totalHours = equipment.reduce((sum, eq) =>
    sum + eq.logs.reduce((s, log) => s + (log.hoursUsed || 0), 0), 0)

  const stats: ReportStat[] = [
    { id: 'stat-1', label: 'Total Equipment', value: equipment.length.toString(), change: null, change_label: null },
    { id: 'stat-2', label: 'Available', value: available.toString(), change: null, change_label: null },
    { id: 'stat-3', label: 'In Use', value: inUse.toString(), change: null, change_label: null },
    { id: 'stat-4', label: 'Total Hours', value: totalHours.toFixed(0), change: null, change_label: null }
  ]

  const data: ReportDataPoint[] = [
    { id: 'data-1', label: 'Available', value: available, category: 'Status' },
    { id: 'data-2', label: 'In Use', value: inUse, category: 'Status' },
    { id: 'data-3', label: 'Maintenance', value: maintenance, category: 'Status' }
  ]

  return { chartType: 'PIE', stats, data }
}

async function generateFinancialReport(projectId: string | null, dateFilter: Record<string, unknown>): Promise<ReportData> {
  const [projects, expenses, invoices] = await Promise.all([
    prisma.project.findMany({
      where: projectId ? { id: projectId } : { status: 'ACTIVE' },
      include: { budget: true }
    }),
    prisma.expense.findMany({
      where: {
        ...(projectId ? { projectId } : {}),
        ...(Object.keys(dateFilter).length ? { date: dateFilter } : {})
      }
    }),
    prisma.invoice.findMany({
      where: {
        ...(projectId ? { projectId } : {}),
        ...(Object.keys(dateFilter).length ? { issueDate: dateFilter } : {})
      }
    })
  ])

  const totalBudget = projects.reduce((sum, p) => sum + (p.budget?.totalBudget || 0), 0)
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  const totalInvoiced = invoices.reduce((sum, i) => sum + i.totalAmount, 0)
  const paidInvoices = invoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + i.totalAmount, 0)

  const stats: ReportStat[] = [
    { id: 'stat-1', label: 'Total Budget', value: `$${(totalBudget / 1000000).toFixed(2)}M`, change: null, change_label: null },
    { id: 'stat-2', label: 'Total Expenses', value: `$${(totalExpenses / 1000).toFixed(0)}K`, change: null, change_label: null },
    { id: 'stat-3', label: 'Invoiced', value: `$${(totalInvoiced / 1000).toFixed(0)}K`, change: null, change_label: null },
    { id: 'stat-4', label: 'Collected', value: `$${(paidInvoices / 1000).toFixed(0)}K`, change: null, change_label: null }
  ]

  const data: ReportDataPoint[] = [
    { id: 'data-1', label: 'Budget', value: totalBudget, category: 'Financial' },
    { id: 'data-2', label: 'Expenses', value: totalExpenses, category: 'Financial' },
    { id: 'data-3', label: 'Invoiced', value: totalInvoiced, category: 'Financial' },
    { id: 'data-4', label: 'Collected', value: paidInvoices, category: 'Financial' }
  ]

  return { chartType: 'BAR', stats, data }
}

async function generateProjectReport(projectId: string | null, dateFilter: Record<string, unknown>): Promise<ReportData> {
  const projects = await prisma.project.findMany({
    where: projectId ? { id: projectId } : {},
    include: {
      _count: {
        select: {
          dailyLogs: true,
          timeEntries: true,
          incidents: true,
          punchLists: true
        }
      }
    }
  })

  const active = projects.filter(p => p.status === 'ACTIVE').length
  const completed = projects.filter(p => p.status === 'COMPLETED').length
  const onHold = projects.filter(p => p.status === 'ON_HOLD').length

  const stats: ReportStat[] = [
    { id: 'stat-1', label: 'Total Projects', value: projects.length.toString(), change: null, change_label: null },
    { id: 'stat-2', label: 'Active', value: active.toString(), change: null, change_label: null },
    { id: 'stat-3', label: 'Completed', value: completed.toString(), change: null, change_label: null },
    { id: 'stat-4', label: 'On Hold', value: onHold.toString(), change: null, change_label: null }
  ]

  const data: ReportDataPoint[] = [
    { id: 'data-1', label: 'Active', value: active, category: 'Status' },
    { id: 'data-2', label: 'Completed', value: completed, category: 'Status' },
    { id: 'data-3', label: 'On Hold', value: onHold, category: 'Status' }
  ]

  return { chartType: 'PIE', stats, data }
}

async function generateDailyLogReport(projectId: string | null, dateFilter: Record<string, unknown>): Promise<ReportData> {
  const dailyLogs = await prisma.dailyLog.findMany({
    where: {
      ...(projectId ? { projectId } : {}),
      ...(Object.keys(dateFilter).length ? { date: dateFilter } : {})
    },
    include: {
      project: { select: { name: true } }
    }
  })

  const weatherDelays = dailyLogs.filter(l => l.weatherDelay).length
  const uniqueProjects = new Set(dailyLogs.map(l => l.projectId)).size

  // Group by project
  const logsByProject: Record<string, { name: string; count: number }> = {}
  dailyLogs.forEach(log => {
    if (!logsByProject[log.projectId]) {
      logsByProject[log.projectId] = { name: log.project.name, count: 0 }
    }
    logsByProject[log.projectId].count++
  })

  const stats: ReportStat[] = [
    { id: 'stat-1', label: 'Total Logs', value: dailyLogs.length.toString(), change: null, change_label: null },
    { id: 'stat-2', label: 'Projects', value: uniqueProjects.toString(), change: null, change_label: null },
    { id: 'stat-3', label: 'Weather Delays', value: weatherDelays.toString(), change: null, change_label: null },
    { id: 'stat-4', label: 'Avg/Project', value: uniqueProjects > 0 ? (dailyLogs.length / uniqueProjects).toFixed(1) : '0', change: null, change_label: null }
  ]

  const data: ReportDataPoint[] = Object.entries(logsByProject)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([id, proj], idx) => ({
      id: `data-${idx}`,
      label: proj.name,
      value: proj.count,
      category: 'Daily Logs'
    }))

  return { chartType: 'BAR', stats, data }
}
