import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Transform order to snake_case for mobile compatibility
function transformOrder(order: {
  id: string
  materialId: string
  projectId: string | null
  quantity: number
  costPerUnit: number
  totalCost: number
  supplier: string
  orderDate: Date
  expectedDeliveryDate: Date | null
  actualDeliveryDate: Date | null
  status: string
  orderedById: string | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
  material?: { id: string; name: string; sku: string | null; unit: string } | null
  project?: { id: string; name: string } | null
  orderedBy?: { id: string; name: string; email: string } | null
}) {
  return {
    id: order.id,
    material_id: order.materialId,
    material_name: order.material?.name || null,
    material_sku: order.material?.sku || null,
    material_unit: order.material?.unit || null,
    project_id: order.projectId,
    project_name: order.project?.name || null,
    quantity: order.quantity,
    cost_per_unit: order.costPerUnit,
    total_cost: order.totalCost,
    supplier: order.supplier,
    order_date: order.orderDate,
    expected_delivery_date: order.expectedDeliveryDate,
    actual_delivery_date: order.actualDeliveryDate,
    status: order.status,
    ordered_by_id: order.orderedById,
    ordered_by_name: order.orderedBy?.name || null,
    ordered_by_email: order.orderedBy?.email || null,
    notes: order.notes,
    created_at: order.createdAt,
    updated_at: order.updatedAt,
  }
}

// GET /api/materials/orders - List all material orders
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const { searchParams } = new URL(request.url)
    const materialId = searchParams.get('materialId') || searchParams.get('material_id')
    const projectId = searchParams.get('projectId') || searchParams.get('project_id')
    const status = searchParams.get('status')
    const pageParam = searchParams.get('page')
    const pageSizeParam = searchParams.get('pageSize') || searchParams.get('page_size')

    const page = Math.max(1, Number.parseInt(pageParam || '1', 10) || 1)
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(pageSizeParam || '25', 10) || 25))
    const skip = (page - 1) * pageSize

    // Build where clause
    const where: Record<string, unknown> = {}

    if (materialId) where.materialId = materialId
    if (projectId) where.projectId = projectId
    if (status) where.status = status

    const [total, orders] = await Promise.all([
      prisma.materialOrder.count({ where }),
      prisma.materialOrder.findMany({
        where,
        include: {
          material: { select: { id: true, name: true, sku: true, unit: true } },
          project: { select: { id: true, name: true } },
          orderedBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { orderDate: 'desc' },
        skip,
        take: pageSize,
      }),
    ])

    // Calculate stats
    const allOrders = await prisma.materialOrder.findMany({
      where: projectId ? { projectId } : {},
      select: {
        status: true,
        totalCost: true,
      },
    })

    const stats = {
      total_count: allOrders.length,
      pending: allOrders.filter(o => o.status === 'PENDING').length,
      confirmed: allOrders.filter(o => o.status === 'CONFIRMED').length,
      shipped: allOrders.filter(o => o.status === 'SHIPPED').length,
      delivered: allOrders.filter(o => o.status === 'DELIVERED').length,
      cancelled: allOrders.filter(o => o.status === 'CANCELLED').length,
      total_value: allOrders.reduce((sum, o) => sum + o.totalCost, 0),
    }

    return NextResponse.json({
      orders: orders.map(transformOrder),
      stats,
      page,
      page_size: pageSize,
      total,
      total_pages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('Error fetching material orders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/materials/orders - Create a new material order
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const body = await request.json()
    const {
      materialId,
      material_id,
      projectId,
      project_id,
      quantity,
      costPerUnit,
      cost_per_unit,
      supplier,
      orderDate,
      order_date,
      expectedDeliveryDate,
      expected_delivery_date,
      status = 'PENDING',
      notes,
    } = body

    const matId = materialId ?? material_id
    if (!matId) {
      return NextResponse.json({ error: 'Material ID is required' }, { status: 400 })
    }

    if (!quantity || quantity <= 0) {
      return NextResponse.json({ error: 'Valid quantity is required' }, { status: 400 })
    }

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier is required' }, { status: 400 })
    }

    // Check if material exists
    const material = await prisma.material.findUnique({ where: { id: matId } })
    if (!material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 })
    }

    const unitCost = costPerUnit ?? cost_per_unit ?? material.costPerUnit
    const totalCost = quantity * unitCost

    const order = await prisma.materialOrder.create({
      data: {
        materialId: matId,
        projectId: projectId ?? project_id ?? material.projectId,
        quantity,
        costPerUnit: unitCost,
        totalCost,
        supplier,
        orderDate: orderDate ?? order_date ? new Date(orderDate ?? order_date) : new Date(),
        expectedDeliveryDate: expectedDeliveryDate ?? expected_delivery_date
          ? new Date(expectedDeliveryDate ?? expected_delivery_date)
          : null,
        status,
        orderedById: user.id,
        notes,
      },
      include: {
        material: { select: { id: true, name: true, sku: true, unit: true } },
        project: { select: { id: true, name: true } },
        orderedBy: { select: { id: true, name: true, email: true } },
      },
    })

    // Update material's last order date and status if on order
    await prisma.material.update({
      where: { id: matId },
      data: {
        lastOrderDate: new Date(),
        status: material.quantityOnHand <= 0 ? 'ON_ORDER' : material.status,
      },
    })

    return NextResponse.json(transformOrder(order), { status: 201 })
  } catch (error) {
    console.error('Error creating material order:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
