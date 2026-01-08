import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { getFileType } from '@/lib/supabase-storage'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// POST /api/upload/confirm - Confirm upload and create database record
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const body = await request.json()
    const {
      projectId,
      storagePath,
      originalFileName,
      fileSize,
      category,
      description,
      tags,
      dailyLogId,
      gpsLatitude,
      gpsLongitude,
      isAdminOnly,
      blasterIds
    } = body

    if (!storagePath || !originalFileName) {
      return NextResponse.json(
        { error: 'storagePath and originalFileName are required' },
        { status: 400 }
      )
    }

    // Verify user has access to the project (if specified)
    const isAdmin = user.role === 'ADMIN'

    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
          id: true,
          assignments: {
            select: { userId: true }
          }
        }
      })

      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }

      const isAssigned = project.assignments.some(a => a.userId === user.id)

      if (!isAdmin && !isAssigned) {
        return NextResponse.json({ error: 'Access denied to this project' }, { status: 403 })
      }
    } else {
      // Company-wide documents can only be uploaded by admins
      if (!isAdmin) {
        return NextResponse.json({ error: 'Only admins can upload company-wide documents' }, { status: 403 })
      }
    }

    // Determine file type for database
    const fileType = getFileType(originalFileName)

    // Generate a simple checksum placeholder (actual checksum would require re-downloading)
    const checksum = crypto.randomBytes(16).toString('hex')

    // Store in database
    const dbFile = await prisma.file.create({
      data: {
        projectId,
        dailyLogId: dailyLogId || null,
        name: originalFileName,
        type: fileType,
        storagePath,
        uploadedBy: user.id,
        category: category || null,
        description: description || null,
        tags: tags || undefined,
        gpsLatitude: gpsLatitude ? parseFloat(gpsLatitude) : null,
        gpsLongitude: gpsLongitude ? parseFloat(gpsLongitude) : null,
        takenAt: new Date(),
        currentVersion: 1,
        isLatest: true,
        isAdminOnly: isAdminOnly || false
      },
      include: {
        project: { select: { id: true, name: true } },
        uploader: { select: { id: true, name: true } }
      }
    })

    // Create initial revision record
    await prisma.documentRevision.create({
      data: {
        fileId: dbFile.id,
        version: 1,
        storagePath,
        changeNotes: 'Initial upload',
        uploadedBy: user.id,
        fileSize: fileSize || 0,
        checksum
      }
    })

    // Create blaster assignments if provided
    if (blasterIds && Array.isArray(blasterIds) && blasterIds.length > 0) {
      await prisma.fileBlasterAssignment.createMany({
        data: blasterIds.map((blasterId: string) => ({
          fileId: dbFile.id,
          blasterId: blasterId
        }))
      })
    }

    return NextResponse.json({
      message: 'File uploaded successfully',
      file: dbFile
    }, { status: 201 })
  } catch (error) {
    console.error('Error confirming upload:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
