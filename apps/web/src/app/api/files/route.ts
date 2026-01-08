import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const type = searchParams.get('type')
    const category = searchParams.get('category')

    const where: any = {}
    if (projectId) where.projectId = projectId
    if (type) where.type = type
    if (category) where.category = category

    const files = await prisma.file.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true },
        },
        uploader: {
          select: { id: true, name: true },
        },
        blasterAssignments: {
          include: {
            blaster: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Filter out blasting documents that the user is not assigned to
    const filteredFiles = files.filter(file => {
      // If not a blasting document, include it
      if (file.category !== 'BLASTING') return true

      // If blasting document, check if user is assigned
      const isAssignedBlaster = file.blasterAssignments.some(
        assignment => assignment.blaster.id === user.id
      )

      // Include if user is assigned OR user is uploader
      return isAssignedBlaster || file.uploadedBy === user.id
    })

    return NextResponse.json({ files: filteredFiles })
  } catch (error) {
    console.error('Error fetching files:', error)
    return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const body = await request.json()
    const {
      projectId,
      dailyLogId,
      name,
      type,
      storagePath,
      category,
      blasterIds,
      gpsLatitude,
      gpsLongitude,
      takenAt
    } = body

    if (!projectId || !name || !type || !storagePath) {
      return NextResponse.json(
        { error: 'Project, name, type, and storage path are required' },
        { status: 400 }
      )
    }

    // Validate blaster assignments for blasting documents
    if (category === 'BLASTING' && (!blasterIds || blasterIds.length === 0)) {
      return NextResponse.json(
        { error: 'Blasting documents require at least one assigned blaster' },
        { status: 400 }
      )
    }

    const file = await prisma.file.create({
      data: {
        projectId,
        dailyLogId,
        name,
        type,
        category,
        storagePath,
        uploadedBy: user.id,
        gpsLatitude,
        gpsLongitude,
        takenAt: takenAt ? new Date(takenAt) : null,
        // Create blaster assignments if provided
        blasterAssignments: blasterIds && blasterIds.length > 0 ? {
          create: blasterIds.map((blasterId: string) => ({
            blasterId,
          })),
        } : undefined,
      },
      include: {
        project: {
          select: { id: true, name: true },
        },
        uploader: {
          select: { id: true, name: true },
        },
        blasterAssignments: {
          include: {
            blaster: {
              select: { id: true, name: true },
            },
          },
        },
      },
    })

    return NextResponse.json({ file }, { status: 201 })
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
  }
}
