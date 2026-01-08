import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

interface PageData {
  pageNumber: number
  drawingNumber: string | null
  sheetTitle: string | null
  discipline: string | null
  revision: string | null
}

interface ExistingDrawingMatch {
  fileId: string
  fileName: string
  drawingNumber: string
  currentVersion: number
  currentRevision: string | null
  uploadedAt: string
  matchedPageNumbers: number[]
}

/**
 * POST /api/documents/split/[draftId]/check-revisions
 * Check if any pages in the draft match existing drawings in the project
 * Returns potential revision matches for user to review
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ draftId: string }> }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const { draftId } = await params

    // Get the draft
    const draft = await prisma.documentSplitDraft.findUnique({
      where: { id: draftId },
      include: {
        project: { select: { id: true, name: true } }
      }
    })

    if (!draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }

    // Verify access - only uploader or admin
    const isAdmin = user.role === 'ADMIN' || user.role === 'PROJECT_MANAGER'
    if (draft.uploaderId !== user.id && !isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const pages = draft.pages as unknown as PageData[]

    // Get unique drawing numbers from the draft (excluding null/empty)
    const drawingNumbers = [...new Set(
      pages
        .filter(p => p.drawingNumber && p.drawingNumber.trim())
        .map(p => p.drawingNumber!.trim().toUpperCase())
    )]

    if (drawingNumbers.length === 0) {
      return NextResponse.json({
        matches: [],
        message: 'No drawing numbers detected in the document'
      })
    }

    // Find existing files in the same project with matching drawing numbers
    const existingFiles = await prisma.file.findMany({
      where: {
        projectId: draft.projectId,
        isLatest: true, // Only match against latest versions
        metadata: {
          drawingNumber: {
            in: drawingNumbers,
            mode: 'insensitive'
          }
        }
      },
      include: {
        metadata: {
          select: {
            drawingNumber: true,
            revision: true,
            sheetTitle: true,
            discipline: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Build matches - group by drawing number
    const matchMap = new Map<string, ExistingDrawingMatch>()

    for (const file of existingFiles) {
      const drawingNum = file.metadata?.drawingNumber?.toUpperCase()
      if (!drawingNum) continue

      // Find which pages in the draft have this drawing number
      const matchedPageNumbers = pages
        .filter(p => p.drawingNumber?.toUpperCase() === drawingNum)
        .map(p => p.pageNumber)

      if (matchedPageNumbers.length === 0) continue

      // Only keep the most recent version if multiple exist
      if (!matchMap.has(drawingNum)) {
        matchMap.set(drawingNum, {
          fileId: file.id,
          fileName: file.name,
          drawingNumber: drawingNum,
          currentVersion: file.currentVersion,
          currentRevision: file.metadata?.revision || null,
          uploadedAt: file.createdAt.toISOString(),
          matchedPageNumbers
        })
      }
    }

    const matches = Array.from(matchMap.values())

    // Also return summary stats
    const totalPagesWithDrawingNumbers = pages.filter(p => p.drawingNumber).length
    const pagesWithMatches = matches.reduce((sum, m) => sum + m.matchedPageNumbers.length, 0)
    const newDrawingsCount = totalPagesWithDrawingNumbers - pagesWithMatches

    return NextResponse.json({
      matches,
      summary: {
        totalPagesInDraft: draft.totalPages,
        pagesWithDrawingNumbers: totalPagesWithDrawingNumbers,
        pagesMatchingExisting: pagesWithMatches,
        newDrawings: newDrawingsCount,
        uniqueDrawingNumbers: drawingNumbers.length,
        existingMatchCount: matches.length
      },
      message: matches.length > 0
        ? `Found ${matches.length} existing drawing(s) that may be updated as revisions`
        : 'No matching existing drawings found - all will be created as new'
    })
  } catch (error) {
    console.error('[CheckRevisions] Error:', error)
    return NextResponse.json(
      { error: 'Failed to check for revisions' },
      { status: 500 }
    )
  }
}
