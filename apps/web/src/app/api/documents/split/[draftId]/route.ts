import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

interface PageData {
  pageNumber: number
  thumbnailPath: string | null
  drawingNumber: string | null
  sheetTitle: string | null
  discipline: string | null
  revision: string | null
  scale: string | null
  confidence: number
  verified: boolean
  skipped: boolean
}

/**
 * GET /api/documents/split/[draftId]
 * Get draft details including all pages
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ draftId: string }> }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const { draftId } = await params

    const draft = await prisma.documentSplitDraft.findUnique({
      where: { id: draftId },
      include: {
        project: { select: { id: true, name: true } },
        originalFile: { select: { id: true, name: true, storagePath: true } },
        uploader: { select: { id: true, name: true } }
      }
    })

    if (!draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }

    // Only the uploader or admin can view the draft
    const isAdmin = user.role === 'ADMIN' || user.role === 'PROJECT_MANAGER'
    if (draft.uploaderId !== user.id && !isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({
      draft: {
        id: draft.id,
        projectId: draft.projectId,
        projectName: draft.project.name,
        originalFileId: draft.originalFileId,
        originalFileName: draft.originalFile.name,
        originalStoragePath: draft.originalFile.storagePath,
        status: draft.status,
        totalPages: draft.totalPages,
        verifiedCount: draft.verifiedCount,
        pages: draft.pages,
        uploaderId: draft.uploaderId,
        uploaderName: draft.uploader.name,
        createdAt: draft.createdAt,
        updatedAt: draft.updatedAt
      }
    })
  } catch (error) {
    console.error('[SplitDraft] GET error:', error)
    return NextResponse.json({ error: 'Failed to get draft' }, { status: 500 })
  }
}

/**
 * PATCH /api/documents/split/[draftId]
 * Update draft - verify pages, update metadata
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ draftId: string }> }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const { draftId } = await params
    const body = await request.json()

    const draft = await prisma.documentSplitDraft.findUnique({
      where: { id: draftId }
    })

    if (!draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }

    // Only the uploader can modify the draft
    if (draft.uploaderId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (draft.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Draft is no longer editable' }, { status: 400 })
    }

    // Handle page updates
    if (body.pages) {
      const currentPages = draft.pages as unknown as PageData[]
      const updatedPages = [...currentPages]

      for (const update of body.pages) {
        const pageIndex = updatedPages.findIndex(p => p.pageNumber === update.pageNumber)
        if (pageIndex !== -1) {
          updatedPages[pageIndex] = {
            ...updatedPages[pageIndex],
            ...update,
            // Ensure pageNumber can't be changed
            pageNumber: updatedPages[pageIndex].pageNumber
          }
        }
      }

      // Calculate verified count
      const verifiedCount = updatedPages.filter(p => p.verified && !p.skipped).length

      const updated = await prisma.documentSplitDraft.update({
        where: { id: draftId },
        data: {
          pages: updatedPages as unknown as Prisma.InputJsonValue,
          verifiedCount
        }
      })

      return NextResponse.json({
        success: true,
        draft: {
          id: updated.id,
          totalPages: updated.totalPages,
          verifiedCount: updated.verifiedCount,
          pages: updated.pages
        }
      })
    }

    // Handle status update (cancel)
    if (body.status === 'CANCELLED') {
      await prisma.documentSplitDraft.update({
        where: { id: draftId },
        data: { status: 'CANCELLED' }
      })

      return NextResponse.json({ success: true, status: 'CANCELLED' })
    }

    return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 })
  } catch (error) {
    console.error('[SplitDraft] PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update draft' }, { status: 500 })
  }
}

/**
 * DELETE /api/documents/split/[draftId]
 * Delete a draft (cancel the split operation)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ draftId: string }> }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const { draftId } = await params

    const draft = await prisma.documentSplitDraft.findUnique({
      where: { id: draftId }
    })

    if (!draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }

    // Only the uploader or admin can delete
    const isAdmin = user.role === 'ADMIN'
    if (draft.uploaderId !== user.id && !isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Mark as cancelled instead of deleting
    await prisma.documentSplitDraft.update({
      where: { id: draftId },
      data: { status: 'CANCELLED' }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[SplitDraft] DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete draft' }, { status: 500 })
  }
}
