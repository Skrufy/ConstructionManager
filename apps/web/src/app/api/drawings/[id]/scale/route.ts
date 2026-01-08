import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { isOwnerAdmin, getToolAccessLevel, hasProjectAccess } from '@/lib/api-permissions'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const scaleUpdateSchema = z.object({
  scale: z.string().min(1).max(50),
})

// PATCH /api/drawings/[id]/scale - Update drawing scale (calibration)
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
    const validationResult = scaleUpdateSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Invalid scale format',
        details: validationResult.error.issues
      }, { status: 400 })
    }

    const { scale } = validationResult.data

    const file = await prisma.file.findUnique({
      where: { id: fileId },
      select: {
        id: true,
        category: true,
        projectId: true,
        uploadedBy: true,
        project: {
          select: {
            id: true,
            assignments: {
              select: { userId: true }
            }
          }
        },
        metadata: {
          select: { id: true }
        }
      }
    })

    if (!file) {
      return NextResponse.json({ error: 'Drawing not found' }, { status: 404 })
    }

    if (file.category !== 'DRAWINGS') {
      return NextResponse.json({ error: 'File is not a drawing' }, { status: 400 })
    }

    const isAdmin = await isOwnerAdmin(user.id)
    const accessLevel = file.projectId ? await getToolAccessLevel(user.id, file.projectId, 'documents') : null
    const hasDocumentAccess = isAdmin || accessLevel === 'admin' || accessLevel === 'standard'
    const isAssigned = file.projectId ? await hasProjectAccess(user.id, file.projectId) : false
    const isUploader = file.uploadedBy === user.id

    if (!hasDocumentAccess && !isAssigned && !isUploader) {
      return NextResponse.json({ error: 'Not authorized to update this drawing' }, { status: 403 })
    }

    const metadata = await prisma.documentMetadata.upsert({
      where: { fileId },
      create: {
        fileId,
        scale,
      },
      update: {
        scale,
      },
    })

    console.log(`[Scale] Updated drawing ${fileId} scale to: ${scale} by user ${user.id}`)

    return NextResponse.json({
      success: true,
      scale: metadata.scale,
      message: 'Scale calibration saved'
    })
  } catch (error) {
    console.error('Error updating drawing scale:', error)
    return NextResponse.json({ error: 'Failed to save scale calibration' }, { status: 500 })
  }
}

// GET /api/drawings/[id]/scale - Get current drawing scale
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult

    const { id: fileId } = await params

    const metadata = await prisma.documentMetadata.findUnique({
      where: { fileId },
      select: { scale: true }
    })

    return NextResponse.json({
      scale: metadata?.scale || null
    })
  } catch (error) {
    console.error('Error getting drawing scale:', error)
    return NextResponse.json({ error: 'Failed to get scale' }, { status: 500 })
  }
}
