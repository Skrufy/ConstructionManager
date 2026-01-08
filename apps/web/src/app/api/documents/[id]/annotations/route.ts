import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { withRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { auditLog } from '@/lib/audit-log'

export const dynamic = 'force-dynamic'

// Validation schemas
const annotationCreateSchema = z.object({
  annotationType: z.enum([
    'COMMENT', 'MARKUP', 'HIGHLIGHT', 'MEASUREMENT', 'CALLOUT',
    'PIN', 'RECTANGLE', 'CIRCLE', 'CLOUD', 'ARROW', 'LINE', 'AREA', 'FREEHAND'
  ]),
  content: z.union([z.string(), z.record(z.unknown())]),
  pageNumber: z.number().int().positive().optional(),
})

const annotationUpdateSchema = z.object({
  annotationId: z.string().min(1, 'Annotation ID is required'),
  resolved: z.boolean(),
})

// Helper function to check document access authorization
async function checkDocumentAccess(
  documentId: string,
  userId: string,
  userRole: string
): Promise<{ authorized: boolean; document: unknown | null; error?: string }> {
  const document = await prisma.file.findUnique({
    where: { id: documentId },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          assignments: {
            select: { userId: true }
          }
        }
      },
      uploader: { select: { id: true, name: true } }
    }
  })

  if (!document) {
    return { authorized: false, document: null, error: 'Document not found' }
  }

  // Admins have access to all documents
  if (userRole === 'ADMIN') {
    return { authorized: true, document }
  }

  // Check if user is assigned to the project (if document has a project)
  const isAssigned = document.project?.assignments.some(a => a.userId === userId) || false

  // Document uploader always has access
  const isUploader = document.uploader.id === userId

  if (!isAssigned && !isUploader) {
    return { authorized: false, document: null, error: 'Access denied to this document' }
  }

  return { authorized: true, document }
}

