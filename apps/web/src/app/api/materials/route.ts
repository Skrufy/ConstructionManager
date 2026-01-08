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
  }
}

// GET /api/materials - List materials with filtering
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId') || searchParams.get('project_id')
    const category = searchParams.get('category')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const lowStockOnly = searchParams.get('lowStockOnly') === 'true' || searchParams.get('low_stock_only') === 'true'
    const pageParam = searchParams.get('page')
    const pageSizeParam = searchParams.get('pageSize') || searchParams.get('page_size')

    const page = Math.max(1, Number.parseInt(pageParam || '1', 10) || 1)
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(pageSizeParam || '50', 10) || 50))
    const skip = (page - 1) * pageSize

    // Build where clause
    const where: Record<string, unknown> = {}

    if (projectId) where.projectId = projectId
    if (category) where.category = category
    if (status) where.status = status

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { supplier: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Low stock filter - use status since we auto-calculate it
    if (lowStockOnly) {
      where.status = 'LOW_STOCK'
    }

    const [total, materials] = await Promise.all([
      prisma.material.count({ where }),
      prisma.material.findMany({
        where,
        include: {
          project: { select: { id: true, name: true } },
        },
        orderBy: [{ status: 'asc' }, { name: 'asc' }],
        skip,
        take: pageSize,
      }),
    ])

    // Calculate stats
    const allMaterials = await prisma.material.findMany({
      where: projectId ? { projectId } : {},
      select: {
        quantityOnHand: true,
        minimumQuantity: true,
        costPerUnit: true,
        status: true,
      },
    })

    const stats = {
      total_count: allMaterials.length,
      in_stock: allMaterials.filter(m => m.status === 'IN_STOCK').length,
      low_stock: allMaterials.filter(m => m.quantityOnHand <= m.minimumQuantity && m.quantityOnHand > 0).length,
      out_of_stock: allMaterials.filter(m => m.quantityOnHand <= 0).length,
      on_order: allMaterials.filter(m => m.status === 'ON_ORDER').length,
      total_value: allMaterials.reduce((sum, m) => sum + (m.quantityOnHand * m.costPerUnit), 0),
    }

    return NextResponse.json({
      materials: materials.map(transformMaterial),
      stats,
      page,
      page_size: pageSize,
      total,
      total_pages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('Error fetching materials:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/materials - Create a new material
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult

    const body = await request.json()
    const {
      name,
      description,
      category = 'OTHER',
      sku,
      unit = 'each',
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
      status = 'IN_STOCK',
      notes,
    } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Calculate initial status based on quantity
    const qty = quantityOnHand ?? quantity_on_hand ?? 0
    const minQty = minimumQuantity ?? minimum_quantity ?? 0
    let materialStatus = status
    if (qty <= 0) {
      materialStatus = 'OUT_OF_STOCK'
    } else if (qty <= minQty) {
      materialStatus = 'LOW_STOCK'
    }

    const material = await prisma.material.create({
      data: {
        name,
        description,
        category,
        sku,
        unit,
        quantityOnHand: qty,
        minimumQuantity: minQty,
        costPerUnit: costPerUnit ?? cost_per_unit ?? 0,
        supplier,
        projectId: projectId ?? project_id,
        location,
        status: materialStatus,
        notes,
      },
      include: {
        project: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(transformMaterial(material), { status: 201 })
  } catch (error) {
    console.error('Error creating material:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
