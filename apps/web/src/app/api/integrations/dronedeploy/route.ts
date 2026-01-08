import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const AUTHORIZED_ROLES = ['ADMIN', 'PROJECT_MANAGER', 'SUPERINTENDENT']

// GET /api/integrations/dronedeploy - Get DroneDeploy data
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const type = searchParams.get('type') || 'status' // status, flights, maps, progress

    // Check if DroneDeploy is configured
    const apiKey = process.env.DRONEDEPLOY_API_KEY
    const isConfigured = !!apiKey

    if (type === 'status') {
      return NextResponse.json({
        configured: isConfigured,
        apiKeySet: isConfigured,
        message: isConfigured
          ? 'DroneDeploy integration is active'
          : 'DroneDeploy API key not configured. Set DRONEDEPLOY_API_KEY in environment variables.',
        instructions: !isConfigured ? [
          '1. Sign up for DroneDeploy at https://www.dronedeploy.com',
          '2. Go to Developer Settings and create an API key',
          '3. Add DRONEDEPLOY_API_KEY to your .env file',
          '4. Restart the server'
        ] : null
      })
    }

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Fetch real data from database
    if (type === 'flights') {
      const flights = await prisma.droneFlight.findMany({
        where: { projectId },
        orderBy: { flightDate: 'desc' },
        include: {
          logger: { select: { id: true, name: true } },
          maps: { select: { id: true, name: true, mapType: true, status: true } }
        }
      })

      // Calculate totals
      const totalFlights = flights.length
      const totalImages = flights.reduce((sum, f) => sum + (f.images || 0), 0)
      const totalArea = flights.reduce((sum, f) => sum + (f.area || 0), 0)

      return NextResponse.json({
        flights: flights.map(f => ({
          id: f.id,
          projectId: f.projectId,
          flightDate: f.flightDate.toISOString(),
          pilotName: f.pilotName,
          droneModel: f.droneModel,
          duration: f.duration,
          area: f.area,
          images: f.images,
          mapUrl: f.mapUrl,
          status: f.status,
          notes: f.notes,
          maps: f.maps,
          loggedBy: f.logger
        })),
        totalFlights,
        totalImages,
        totalArea: Math.round(totalArea * 10) / 10
      })
    }

    if (type === 'maps') {
      const maps = await prisma.droneMap.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        include: {
          flight: { select: { id: true, flightDate: true } }
        }
      })

      return NextResponse.json({
        maps: maps.map(m => ({
          id: m.id,
          name: m.name,
          type: m.mapType,
          resolution: m.resolution,
          embedUrl: m.embedUrl,
          thumbnailUrl: m.thumbnailUrl,
          status: m.status,
          processedAt: m.processedAt?.toISOString(),
          createdAt: m.createdAt.toISOString(),
          flight: m.flight
        })),
        note: isConfigured ? null : 'Configure DroneDeploy for live map sync'
      })
    }

    if (type === 'progress') {
      // Calculate progress from flights
      const flights = await prisma.droneFlight.findMany({
        where: { projectId, status: 'PROCESSED' },
        orderBy: { flightDate: 'asc' }
      })

      if (flights.length === 0) {
        return NextResponse.json({
          progress: {
            baseline: null,
            current: null,
            weeklyProgress: []
          },
          note: 'No processed flights available for progress tracking'
        })
      }

      const baseline = flights[0]
      const current = flights[flights.length - 1]

      // Group flights by week for progress visualization
      const weeklyProgress = flights.map((f, i) => ({
        week: i + 1,
        date: f.flightDate.toISOString(),
        images: f.images || 0,
        area: f.area || 0
      }))

      return NextResponse.json({
        progress: {
          baseline: {
            date: baseline.flightDate.toISOString(),
            flightId: baseline.id
          },
          current: {
            date: current.flightDate.toISOString(),
            flightId: current.id
          },
          totalFlights: flights.length,
          weeklyProgress
        },
        note: isConfigured ? null : 'Configure DroneDeploy for volumetric analysis'
      })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error) {
    console.error('Error fetching DroneDeploy data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/integrations/dronedeploy - Log flight data or trigger sync
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    if (!AUTHORIZED_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { action } = body

    // Handle sync action - manually trigger DroneDeploy sync
    if (action === 'sync') {
      const { runFullSync, getSyncStatus } = await import('@/lib/services/dronedeploy-sync')

      const status = await getSyncStatus()
      if (!status.configured) {
        return NextResponse.json({
          success: false,
          message: 'DroneDeploy API key not configured. Set DRONEDEPLOY_API_KEY in environment variables.',
        })
      }

      const result = await runFullSync()
      return NextResponse.json({
        success: result.success,
        message: result.success
          ? `Sync completed: ${result.plansSynced} plans synced, ${result.exportsCreated} new exports`
          : 'Sync failed - check configuration',
        result,
      })
    }

    const { projectId, flightDate, pilotName, droneModel, duration, area, images, mapUrl, notes } = body

    if (!projectId || !flightDate) {
      return NextResponse.json({ error: 'Project ID and flight date are required' }, { status: 400 })
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Create flight record in database
    const flight = await prisma.droneFlight.create({
      data: {
        projectId,
        flightDate: new Date(flightDate),
        pilotName: pilotName || user.name,
        droneModel: droneModel || null,
        duration: duration ? parseInt(duration) : null,
        area: area ? parseFloat(area) : null,
        images: images ? parseInt(images) : null,
        mapUrl: mapUrl || null,
        notes: notes || null,
        status: 'PENDING',
        loggedBy: user.id
      },
      include: {
        project: { select: { id: true, name: true } },
        logger: { select: { id: true, name: true } }
      }
    })

    return NextResponse.json({
      success: true,
      flight: {
        id: flight.id,
        projectId: flight.projectId,
        flightDate: flight.flightDate.toISOString(),
        pilotName: flight.pilotName,
        droneModel: flight.droneModel,
        duration: flight.duration,
        area: flight.area,
        images: flight.images,
        mapUrl: flight.mapUrl,
        notes: flight.notes,
        status: flight.status,
        project: flight.project,
        loggedBy: flight.logger
      },
      message: 'Flight logged successfully. Upload to DroneDeploy to process imagery.'
    }, { status: 201 })
  } catch (error) {
    console.error('Error logging flight:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/integrations/dronedeploy - Update flight status
export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    if (!AUTHORIZED_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { flightId, status, mapUrl, images, area, duration } = body

    if (!flightId) {
      return NextResponse.json({ error: 'Flight ID is required' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status
    if (mapUrl) updateData.mapUrl = mapUrl
    if (images !== undefined) updateData.images = parseInt(images)
    if (area !== undefined) updateData.area = parseFloat(area)
    if (duration !== undefined) updateData.duration = parseInt(duration)

    const flight = await prisma.droneFlight.update({
      where: { id: flightId },
      data: updateData,
      include: {
        project: { select: { id: true, name: true } },
        logger: { select: { id: true, name: true } }
      }
    })

    return NextResponse.json({
      success: true,
      flight: {
        id: flight.id,
        projectId: flight.projectId,
        status: flight.status,
        mapUrl: flight.mapUrl,
        images: flight.images,
        area: flight.area,
        duration: flight.duration
      },
      message: 'Flight updated successfully'
    })
  } catch (error) {
    console.error('Error updating flight:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/integrations/dronedeploy - Delete flight
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    if (!['ADMIN', 'PROJECT_MANAGER'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const flightId = searchParams.get('flightId')

    if (!flightId) {
      return NextResponse.json({ error: 'Flight ID is required' }, { status: 400 })
    }

    await prisma.droneFlight.delete({
      where: { id: flightId }
    })

    return NextResponse.json({
      success: true,
      message: 'Flight deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting flight:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
