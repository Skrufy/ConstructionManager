import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const FINANCIAL_AUTHORIZED_ROLES = ['ADMIN', 'PROJECT_MANAGER', 'OFFICE']

// GET /api/reports/export - Export report data
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'csv' // csv, json
    const type = searchParams.get('type') || 'labor'
    const projectId = searchParams.get('projectId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const columnsParam = searchParams.get('columns')
    const selectedColumns = columnsParam ? columnsParam.split(',').filter(c => c.trim()) : []

    // Check authorization for sensitive report types
    if (type === 'financial' && !FINANCIAL_AUTHORIZED_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions for financial reports' }, { status: 403 })
    }

    let data: unknown[] = []
    let filename = `report-${type}-${new Date().toISOString().split('T')[0]}`

    // Build date filter
    const dateFilter: Record<string, Date> = {}
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

    // Fetch data based on type
    switch (type) {
      case 'labor':
        const timeEntries = await prisma.timeEntry.findMany({
          where: {
            ...(projectId ? { projectId } : {}),
            ...(Object.keys(dateFilter).length ? { clockIn: dateFilter } : {}),
            clockOut: { not: null }
          },
          include: {
            user: { select: { name: true, role: true } },
            project: { select: { name: true } }
          },
          orderBy: { clockIn: 'desc' }
        })

        data = timeEntries.map(entry => ({
          Date: new Date(entry.clockIn).toLocaleDateString(),
          Employee: entry.user.name,
          Role: entry.user.role,
          Project: entry.project.name,
          'Clock In': new Date(entry.clockIn).toLocaleTimeString(),
          'Clock Out': entry.clockOut ? new Date(entry.clockOut).toLocaleTimeString() : '',
          Hours: entry.clockOut
            ? ((new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / (1000 * 60 * 60)).toFixed(2)
            : '',
          Status: entry.status
        }))
        filename = `labor-report-${new Date().toISOString().split('T')[0]}`
        break

      case 'equipment':
        const equipment = await prisma.equipment.findMany({
          include: {
            logs: {
              where: Object.keys(dateFilter).length ? { date: dateFilter } : {},
              orderBy: { date: 'desc' }
            },
            assignments: {
              where: { endDate: null },
              include: { project: { select: { name: true } } }
            }
          }
        })

        data = equipment.map(eq => ({
          Name: eq.name,
          Type: eq.type,
          Status: eq.status,
          'Current Project': eq.assignments[0]?.project.name || 'Unassigned',
          'Total Hours': eq.logs.reduce((sum, log) => sum + (log.hoursUsed || 0), 0).toFixed(1),
          'Total Fuel': eq.logs.reduce((sum, log) => sum + (log.fuelUsed || 0), 0).toFixed(1),
          'Log Count': eq.logs.length
        }))
        filename = `equipment-report-${new Date().toISOString().split('T')[0]}`
        break

      case 'safety':
        const [incidents, inspections, meetings] = await Promise.all([
          prisma.incidentReport.findMany({
            where: {
              ...(projectId ? { projectId } : {}),
              ...(Object.keys(dateFilter).length ? { incidentDate: dateFilter } : {})
            },
            include: {
              project: { select: { name: true } },
              reporter: { select: { name: true } }
            },
            orderBy: { incidentDate: 'desc' }
          }),
          prisma.inspection.findMany({
            where: {
              ...(projectId ? { projectId } : {}),
              ...(Object.keys(dateFilter).length ? { date: dateFilter } : {})
            },
            include: {
              project: { select: { name: true } },
              inspector: { select: { name: true } },
              template: { select: { name: true } }
            },
            orderBy: { date: 'desc' }
          }),
          prisma.safetyMeeting.findMany({
            where: {
              ...(projectId ? { projectId } : {}),
              ...(Object.keys(dateFilter).length ? { date: dateFilter } : {})
            },
            include: {
              project: { select: { name: true } },
              conductor: { select: { name: true } },
              _count: { select: { meetingAttendees: true } }
            },
            orderBy: { date: 'desc' }
          })
        ])

        data = [
          ...incidents.map(inc => ({
            Type: 'Incident',
            Date: new Date(inc.incidentDate).toLocaleDateString(),
            Project: inc.project?.name || 'N/A',
            Category: inc.incidentType,
            Status: inc.status,
            Reporter: inc.reporter.name,
            Description: inc.description?.substring(0, 100) || 'no'
          })),
          ...inspections.map(insp => ({
            Type: 'Inspection',
            Date: new Date(insp.date).toLocaleDateString(),
            Project: insp.project?.name || 'N/A',
            Category: insp.template?.name || 'Unknown',
            Status: insp.overallStatus,
            Reporter: insp.inspector.name,
            Description: insp.notes?.substring(0, 100) || ''
          })),
          ...meetings.map(meeting => ({
            Type: 'Safety Meeting',
            Date: new Date(meeting.date).toLocaleDateString(),
            Project: meeting.project?.name || 'N/A',
            Category: meeting.topic || 'General',
            Status: 'COMPLETED',
            Reporter: meeting.conductor.name,
            Description: `${meeting._count.meetingAttendees} attendees - ${meeting.description?.substring(0, 80) || meeting.topic}`
          }))
        ]
        // Sort all data by date descending
        data.sort((a: any, b: any) => new Date(b.Date).getTime() - new Date(a.Date).getTime())
        filename = `safety-report-${new Date().toISOString().split('T')[0]}`
        break

      case 'financial':
        const [invoices, expenses] = await Promise.all([
          prisma.invoice.findMany({
            where: {
              ...(projectId ? { projectId } : {}),
              ...(Object.keys(dateFilter).length ? { invoiceDate: dateFilter } : {})
            },
            include: { project: { select: { name: true } } },
            orderBy: { invoiceDate: 'desc' }
          }),
          prisma.expense.findMany({
            where: {
              ...(projectId ? { projectId } : {}),
              ...(Object.keys(dateFilter).length ? { date: dateFilter } : {})
            },
            include: { project: { select: { name: true } } },
            orderBy: { date: 'desc' }
          })
        ])

        data = [
          ...invoices.map(inv => ({
            Type: 'Invoice',
            Date: new Date(inv.invoiceDate).toLocaleDateString(),
            Project: inv.project.name,
            Vendor: inv.vendorName,
            Category: inv.category,
            Amount: inv.totalAmount.toFixed(2),
            Status: inv.status,
            Number: inv.invoiceNumber
          })),
          ...expenses.map(exp => ({
            Type: 'Expense',
            Date: new Date(exp.date).toLocaleDateString(),
            Project: exp.project.name,
            Vendor: exp.vendor || '',
            Category: exp.category,
            Amount: exp.amount.toFixed(2),
            Status: exp.status,
            Number: ''
          }))
        ]
        filename = `financial-report-${new Date().toISOString().split('T')[0]}`
        break

      case 'weather-delays':
        const weatherDelays = await prisma.dailyLog.findMany({
          where: {
            weatherDelay: true,
            ...(projectId ? { projectId } : {}),
            ...(Object.keys(dateFilter).length ? { date: dateFilter } : {})
          },
          include: {
            project: { select: { name: true } },
            submitter: { select: { name: true } }
          },
          orderBy: { date: 'desc' }
        })

        data = weatherDelays.map(log => {
          const weatherData = log.weatherData as { weather?: string; temperatureLow?: number; temperatureHigh?: number } | null
          return {
            Date: new Date(log.date).toLocaleDateString(),
            Project: log.project.name,
            'Reported By': log.submitter.name,
            Weather: weatherData?.weather || '',
            'Weather Delay Notes': log.weatherDelayNotes || '',
            'General Notes': log.notes || '',
            Temperature: weatherData?.temperatureHigh ? `${weatherData.temperatureLow || 'N/A'} - ${weatherData.temperatureHigh}°F` : ''
          }
        })
        filename = `weather-delays-report-${new Date().toISOString().split('T')[0]}`
        break

      case 'projects':
        const projects = await prisma.project.findMany({
          where: projectId ? { id: projectId } : {},
          include: {
            _count: {
              select: {
                dailyLogs: true,
                timeEntries: true,
                files: true
              }
            },
            budget: true
          }
        })

        data = projects.map(proj => ({
          Name: proj.name,
          Status: proj.status,
          'Start Date': proj.startDate ? new Date(proj.startDate).toLocaleDateString() : '',
          'End Date': proj.endDate ? new Date(proj.endDate).toLocaleDateString() : '',
          Address: proj.address || '',
          Budget: proj.budget?.totalBudget.toFixed(2) || '0.00',
          'Daily Logs': proj._count.dailyLogs,
          'Time Entries': proj._count.timeEntries,
          Files: proj._count.files
        }))
        filename = `projects-report-${new Date().toISOString().split('T')[0]}`
        break

      case 'safety-incidents':
        const incidentsOnly = await prisma.incidentReport.findMany({
          where: {
            ...(projectId ? { projectId } : {}),
            ...(Object.keys(dateFilter).length ? { incidentDate: dateFilter } : {})
          },
          include: {
            project: { select: { name: true } },
            reporter: { select: { name: true } }
          },
          orderBy: { incidentDate: 'desc' }
        })

        data = incidentsOnly.map(inc => ({
          Date: new Date(inc.incidentDate).toLocaleDateString(),
          Project: inc.project.name,
          Type: inc.incidentType,
          Severity: inc.severity,
          Status: inc.status,
          Location: inc.location || '',
          Reporter: inc.reporter.name,
          Description: inc.description || ''
        }))
        filename = `safety-incidents-report-${new Date().toISOString().split('T')[0]}`
        break

      case 'safety-inspections':
        const inspectionsOnly = await prisma.inspection.findMany({
          where: {
            ...(projectId ? { projectId } : {}),
            ...(Object.keys(dateFilter).length ? { date: dateFilter } : {})
          },
          include: {
            project: { select: { name: true } },
            inspector: { select: { name: true } },
            template: { select: { name: true, category: true } }
          },
          orderBy: { date: 'desc' }
        })

        data = inspectionsOnly.map(insp => ({
          Date: new Date(insp.date).toLocaleDateString(),
          Project: insp.project.name,
          Template: insp.template?.name || 'Unknown',
          Category: insp.template?.category || 'Other',
          Status: insp.overallStatus,
          Inspector: insp.inspector.name,
          Notes: insp.notes || ''
        }))
        filename = `safety-inspections-report-${new Date().toISOString().split('T')[0]}`
        break

      case 'safety-meetings':
        const meetingsOnly = await prisma.safetyMeeting.findMany({
          where: {
            ...(projectId ? { projectId } : {}),
            ...(Object.keys(dateFilter).length ? { date: dateFilter } : {})
          },
          include: { project: { select: { name: true } } },
          orderBy: { date: 'desc' }
        })

        data = meetingsOnly.map(meet => ({
          Date: new Date(meet.date).toLocaleDateString(),
          Project: meet.project?.name || 'General',
          Topic: meet.topic || '',
          Duration: meet.duration ? `${meet.duration} min` : '',
          Attendees: Array.isArray(meet.attendees) ? meet.attendees.length : 0,
          Location: meet.location || '',
          Notes: meet.notes || ''
        }))
        filename = `safety-meetings-report-${new Date().toISOString().split('T')[0]}`
        break

      case 'daily-logs':
        const dailyLogsExport = await prisma.dailyLog.findMany({
          where: {
            ...(projectId ? { projectId } : {}),
            ...(Object.keys(dateFilter).length ? { date: dateFilter } : {})
          },
          include: {
            project: { select: { name: true } },
            submitter: { select: { name: true } }
          },
          orderBy: { date: 'desc' }
        })

        data = dailyLogsExport.map(log => ({
          Date: new Date(log.date).toLocaleDateString(),
          Project: log.project.name,
          Status: log.status,
          'Submitted By': log.submitter.name,
          'Total Hours': log.totalHours || 0,
          'Crew Count': log.crewCount || 0,
          'Weather Delay': log.weatherDelay ? 'Yes' : 'No',
          Notes: log.notes || ''
        }))
        filename = `daily-logs-report-${new Date().toISOString().split('T')[0]}`
        break
    }

    // Filter data based on selected columns
    if (selectedColumns.length > 0 && data.length > 0) {
      data = data.map(row => {
        const filteredRow: Record<string, unknown> = {}
        const rowRecord = row as Record<string, unknown>
        selectedColumns.forEach(col => {
          if (col in rowRecord) {
            filteredRow[col] = rowRecord[col]
          }
        })
        return filteredRow
      })
    }

    // Format response
    if (format === 'csv') {
      if (data.length === 0) {
        return new Response('No data available', {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${filename}.csv"`
          }
        })
      }

      const headers = Object.keys(data[0] as Record<string, unknown>)
      const csvRows = [
        headers.join(','),
        ...data.map(row =>
          headers.map(header => {
            const value = (row as Record<string, unknown>)[header]
            // Escape quotes and wrap in quotes if contains comma
            const stringValue = String(value || '')
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
              return `"${stringValue.replace(/"/g, '""')}"`
            }
            return stringValue
          }).join(',')
        )
      ]

      return new Response(csvRows.join('\n'), {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}.csv"`
        }
      })
    }

    // JSON format
    return NextResponse.json({
      filename: `${filename}.json`,
      data,
      exportedAt: new Date().toISOString(),
      recordCount: data.length
    })
  } catch (error) {
    console.error('Error exporting report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
