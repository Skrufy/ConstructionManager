import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const AUTHORIZED_ROLES = ['ADMIN', 'PROJECT_MANAGER', 'SUPERINTENDENT']

// GET /api/integrations/dronedeploy/flights/[id] - Get a specific flight
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult

    const { id } = await params

    const flight = await prisma.droneFlight.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        logger: { select: { id: true, name: true } },
        maps: true
      }
    })

    if (!flight) {
      return NextResponse.json({ error: 'Flight not found' }, { status: 404 })
    }

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
      status: flight.status,
      notes: flight.notes,
      maps: flight.maps,
      project: flight.project,
      logged_by: flight.logger,
      created_at: flight.createdAt?.toISOString(),
      updated_at: flight.updatedAt?.toISOString()
    })
  } catch (error) {
    console.error('Error fetching drone flight:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/integrations/dronedeploy/flights/[id] - Update a flight
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    if (!AUTHORIZED_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const {
      status,
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

    // Check if flight exists
    const existing = await prisma.droneFlight.findUnique({
      where: { id }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Flight not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status
    if (pilotName || pilot_name) updateData.pilotName = pilotName || pilot_name
    if (droneModel || drone_model) updateData.droneModel = droneModel || drone_model
    if (duration !== undefined) updateData.duration = parseInt(duration)
    if (area !== undefined) updateData.area = parseFloat(area)
    if (images !== undefined) updateData.images = parseInt(images)
    if (mapUrl || map_url) updateData.mapUrl = mapUrl || map_url
    if (notes !== undefined) updateData.notes = notes

    const flight = await prisma.droneFlight.update({
      where: { id },
      data: updateData,
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
      status: flight.status,
      notes: flight.notes,
      project: flight.project,
      logged_by: flight.logger,
      updated_at: flight.updatedAt?.toISOString(),
      message: 'Flight updated successfully'
    })
  } catch (error) {
    console.error('Error updating drone flight:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/integrations/dronedeploy/flights/[id] - Delete a flight
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    if (!['ADMIN', 'PROJECT_MANAGER'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    // Check if flight exists
    const existing = await prisma.droneFlight.findUnique({
      where: { id }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Flight not found' }, { status: 404 })
    }

    await prisma.droneFlight.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Flight deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting drone flight:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
