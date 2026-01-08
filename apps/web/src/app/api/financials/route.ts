import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const AUTHORIZED_ROLES = ['ADMIN', 'PROJECT_MANAGER', 'OFFICE']

// GET /api/financials - Get financial overview
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    if (!AUTHORIZED_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const type = searchParams.get('type') // 'overview', 'invoices', 'expenses', 'change-orders'

    const where = projectId ? { projectId } : {}

    if (type === 'invoices') {
      const invoices = await prisma.invoice.findMany({
        where,
        include: {
          project: { select: { id: true, name: true } },
          creator: { select: { id: true, name: true } },
          approver: { select: { id: true, name: true } }
        },
        orderBy: { invoiceDate: 'desc' }
      })
      return NextResponse.json(invoices)
    }

    if (type === 'expenses') {
      const expenses = await prisma.expense.findMany({
        where,
        include: {
          project: { select: { id: true, name: true } },
          submitter: { select: { id: true, name: true } },
          approver: { select: { id: true, name: true } }
        },
        orderBy: { date: 'desc' }
      })
      return NextResponse.json(expenses)
    }

    if (type === 'change-orders') {
      const changeOrders = await prisma.changeOrder.findMany({
        where,
        include: {
          project: { select: { id: true, name: true } },
          requester: { select: { id: true, name: true } },
          approver: { select: { id: true, name: true } }
        },
        orderBy: { requestDate: 'desc' }
      })
      return NextResponse.json(changeOrders)
    }

    // Default: Get financial overview
    const [budgets, invoices, expenses, changeOrders] = await Promise.all([
      prisma.budget.findMany({
        where: projectId ? { projectId } : {},
        include: { project: { select: { id: true, name: true } } }
      }),
      prisma.invoice.findMany({ where }),
      prisma.expense.findMany({ where }),
      prisma.changeOrder.findMany({ where })
    ])

    // Calculate totals
    const totalBudget = budgets.reduce((sum, b) => sum + b.totalBudget, 0)
    const totalInvoiced = invoices.reduce((sum, i) => sum + i.totalAmount, 0)
    const totalPaid = invoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + (i.paidAmount || i.totalAmount), 0)
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
    const approvedChangeOrders = changeOrders.filter(co => co.status === 'APPROVED').reduce((sum, co) => sum + co.amount, 0)

    // Category breakdowns
    const invoicesByCategory = invoices.reduce((acc, i) => {
      acc[i.category] = (acc[i.category] || 0) + i.totalAmount
      return acc
    }, {} as Record<string, number>)

    const expensesByCategory = expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      summary: {
        totalBudget,
        totalInvoiced,
        totalPaid,
        pendingPayment: totalInvoiced - totalPaid,
        totalExpenses,
        approvedChangeOrders,
        adjustedBudget: totalBudget + approvedChangeOrders,
        remainingBudget: totalBudget + approvedChangeOrders - totalInvoiced - totalExpenses
      },
      counts: {
        budgets: budgets.length,
        invoices: invoices.length,
        pendingInvoices: invoices.filter(i => i.status === 'PENDING').length,
        expenses: expenses.length,
        pendingExpenses: expenses.filter(e => e.status === 'PENDING').length,
        changeOrders: changeOrders.length,
        pendingChangeOrders: changeOrders.filter(co => co.status === 'PENDING').length
      },
      invoicesByCategory,
      expensesByCategory,
      recentInvoices: invoices.slice(0, 5),
      recentExpenses: expenses.slice(0, 5),
      pendingChangeOrders: changeOrders.filter(co => co.status === 'PENDING').slice(0, 5)
    })
  } catch (error) {
    console.error('Error fetching financials:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/financials - Create financial records
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    if (!AUTHORIZED_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { type, ...data } = body

    if (type === 'invoice') {
      const invoice = await prisma.invoice.create({
        data: {
          projectId: data.projectId,
          invoiceNumber: data.invoiceNumber,
          vendorName: data.vendorName,
          vendorId: data.vendorId,
          invoiceDate: new Date(data.invoiceDate),
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          amount: data.amount,
          taxAmount: data.taxAmount || 0,
          totalAmount: data.amount + (data.taxAmount || 0),
          category: data.category,
          description: data.description,
          createdBy: user.id
        }
      })
      return NextResponse.json(invoice, { status: 201 })
    }

    if (type === 'expense') {
      const expense = await prisma.expense.create({
        data: {
          projectId: data.projectId,
          date: new Date(data.date),
          category: data.category,
          vendor: data.vendor,
          description: data.description,
          amount: data.amount,
          paymentMethod: data.paymentMethod,
          billable: data.billable !== false,
          submittedBy: user.id
        }
      })
      return NextResponse.json(expense, { status: 201 })
    }

    if (type === 'change-order') {
      // Generate change order number
      const count = await prisma.changeOrder.count({ where: { projectId: data.projectId } })
      const changeOrderNumber = `CO-${String(count + 1).padStart(3, '0')}`

      const changeOrder = await prisma.changeOrder.create({
        data: {
          projectId: data.projectId,
          changeOrderNumber,
          title: data.title,
          description: data.description,
          reason: data.reason,
          requestedBy: user.id,
          requestDate: new Date(),
          amount: data.amount,
          daysImpact: data.daysImpact
        }
      })
      return NextResponse.json(changeOrder, { status: 201 })
    }

    if (type === 'budget') {
      const budget = await prisma.budget.upsert({
        where: { projectId: data.projectId },
        update: {
          totalBudget: data.totalBudget,
          laborBudget: data.laborBudget,
          materialsBudget: data.materialsBudget,
          equipmentBudget: data.equipmentBudget,
          subcontractorBudget: data.subcontractorBudget,
          overheadBudget: data.overheadBudget,
          contingency: data.contingency,
          notes: data.notes
        },
        create: {
          projectId: data.projectId,
          totalBudget: data.totalBudget,
          laborBudget: data.laborBudget,
          materialsBudget: data.materialsBudget,
          equipmentBudget: data.equipmentBudget,
          subcontractorBudget: data.subcontractorBudget,
          overheadBudget: data.overheadBudget,
          contingency: data.contingency,
          notes: data.notes,
          createdBy: user.id
        }
      })
      return NextResponse.json(budget, { status: 201 })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error) {
    console.error('Error creating financial record:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
