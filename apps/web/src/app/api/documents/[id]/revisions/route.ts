import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { withRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { auditLog, logFailure } from '@/lib/audit-log'
import { withTransaction } from '@/lib/transactions'

export const dynamic = 'force-dynamic'

// Validation schema for revision creation
const revisionCreateSchema = z.object({
  storagePath: z.string().min(1, 'Storage path is required'),
  changeNotes: z.string().max(2000).optional(),
  fileSize: z.number().int().positive().optional(),
  checksum: z.string().max(128).optional(),
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
      revisions: {
        orderBy: { version: 'desc' }
      },
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

// GET /api/documents/[id]/revisions - Get all revisions for a document
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
    const { authorized, document, error } = await checkDocumentAccess(
      id,
      user.id,
      user.role
    )

    if (!authorized || !document) {
      // Log access denial as a security event
      await logFailure('VIEW', 'DOCUMENT', user, error || 'Access denied', { resourceId: id }, request)
      return NextResponse.json({ error: error || 'Access denied' }, { status: 403 })
    }

    // Log successful access
    await auditLog.view('DOCUMENT', user, id, (document as { project: { id: string } }).project.id)

    const doc = document as {
      id: string
      name: string
      currentVersion: number
      category: string | null
      project: { name: string }
      revisions: unknown[]
    }

    return NextResponse.json({
      document: {
        id: doc.id,
        name: doc.name,
        currentVersion: doc.currentVersion,
        category: doc.category,
        project: doc.project.name
      },
      revisions: doc.revisions
    })
  } catch (error) {
    console.error('Error fetching revisions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/documents/[id]/revisions - Upload a new revision
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting for uploads
    const rateLimitResult = withRateLimit(request, RATE_LIMITS.upload)
    if (rateLimitResult) return rateLimitResult

    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Viewers cannot upload revisions
    if (user.role === 'VIEWER') {
      return NextResponse.json({ error: 'Viewers cannot upload document revisions' }, { status: 403 })
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
    const validation = revisionCreateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { storagePath, changeNotes, fileSize, checksum } = validation.data

    const doc = document as { currentVersion: number; project: { id: string } }
    const newVersion = doc.currentVersion + 1

    // Use transaction to ensure atomicity of revision creation and file update
    const revision = await withTransaction(async (tx) => {
      // Create new revision
      const newRevision = await tx.documentRevision.create({
        data: {
          fileId: id,
          version: newVersion,
          storagePath,
          changeNotes,
          uploadedBy: user.id,
          fileSize,
          checksum
        }
      })

      // Update the main document
      await tx.file.update({
        where: { id },
        data: {
          currentVersion: newVersion,
          storagePath, // Update to new file path
        }
      })

      return newRevision
    })

    // Audit log
    await auditLog.create('DOCUMENT', user, revision.id, {
      version: newVersion,
      changeNotes,
      fileSize,
    }, doc.project.id)

    return NextResponse.json({
      success: true,
      revision,
      newVersion,
      message: `Document updated to version ${newVersion}`
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating revision:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
