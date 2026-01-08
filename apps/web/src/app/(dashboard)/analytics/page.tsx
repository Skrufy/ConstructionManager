'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@/hooks/useSession'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Activity,
  Target,
  Loader2,
  ChevronRight,
} from 'lucide-react'

interface KPIs {
  totalProjects: number
  activeProjects: number
  totalBudget: number
  totalSpent: number
  timeEntries: number
  dailyLogs: number
  incidents: number
  equipment: number
}

interface Trends {
  productivity: number
  budgetUtilization: number
  safetyScore: number
  scheduleAdherence: number
}

interface ProductivityData {
  summary: {
    totalHours: number
    avgDailyHours: number
    totalEntries: number
    workingDays: number
  }
  dailyTrend: Array<{ date: string; hours: number }>
  topPerformers: Array<{ name: string; hours: number; avgPerEntry: number }>
  projectBreakdown: Array<{ name: string; hours: number }>
  forecast: Array<{ period: string; value: number }>
}

interface BudgetData {
  summary: {
    totalBudget: number
    totalSpent: number
    changeOrderImpact: number
    pendingInvoices: number
  }
  categoryBreakdown: Array<{ category: string; amount: number }>
  monthlyTrend: Array<{ month: string; amount: number }>
  projectStatus: Array<{
    projectName: string
    budget: number
    spent: number
    remaining: number
    percentUsed: number
    status: string
  }>
}

interface ForecastData {
  laborForecast: {
    historical: Array<{ week: string; hours: number }>
    predicted: Array<{ period: string; value: number }>
  }
  spendingForecast: {
    historical: Array<{ week: string; amount: number }>
    predicted: Array<{ period: string; value: number }>
  }
  completionForecast: {
    estimatedCompletion: string
    confidence: number
    factors: Array<{ name: string; impact: string }>
  }
  riskIndicators: Array<{ category: string; score: number; trend: string }>
}

