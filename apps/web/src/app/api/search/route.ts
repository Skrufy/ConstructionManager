import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Valid search categories for filtering (dailylogs is normalized to 'logs')
const VALID_CATEGORIES = ['projects', 'logs', 'users', 'equipment', 'documents', 'safety', 'subcontractors'] as const
type SearchCategory = typeof VALID_CATEGORIES[number]

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim()
    // Support iOS 'types' parameter (comma-separated list of categories)
    const typesParam = searchParams.get('types')?.toLowerCase()
    // Support project filtering
    const projectId = searchParams.get('projectId') || searchParams.get('project_id')

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] })
    }

    // Parse types into array of categories (iOS sends comma-separated)
    const typesArray = typesParam?.split(',').map(t => t.trim()).filter(Boolean) || []

    // Normalize category aliases (handle dailylogs -> logs mapping)
    const normalizedCategory = searchParams.get('category')?.toLowerCase()
    let category: SearchCategory | undefined = normalizedCategory === 'dailylogs'
      ? 'logs'
      : (VALID_CATEGORIES.includes(normalizedCategory as SearchCategory) ? normalizedCategory as SearchCategory : undefined)

    // If types provided but no category, use first type as category filter
    if (!category && typesArray.length > 0) {
      // Map iOS type names to our categories
      const typeMap: Record<string, SearchCategory> = {
        'project': 'projects',
        'projects': 'projects',
        'dailylog': 'logs',
        'dailylogs': 'logs',
        'daily-log': 'logs',
        'log': 'logs',
        'logs': 'logs',
        'user': 'users',
        'users': 'users',
        'equipment': 'equipment',
        'document': 'documents',
        'documents': 'documents',
        'safety': 'safety',
        'subcontractor': 'subcontractors',
        'subcontractors': 'subcontractors',
      }
      // Use first matching type as category
      for (const t of typesArray) {
        if (typeMap[t]) {
          category = typeMap[t]
          break
        }
      }
    }

    const isAdmin = user.role === 'ADMIN'
    const userId = user.id

    // Determine which categories to search based on filter
    const searchProjects = !category || category === 'projects'
    const searchLogs = !category || category === 'logs'
    const searchUsers = !category || category === 'users'
    const searchEquipment = !category || category === 'equipment'
    const searchDocuments = !category || category === 'documents'
    const searchSafety = !category || category === 'safety'
    const searchSubcontractors = !category || category === 'subcontractors'

    // Increase limit when filtering by category
    const resultLimit = category ? 15 : 5

    // Search projects with PostgreSQL case-insensitive search
    let projects: Array<{ id: string; name: string; address: string | null; status: string }> = []
    if (searchProjects) {
      const projectWhere: Record<string, unknown> = {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { address: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      }

      // Filter by specific project if provided
      if (projectId) {
        projectWhere.id = projectId
      }

      // Non-admins can only see assigned projects
      if (!isAdmin) {
        projectWhere.assignments = {
          some: { userId },
        }
      }

      projects = await prisma.project.findMany({
        where: projectWhere,
        select: {
          id: true,
          name: true,
          address: true,
          status: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: resultLimit,
      })
    }

    // Search daily logs with PostgreSQL case-insensitive search
    let dailyLogs: Array<{ id: string; date: Date; notes: string | null; project: { name: string } | null }> = []
    if (searchLogs) {
      const logWhere: Record<string, unknown> = {
        OR: [
          { notes: { contains: query, mode: 'insensitive' } },
          { project: { name: { contains: query, mode: 'insensitive' } } },
        ],
      }

      // Filter by specific project if provided
      if (projectId) {
        logWhere.projectId = projectId
      }

      if (!isAdmin) {
        logWhere.AND = [
          {
            OR: [
              { submittedBy: userId },
              {
                project: {
                  assignments: {
                    some: { userId },
                  },
                },
              },
            ],
          },
        ]
      }

      dailyLogs = await prisma.dailyLog.findMany({
        where: logWhere,
        select: {
          id: true,
          date: true,
          notes: true,
          project: {
            select: { name: true },
          },
        },
        orderBy: { date: 'desc' },
        take: resultLimit,
      })
    }

    // Search users (admin only) with PostgreSQL case-insensitive search
    let users: Array<{ id: string; name: string; email: string; role: string }> = []
    if (searchUsers && isAdmin) {
      users = await prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
        orderBy: { name: 'asc' },
        take: resultLimit,
      })
    }

    // Search equipment
    let equipment: Array<{ id: string; name: string; type: string; status: string }> = []
    if (searchEquipment) {
      equipment = await prisma.equipment.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { type: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
        },
        orderBy: { name: 'asc' },
        take: resultLimit,
      })
    }

    // Search files/documents
    let documents: Array<{ id: string; name: string; category: string | null; project: { name: string } | null }> = []
    if (searchDocuments) {
      const documentWhere: Record<string, unknown> = {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { category: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      }

      // Filter by specific project if provided
      if (projectId) {
        documentWhere.projectId = projectId
      }

      documents = await prisma.file.findMany({
        where: documentWhere,
        select: {
          id: true,
          name: true,
          category: true,
          project: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: resultLimit,
      })
    }

    // Search safety incidents
    let safetyItems: Array<{ id: string; incidentType: string; status: string; project: { name: string } | null }> = []
    if (searchSafety) {
      const safetyWhere: Record<string, unknown> = {
        OR: [
          { incidentType: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { location: { contains: query, mode: 'insensitive' } },
          { project: { name: { contains: query, mode: 'insensitive' } } },
        ],
      }

      // Filter by specific project if provided
      if (projectId) {
        safetyWhere.projectId = projectId
      }

      safetyItems = await prisma.incidentReport.findMany({
        where: safetyWhere,
        select: {
          id: true,
          incidentType: true,
          status: true,
          project: {
            select: { name: true },
          },
        },
        orderBy: { incidentDate: 'desc' },
        take: resultLimit,
      })
    }

    // Search subcontractors
    let subcontractors: Array<{ id: string; companyName: string; contactName: string | null }> = []
    if (searchSubcontractors) {
      subcontractors = await prisma.subcontractor.findMany({
        where: {
          OR: [
            { companyName: { contains: query, mode: 'insensitive' } },
            { contactName: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          companyName: true,
          contactName: true,
        },
        orderBy: { companyName: 'asc' },
        take: resultLimit,
      })
    }

    // Format results
    const results = [
      ...projects.map((p) => ({
        type: 'project' as const,
        id: p.id,
        title: p.name,
        subtitle: p.address || p.status,
      })),
      ...dailyLogs.map((l) => ({
        type: 'daily-log' as const,
        id: l.id,
        title: l.notes?.slice(0, 50) || `Log from ${new Date(l.date).toLocaleDateString()}`,
        subtitle: l.project?.name,
      })),
      ...users.map((u) => ({
        type: 'user' as const,
        id: u.id,
        title: u.name,
        subtitle: u.role.replace('_', ' '),
      })),
      ...equipment.map((e) => ({
        type: 'equipment' as const,
        id: e.id,
        title: e.name,
        subtitle: e.type || e.status,
      })),
      ...documents.map((d) => ({
        type: 'document' as const,
        id: d.id,
        title: d.name,
        subtitle: d.project?.name || d.category || 'Document',
      })),
      ...safetyItems.map((s) => ({
        type: 'safety' as const,
        id: s.id,
        title: s.incidentType.replace('_', ' '),
        subtitle: s.project?.name || s.status,
      })),
      ...subcontractors.map((s) => ({
        type: 'subcontractor' as const,
        id: s.id,
        title: s.companyName,
        subtitle: s.contactName || 'Subcontractor',
      })),
    ]

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
