import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const AUTHORIZED_ROLES = ['ADMIN', 'PROJECT_MANAGER', 'SUPERINTENDENT']

// GET /api/integrations/dronedeploy/flights - List drone flights
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')

    const where: Record<string, unknown> = {}
    if (projectId) where.projectId = projectId
    if (status) where.status = status

    const [flights, total] = await Promise.all([
      prisma.droneFlight.findMany({
        where,
        orderBy: { flightDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          project: { select: { id: true, name: true } },
          logger: { select: { id: true, name: true } },
          maps: { select: { id: true, name: true, mapType: true, status: true } }
        }
      }),
      prisma.droneFlight.count({ where })
    ])

    // Calculate totals
    const totalImages = flights.reduce((sum, f) => sum + (f.images || 0), 0)
    const totalArea = flights.reduce((sum, f) => sum + (f.area || 0), 0)

    return NextResponse.json({
      flights: flights.map(f => ({
        id: f.id,
        project_id: f.projectId,
        flight_date: f.flightDate.toISOString(),
        pilot_name: f.pilotName,
        drone_model: f.droneModel,
        duration: f.duration,
        area: f.area,
        images: f.images,
        map_url: f.mapUrl,
        status: f.status,
        notes: f.notes,
        maps: f.maps,
        project: f.project,
        logged_by: f.logger,
        created_at: f.createdAt?.toISOString(),
        updated_at: f.updatedAt?.toISOString()
      })),
      total,
      total_flights: flights.length,
      total_images: totalImages,
      total_area: Math.round(totalArea * 10) / 10,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(total / pageSize)
    })
  } catch (error) {
    console.error('Error fetching drone flights:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/integrations/dronedeploy/flights - Create a new drone flight
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    if (!AUTHORIZED_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      projectId,
      project_id,
      flightDate,
      flight_date,
      pilotName,
      pilot_name,
      droneModel,
      drone_model,
      duration,
      area,
      images,
      mapUrl,
      map_url,
      notes
    } = body

    // Accept both camelCase and snake_case
    const finalProjectId = projectId || project_id
    const finalFlightDate = flightDate || flight_date
    const finalPilotName = pilotName || pilot_name
    const finalDroneModel = droneModel || drone_model
    const finalMapUrl = mapUrl || map_url

    if (!finalProjectId || !finalFlightDate) {
      return NextResponse.json(
        { error: 'Project ID and flight date are required' },
        { status: 400 }
      )
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: finalProjectId }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Create flight record
    const flight = await prisma.droneFlight.create({
      data: {
        projectId: finalProjectId,
        flightDate: new Date(finalFlightDate),
        pilotName: finalPilotName || user.name,
        droneModel: finalDroneModel || null,
        duration: duration ? parseInt(duration) : null,
        area: area ? parseFloat(area) : null,
        images: images ? parseInt(images) : null,
        mapUrl: finalMapUrl || null,
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
      id: flight.id,
      project_id: flight.projectId,
      flight_date: flight.flightDate.toISOString(),
      pilot_name: flight.pilotName,
      drone_model: flight.droneModel,
      duration: flight.duration,
      area: flight.area,
      images: flight.images,
      map_url: flight.mapUrl,
      notes: flight.notes,
      status: flight.status,
      project: flight.project,
      logged_by: flight.logger,
      created_at: flight.createdAt?.toISOString(),
      message: 'Flight logged successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating drone flight:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
