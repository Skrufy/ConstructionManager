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

interface RouteParams {
  params: Promise<{ orderId: string }>
}

// GET /api/materials/orders/[orderId] - Get a single order
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult

    const { orderId } = await params

    const order = await prisma.materialOrder.findUnique({
      where: { id: orderId },
      include: {
        material: { select: { id: true, name: true, sku: true, unit: true } },
        project: { select: { id: true, name: true } },
        orderedBy: { select: { id: true, name: true, email: true } },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json(transformOrder(order))
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/materials/orders/[orderId] - Update an order
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const { orderId } = await params
    const body = await request.json()

    // Check if order exists
    const existing = await prisma.materialOrder.findUnique({
      where: { id: orderId },
      include: { material: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const {
      quantity,
      costPerUnit,
      cost_per_unit,
      supplier,
      expectedDeliveryDate,
      expected_delivery_date,
      actualDeliveryDate,
      actual_delivery_date,
      status,
      notes,
    } = body

    // Calculate new total if quantity or cost changed
    const newQuantity = quantity ?? existing.quantity
    const newCostPerUnit = costPerUnit ?? cost_per_unit ?? existing.costPerUnit
    const newTotalCost = newQuantity * newCostPerUnit

    const order = await prisma.materialOrder.update({
      where: { id: orderId },
      data: {
        ...(quantity !== undefined && { quantity: newQuantity }),
        ...(costPerUnit !== undefined || cost_per_unit !== undefined) && { costPerUnit: newCostPerUnit },
        totalCost: newTotalCost,
        ...(supplier !== undefined && { supplier }),
        ...(expectedDeliveryDate !== undefined || expected_delivery_date !== undefined) && {
          expectedDeliveryDate: expectedDeliveryDate ?? expected_delivery_date
            ? new Date(expectedDeliveryDate ?? expected_delivery_date)
            : null,
        },
        ...(actualDeliveryDate !== undefined || actual_delivery_date !== undefined) && {
          actualDeliveryDate: actualDeliveryDate ?? actual_delivery_date
            ? new Date(actualDeliveryDate ?? actual_delivery_date)
            : null,
        },
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        material: { select: { id: true, name: true, sku: true, unit: true } },
        project: { select: { id: true, name: true } },
        orderedBy: { select: { id: true, name: true, email: true } },
      },
    })

    // If order is delivered, update material quantity and delivery date
    if (status === 'DELIVERED' && existing.status !== 'DELIVERED') {
      const material = existing.material
      const newQuantityOnHand = material.quantityOnHand + newQuantity

      // Determine new status based on quantity
      let newMaterialStatus = 'IN_STOCK'
      if (newQuantityOnHand <= 0) {
        newMaterialStatus = 'OUT_OF_STOCK'
      } else if (newQuantityOnHand <= material.minimumQuantity) {
        newMaterialStatus = 'LOW_STOCK'
      }

      await prisma.material.update({
        where: { id: existing.materialId },
        data: {
          quantityOnHand: newQuantityOnHand,
          lastDeliveryDate: new Date(),
          status: newMaterialStatus,
        },
      })
    }

    return NextResponse.json(transformOrder(order))
  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/materials/orders/[orderId] - Delete an order
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Check for admin or project manager role
    if (!['ADMIN', 'PROJECT_MANAGER'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin or Project Manager access required' }, { status: 403 })
    }

    const { orderId } = await params

    // Check if order exists
    const existing = await prisma.materialOrder.findUnique({ where: { id: orderId } })
    if (!existing) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    await prisma.materialOrder.delete({ where: { id: orderId } })

    return NextResponse.json({ success: true, message: 'Order deleted' })
  } catch (error) {
    console.error('Error deleting order:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