export default function AnalyticsPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'productivity' | 'budget' | 'forecast'>('overview')
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [trends, setTrends] = useState<Trends | null>(null)
  const [productivityData, setProductivityData] = useState<ProductivityData | null>(null)
  const [budgetData, setBudgetData] = useState<BudgetData | null>(null)
  const [forecastData, setForecastData] = useState<ForecastData | null>(null)

  useEffect(() => {
    fetchAnalytics()
  }, [activeTab])

  async function fetchAnalytics() {
    setLoading(true)
    try {
      if (activeTab === 'overview') {
        const res = await fetch('/api/analytics?type=overview')
        if (res.ok) {
          const data = await res.json()
          setKpis(data.kpis)
          setTrends(data.trends)
        }
      } else if (activeTab === 'productivity') {
        const res = await fetch('/api/analytics?type=productivity')
        if (res.ok) {
          const data = await res.json()
          setProductivityData(data)
        }
      } else if (activeTab === 'budget') {
        const res = await fetch('/api/analytics?type=budget')
        if (res.ok) {
          const data = await res.json()
          setBudgetData(data)
        }
      } else if (activeTab === 'forecast') {
        const res = await fetch('/api/analytics?type=forecast')
        if (res.ok) {
          const data = await res.json()
          setForecastData(data)
        }
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const userRole = session?.user?.role
  const canViewAnalytics = userRole && ['ADMIN', 'PROJECT_MANAGER', 'OFFICE'].includes(userRole)

  if (!canViewAnalytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Access Restricted</h2>
          <p className="text-gray-500 dark:text-gray-400">You don't have permission to view analytics.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Advanced Analytics & Forecasting</h1>
        <p className="text-gray-600 dark:text-gray-400">Data-driven insights for construction management</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'productivity', label: 'Productivity', icon: Activity },
            { id: 'budget', label: 'Budget', icon: DollarSign },
            { id: 'forecast', label: 'Forecasting', icon: TrendingUp },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === 'overview' && kpis && trends && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Active Projects</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{kpis.activeProjects}</p>
                    </div>
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg">
                      <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">of {kpis.totalProjects} total</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Total Budget</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(kpis.totalBudget)}</p>
                    </div>
                    <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
                      <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{formatCurrency(kpis.totalSpent)} spent</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Time Entries</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{kpis.timeEntries}</p>
                    </div>
                    <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-lg">
                      <Clock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{kpis.dailyLogs} daily logs</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Safety Score</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{100 - (kpis.incidents * 2)}%</p>
                    </div>
                    <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-lg">
                      <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{kpis.incidents} incidents</p>
                </div>
              </div>

              {/* Trend Indicators */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Performance Trends</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                      trends.productivity >= 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}>
                      {trends.productivity >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      {Math.abs(trends.productivity)}%
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Productivity</p>
                  </div>
                  <div className="text-center">
                    <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                      trends.budgetUtilization <= 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}>
                      {trends.budgetUtilization <= 0 ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                      {Math.abs(trends.budgetUtilization)}%
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Budget Variance</p>
                  </div>
                  <div className="text-center">
                    <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                      trends.safetyScore >= 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}>
                      {trends.safetyScore >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      {Math.abs(trends.safetyScore)}%
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Safety Score</p>
                  </div>
                  <div className="text-center">
                    <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                      <CheckCircle className="h-4 w-4" />
                      {trends.scheduleAdherence}%
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">On Schedule</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Productivity Tab */}
          {activeTab === 'productivity' && productivityData && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Hours</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{productivityData.summary.totalHours}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Avg Daily Hours</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{productivityData.summary.avgDailyHours}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Time Entries</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{productivityData.summary.totalEntries}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Working Days</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{productivityData.summary.workingDays}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Daily Trend Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Daily Hours Trend</h3>
                  <div className="h-48 flex items-end gap-1">
                    {productivityData.dailyTrend.slice(-14).map((day, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-blue-500 rounded-t"
                          style={{ height: `${Math.min(100, (day.hours / 12) * 100)}%` }}
                        />
                        <span className="text-xs text-gray-400 dark:text-gray-500 mt-1 rotate-45 origin-left">
                          {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Performers */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Top Performers</h3>
                  <div className="space-y-3">
                    {productivityData.topPerformers.map((performer, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                            i === 0 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                            i === 1 ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' :
                            i === 2 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' :
                            'bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                          }`}>
                            {i + 1}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">{performer.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-medium text-gray-900 dark:text-gray-100">{performer.hours}h</span>
                          <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">({performer.avgPerEntry}h avg)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Budget Tab */}
          {activeTab === 'budget' && budgetData && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Budget</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(budgetData.summary.totalBudget)}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Spent</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(budgetData.summary.totalSpent)}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Change Orders</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{formatCurrency(budgetData.summary.changeOrderImpact)}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Pending Invoices</p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{formatCurrency(budgetData.summary.pendingInvoices)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Category Breakdown */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Spending by Category</h3>
                  <div className="space-y-3">
                    {budgetData.categoryBreakdown.map((cat, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600 dark:text-gray-400">{cat.category}</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(cat.amount)}</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${(cat.amount / budgetData.summary.totalSpent) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Project Budget Status */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Project Budget Status</h3>
                  <div className="space-y-4">
                    {budgetData.projectStatus.slice(0, 5).map((project, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-900 dark:text-gray-100">{project.projectName}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            project.status === 'ON_TRACK' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                            project.status === 'AT_RISK' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                            'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          }`}>
                            {project.percentUsed}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              project.status === 'ON_TRACK' ? 'bg-green-500' :
                              project.status === 'AT_RISK' ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(100, project.percentUsed)}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {formatCurrency(project.spent)} of {formatCurrency(project.budget)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Forecast Tab */}
          {activeTab === 'forecast' && forecastData && (
            <div className="space-y-6">
              {/* Risk Indicators */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {forecastData.riskIndicators.map((indicator, i) => (
                  <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">{indicator.category} Risk</p>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        indicator.trend === 'improving' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                        indicator.trend === 'declining' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                        'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}>
                        {indicator.trend}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full ${
                            indicator.score >= 80 ? 'bg-green-500' :
                            indicator.score >= 60 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${indicator.score}%` }}
                        />
                      </div>
                      <span className="font-bold text-gray-900 dark:text-gray-100">{indicator.score}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Labor Forecast */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Labor Hours Forecast</h3>
                  <div className="h-48 flex items-end gap-1">
                    {forecastData.laborForecast.historical.map((week, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-blue-500 rounded-t"
                          style={{ height: `${(week.hours / 200) * 100}%` }}
                        />
                      </div>
                    ))}
                    {forecastData.laborForecast.predicted.map((period, i) => (
                      <div key={`pred-${i}`} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-blue-300 dark:bg-blue-700 rounded-t border-2 border-dashed border-blue-500"
                          style={{ height: `${(period.value / 200) * 100}%` }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-center gap-4 mt-4 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-blue-500 rounded" /> Historical
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-blue-300 dark:bg-blue-700 border-2 border-dashed border-blue-500 rounded" /> Forecast
                    </span>
                  </div>
                </div>

                {/* Spending Forecast */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Spending Forecast</h3>
                  <div className="h-48 flex items-end gap-1">
                    {forecastData.spendingForecast.historical.map((week, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-green-500 rounded-t"
                          style={{ height: `${Math.min(100, (week.amount / 50000) * 100)}%` }}
                        />
                      </div>
                    ))}
                    {forecastData.spendingForecast.predicted.map((period, i) => (
                      <div key={`pred-${i}`} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-green-300 dark:bg-green-700 rounded-t border-2 border-dashed border-green-500"
                          style={{ height: `${Math.min(100, (period.value / 50000) * 100)}%` }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-center gap-4 mt-4 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-green-500 rounded" /> Historical
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-green-300 dark:bg-green-700 border-2 border-dashed border-green-500 rounded" /> Forecast
                    </span>
                  </div>
                </div>
              </div>

              {/* Completion Forecast */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Project Completion Forecast</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg">
                        <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Estimated Completion</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                          {new Date(forecastData.completionForecast.estimatedCompletion).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Confidence:</span>
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${forecastData.completionForecast.confidence}%` }}
                        />
                      </div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{forecastData.completionForecast.confidence}%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Key Factors</p>
                    <div className="space-y-2">
                      {forecastData.completionForecast.factors.map((factor, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            factor.impact === 'positive' ? 'bg-green-500' :
                            factor.impact === 'negative' ? 'bg-red-500' :
                            'bg-gray-400'
                          }`} />
                          <span className="text-sm text-gray-600 dark:text-gray-400">{factor.name}</span>
                          <ChevronRight className="h-4 w-4 text-gray-400 ml-auto" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
