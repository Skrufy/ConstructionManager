import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Helper to transform project to snake_case format for iOS
function transformProject(project: {
  id: string
  name: string
  address: string | null
  description: string | null
  gpsLatitude: number | null
  gpsLongitude: number | null
  startDate: Date | null
  endDate: Date | null
  status: string
  visibilityMode: string
  clientId: string | null
  createdAt: Date
  updatedAt: Date
  client?: { id: string; companyName: string; contactName: string | null } | null
  assignments?: Array<{ user: { id: string; name: string; email: string; role: string } }>
  _count?: { assignments: number; dailyLogs: number; timeEntries: number; files: number }
}, drawingCount: number = 0) {
  // Calculate document count (files minus drawings)
  const totalFiles = project._count?.files ?? 0
  const documentCount = Math.max(0, totalFiles - drawingCount)

  return {
    id: project.id,
    name: project.name,
    address: project.address ?? '',
    city: '',  // Not in current schema - iOS expects these
    state: '',
    zip_code: '',
    description: project.description,
    gps_latitude: project.gpsLatitude,
    gps_longitude: project.gpsLongitude,
    start_date: project.startDate?.toISOString() ?? null,
    end_date: project.endDate?.toISOString() ?? null,
    estimated_end_date: project.endDate?.toISOString() ?? null,
    actual_end_date: null,
    status: project.status,
    type: 'Commercial',  // Default type
    visibility_mode: project.visibilityMode,
    client_id: project.clientId,
    client: project.client ? {
      id: project.client.id,
      company_name: project.client.companyName,
      contact_name: project.client.contactName
    } : null,
    project_manager_id: null,
    superintendent_id: null,
    budget: null,
    image_url: null,
    assignments: project.assignments?.map(a => ({
      user: {
        id: a.user.id,
        name: a.user.name,
        email: a.user.email,
        role: a.user.role
      }
    })) ?? [],
    daily_log_count: project._count?.dailyLogs ?? 0,
    hours_tracked: 0,
    document_count: documentCount,
    drawing_count: drawingCount,
    crew_count: project._count?.assignments ?? 0,
    created_at: project.createdAt.toISOString(),
    updated_at: project.updatedAt.toISOString()
  }
}

const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  address: z.string().optional().nullable(),
  gpsLatitude: z.number().optional().nullable(),
  gpsLongitude: z.number().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']).default('ACTIVE'),
  visibilityMode: z.enum(['ALL', 'ASSIGNED_ONLY']).default('ALL'),
  description: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(), // Associated client
  assignedUserIds: z.array(z.string()).optional(), // Users to assign to this project
})

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const includeAssignments = searchParams.get('includeAssignments') === 'true'
    const pageParam = searchParams.get('page')
    const pageSizeParam = searchParams.get('pageSize')
    const page = Math.max(1, Number.parseInt(pageParam || '1', 10) || 1)
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(pageSizeParam || '25', 10) || 25))
    const skip = (page - 1) * pageSize

    const where: any = {}
    if (status) {
      where.status = status
    }
    if (search) {
      where.AND = [
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { address: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { client: { companyName: { contains: search, mode: 'insensitive' } } },
            { client: { contactName: { contains: search, mode: 'insensitive' } } },
          ],
        },
      ]
    }

    // Admins see all projects
    // Non-admins see: projects with visibilityMode='ALL' OR projects they're assigned to
    if (user.role !== 'ADMIN') {
      where.OR = [
        { visibilityMode: 'ALL' },
        {
          assignments: {
            some: {
              userId: user.id,
            },
          },
        },
      ]
    }

    const total = await prisma.project.count({ where })

    // Build include object based on includeAssignments parameter
    const includeConfig: any = {
      client: {
        select: { id: true, companyName: true, contactName: true },
      },
      assignments: includeAssignments ? {
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
          projectTemplate: {
            select: { id: true, name: true },
          },
        },
      } : {
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      },
      _count: {
        select: {
          assignments: true,
          dailyLogs: true,
          timeEntries: true,
          files: true,
        },
      },
    }

    const projects = await prisma.project.findMany({
      where,
      include: includeConfig,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    })

    // Get drawing counts for each project (files with category = 'DRAWINGS')
    const projectIds = projects.map(p => p.id)
    const drawingCounts = await prisma.file.groupBy({
      by: ['projectId'],
      where: {
        projectId: { in: projectIds },
        category: 'DRAWINGS',
      },
      _count: { id: true },
    })

    // Create a map of projectId -> drawingCount
    const drawingCountMap = new Map(
      drawingCounts.map(d => [d.projectId, d._count.id])
    )

    // If includeAssignments is true (for admin permissions page), return raw data
    // Otherwise, transform to snake_case for mobile compatibility
    if (includeAssignments) {
      return NextResponse.json({
        projects: projects.map(p => ({
          id: p.id,
          name: p.name,
          address: p.address,
          description: p.description,
          status: p.status,
          visibilityMode: p.visibilityMode,
          clientId: p.clientId,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          assignments: p.assignments.map((a: any) => ({
            id: a.id,
            userId: a.userId,
            projectTemplateId: a.projectTemplateId,
            user: {
              id: a.user.id,
              name: a.user.name,
              email: a.user.email,
            },
            projectTemplate: a.projectTemplate ? {
              id: a.projectTemplate.id,
              name: a.projectTemplate.name,
            } : null,
          })),
        })),
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      })
    }

    return NextResponse.json({
      projects: projects.map(p => transformProject(p, drawingCountMap.get(p.id) ?? 0)),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Only admins and project managers can create projects
    if (!['ADMIN', 'PROJECT_MANAGER'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const validation = projectSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const data = validation.data

    // Build list of users to assign (always include creator)
    const userIdsToAssign = new Set<string>([user.id])
    if (data.assignedUserIds) {
      data.assignedUserIds.forEach(id => userIdsToAssign.add(id))
    }

    const project = await prisma.project.create({
      data: {
        name: data.name,
        address: data.address,
        gpsLatitude: data.gpsLatitude,
        gpsLongitude: data.gpsLongitude,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        status: data.status,
        visibilityMode: data.visibilityMode,
        description: data.description,
        clientId: data.clientId,
        // Assign all specified users to the project
        assignments: {
          create: Array.from(userIdsToAssign).map(userId => ({
            userId,
          })),
        },
      },
      include: {
        client: {
          select: { id: true, companyName: true, contactName: true },
        },
        assignments: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
      },
    })

    // Revalidate the projects page cache so the new project appears
    revalidatePath('/projects')

    return NextResponse.json({ project: transformProject(project) }, { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}
