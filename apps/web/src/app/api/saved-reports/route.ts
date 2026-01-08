import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/saved-reports - Get saved reports
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    const where: Record<string, unknown> = {
      OR: [
        { createdBy: user.id },
        { isPublic: true }
      ]
    }

    if (type) where.reportType = type

    const reports = await prisma.savedReport.findMany({
      where,
      include: {
        creator: { select: { id: true, name: true } }
      },
      orderBy: { updatedAt: 'desc' }
    })

    return NextResponse.json(reports)
  } catch (error) {
    console.error('Error fetching saved reports:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/saved-reports - Create saved report
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const body = await request.json()
    const {
      name,
      description,
      reportType,
      filters,
      columns,
      groupBy,
      sortBy,
      sortOrder,
      chartType,
      isPublic
    } = body

    if (!name || !reportType || !filters) {
      return NextResponse.json({ error: 'Name, report type, and filters are required' }, { status: 400 })
    }

    const report = await prisma.savedReport.create({
      data: {
        name,
        description,
        reportType,
        filters: filters,
        columns: columns || undefined,
        groupBy,
        sortBy,
        sortOrder,
        chartType,
        isPublic: isPublic || false,
        createdBy: user.id
      }
    })

    return NextResponse.json(report, { status: 201 })
  } catch (error) {
    console.error('Error creating saved report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/saved-reports - Update saved report
export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'Report ID is required' }, { status: 400 })
    }

    // Check ownership
    const existing = await prisma.savedReport.findUnique({
      where: { id }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    if (existing.createdBy !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const report = await prisma.savedReport.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        reportType: data.reportType,
        filters: data.filters || undefined,
        columns: data.columns || undefined,
        groupBy: data.groupBy,
        sortBy: data.sortBy,
        sortOrder: data.sortOrder,
        chartType: data.chartType,
        isPublic: data.isPublic
      }
    })

    return NextResponse.json(report)
  } catch (error) {
    console.error('Error updating saved report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/saved-reports - Delete saved report
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Report ID is required' }, { status: 400 })
    }

    // Check ownership
    const existing = await prisma.savedReport.findUnique({
      where: { id }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    if (existing.createdBy !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.savedReport.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting saved report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
