import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { getSignedUrl, getDownloadUrl, isLegacyPath } from '@/lib/supabase-storage'

export const dynamic = 'force-dynamic'

// Maximum signed URL expiry: 24 hours
const MAX_EXPIRY_SECONDS = 86400
const MIN_EXPIRY_SECONDS = 60
const DEFAULT_EXPIRY_SECONDS = 3600

// GET /api/files/[id]/url - Get signed URL for file access
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const download = searchParams.get('download') === 'true'

    // Validate and bound expiresIn parameter
    const rawExpiresIn = parseInt(searchParams.get('expiresIn') || String(DEFAULT_EXPIRY_SECONDS))
    const expiresIn = Math.min(Math.max(rawExpiresIn || DEFAULT_EXPIRY_SECONDS, MIN_EXPIRY_SECONDS), MAX_EXPIRY_SECONDS)

    // Get file from database with project assignments for authorization
    const file = await prisma.file.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        storagePath: true,
        projectId: true,
        uploadedBy: true,
        project: {
          select: {
            id: true,
            assignments: {
              select: { userId: true }
            }
          }
        }
      },
    })

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Authorization check: user must be admin, assigned to project, or the uploader (company-wide files accessible to all)
    const isAdmin = user.role === 'ADMIN'
    const isAssigned = file.project?.assignments.some(a => a.userId === user.id) || false
    const isUploader = file.uploadedBy === user.id

    if (!isAdmin && !isAssigned && !isUploader && file.projectId) {
      return NextResponse.json({ error: 'Access denied to this file' }, { status: 403 })
    }

    // Check if storagePath is a legacy local path (backward compatibility)
    if (isLegacyPath(file.storagePath)) {
      // Legacy local file - return the path as-is
      return NextResponse.json({ url: file.storagePath })
    }

    // Generate signed URL from Supabase
    const result = download
      ? await getDownloadUrl(file.storagePath, file.name, expiresIn)
      : await getSignedUrl(file.storagePath, expiresIn)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ url: result.signedUrl })
  } catch (error) {
    console.error('Error getting file URL:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
