import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/reports - Get report data
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') || 'overview'
    const projectId = searchParams.get('projectId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const dateFilter: Record<string, unknown> = {}
    if (startDate) {
      // Parse as local date at start of day
      const [year, month, day] = startDate.split('-').map(Number)
      dateFilter.gte = new Date(year, month - 1, day, 0, 0, 0, 0)
    }
    if (endDate) {
      // Parse as local date at end of day
      const [year, month, day] = endDate.split('-').map(Number)
      dateFilter.lte = new Date(year, month - 1, day, 23, 59, 59, 999)
    }

    // Check if user can see all projects or just assigned ones
    const userRole = user.role
    const canSeeAllProjects = ['ADMIN', 'PROJECT_MANAGER'].includes(userRole)

    // Get user's assigned projects if they can't see all projects
    let assignedProjectIds: string[] | null = null
    let hasLimitedAccess = false
    if (!canSeeAllProjects) {
      const assignments = await prisma.projectAssignment.findMany({
        where: { userId: user.id },
        select: { projectId: true },
      })
      assignedProjectIds = assignments.map(a => a.projectId)
      hasLimitedAccess = true
    }

    // Build project filter to apply to all queries
    const projectFilter: Record<string, unknown> = {}
    if (projectId) {
      // If specific project requested, use it (if user has access)
      if (assignedProjectIds && !assignedProjectIds.includes(projectId)) {
        return NextResponse.json(
          { error: 'You do not have access to this project' },
          { status: 403 }
        )
      }
      projectFilter.id = projectId
    } else if (assignedProjectIds) {
      // If user has limited access, filter by assigned projects
      projectFilter.id = { in: assignedProjectIds }
    }

    // Get total project count for metadata
    const totalProjectsInSystem = hasLimitedAccess
      ? await prisma.project.count({ where: { status: 'ACTIVE' } })
      : null

    // Project Health Overview
    if (reportType === 'project-health') {
      const projects = await prisma.project.findMany({
        where: {
          status: 'ACTIVE',
          ...projectFilter
        },
        include: {
          _count: {
            select: {
              dailyLogs: true,
              timeEntries: true,
              incidents: true,
              punchLists: true
            }
          },
          budget: true,
          invoices: { where: { status: 'PAID' } },
          expenses: { where: { status: 'APPROVED' } }
        }
      })

      const projectHealth = projects.map(project => {
        const totalSpent = (project.invoices?.reduce((sum, i) => sum + i.totalAmount, 0) || 0) +
          (project.expenses?.reduce((sum, e) => sum + e.amount, 0) || 0)
        const budget = project.budget?.totalBudget || 0
        const budgetUsed = budget > 0 ? (totalSpent / budget) * 100 : 0

        return {
          id: project.id,
          name: project.name,
          status: project.status,
          startDate: project.startDate,
          endDate: project.endDate,
          budget,
          totalSpent,
          budgetUsed,
          dailyLogsCount: project._count.dailyLogs,
          timeEntriesCount: project._count.timeEntries,
          incidentsCount: project._count.incidents,
          punchListsCount: project._count.punchLists,
          health: budgetUsed > 100 ? 'CRITICAL' : budgetUsed > 80 ? 'WARNING' : 'GOOD'
        }
      })

      const response: any = { data: projectHealth }
      if (hasLimitedAccess) {
        response.meta = {
          hasLimitedAccess: true,
          accessibleProjects: assignedProjectIds?.length || 0,
          totalProjects: totalProjectsInSystem,
          message: `Showing data for ${assignedProjectIds?.length || 0} of ${totalProjectsInSystem} projects. You only have access to assigned projects.`
        }
      }
      return NextResponse.json(response)
    }

    // Labor Productivity Report
    if (reportType === 'labor-productivity') {
      const timeEntries = await prisma.timeEntry.findMany({
        where: {
          ...(assignedProjectIds ? { projectId: { in: assignedProjectIds } } : projectId ? { projectId } : {}),
          clockOut: { not: null },
          ...(Object.keys(dateFilter).length ? { clockIn: dateFilter } : {})
        },
        include: {
          user: { select: { id: true, name: true, role: true } },
          project: { select: { id: true, name: true } }
        }
      })

      // Calculate hours by user
      const userHours: Record<string, { name: string; role: string; hours: number; entries: number }> = {}
      timeEntries.forEach(entry => {
        if (!entry.clockOut) return
        const hours = (new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / (1000 * 60 * 60)
        if (!userHours[entry.userId]) {
          userHours[entry.userId] = { name: entry.user.name, role: entry.user.role, hours: 0, entries: 0 }
        }
        userHours[entry.userId].hours += hours
        userHours[entry.userId].entries++
      })

      // Calculate hours by project
      const projectHours: Record<string, { name: string; hours: number; entries: number }> = {}
      timeEntries.forEach(entry => {
        if (!entry.clockOut) return
        const hours = (new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / (1000 * 60 * 60)
        if (!projectHours[entry.projectId]) {
          projectHours[entry.projectId] = { name: entry.project.name, hours: 0, entries: 0 }
        }
        projectHours[entry.projectId].hours += hours
        projectHours[entry.projectId].entries++
      })

      // Calculate hours by day of week
      const dayHours: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
      timeEntries.forEach(entry => {
        if (!entry.clockOut) return
        const hours = (new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / (1000 * 60 * 60)
        const day = new Date(entry.clockIn).getDay()
        dayHours[day] += hours
      })

      const totalHours = Object.values(userHours).reduce((sum, u) => sum + u.hours, 0)

      const response: any = {
        data: {
          totalHours,
          totalEntries: timeEntries.length,
          averageHoursPerEntry: timeEntries.length > 0 ? totalHours / timeEntries.length : 0,
          byUser: Object.entries(userHours).map(([id, data]) => ({ id, ...data })).sort((a, b) => b.hours - a.hours),
          byProject: Object.entries(projectHours).map(([id, data]) => ({ id, ...data })).sort((a, b) => b.hours - a.hours),
          byDayOfWeek: dayHours
        }
      }
      if (hasLimitedAccess) {
        response.meta = {
          hasLimitedAccess: true,
          accessibleProjects: assignedProjectIds?.length || 0,
          totalProjects: totalProjectsInSystem,
          message: `Showing data for ${assignedProjectIds?.length || 0} of ${totalProjectsInSystem} projects. You only have access to assigned projects.`
        }
      }
      return NextResponse.json(response)
    }

    // Equipment Utilization Report
    if (reportType === 'equipment-utilization') {
      const equipment = await prisma.equipment.findMany({
        include: {
          logs: {
            where: Object.keys(dateFilter).length ? { date: dateFilter } : {},
            orderBy: { date: 'desc' }
          },
          assignments: {
            include: {
              project: { select: { id: true, name: true } }
            }
          }
        }
      })

      const utilization = equipment.map(eq => {
        const totalHours = eq.logs.reduce((sum, log) => sum + (log.hoursUsed || 0), 0)
        const totalFuel = eq.logs.reduce((sum, log) => sum + (log.fuelUsed || 0), 0)
        const activeAssignments = eq.assignments.filter(a => !a.endDate)

        return {
          id: eq.id,
          name: eq.name,
          type: eq.type,
          status: eq.status,
          totalHours,
          totalFuel,
          logCount: eq.logs.length,
          activeAssignments: activeAssignments.length,
          currentProjects: activeAssignments.map(a => a.project.name)
        }
      })

      const summary = {
        totalEquipment: equipment.length,
        available: equipment.filter(e => e.status === 'AVAILABLE').length,
        inUse: equipment.filter(e => e.status === 'IN_USE').length,
        maintenance: equipment.filter(e => e.status === 'MAINTENANCE').length,
        outOfService: equipment.filter(e => e.status === 'OUT_OF_SERVICE').length,
        totalHours: utilization.reduce((sum, e) => sum + e.totalHours, 0),
        totalFuel: utilization.reduce((sum, e) => sum + e.totalFuel, 0)
      }

      return NextResponse.json({ summary, equipment: utilization })
    }

    // Weather Delays Report
    if (reportType === 'weather-delays') {
      const dailyLogs = await prisma.dailyLog.findMany({
        where: {
          weatherDelay: true,
          ...(assignedProjectIds ? { projectId: { in: assignedProjectIds } } : projectId ? { projectId } : {}),
          ...(Object.keys(dateFilter).length ? { date: dateFilter } : {})
        },
        include: {
          project: { select: { id: true, name: true } },
          submitter: { select: { id: true, name: true } }
        },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }]
      })

      // Group by project
      const byProject: Record<string, { name: string; count: number; days: number }> = {}
      dailyLogs.forEach(log => {
        if (!byProject[log.projectId]) {
          byProject[log.projectId] = { name: log.project.name, count: 0, days: 0 }
        }
        byProject[log.projectId].count++
      })

      // Calculate total delay days estimate (each weather delay log = 1 delay day)
      const totalDelayDays = dailyLogs.length

      const response: any = {
        data: {
          total: dailyLogs.length,
          totalDelayDays,
          byProject: Object.entries(byProject).map(([id, data]) => ({ id, ...data })).sort((a, b) => b.count - a.count),
          recentDelays: dailyLogs.slice(0, 20).map(log => {
            const weatherData = log.weatherData as { weather?: string } | null
            return {
              id: log.id,
              date: log.date,
              projectId: log.projectId,
              projectName: log.project.name,
              authorName: log.submitter.name,
              weatherDelayNotes: log.weatherDelayNotes || null,
              generalNotes: log.notes || null,
              weather: weatherData?.weather || null
            }
          })
        }
      }
      if (hasLimitedAccess) {
        response.meta = {
          hasLimitedAccess: true,
          accessibleProjects: assignedProjectIds?.length || 0,
          totalProjects: totalProjectsInSystem,
          message: `Showing data for ${assignedProjectIds?.length || 0} of ${totalProjectsInSystem} projects. You only have access to assigned projects.`
        }
      }
      return NextResponse.json(response)
    }

    // Safety Incidents Report
    if (reportType === 'safety-incidents') {
      const incidents = await prisma.incidentReport.findMany({
        where: {
          ...(projectId ? { projectId } : {}),
          ...(Object.keys(dateFilter).length ? { incidentDate: dateFilter } : {})
        },
        include: { project: { select: { id: true, name: true } } },
        orderBy: [{ incidentDate: 'desc' }, { createdAt: 'desc' }]
      })

      const byType: Record<string, number> = {}
      const bySeverity: Record<string, number> = {}
      const byStatus: Record<string, number> = {}

      incidents.forEach(i => {
        byType[i.incidentType] = (byType[i.incidentType] || 0) + 1
        bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1
        byStatus[i.status] = (byStatus[i.status] || 0) + 1
      })

      const recentIncidents = incidents.slice(0, 20).map(i => ({
        id: i.id,
        date: i.incidentDate,
        type: i.incidentType,
        severity: i.severity,
        status: i.status,
        location: i.location,
        projectName: i.project?.name || null,
        description: i.description?.slice(0, 200) || null
      }))

      return NextResponse.json({
        total: incidents.length,
        byType,
        bySeverity,
        byStatus,
        openCount: incidents.filter(i => i.status !== 'CLOSED').length,
        recentIncidents
      })
    }

    // Safety Inspections Report
    if (reportType === 'safety-inspections') {
      const inspections = await prisma.inspection.findMany({
        where: {
          ...(projectId ? { projectId } : {}),
          ...(Object.keys(dateFilter).length ? { date: dateFilter } : {})
        },
        include: {
          template: { select: { name: true, category: true } },
          project: { select: { id: true, name: true } }
        },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }]
      })

      const byStatus: Record<string, number> = {}
      const byCategory: Record<string, number> = {}

      inspections.forEach(i => {
        byStatus[i.overallStatus] = (byStatus[i.overallStatus] || 0) + 1
        const category = i.template?.category || 'Other'
        byCategory[category] = (byCategory[category] || 0) + 1
      })

      const recentInspections = inspections.slice(0, 20).map(i => ({
        id: i.id,
        date: i.date,
        templateName: i.template?.name || 'Inspection',
        category: i.template?.category || 'Other',
        status: i.overallStatus,
        projectName: i.project?.name || null
      }))

      return NextResponse.json({
        total: inspections.length,
        byStatus,
        byCategory,
        passRate: inspections.length > 0
          ? (inspections.filter(i => i.overallStatus === 'PASSED').length / inspections.length) * 100
          : 0,
        recentInspections
      })
    }

    // Safety Meetings Report
    if (reportType === 'safety-meetings') {
      const meetings = await prisma.safetyMeeting.findMany({
        where: {
          ...(projectId ? { projectId } : {}),
          ...(Object.keys(dateFilter).length ? { date: dateFilter } : {})
        },
        include: { project: { select: { id: true, name: true } } },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }]
      })

      const byTopic: Record<string, number> = {}
      let totalAttendees = 0

      meetings.forEach(m => {
        const topicKey = m.topic || 'General'
        byTopic[topicKey] = (byTopic[topicKey] || 0) + 1
        totalAttendees += Array.isArray(m.attendees) ? m.attendees.length : 0
      })

      const recentMeetings = meetings.slice(0, 20).map(m => ({
        id: m.id,
        date: m.date,
        topic: m.topic,
        duration: m.duration,
        attendeeCount: Array.isArray(m.attendees) ? m.attendees.length : 0,
        projectName: m.project?.name || null,
        location: m.location
      }))

      return NextResponse.json({
        total: meetings.length,
        totalAttendees,
        byTopic,
        averageAttendance: meetings.length > 0 ? totalAttendees / meetings.length : 0,
        recentMeetings
      })
    }

    // Daily Logs Report
    if (reportType === 'daily-logs') {
      const dailyLogs = await prisma.dailyLog.findMany({
        where: {
          ...(projectId ? { projectId } : {}),
          ...(Object.keys(dateFilter).length ? { date: dateFilter } : {})
        },
        include: {
          project: { select: { id: true, name: true } },
          submitter: { select: { id: true, name: true } },
          entries: true
        },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }]
      })

      // Group by project
      const byProject: Record<string, { name: string; count: number }> = {}
      const byStatus: Record<string, number> = {}
      let totalHours = 0

      dailyLogs.forEach(log => {
        // By project
        if (!byProject[log.projectId]) {
          byProject[log.projectId] = { name: log.project.name, count: 0 }
        }
        byProject[log.projectId].count++

        // By status
        byStatus[log.status] = (byStatus[log.status] || 0) + 1

        // Total hours
        totalHours += log.totalHours || 0

        // Track crew count (note: this counts total across all logs, not unique workers)
        // For unique workers, we'd need to query TimeEntry records
      })

      const recentLogs = dailyLogs.slice(0, 20).map(log => ({
        id: log.id,
        date: log.date,
        projectId: log.projectId,
        projectName: log.project.name,
        submitterName: log.submitter.name,
        status: log.status,
        totalHours: log.totalHours || 0,
        weatherDelay: log.weatherDelay || false
      }))

      return NextResponse.json({
        total: dailyLogs.length,
        byProject: Object.entries(byProject).map(([id, data]) => ({ id, ...data })).sort((a, b) => b.count - a.count),
        byStatus,
        totalHours,
        totalWorkers: 0, // TODO: Calculate from TimeEntry records
        recentLogs
      })
    }

    // Safety Report
    if (reportType === 'safety') {
      const [incidents, inspections, meetings] = await Promise.all([
        prisma.incidentReport.findMany({
          where: {
            ...(projectId ? { projectId } : {}),
            ...(Object.keys(dateFilter).length ? { incidentDate: dateFilter } : {})
          },
          include: { project: { select: { id: true, name: true } } },
          orderBy: [{ incidentDate: 'desc' }, { createdAt: 'desc' }]
        }),
        prisma.inspection.findMany({
          where: {
            ...(projectId ? { projectId } : {}),
            ...(Object.keys(dateFilter).length ? { date: dateFilter } : {})
          },
          include: {
            template: { select: { name: true, category: true } },
            project: { select: { id: true, name: true } }
          },
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }]
        }),
        prisma.safetyMeeting.findMany({
          where: {
            ...(projectId ? { projectId } : {}),
            ...(Object.keys(dateFilter).length ? { date: dateFilter } : {})
          },
          include: { project: { select: { id: true, name: true } } },
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }]
        })
      ])

      // Process incidents
      const incidentsByType: Record<string, number> = {}
      const incidentsBySeverity: Record<string, number> = {}
      incidents.forEach(i => {
        incidentsByType[i.incidentType] = (incidentsByType[i.incidentType] || 0) + 1
        incidentsBySeverity[i.severity] = (incidentsBySeverity[i.severity] || 0) + 1
      })

      // Process inspections
      const inspectionsByStatus: Record<string, number> = {}
      const inspectionsByCategory: Record<string, number> = {}
      inspections.forEach(i => {
        inspectionsByStatus[i.overallStatus] = (inspectionsByStatus[i.overallStatus] || 0) + 1
        const category = i.template?.category || 'Other'
        inspectionsByCategory[category] = (inspectionsByCategory[category] || 0) + 1
      })

      // Process meetings - group by topic since meetingType doesn't exist in schema
      const meetingsByTopic: Record<string, number> = {}
      let totalAttendees = 0
      meetings.forEach(m => {
        // Use topic name or 'General' as grouping key
        const topicKey = m.topic || 'General'
        meetingsByTopic[topicKey] = (meetingsByTopic[topicKey] || 0) + 1
        totalAttendees += Array.isArray(m.attendees) ? m.attendees.length : 0
      })

      // Recent items for detailed view
      const recentIncidents = incidents.slice(0, 10).map(i => ({
        id: i.id,
        date: i.incidentDate,
        type: i.incidentType,
        severity: i.severity,
        status: i.status,
        location: i.location,
        projectName: i.project?.name || null,
        description: i.description?.slice(0, 100) || null
      }))

      const recentInspections = inspections.slice(0, 10).map(i => ({
        id: i.id,
        date: i.date,
        templateName: i.template?.name || 'Inspection',
        category: i.template?.category || 'Other',
        status: i.overallStatus,
        projectName: i.project?.name || null
      }))

      const recentMeetings = meetings.slice(0, 10).map(m => ({
        id: m.id,
        date: m.date,
        topic: m.topic,
        duration: m.duration,
        attendeeCount: Array.isArray(m.attendees) ? m.attendees.length : 0,
        projectName: m.project?.name || null,
        location: m.location
      }))

      return NextResponse.json({
        incidents: {
          total: incidents.length,
          byType: incidentsByType,
          bySeverity: incidentsBySeverity,
          openCount: incidents.filter(i => i.status !== 'CLOSED').length,
          recentIncidents
        },
        inspections: {
          total: inspections.length,
          byStatus: inspectionsByStatus,
          byCategory: inspectionsByCategory,
          passRate: inspections.length > 0
            ? (inspections.filter(i => i.overallStatus === 'PASSED').length / inspections.length) * 100
            : 0,
          recentInspections
        },
        meetings: {
          total: meetings.length,
          totalAttendees,
          byTopic: meetingsByTopic,
          recentMeetings
        }
      })
    }

    // Default overview
    const [projects, timeEntries, dailyLogs, incidents, equipment] = await Promise.all([
      prisma.project.count({ where: { status: 'ACTIVE' } }),
      prisma.timeEntry.count({
        where: Object.keys(dateFilter).length ? { clockIn: dateFilter } : {}
      }),
      prisma.dailyLog.count({
        where: Object.keys(dateFilter).length ? { date: dateFilter } : {}
      }),
      prisma.incidentReport.count({
        where: Object.keys(dateFilter).length ? { incidentDate: dateFilter } : {}
      }),
      prisma.equipment.count()
    ])

    return NextResponse.json({
      activeProjects: projects,
      timeEntries,
      dailyLogs,
      incidents,
      equipment
    })
  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
