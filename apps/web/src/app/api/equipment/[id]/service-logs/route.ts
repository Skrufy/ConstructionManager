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

const serviceLogSchema = z.object({
  service_type: z.string().min(1, 'Service type is required'),
  date: z.string().datetime().or(z.string().min(1)),
  meter_reading: z.number().optional().nullable(),
  cost: z.number().optional().nullable(),
  parts_used: z.string().optional().nullable(),
  technician: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  next_service_due: z.string().datetime().optional().nullable(),
  next_service_hours: z.number().optional().nullable(),
})

// GET /api/equipment/[id]/service-logs - List service logs for equipment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Service logs require owner/admin access
    const isAdmin = await isOwnerAdmin(user.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id: equipmentId } = await params
    const { searchParams } = new URL(request.url)
    const serviceType = searchParams.get('service_type')
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    // Verify equipment exists
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
    })

    if (!equipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })
    }

    const where: any = { equipmentId }
    if (serviceType) {
      where.serviceType = serviceType
    }

    const serviceLogs = await prisma.serviceLog.findMany({
      where,
      orderBy: { date: 'desc' },
      take: limit,
    })

    return NextResponse.json({
      service_logs: serviceLogs.map(transformServiceLog),
    })
  } catch (error) {
    console.error('Error fetching service logs:', error)
    return NextResponse.json({ error: 'Failed to fetch service logs' }, { status: 500 })
  }
}

// POST /api/equipment/[id]/service-logs - Create a new service log
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Creating service logs requires owner/admin access
    const isAdmin = await isOwnerAdmin(user.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id: equipmentId } = await params
    const body = await request.json()

    // Verify equipment exists
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
    })

    if (!equipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })
    }

    const validation = serviceLogSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const data = validation.data

    const serviceLog = await prisma.serviceLog.create({
      data: {
        equipmentId,
        serviceType: data.service_type,
        date: new Date(data.date),
        meterReading: data.meter_reading,
        cost: data.cost,
        partsUsed: data.parts_used,
        technician: data.technician,
        notes: data.notes,
        nextServiceDue: data.next_service_due ? new Date(data.next_service_due) : null,
        nextServiceHours: data.next_service_hours,
      },
    })

    return NextResponse.json(
      { service_log: transformServiceLog(serviceLog) },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating service log:', error)
    return NextResponse.json({ error: 'Failed to create service log' }, { status: 500 })
  }
}
