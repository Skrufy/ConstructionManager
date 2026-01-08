'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@/hooks/useSession'
import { useRouter } from 'next/navigation'

interface FinancialSummary {
  totalBudget: number
  totalInvoiced: number
  totalPaid: number
  pendingPayment: number
  totalExpenses: number
  approvedChangeOrders: number
  adjustedBudget: number
  remainingBudget: number
}

interface FinancialCounts {
  budgets: number
  invoices: number
  pendingInvoices: number
  expenses: number
  pendingExpenses: number
  changeOrders: number
  pendingChangeOrders: number
}

interface Invoice {
  id: string
  invoiceNumber: string
  vendorName: string
  totalAmount: number
  status: string
  invoiceDate: string
  project: { id: string; name: string }
}

interface Expense {
  id: string
  description: string
  amount: number
  category: string
  date: string
  status: string
  project: { id: string; name: string }
}

interface ChangeOrder {
  id: string
  changeOrderNumber: string
  title: string
  amount: number
  status: string
  requestDate: string
  project: { id: string; name: string }
}

interface FinancialData {
  summary: FinancialSummary
  counts: FinancialCounts
  invoicesByCategory: Record<string, number>
  expensesByCategory: Record<string, number>
  recentInvoices: Invoice[]
  recentExpenses: Expense[]
  pendingChangeOrders: ChangeOrder[]
}

const AUTHORIZED_ROLES = ['ADMIN', 'PROJECT_MANAGER', 'OFFICE']

const CATEGORY_COLORS: Record<string, string> = {
  LABOR: 'bg-blue-500',
  MATERIALS: 'bg-green-500',
  EQUIPMENT: 'bg-yellow-500',
  SUBCONTRACTOR: 'bg-purple-500',
  OVERHEAD: 'bg-gray-500',
  FUEL: 'bg-orange-500',
  SUPPLIES: 'bg-pink-500',
  MEALS: 'bg-red-500',
  TRAVEL: 'bg-indigo-500',
  OTHER: 'bg-gray-400'
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  PAID: 'bg-green-100 text-green-800',
  DISPUTED: 'bg-red-100 text-red-800',
  REIMBURSED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800'
}

export default function FinancialsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [data, setData] = useState<FinancialData | null>(null)
  const [loading, setLoading] = useState(true)

  const canAccess = session?.user && AUTHORIZED_ROLES.includes(session.user.role)

  useEffect(() => {
    if (!canAccess) {
      router.push('/dashboard')
      return
    }
    fetchData()
  }, [canAccess, router])

  const fetchData = async () => {
    try {
      const res = await fetch('/api/financials')
      if (res.ok) {
        setData(await res.json())
      }
    } catch (error) {
      console.error('Error fetching financial data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  if (!canAccess) return null

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const budgetUsed = data?.summary.adjustedBudget
    ? ((data.summary.totalInvoiced + data.summary.totalExpenses) / data.summary.adjustedBudget) * 100
    : 0

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Financial Tracking</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Monitor budgets, invoices, expenses, and change orders</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Budget</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(data?.summary.totalBudget || 0)}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          {data?.summary.approvedChangeOrders !== 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              +{formatCurrency(data?.summary.approvedChangeOrders || 0)} change orders
            </p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Invoiced</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(data?.summary.totalInvoiced || 0)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {formatCurrency(data?.summary.pendingPayment || 0)} pending
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(data?.summary.totalExpenses || 0)}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {data?.counts.pendingExpenses || 0} pending approval
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Remaining Budget</p>
              <p className={`text-2xl font-bold ${(data?.summary.remainingBudget || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(data?.summary.remainingBudget || 0)}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${(data?.summary.remainingBudget || 0) >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              <svg className={`w-6 h-6 ${(data?.summary.remainingBudget || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <div className="mt-2">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>Budget Used</span>
              <span>{budgetUsed.toFixed(1)}%</span>
            </div>
            <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`rounded-full h-2 transition-all ${budgetUsed > 100 ? 'bg-red-500' : budgetUsed > 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(budgetUsed, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Spending by Category</h2>
          <div className="space-y-3">
            {Object.entries(Object.assign({}, data?.invoicesByCategory, data?.expensesByCategory))
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .slice(0, 6)
              .map(([category, amount]) => (
                <div key={category}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">{category}</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(amount as number)}</span>
                  </div>
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`rounded-full h-2 ${CATEGORY_COLORS[category] || 'bg-gray-400'}`}
                      style={{
                        width: `${((amount as number) / (data?.summary.totalInvoiced || 1 + (data?.summary.totalExpenses || 0))) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Pending Change Orders */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Pending Change Orders</h2>
          {data?.pendingChangeOrders?.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No pending change orders</p>
          ) : (
            <div className="space-y-3">
              {data?.pendingChangeOrders?.map(co => (
                <div key={co.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">{co.changeOrderNumber}: {co.title}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{co.project.name}</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-medium ${co.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {co.amount >= 0 ? '+' : ''}{formatCurrency(co.amount)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{formatDate(co.requestDate)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Invoices */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Invoices</h2>
          {data?.recentInvoices?.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No invoices recorded</p>
          ) : (
            <div className="space-y-3">
              {data?.recentInvoices?.map(invoice => (
                <div key={invoice.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">{invoice.invoiceNumber}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{invoice.vendorName}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(invoice.totalAmount)}</div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[invoice.status]}`}>
                      {invoice.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Expenses */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Expenses</h2>
          {data?.recentExpenses?.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No expenses recorded</p>
          ) : (
            <div className="space-y-3">
              {data?.recentExpenses?.map(expense => (
                <div key={expense.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">{expense.description}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{expense.category} • {formatDate(expense.date)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(expense.amount)}</div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[expense.status]}`}>
                      {expense.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
