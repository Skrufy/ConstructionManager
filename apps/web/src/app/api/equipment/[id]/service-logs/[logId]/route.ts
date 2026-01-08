import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { isOwnerAdmin } from '@/lib/api-permissions'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Transform service log to snake_case for mobile clients
function transformServiceLog(log: any) {
  return {
    id: log.id,
    equipment_id: log.equipmentId,
    service_type: log.serviceType,
    date: log.date.toISOString(),
    meter_reading: log.meterReading,
    cost: log.cost,
    parts_used: log.partsUsed,
    technician: log.technician,
    notes: log.notes,
    next_service_due: log.nextServiceDue?.toISOString() || null,
    next_service_hours: log.nextServiceHours,
    created_at: log.createdAt.toISOString(),
    updated_at: log.updatedAt.toISOString(),
  }
}

const updateServiceLogSchema = z.object({
  service_type: z.string().min(1).optional(),
  date: z.string().datetime().or(z.string().min(1)).optional(),
  meter_reading: z.number().optional().nullable(),
  cost: z.number().optional().nullable(),
  parts_used: z.string().optional().nullable(),
  technician: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  next_service_due: z.string().datetime().optional().nullable(),
  next_service_hours: z.number().optional().nullable(),
})

// GET /api/equipment/[id]/service-logs/[logId] - Get a specific service log
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; logId: string }> }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Service log access requires owner/admin
    const isAdmin = await isOwnerAdmin(user.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id: equipmentId, logId } = await params

    const serviceLog = await prisma.serviceLog.findFirst({
      where: {
        id: logId,
        equipmentId,
      },
    })

    if (!serviceLog) {
      return NextResponse.json({ error: 'Service log not found' }, { status: 404 })
    }

    return NextResponse.json({
      service_log: transformServiceLog(serviceLog),
    })
  } catch (error) {
    console.error('Error fetching service log:', error)
    return NextResponse.json({ error: 'Failed to fetch service log' }, { status: 500 })
  }
}

// PUT /api/equipment/[id]/service-logs/[logId] - Update a service log
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; logId: string }> }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Service log updates require owner/admin
    const isAdmin = await isOwnerAdmin(user.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id: equipmentId, logId } = await params
    const body = await request.json()

    // Verify service log exists and belongs to equipment
    const existingLog = await prisma.serviceLog.findFirst({
      where: {
        id: logId,
        equipmentId,
      },
    })

    if (!existingLog) {
      return NextResponse.json({ error: 'Service log not found' }, { status: 404 })
    }

    const validation = updateServiceLogSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const data = validation.data

    const updateData: any = {}
    if (data.service_type !== undefined) updateData.serviceType = data.service_type
    if (data.date !== undefined) updateData.date = new Date(data.date)
    if (data.meter_reading !== undefined) updateData.meterReading = data.meter_reading
    if (data.cost !== undefined) updateData.cost = data.cost
    if (data.parts_used !== undefined) updateData.partsUsed = data.parts_used
    if (data.technician !== undefined) updateData.technician = data.technician
    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.next_service_due !== undefined) {
      updateData.nextServiceDue = data.next_service_due ? new Date(data.next_service_due) : null
    }
    if (data.next_service_hours !== undefined) updateData.nextServiceHours = data.next_service_hours

    const serviceLog = await prisma.serviceLog.update({
      where: { id: logId },
      data: updateData,
    })

    return NextResponse.json({
      service_log: transformServiceLog(serviceLog),
    })
  } catch (error) {
    console.error('Error updating service log:', error)
    return NextResponse.json({ error: 'Failed to update service log' }, { status: 500 })
  }
}

// DELETE /api/equipment/[id]/service-logs/[logId] - Delete a service log
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; logId: string }> }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Service log deletion requires owner/admin
    const isAdmin = await isOwnerAdmin(user.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id: equipmentId, logId } = await params

    // Verify service log exists and belongs to equipment
    const existingLog = await prisma.serviceLog.findFirst({
      where: {
        id: logId,
        equipmentId,
      },
    })

    if (!existingLog) {
      return NextResponse.json({ error: 'Service log not found' }, { status: 404 })
    }

    await prisma.serviceLog.delete({
      where: { id: logId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting service log:', error)
    return NextResponse.json({ error: 'Failed to delete service log' }, { status: 500 })
  }
}
