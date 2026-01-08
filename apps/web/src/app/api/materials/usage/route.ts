import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Transform usage to snake_case for mobile compatibility
function transformUsage(usage: {
  id: string
  materialId: string
  projectId: string
  quantity: number
  usedById: string | null
  usageDate: Date
  dailyLogId: string | null
  notes: string | null
  createdAt: Date
  material?: { id: string; name: string; sku: string | null; unit: string; costPerUnit: number } | null
  project?: { id: string; name: string } | null
  usedBy?: { id: string; name: string; email: string } | null
  dailyLog?: { id: string; date: Date } | null
}) {
  return {
    id: usage.id,
    material_id: usage.materialId,
    material_name: usage.material?.name || null,
    material_sku: usage.material?.sku || null,
    material_unit: usage.material?.unit || null,
    cost_per_unit: usage.material?.costPerUnit || 0,
    total_cost: usage.quantity * (usage.material?.costPerUnit || 0),
    project_id: usage.projectId,
    project_name: usage.project?.name || null,
    quantity: usage.quantity,
    used_by_id: usage.usedById,
    used_by_name: usage.usedBy?.name || null,
    used_by_email: usage.usedBy?.email || null,
    usage_date: usage.usageDate,
    daily_log_id: usage.dailyLogId,
    daily_log_date: usage.dailyLog?.date || null,
    notes: usage.notes,
    created_at: usage.createdAt,
  }
}

// GET /api/materials/usage - List all material usage records
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult

    const { searchParams } = new URL(request.url)
    const materialId = searchParams.get('materialId') || searchParams.get('material_id')
    const projectId = searchParams.get('projectId') || searchParams.get('project_id')
    const usedById = searchParams.get('usedById') || searchParams.get('used_by_id')
    const startDate = searchParams.get('startDate') || searchParams.get('start_date')
    const endDate = searchParams.get('endDate') || searchParams.get('end_date')
    const pageParam = searchParams.get('page')
    const pageSizeParam = searchParams.get('pageSize') || searchParams.get('page_size')

    const page = Math.max(1, Number.parseInt(pageParam || '1', 10) || 1)
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(pageSizeParam || '25', 10) || 25))
    const skip = (page - 1) * pageSize

    // Build where clause
    const where: Record<string, unknown> = {}

    if (materialId) where.materialId = materialId
    if (projectId) where.projectId = projectId
    if (usedById) where.usedById = usedById

    if (startDate || endDate) {
      where.usageDate = {}
      if (startDate) (where.usageDate as Record<string, Date>).gte = new Date(startDate)
      if (endDate) (where.usageDate as Record<string, Date>).lte = new Date(endDate)
    }

    const [total, usages] = await Promise.all([
      prisma.materialUsage.count({ where }),
      prisma.materialUsage.findMany({
        where,
        include: {
          material: { select: { id: true, name: true, sku: true, unit: true, costPerUnit: true } },
          project: { select: { id: true, name: true } },
          usedBy: { select: { id: true, name: true, email: true } },
          dailyLog: { select: { id: true, date: true } },
        },
        orderBy: { usageDate: 'desc' },
        skip,
        take: pageSize,
      }),
    ])

    // Calculate stats
    const allUsages = await prisma.materialUsage.findMany({
      where: projectId ? { projectId } : {},
      include: {
        material: { select: { costPerUnit: true } },
      },
    })

    const stats = {
      total_count: allUsages.length,
      total_quantity: allUsages.reduce((sum, u) => sum + u.quantity, 0),
      total_value: allUsages.reduce((sum, u) => sum + (u.quantity * (u.material?.costPerUnit || 0)), 0),
    }

    return NextResponse.json({
      usages: usages.map(transformUsage),
      stats,
      page,
      page_size: pageSize,
      total,
      total_pages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('Error fetching material usage:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/materials/usage - Record material usage
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
      usageDate,
      usage_date,
      dailyLogId,
      daily_log_id,
      notes,
    } = body

    const matId = materialId ?? material_id
    const projId = projectId ?? project_id

    if (!matId) {
      return NextResponse.json({ error: 'Material ID is required' }, { status: 400 })
    }

    if (!projId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    if (!quantity || quantity <= 0) {
      return NextResponse.json({ error: 'Valid quantity is required' }, { status: 400 })
    }

    // Check if material exists
    const material = await prisma.material.findUnique({ where: { id: matId } })
    if (!material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 })
    }

    // Check if project exists
    const project = await prisma.project.findUnique({ where: { id: projId } })
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check if there's enough quantity
    if (material.quantityOnHand < quantity) {
      return NextResponse.json({
        error: `Insufficient quantity. Available: ${material.quantityOnHand} ${material.unit}`,
      }, { status: 400 })
    }

    // Create usage record
    const usage = await prisma.materialUsage.create({
      data: {
        materialId: matId,
        projectId: projId,
        quantity,
        usedById: user.id,
        usageDate: usageDate ?? usage_date ? new Date(usageDate ?? usage_date) : new Date(),
        dailyLogId: dailyLogId ?? daily_log_id ?? null,
        notes,
      },
      include: {
        material: { select: { id: true, name: true, sku: true, unit: true, costPerUnit: true } },
        project: { select: { id: true, name: true } },
        usedBy: { select: { id: true, name: true, email: true } },
        dailyLog: { select: { id: true, date: true } },
      },
    })

    // Update material quantity
    const newQuantityOnHand = material.quantityOnHand - quantity

    // Determine new status based on quantity
    let newStatus = material.status
    if (newQuantityOnHand <= 0) {
      newStatus = 'OUT_OF_STOCK'
    } else if (newQuantityOnHand <= material.minimumQuantity) {
      newStatus = 'LOW_STOCK'
    }

    await prisma.material.update({
      where: { id: matId },
      data: {
        quantityOnHand: newQuantityOnHand,
        status: newStatus,
      },
    })

    return NextResponse.json(transformUsage(usage), { status: 201 })
  } catch (error) {
    console.error('Error recording material usage:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
