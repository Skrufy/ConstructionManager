import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Transform document to snake_case format for iOS/Android
function transformDocument(doc: {
  id: string
  projectId: string | null
  name: string
  type: string
  storagePath: string
  category: string | null
  description: string | null
  tags: string[] | null
  gpsLatitude: number | null
  gpsLongitude: number | null
  currentVersion: number
  isLatest: boolean
  isAdminOnly: boolean
  createdAt: Date
  uploadedBy: string
  project?: { id: string; name: string; address: string | null } | null
  uploader?: { id: string; name: string } | null
  blasterAssignments?: Array<{ blaster: { id: string; name: string; email: string } }>
  metadata?: {
    discipline: string | null
    drawingNumber: string | null
    sheetTitle: string | null
    revision: string | null
    scale: string | null
    building: string | null
    floor: string | null
    zone: string | null
  } | null
  _count?: { revisions: number; annotations: number }
}) {
  return {
    id: doc.id,
    project_id: doc.projectId,
    user_id: null, // Not tracked in current schema
    name: doc.name,
    description: doc.description,
    category: doc.category,
    file_url: doc.storagePath,
    thumbnail_url: null, // Not tracked in current schema
    file_type: doc.type,
    file_size: 0, // Not tracked - would need file metadata
    uploaded_by: doc.uploadedBy,
    uploaded_at: doc.createdAt.toISOString(),
    expires_at: null, // Not tracked in current schema
    tags: doc.tags ?? [],
    blaster_assignments: doc.blasterAssignments?.map(a => ({
      id: a.blaster.id,
      blaster: {
        id: a.blaster.id,
        name: a.blaster.name
      }
    })) ?? null,
    // Additional fields for web/admin
    storage_path: doc.storagePath,
    gps_latitude: doc.gpsLatitude,
    gps_longitude: doc.gpsLongitude,
    current_version: doc.currentVersion,
    is_latest: doc.isLatest,
    is_admin_only: doc.isAdminOnly,
    created_at: doc.createdAt.toISOString(),
    updated_at: doc.createdAt.toISOString(), // File model doesn't have updatedAt
    project: doc.project ? {
      id: doc.project.id,
      name: doc.project.name,
      address: doc.project.address
    } : null,
    uploader: doc.uploader ? {
      id: doc.uploader.id,
      name: doc.uploader.name
    } : null,
    metadata: doc.metadata,
    revision_count: doc._count?.revisions ?? 0,
    annotation_count: doc._count?.annotations ?? 0
  }
}

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

    // Transform documents to snake_case format for mobile
    const transformedDocuments = documents.map(doc => {
      const transformInput = {
        id: doc.id,
        projectId: doc.projectId,
        name: doc.name,
        type: doc.type,
        storagePath: doc.storagePath,
        category: doc.category,
        description: doc.description,
        tags: doc.tags as string[] | null,
        gpsLatitude: doc.gpsLatitude,
        gpsLongitude: doc.gpsLongitude,
        currentVersion: doc.currentVersion,
        isLatest: doc.isLatest,
        isAdminOnly: doc.isAdminOnly,
        createdAt: doc.createdAt,
        uploadedBy: doc.uploadedBy,
        project: doc.project,
        uploader: doc.uploader,
        blasterAssignments: doc.blasterAssignments.map(a => ({ blaster: a.blaster })),
        metadata: doc.metadata,
        _count: doc._count
      }
      return transformDocument(transformInput)
    })

    // Get category counts
    const categoryCounts = await prisma.file.groupBy({
      by: ['category'],
      where: { isLatest: true, ...(projectId ? { projectId } : {}) },
      _count: true
    })

    return NextResponse.json({
      documents: transformedDocuments,
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
        project: { select: { id: true, name: true, address: true } },
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

    // Transform response to snake_case format for mobile
    const transformInput = {
      id: document.id,
      projectId: document.projectId,
      name: document.name,
      type: document.type,
      storagePath: document.storagePath,
      category: document.category,
      description: document.description,
      tags: document.tags as string[] | null,
      gpsLatitude: document.gpsLatitude,
      gpsLongitude: document.gpsLongitude,
      currentVersion: document.currentVersion,
      isLatest: document.isLatest,
      isAdminOnly: document.isAdminOnly,
      createdAt: document.createdAt,
      uploadedBy: document.uploadedBy,
      project: document.project,
      uploader: document.uploader,
      blasterAssignments: document.blasterAssignments.map(a => ({ blaster: a.blaster })),
      metadata: null,
      _count: undefined
    }
    const transformedDocument = transformDocument(transformInput)

    return NextResponse.json({ document: transformedDocument }, { status: 201 })
  } catch (error) {
    console.error('Error creating document:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
