import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Validation schema for creating an annotation
const CreateAnnotationSchema = z.object({
  annotationType: z.string(),
  content: z.any(), // JSON content varies by annotation type
  pageNumber: z.number().int().nonnegative(),
})

// GET /api/files/[id]/annotations - Get annotations for a file (filtered by user)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const { id: fileId } = await params
    const { searchParams } = new URL(request.url)
    const showAllUsers = searchParams.get('all') === 'true' // Admin-only option

    // By default, users only see their own annotations
    // Admins can optionally see all annotations with ?all=true
    const createdByFilter = (user.role === 'ADMIN' && showAllUsers)
      ? {}
      : { createdBy: user.id }

    // Get annotations for this file, filtered by user
    const annotations = await prisma.documentAnnotation.findMany({
      where: {
        fileId,
        ...createdByFilter,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Format annotations for response
    const formatted = annotations.map((ann) => ({
      id: ann.id,
      fileId: ann.fileId,
      annotationType: ann.annotationType,
      content: ann.content,
      pageNumber: ann.pageNumber,
      createdBy: ann.createdBy,
      createdAt: ann.createdAt.toISOString(),
      resolvedAt: ann.resolvedAt?.toISOString() || null,
      resolvedBy: ann.resolvedBy,
    }))

    return NextResponse.json({ annotations: formatted })
  } catch (error) {
    console.error('Error fetching annotations:', error)
    return NextResponse.json({ error: 'Failed to fetch annotations' }, { status: 500 })
  }
}

// POST /api/files/[id]/annotations - Create a new annotation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const { id: fileId } = await params
    const body = await request.json()

    // Validate request body
    const result = CreateAnnotationSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({
        error: 'Invalid request',
        details: result.error.flatten(),
      }, { status: 400 })
    }

    const data = result.data

    // Verify file exists
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      select: { id: true, projectId: true },
    })

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Create the annotation
    const annotation = await prisma.documentAnnotation.create({
      data: {
        fileId,
        annotationType: data.annotationType,
        content: data.content,
        pageNumber: data.pageNumber,
        createdBy: user.id,
      },
    })

    return NextResponse.json({
      annotation: {
        id: annotation.id,
        fileId: annotation.fileId,
        annotationType: annotation.annotationType,
        content: annotation.content,
        pageNumber: annotation.pageNumber,
        createdBy: annotation.createdBy,
        createdAt: annotation.createdAt.toISOString(),
        resolvedAt: null,
        resolvedBy: null,
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating annotation:', error)
    return NextResponse.json({ error: 'Failed to create annotation' }, { status: 500 })
  }
}

// PATCH /api/files/[id]/annotations - Update an annotation
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const { id: fileId } = await params
    const body = await request.json()
    const { annotationId, content, resolve } = body

    if (!annotationId) {
      return NextResponse.json({ error: 'Annotation ID required' }, { status: 400 })
    }

    // Verify the annotation exists
    const annotation = await prisma.documentAnnotation.findFirst({
      where: {
        id: annotationId,
        fileId,
      },
    })

    if (!annotation) {
      return NextResponse.json({ error: 'Annotation not found' }, { status: 404 })
    }

    // Build update data
    const updateData: any = {}

    if (content !== undefined) {
      updateData.content = content
    }

    if (resolve !== undefined) {
      updateData.resolvedAt = resolve ? new Date() : null
      updateData.resolvedBy = resolve ? user.id : null
    }

    // Update the annotation
    const updated = await prisma.documentAnnotation.update({
      where: { id: annotationId },
      data: updateData,
    })

    return NextResponse.json({
      annotation: {
        id: updated.id,
        fileId: updated.fileId,
        annotationType: updated.annotationType,
        content: updated.content,
        pageNumber: updated.pageNumber,
        createdBy: updated.createdBy,
        createdAt: updated.createdAt.toISOString(),
        resolvedAt: updated.resolvedAt?.toISOString() || null,
        resolvedBy: updated.resolvedBy,
      }
    })
  } catch (error) {
    console.error('Error updating annotation:', error)
    return NextResponse.json({ error: 'Failed to update annotation' }, { status: 500 })
  }
}

// DELETE /api/files/[id]/annotations - Delete annotation(s)
// Query params:
// - annotationId: Delete specific annotation
// - clearAll: Delete all of current user's annotations for this file
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const { id: fileId } = await params
    const { searchParams } = new URL(request.url)
    const annotationId = searchParams.get('annotationId')
    const clearAll = searchParams.get('clearAll') === 'true'

    // Clear all of user's annotations for this file
    if (clearAll) {
      const result = await prisma.documentAnnotation.deleteMany({
        where: {
          fileId,
          createdBy: user.id, // Only delete user's own annotations
        },
      })
      return NextResponse.json({ success: true, deleted: result.count })
    }

    // Delete specific annotation
    if (!annotationId) {
      return NextResponse.json({ error: 'Annotation ID required (or use clearAll=true)' }, { status: 400 })
    }

    // Verify the annotation exists and belongs to this file
    const annotation = await prisma.documentAnnotation.findFirst({
      where: {
        id: annotationId,
        fileId,
      },
    })

    if (!annotation) {
      return NextResponse.json({ error: 'Annotation not found' }, { status: 404 })
    }

    // Only allow deletion by creator or admin
    const userRole = user.role
    if (annotation.createdBy !== user.id && userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Not authorized to delete this annotation' }, { status: 403 })
    }

    // Delete the annotation
    await prisma.documentAnnotation.delete({
      where: { id: annotationId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting annotation:', error)
    return NextResponse.json({ error: 'Failed to delete annotation' }, { status: 500 })
  }
}
