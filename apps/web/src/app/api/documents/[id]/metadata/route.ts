import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { isOwnerAdmin, getToolAccessLevel, hasProjectAccess } from '@/lib/api-permissions'
import { normalizeScale } from '@/lib/services/pdf-utils'

export const dynamic = 'force-dynamic'

interface MetadataUpdateBody {
  drawingNumber?: string | null
  sheetTitle?: string | null
  discipline?: string | null
  revision?: string | null
  scale?: string | null
  building?: string | null
  floor?: string | null
  zone?: string | null
  room?: string | null
  syncToRevisions?: boolean // If true, sync changes to all revisions of this drawing
}

/**
 * GET /api/documents/[id]/metadata
 * Get document metadata
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult

    const { id: fileId } = await params

    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: {
        metadata: true,
        project: {
          select: { id: true, name: true }
        }
      }
    })

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Get revision history for this drawing (files with same drawing number)
    let relatedRevisions: Array<{
      id: string
      name: string
      version: number
      createdAt: Date
    }> = []

    if (file.metadata?.drawingNumber) {
      relatedRevisions = await prisma.file.findMany({
        where: {
          projectId: file.projectId,
          id: { not: fileId },
          metadata: {
            drawingNumber: file.metadata.drawingNumber
          }
        },
        select: {
          id: true,
          name: true,
          currentVersion: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      }).then(files => files.map(f => ({
        id: f.id,
        name: f.name,
        version: f.currentVersion,
        createdAt: f.createdAt
      })))
    }

    return NextResponse.json({
      fileId: file.id,
      fileName: file.name,
      projectId: file.projectId,
      projectName: file.project?.name || 'Company-wide',
      version: file.currentVersion,
      metadata: file.metadata ? {
        drawingNumber: file.metadata.drawingNumber,
        sheetNumber: file.metadata.sheetNumber,
        sheetTitle: file.metadata.sheetTitle,
        discipline: file.metadata.discipline,
        revision: file.metadata.revision,
        scale: file.metadata.scale,
        building: file.metadata.building,
        floor: file.metadata.floor,
        zone: file.metadata.zone,
        room: file.metadata.room,
        ocrProvider: file.metadata.ocrProvider,
        ocrConfidence: file.metadata.ocrConfidence
      } : null,
      relatedRevisions,
      hasRelatedRevisions: relatedRevisions.length > 0
    })
  } catch (error) {
    console.error('[DocumentMetadata] GET error:', error)
    return NextResponse.json({ error: 'Failed to get metadata' }, { status: 500 })
  }
}

/**
 * PATCH /api/documents/[id]/metadata
 * Update document metadata
 * Optionally sync changes to related revisions
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const { id: fileId } = await params
    const body: MetadataUpdateBody = await request.json()

    // Get the file and verify access
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: {
        metadata: true,
        project: {
          select: {
            id: true,
            assignments: {
              select: { userId: true }
            }
          }
        }
      }
    })

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Authorization: admin, has documents access, assigned to project, or uploader
    const isAdmin = await isOwnerAdmin(user.id)
    const accessLevel = file.projectId ? await getToolAccessLevel(user.id, file.projectId, 'documents') : null
    const hasDocumentAccess = isAdmin || accessLevel === 'admin' || accessLevel === 'standard'
    const isAssigned = file.projectId ? await hasProjectAccess(user.id, file.projectId) : false
    const isUploader = file.uploadedBy === user.id

    if (!hasDocumentAccess && !isAssigned && !isUploader) {
      return NextResponse.json({ error: 'Not authorized to update this document' }, { status: 403 })
    }

    // Normalize scale if provided
    const normalizedScale = body.scale ? normalizeScale(body.scale) : body.scale

    // Prepare update data - only include fields that were explicitly provided
    const updateData: Record<string, unknown> = {}
    if ('drawingNumber' in body) updateData.drawingNumber = body.drawingNumber
    if ('sheetTitle' in body) updateData.sheetTitle = body.sheetTitle
    if ('discipline' in body) updateData.discipline = body.discipline
    if ('revision' in body) updateData.revision = body.revision
    if ('scale' in body) updateData.scale = normalizedScale
    if ('building' in body) updateData.building = body.building
    if ('floor' in body) updateData.floor = body.floor
    if ('zone' in body) updateData.zone = body.zone
    if ('room' in body) updateData.room = body.room

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Update or create the metadata
    const metadata = await prisma.documentMetadata.upsert({
      where: { fileId },
      create: {
        fileId,
        ...updateData
      },
      update: updateData
    })

    // Track files that were synced
    const syncedFileIds: string[] = []

    // If syncToRevisions is true and we have a drawing number, sync to related files
    if (body.syncToRevisions && (body.drawingNumber || file.metadata?.drawingNumber)) {
      const drawingNumber = body.drawingNumber ?? file.metadata?.drawingNumber

      // Find all files with the same drawing number in this project
      const relatedFiles = await prisma.file.findMany({
        where: {
          projectId: file.projectId,
          id: { not: fileId },
          metadata: {
            drawingNumber: {
              equals: drawingNumber,
              mode: 'insensitive'
            }
          }
        },
        select: { id: true }
      })

      // Prepare sync data - only sync certain fields (not drawingNumber, revision)
      const syncData: Record<string, unknown> = {}
      if ('sheetTitle' in body) syncData.sheetTitle = body.sheetTitle
      if ('discipline' in body) syncData.discipline = body.discipline
      if ('scale' in body) syncData.scale = normalizedScale
      if ('building' in body) syncData.building = body.building
      if ('floor' in body) syncData.floor = body.floor
      if ('zone' in body) syncData.zone = body.zone
      if ('room' in body) syncData.room = body.room

      if (Object.keys(syncData).length > 0 && relatedFiles.length > 0) {
        for (const related of relatedFiles) {
          await prisma.documentMetadata.update({
            where: { fileId: related.id },
            data: syncData
          })
          syncedFileIds.push(related.id)
        }
        console.log(`[DocumentMetadata] Synced ${syncedFileIds.length} related files for drawing ${drawingNumber}`)
      }
    }

    return NextResponse.json({
      success: true,
      metadata: {
        drawingNumber: metadata.drawingNumber,
        sheetNumber: metadata.sheetNumber,
        sheetTitle: metadata.sheetTitle,
        discipline: metadata.discipline,
        revision: metadata.revision,
        scale: metadata.scale,
        building: metadata.building,
        floor: metadata.floor,
        zone: metadata.zone,
        room: metadata.room
      },
      syncedFiles: syncedFileIds.length,
      syncedFileIds: syncedFileIds.length > 0 ? syncedFileIds : undefined,
      message: syncedFileIds.length > 0
        ? `Updated metadata and synced to ${syncedFileIds.length} related revision${syncedFileIds.length === 1 ? '' : 's'}`
        : 'Metadata updated'
    })
  } catch (error) {
    console.error('[DocumentMetadata] PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update metadata' }, { status: 500 })
  }
}
