import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/documents - Get documents with filtering and revision info
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const { searchParams } = new URL(request.url)
    // Accept both camelCase and snake_case
    const projectId = searchParams.get('projectId') || searchParams.get('project_id')
    const category = searchParams.get('category')
    const type = searchParams.get('type')
    const search = searchParams.get('search')
    const blasterIds = searchParams.get('blasterIds')?.split(',').filter(Boolean) || [] // Multiple blaster IDs
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // Build where clause
    // Show all documents, not just isLatest, since some may not have versions tracked
    // Exclude drawings - they have their own endpoint
    const where: Record<string, unknown> = {
      category: { not: 'DRAWINGS' }
    }

    // Check user permissions
    const isAdmin = user.role === 'ADMIN' || user.role === 'admin'
    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      select: { isBlaster: true }
    })
    const isBlaster = userRecord?.isBlaster || false

    // Filter out admin-only documents for non-admin users
    // NOTE: This applies to BOTH project-specific and company-wide documents
    if (!isAdmin) {
      where.isAdminOnly = false
    }

    // Visibility filtering for BLASTING documents
    // CRITICAL: Only ADMIN and assigned blasters can see BLASTING documents
    // This applies to BOTH project-specific and company-wide BLASTING documents
    // - ADMIN: sees all BLASTING documents (project-specific and company-wide)
    // - Blaster: sees only BLASTING documents they're assigned to (regardless of project)
    // - Non-blaster: cannot see any BLASTING documents
    if (!isAdmin) {
      if (isBlaster) {
        // Blaster can see: non-BLASTING docs OR BLASTING docs they're assigned to
        where.OR = [
          { category: { not: 'BLASTING' } },
          {
            category: 'BLASTING',
            blasterAssignments: {
              some: { blasterId: user.id }
            }
          }
        ]
      } else {
        // Non-blaster: exclude all BLASTING docs
        if (where.category && typeof where.category === 'object' && 'not' in where.category) {
          // Already excluding DRAWINGS, need to exclude BLASTING too
          where.AND = [
            { category: { not: 'DRAWINGS' } },
            { category: { not: 'BLASTING' } }
          ]
          delete where.category
        } else {
          where.category = { not: 'BLASTING' }
        }
      }
    }
    // Admins see everything (no additional filtering)

    if (projectId) where.projectId = projectId
    if (category) where.category = category // This will override the visibility filters if explicitly requested
    if (type) where.type = type
    if (search) {
      const searchConditions = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } }
      ]
      if (where.OR) {
        // Merge with existing OR conditions
        where.AND = [
          ...(Array.isArray(where.AND) ? where.AND : []),
          { OR: where.OR },
          { OR: searchConditions }
        ]
        delete where.OR
      } else {
        where.OR = searchConditions
      }
    }

    // Filter by blaster IDs
    if (blasterIds.length > 0) {
      where.blasterAssignments = {
        some: {
          blasterId: { in: blasterIds }
        }
      }
    }

    const [documents, total] = await Promise.all([
      prisma.file.findMany({
        where,
        include: {
          project: { select: { id: true, name: true, address: true } },
          uploader: { select: { id: true, name: true } },
          blasterAssignments: {
            include: {
              blaster: {
                select: { id: true, name: true, email: true }
              }
            }
          },
          metadata: {
            select: {
              discipline: true,
              drawingNumber: true,
              sheetTitle: true,
              revision: true,
              scale: true,
              building: true,
              floor: true,
              zone: true
            }
          },
          revisions: {
            orderBy: { version: 'desc' },
            take: 5
          },
          _count: {
            select: {
              revisions: true,
              annotations: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.file.count({ where })
    ])

    // Transform documents to include blasters array
    const documentsWithBlasters = documents.map(doc => ({
      ...doc,
      blasters: doc.blasterAssignments.map(assignment => assignment.blaster),
      blasterAssignments: undefined // Remove junction records from response
    }))

    // Get category counts
    const categoryCounts = await prisma.file.groupBy({
      by: ['category'],
      where: { isLatest: true, ...(projectId ? { projectId } : {}) },
      _count: true
    })

    return NextResponse.json({
      documents: documentsWithBlasters,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      categories: categoryCounts.reduce((acc, item) => {
        if (item.category) acc[item.category] = item._count
        return acc
      }, {} as Record<string, number>)
    })
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/documents - Upload new document
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const body = await request.json()
    const {
      projectId,
      name,
      type,
      storagePath,
      category,
      description,
      tags,
      gpsLatitude,
      gpsLongitude,
      isAdminOnly,
      blasterIds = [] // Array of blaster user IDs
    } = body

    if (!projectId || !name || !storagePath) {
      return NextResponse.json(
        { error: 'Project ID, name, and storage path are required' },
        { status: 400 }
      )
    }

    // Validate blaster IDs if provided
    if (blasterIds.length > 0) {
      const validBlasters = await prisma.user.findMany({
        where: {
          id: { in: blasterIds },
          isBlaster: true,
          status: 'ACTIVE'
        }
      })

      if (validBlasters.length !== blasterIds.length) {
        return NextResponse.json(
          { error: 'One or more invalid blaster IDs provided' },
          { status: 400 }
        )
      }
    }

    // Create document
    const document = await prisma.file.create({
      data: {
        projectId,
        name,
        type: type || 'document',
        storagePath,
        uploadedBy: user.id,
        category,
        description,
        tags: tags || undefined,
        gpsLatitude,
        gpsLongitude,
        currentVersion: 1,
        isLatest: true,
        isAdminOnly: isAdminOnly || false,
        blasterAssignments: {
          create: blasterIds.map((blasterId: string) => ({
            blasterId
          }))
        }
      },
      include: {
        project: { select: { id: true, name: true } },
        uploader: { select: { id: true, name: true } },
        blasterAssignments: {
          include: {
            blaster: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    })

    // Create initial revision record
    await prisma.documentRevision.create({
      data: {
        fileId: document.id,
        version: 1,
        storagePath,
        changeNotes: 'Initial upload',
        uploadedBy: user.id
      }
    })

    // Transform response to include blasters array
    const documentWithBlasters = {
      ...document,
      blasters: document.blasterAssignments.map(assignment => assignment.blaster),
      blasterAssignments: undefined
    }

    return NextResponse.json({ document: documentWithBlasters }, { status: 201 })
  } catch (error) {
    console.error('Error creating document:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
