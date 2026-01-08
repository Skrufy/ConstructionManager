import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Transform material to snake_case for mobile compatibility
function transformMaterial(material: {
  id: string
  name: string
  description: string | null
  category: string
  sku: string | null
  unit: string
  quantityOnHand: number
  minimumQuantity: number
  costPerUnit: number
  supplier: string | null
  projectId: string | null
  location: string | null
  status: string
  lastOrderDate: Date | null
  lastDeliveryDate: Date | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
  project?: { id: string; name: string } | null
  orders?: unknown[]
  usages?: unknown[]
}) {
  return {
    id: material.id,
    name: material.name,
    description: material.description,
    category: material.category,
    sku: material.sku,
    unit: material.unit,
    quantity_on_hand: material.quantityOnHand,
    minimum_quantity: material.minimumQuantity,
    cost_per_unit: material.costPerUnit,
    supplier: material.supplier,
    project_id: material.projectId,
    project_name: material.project?.name || null,
    location: material.location,
    status: material.status,
    last_order_date: material.lastOrderDate,
    last_delivery_date: material.lastDeliveryDate,
    notes: material.notes,
    created_at: material.createdAt,
    updated_at: material.updatedAt,
    // Computed fields
    total_value: material.quantityOnHand * material.costPerUnit,
    is_low_stock: material.quantityOnHand <= material.minimumQuantity && material.quantityOnHand > 0,
    is_out_of_stock: material.quantityOnHand <= 0,
    // Related data
    orders: material.orders,
    usages: material.usages,
  }
}

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/materials/[id] - Get a single material
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult

    const { id } = await params

    const material = await prisma.material.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        orders: {
          orderBy: { orderDate: 'desc' },
          take: 10,
          include: {
            orderedBy: { select: { id: true, name: true, email: true } },
          },
        },
        usages: {
          orderBy: { usageDate: 'desc' },
          take: 10,
          include: {
            usedBy: { select: { id: true, name: true, email: true } },
          },
        },
      },
    })

    if (!material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 })
    }

    return NextResponse.json(transformMaterial(material))
  } catch (error) {
    console.error('Error fetching material:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/materials/[id] - Update a material
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const { id } = await params
    const body = await request.json()

    // Check if material exists
    const existing = await prisma.material.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 })
    }

    const {
      name,
      description,
      category,
      sku,
      unit,
      quantityOnHand,
      quantity_on_hand,
      minimumQuantity,
      minimum_quantity,
      costPerUnit,
      cost_per_unit,
      supplier,
      projectId,
      project_id,
      location,
      status,
      lastOrderDate,
      last_order_date,
      lastDeliveryDate,
      last_delivery_date,
      notes,
    } = body

    // Calculate status based on quantity if not explicitly set
    const qty = quantityOnHand ?? quantity_on_hand ?? existing.quantityOnHand
    const minQty = minimumQuantity ?? minimum_quantity ?? existing.minimumQuantity
    let materialStatus = status ?? existing.status

    // Auto-update status if quantity changed
    if (quantityOnHand !== undefined || quantity_on_hand !== undefined) {
      if (qty <= 0) {
        materialStatus = 'OUT_OF_STOCK'
      } else if (qty <= minQty) {
        materialStatus = 'LOW_STOCK'
      } else if (materialStatus === 'OUT_OF_STOCK' || materialStatus === 'LOW_STOCK') {
        materialStatus = 'IN_STOCK'
      }
    }

    const material = await prisma.material.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(sku !== undefined && { sku }),
        ...(unit !== undefined && { unit }),
        quantityOnHand: qty,
        minimumQuantity: minQty,
        ...(costPerUnit !== undefined || cost_per_unit !== undefined) && { costPerUnit: costPerUnit ?? cost_per_unit },
        ...(supplier !== undefined && { supplier }),
        ...(projectId !== undefined || project_id !== undefined) && { projectId: projectId ?? project_id },
        ...(location !== undefined && { location }),
        status: materialStatus,
        ...(lastOrderDate !== undefined || last_order_date !== undefined) && {
          lastOrderDate: lastOrderDate ?? last_order_date ? new Date(lastOrderDate ?? last_order_date) : null
        },
        ...(lastDeliveryDate !== undefined || last_delivery_date !== undefined) && {
          lastDeliveryDate: lastDeliveryDate ?? last_delivery_date ? new Date(lastDeliveryDate ?? last_delivery_date) : null
        },
        ...(notes !== undefined && { notes }),
      },
      include: {
        project: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(transformMaterial(material))
  } catch (error) {
    console.error('Error updating material:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/materials/[id] - Delete a material
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Check for admin or project manager role
    if (!['ADMIN', 'PROJECT_MANAGER'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin or Project Manager access required' }, { status: 403 })
    }

    const { id } = await params

    // Check if material exists
    const existing = await prisma.material.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 })
    }

    await prisma.material.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Material deleted' })
  } catch (error) {
    console.error('Error deleting material:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
