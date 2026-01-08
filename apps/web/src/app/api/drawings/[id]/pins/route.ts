import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Validation schema for creating a pin
const CreatePinSchema = z.object({
  pageNumber: z.number().int().positive(),
  position: z.object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
  }),
  label: z.string().optional(),
  color: z.string().optional(),
  linkedEntity: z.object({
    type: z.enum(['COMMENT', 'ISSUE', 'RFI', 'PUNCH_LIST_ITEM']),
    id: z.string(),
    title: z.string().optional(),
    status: z.string().optional(),
  }).optional(),
  comment: z.string().optional(),
})

// GET /api/drawings/[id]/pins - Get all pins for a drawing
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult

    const { id: fileId } = await params

    // Get all PIN type annotations for this file
    const annotations = await prisma.documentAnnotation.findMany({
      where: {
        fileId,
        annotationType: 'PIN',
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Parse the content JSON for each annotation
    const pins = annotations.map((ann) => ({
      id: ann.id,
      fileId: ann.fileId,
      pageNumber: ann.pageNumber,
      createdBy: ann.createdBy,
      createdAt: ann.createdAt.toISOString(),
      resolvedAt: ann.resolvedAt?.toISOString() || null,
      resolvedBy: ann.resolvedBy,
      ...(ann.content as object),
    }))

    return NextResponse.json({ pins })
  } catch (error) {
    console.error('Error fetching pins:', error)
    return NextResponse.json({ error: 'Failed to fetch pins' }, { status: 500 })
  }
}

// POST /api/drawings/[id]/pins - Create a new pin
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
    const result = CreatePinSchema.safeParse(body)
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
      return NextResponse.json({ error: 'Drawing not found' }, { status: 404 })
    }

    // Build the content object
    const content = {
      type: 'PIN',
      position: data.position,
      color: data.color || '#3B82F6', // Default blue
      label: data.label,
      linkedEntity: data.linkedEntity,
      text: data.comment,
    }

    // Create the annotation
    const annotation = await prisma.documentAnnotation.create({
      data: {
        fileId,
        annotationType: 'PIN',
        content,
        pageNumber: data.pageNumber,
        createdBy: user.id,
      },
    })

    // If linked to a punch list item, update the punch list item with the pin reference
    if (data.linkedEntity?.type === 'PUNCH_LIST_ITEM' && data.linkedEntity.id) {
      try {
        // Only update if it's a real punch list item ID (not a placeholder)
        if (!data.linkedEntity.id.startsWith('placeholder-')) {
          await prisma.punchListItem.update({
            where: { id: data.linkedEntity.id },
            data: {
              // Store reference to the drawing and pin
              // This could be extended with a proper relation if needed
            },
          })
        }
      } catch (e) {
        // Non-fatal - punch list item might not exist yet
        console.warn('Could not update punch list item:', e)
      }
    }

    return NextResponse.json({
      id: annotation.id,
      fileId: annotation.fileId,
      pageNumber: annotation.pageNumber,
      createdBy: annotation.createdBy,
      createdAt: annotation.createdAt.toISOString(),
      resolvedAt: null,
      resolvedBy: null,
      ...content,
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating pin:', error)
    return NextResponse.json({ error: 'Failed to create pin' }, { status: 500 })
  }
}

// DELETE /api/drawings/[id]/pins?pinId=xxx - Delete a pin
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
    const pinId = searchParams.get('pinId')

    if (!pinId) {
      return NextResponse.json({ error: 'Pin ID required' }, { status: 400 })
    }

    // Verify the pin exists and belongs to this file
    const annotation = await prisma.documentAnnotation.findFirst({
      where: {
        id: pinId,
        fileId,
        annotationType: 'PIN',
      },
    })

    if (!annotation) {
      return NextResponse.json({ error: 'Pin not found' }, { status: 404 })
    }

    // Only allow deletion by creator or admin
    const userRole = user.role
    if (annotation.createdBy !== user.id && userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Not authorized to delete this pin' }, { status: 403 })
    }

    // Delete the annotation
    await prisma.documentAnnotation.delete({
      where: { id: pinId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting pin:', error)
    return NextResponse.json({ error: 'Failed to delete pin' }, { status: 500 })
  }
}

// PATCH /api/drawings/[id]/pins - Update a pin (resolve/unresolve)
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
    const { pinId, resolve } = body

    if (!pinId) {
      return NextResponse.json({ error: 'Pin ID required' }, { status: 400 })
    }

    // Verify the pin exists
    const annotation = await prisma.documentAnnotation.findFirst({
      where: {
        id: pinId,
        fileId,
        annotationType: 'PIN',
      },
    })

    if (!annotation) {
      return NextResponse.json({ error: 'Pin not found' }, { status: 404 })
    }

    // Update resolution status
    const updated = await prisma.documentAnnotation.update({
      where: { id: pinId },
      data: {
        resolvedAt: resolve ? new Date() : null,
        resolvedBy: resolve ? user.id : null,
      },
    })

    return NextResponse.json({
      id: updated.id,
      resolvedAt: updated.resolvedAt?.toISOString() || null,
      resolvedBy: updated.resolvedBy,
    })
  } catch (error) {
    console.error('Error updating pin:', error)
    return NextResponse.json({ error: 'Failed to update pin' }, { status: 500 })
  }
}