// GET /api/documents/[id]/annotations - Get all annotations for a document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting
    const rateLimitResult = withRateLimit(request, RATE_LIMITS.standard)
    if (rateLimitResult) return rateLimitResult

    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const { id } = await params

    // Authorization check
    const { authorized, error } = await checkDocumentAccess(
      id,
      user.id,
      user.role
    )

    if (!authorized) {
      return NextResponse.json({ error: error || 'Access denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const pageNumber = searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined
    const showAllUsers = searchParams.get('all') === 'true' // Admin-only option to see all annotations

    // By default, users only see their own annotations
    // Admins can optionally see all annotations with ?all=true
    const createdByFilter = (user.role === 'ADMIN' && showAllUsers)
      ? {}
      : { createdBy: user.id }

    const annotations = await prisma.documentAnnotation.findMany({
      where: {
        fileId: id,
        ...createdByFilter,
        ...(pageNumber ? { pageNumber } : {})
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ annotations })
  } catch (error) {
    console.error('Error fetching annotations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/documents/[id]/annotations - Create a new annotation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting
    const rateLimitResult = withRateLimit(request, RATE_LIMITS.standard)
    if (rateLimitResult) return rateLimitResult

    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Viewers cannot create annotations
    if (user.role === 'VIEWER') {
      return NextResponse.json({ error: 'Viewers cannot create annotations' }, { status: 403 })
    }

    const { id } = await params

    // Authorization check
    const { authorized, document, error } = await checkDocumentAccess(
      id,
      user.id,
      user.role
    )

    if (!authorized || !document) {
      return NextResponse.json({ error: error || 'Access denied' }, { status: 403 })
    }

    // Validate request body
    const body = await request.json()
    const validation = annotationCreateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { annotationType, content, pageNumber } = validation.data
    const doc = document as { project: { id: string } }

    const annotation = await prisma.documentAnnotation.create({
      data: {
        fileId: id,
        annotationType,
        content: content as object,
        pageNumber,
        createdBy: user.id
      }
    })

    // Audit log
    await auditLog.create('DOCUMENT', user, annotation.id, {
      annotationType,
      pageNumber,
    }, doc.project.id)

    return NextResponse.json({ annotation }, { status: 201 })
  } catch (error) {
    console.error('Error creating annotation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/documents/[id]/annotations - Update annotation (resolve/unresolve)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting
    const rateLimitResult = withRateLimit(request, RATE_LIMITS.standard)
    if (rateLimitResult) return rateLimitResult

    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Viewers cannot update annotations
    if (user.role === 'VIEWER') {
      return NextResponse.json({ error: 'Viewers cannot update annotations' }, { status: 403 })
    }

    const { id } = await params

    // Authorization check
    const { authorized, document, error } = await checkDocumentAccess(
      id,
      user.id,
      user.role
    )

    if (!authorized || !document) {
      return NextResponse.json({ error: error || 'Access denied' }, { status: 403 })
    }

    // Validate request body
    const body = await request.json()
    const validation = annotationUpdateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { annotationId, resolved } = validation.data

    // Verify annotation belongs to this document
    const existingAnnotation = await prisma.documentAnnotation.findFirst({
      where: {
        id: annotationId,
        fileId: id
      }
    })

    if (!existingAnnotation) {
      return NextResponse.json({ error: 'Annotation not found' }, { status: 404 })
    }

    const annotation = await prisma.documentAnnotation.update({
      where: { id: annotationId },
      data: {
        resolvedAt: resolved ? new Date() : null,
        resolvedBy: resolved ? user.id : null
      }
    })

    const doc = document as { project: { id: string } }

    // Audit log
    await auditLog.update('DOCUMENT', user, annotationId,
      { resolved: !resolved },
      { resolved },
      doc.project.id
    )

    return NextResponse.json({ annotation })
  } catch (error) {
    console.error('Error updating annotation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/documents/[id]/annotations - Delete annotation(s)
// Query params:
// - annotationId: Delete specific annotation
// - clearAll: Delete all of current user's annotations for this document
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting
    const rateLimitResult = withRateLimit(request, RATE_LIMITS.standard)
    if (rateLimitResult) return rateLimitResult

    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Viewers cannot delete annotations
    if (user.role === 'VIEWER') {
      return NextResponse.json({ error: 'Viewers cannot delete annotations' }, { status: 403 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const annotationId = searchParams.get('annotationId')
    const clearAll = searchParams.get('clearAll') === 'true'

    // Authorization check
    const { authorized, document, error } = await checkDocumentAccess(
      id,
      user.id,
      user.role
    )

    if (!authorized || !document) {
      return NextResponse.json({ error: error || 'Access denied' }, { status: 403 })
    }

    const doc = document as { project: { id: string } }

    // Clear all of user's annotations for this document
    if (clearAll) {
      const result = await prisma.documentAnnotation.deleteMany({
        where: {
          fileId: id,
          createdBy: user.id, // Only delete user's own annotations
        },
      })

      // Audit log
      await auditLog.delete('DOCUMENT', user, `clearAll-${id}`, undefined, doc.project.id)

      return NextResponse.json({ success: true, deleted: result.count })
    }

    // Delete specific annotation
    if (!annotationId) {
      return NextResponse.json({ error: 'Annotation ID is required (or use clearAll=true)' }, { status: 400 })
    }

    // Verify annotation exists and belongs to this document
    const existingAnnotation = await prisma.documentAnnotation.findFirst({
      where: {
        id: annotationId,
        fileId: id
      }
    })

    if (!existingAnnotation) {
      return NextResponse.json({ error: 'Annotation not found' }, { status: 404 })
    }

    // Only allow deletion by creator or admin
    if (existingAnnotation.createdBy !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Not authorized to delete this annotation' }, { status: 403 })
    }

    await prisma.documentAnnotation.delete({
      where: { id: annotationId }
    })

    // Audit log
    await auditLog.delete('DOCUMENT', user, annotationId, undefined, doc.project.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting annotation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
