'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from '@/hooks/useSession'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Settings, Star, StarOff, Eye, EyeOff, GripVertical, X, SlidersHorizontal, RefreshCw } from 'lucide-react'

type ReportType = 'weather-delays' | 'project-health' | 'labor-productivity' | 'equipment-utilization' | 'safety' | 'safety-incidents' | 'safety-inspections' | 'safety-meetings' | 'daily-logs'

interface ReportConfig {
  id: ReportType
  name: string
  visible: boolean
  favorite: boolean
}

const DEFAULT_REPORTS: ReportConfig[] = [
  { id: 'weather-delays', name: 'Weather Delays', visible: true, favorite: false },
  { id: 'project-health', name: 'Project Health', visible: true, favorite: false },
  { id: 'labor-productivity', name: 'Labor Productivity', visible: true, favorite: false },
  { id: 'equipment-utilization', name: 'Equipment Utilization', visible: true, favorite: false },
  { id: 'safety', name: 'Safety Overview', visible: true, favorite: false },
  { id: 'safety-incidents', name: 'Safety Incidents', visible: true, favorite: false },
  { id: 'safety-inspections', name: 'Safety Inspections', visible: true, favorite: false },
  { id: 'safety-meetings', name: 'Safety Meetings', visible: true, favorite: false },
  { id: 'daily-logs', name: 'Daily Logs', visible: true, favorite: false },
]

const STORAGE_KEY = 'constructionpro-report-preferences'

interface ProjectHealth {
  id: string
  name: string
  status: string
  budget: number
  totalSpent: number
  budgetUsed: number
  dailyLogsCount: number
  timeEntriesCount: number
  incidentsCount: number
  health: string
}

interface LaborReport {
  totalHours: number
  totalEntries: number
  averageHoursPerEntry: number
  byUser: { id: string; name: string; role: string; hours: number; entries: number }[]
  byProject: { id: string; name: string; hours: number; entries: number }[]
  byDayOfWeek: Record<number, number>
}

interface EquipmentReport {
  summary: {
    totalEquipment: number
    available: number
    inUse: number
    maintenance: number
    outOfService: number
    totalHours: number
    totalFuel: number
  }
  equipment: {
    id: string
    name: string
    type: string
    status: string
    totalHours: number
    totalFuel: number
  }[]
}

interface RecentIncident {
  id: string
  date: string
  type: string
  severity: string
  status: string
  location: string | null
  projectName: string | null
  description: string | null
}

interface RecentInspection {
  id: string
  date: string
  templateName: string
  category: string
  status: string
  projectName: string | null
}

interface RecentMeeting {
  id: string
  date: string
  topic: string
  duration: number | null
  attendeeCount: number
  projectName: string | null
  location: string | null
}

interface SafetyReport {
  incidents: {
    total: number
    byType: Record<string, number>
    bySeverity: Record<string, number>
    openCount: number
    recentIncidents: RecentIncident[]
  }
  inspections: {
    total: number
    byStatus: Record<string, number>
    byCategory: Record<string, number>
    passRate: number
    recentInspections: RecentInspection[]
  }
  meetings: {
    total: number
    totalAttendees: number
    byTopic: Record<string, number>
    recentMeetings: RecentMeeting[]
  }
}

interface IncidentsReport {
  total: number
  byType: Record<string, number>
  bySeverity: Record<string, number>
  byStatus: Record<string, number>
  openCount: number
  recentIncidents: RecentIncident[]
}

interface InspectionsReport {
  total: number
  byStatus: Record<string, number>
  byCategory: Record<string, number>
  passRate: number
  recentInspections: RecentInspection[]
}

interface MeetingsReport {
  total: number
  totalAttendees: number
  byTopic: Record<string, number>
  averageAttendance: number
  recentMeetings: RecentMeeting[]
}

interface DailyLogsReport {
  total: number
  byProject: { id: string; name: string; count: number }[]
  byStatus: Record<string, number>
  totalHours: number
  totalWorkers: number
  recentLogs: {
    id: string
    date: string
    projectId: string
    projectName: string
    submitterName: string
    status: string
    totalHours: number
    weatherDelay: boolean
  }[]
}

interface WeatherDelayReport {
  total: number
  totalDelayDays: number
  byProject: { id: string; name: string; count: number }[]
  recentDelays: {
    id: string
    date: string
    projectId: string
    projectName: string
    authorName: string
    weatherDelayNotes: string | null
    generalNotes: string | null
    weather: string | null
  }[]
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HEALTH_COLORS = {
  GOOD: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
  WARNING: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400',
  CRITICAL: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
}

export default function ReportsPage() {
  const { data: session } = useSession()
  const [activeReport, setActiveReport] = useState<ReportType>('weather-delays')
  const [projectHealth, setProjectHealth] = useState<ProjectHealth[]>([])
  const [laborReport, setLaborReport] = useState<LaborReport | null>(null)
  const [equipmentReport, setEquipmentReport] = useState<EquipmentReport | null>(null)
  const [safetyReport, setSafetyReport] = useState<SafetyReport | null>(null)
  const [incidentsReport, setIncidentsReport] = useState<IncidentsReport | null>(null)
  const [inspectionsReport, setInspectionsReport] = useState<InspectionsReport | null>(null)
  const [meetingsReport, setMeetingsReport] = useState<MeetingsReport | null>(null)
  const [dailyLogsReport, setDailyLogsReport] = useState<DailyLogsReport | null>(null)
  const [weatherDelayReport, setWeatherDelayReport] = useState<WeatherDelayReport | null>(null)
  const [reportMeta, setReportMeta] = useState<{ hasLimitedAccess?: boolean; accessibleProjects?: number; totalProjects?: number; message?: string } | null>(null)
  const [loading, setLoading] = useState(true)

  // Helper to format date in local timezone as YYYY-MM-DD
  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const [dateRange, setDateRange] = useState({
    startDate: formatLocalDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
    endDate: formatLocalDate(new Date())
  })
  const [showSettings, setShowSettings] = useState(false)
  const [reportConfigs, setReportConfigs] = useState<ReportConfig[]>(DEFAULT_REPORTS)
  const [showExportConfig, setShowExportConfig] = useState(false)

  // Export column configurations per report type
  const EXPORT_COLUMNS: Record<ReportType, { key: string; label: string; default: boolean }[]> = {
    'daily-logs': [
      { key: 'Date', label: 'Date', default: true },
      { key: 'Project', label: 'Project', default: true },
      { key: 'Status', label: 'Status', default: true },
      { key: 'Submitted By', label: 'Submitted By', default: true },
      { key: 'Total Hours', label: 'Total Hours', default: false },
      { key: 'Crew Count', label: 'Crew Count', default: false },
      { key: 'Weather Delay', label: 'Weather Delay', default: true },
      { key: 'Notes', label: 'Notes', default: true }
    ],
    'safety-incidents': [
      { key: 'Date', label: 'Date', default: true },
      { key: 'Project', label: 'Project', default: true },
      { key: 'Type', label: 'Type', default: true },
      { key: 'Severity', label: 'Severity', default: true },
      { key: 'Status', label: 'Status', default: true },
      { key: 'Location', label: 'Location', default: true },
      { key: 'Reporter', label: 'Reporter', default: true },
      { key: 'Description', label: 'Description', default: true }
    ],
    'safety-inspections': [
      { key: 'Date', label: 'Date', default: true },
      { key: 'Project', label: 'Project', default: true },
      { key: 'Template', label: 'Template', default: true },
      { key: 'Category', label: 'Category', default: true },
      { key: 'Status', label: 'Status', default: true },
      { key: 'Inspector', label: 'Inspector', default: true },
      { key: 'Notes', label: 'Notes', default: true }
    ],
    'safety-meetings': [
      { key: 'Date', label: 'Date', default: true },
      { key: 'Project', label: 'Project', default: true },
      { key: 'Topic', label: 'Topic', default: true },
      { key: 'Duration', label: 'Duration', default: true },
      { key: 'Attendees', label: 'Attendees', default: true },
      { key: 'Location', label: 'Location', default: true },
      { key: 'Notes', label: 'Notes', default: true }
    ],
    'weather-delays': [
      { key: 'Date', label: 'Date', default: true },
      { key: 'Project', label: 'Project', default: true },
      { key: 'Reported By', label: 'Reported By', default: true },
      { key: 'Weather', label: 'Weather', default: true },
      { key: 'Weather Delay Notes', label: 'Weather Delay Notes', default: true },
      { key: 'General Notes', label: 'General Notes', default: true },
      { key: 'Temperature', label: 'Temperature', default: false }
    ],
    'labor-productivity': [
      { key: 'Date', label: 'Date', default: true },
      { key: 'Employee', label: 'Employee', default: true },
      { key: 'Role', label: 'Role', default: true },
      { key: 'Project', label: 'Project', default: true },
      { key: 'Clock In', label: 'Clock In', default: true },
      { key: 'Clock Out', label: 'Clock Out', default: true },
      { key: 'Hours', label: 'Hours', default: true },
      { key: 'Status', label: 'Status', default: true }
    ],
    'equipment-utilization': [
      { key: 'Name', label: 'Name', default: true },
      { key: 'Type', label: 'Type', default: true },
      { key: 'Status', label: 'Status', default: true },
      { key: 'Current Project', label: 'Current Project', default: true },
      { key: 'Total Hours', label: 'Total Hours', default: true },
      { key: 'Total Fuel', label: 'Total Fuel', default: true },
      { key: 'Log Count', label: 'Log Count', default: true }
    ],
    'safety': [
      { key: 'Type', label: 'Type', default: true },
      { key: 'Date', label: 'Date', default: true },
      { key: 'Project', label: 'Project', default: true },
      { key: 'Category', label: 'Category', default: true },
      { key: 'Severity', label: 'Severity', default: false },
      { key: 'Status', label: 'Status', default: true },
      { key: 'Reporter', label: 'Reporter', default: true },
      { key: 'Description', label: 'Description', default: true }
    ],
    'project-health': [
      { key: 'Name', label: 'Name', default: true },
      { key: 'Status', label: 'Status', default: true },
      { key: 'Start Date', label: 'Start Date', default: true },
      { key: 'End Date', label: 'End Date', default: true },
      { key: 'Address', label: 'Address', default: true },
      { key: 'Budget', label: 'Budget', default: true },
      { key: 'Daily Logs', label: 'Daily Logs', default: false },
      { key: 'Time Entries', label: 'Time Entries', default: false },
      { key: 'Files', label: 'Files', default: false }
    ]
  }

  const [selectedColumns, setSelectedColumns] = useState<Record<ReportType, string[]>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('exportColumnSelections')
      if (saved) return JSON.parse(saved)
    }
    // Initialize with all default columns
    const defaults: Record<ReportType, string[]> = {} as Record<ReportType, string[]>
    Object.keys(EXPORT_COLUMNS).forEach((reportType) => {
      defaults[reportType as ReportType] = EXPORT_COLUMNS[reportType as ReportType]
        .filter(col => col.default)
        .map(col => col.key)
    })
    return defaults
  })

  // Save column selections to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('exportColumnSelections', JSON.stringify(selectedColumns))
    }
  }, [selectedColumns])

  const toggleColumn = (column: string) => {
    setSelectedColumns(prev => ({
      ...prev,
      [activeReport]: prev[activeReport]?.includes(column)
        ? prev[activeReport].filter(c => c !== column)
        : [...(prev[activeReport] || []), column]
    }))
  }

  const selectAllColumns = () => {
    setSelectedColumns(prev => ({
      ...prev,
      [activeReport]: EXPORT_COLUMNS[activeReport].map(col => col.key)
    }))
  }

  const deselectAllColumns = () => {
    setSelectedColumns(prev => ({
      ...prev,
      [activeReport]: []
    }))
  }

  // Load report preferences from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as ReportConfig[]
        // Merge with defaults to handle new reports
        const merged = DEFAULT_REPORTS.map(def => {
          const savedConfig = parsed.find(p => p.id === def.id)
          return savedConfig || def
        })
        setReportConfigs(merged)
        // Set active report to first visible favorite, or first visible
        const firstFavorite = merged.find(r => r.visible && r.favorite)
        const firstVisible = merged.find(r => r.visible)
        if (firstFavorite) setActiveReport(firstFavorite.id)
        else if (firstVisible) setActiveReport(firstVisible.id)
      }
    } catch (e) {
      console.error('Failed to load report preferences:', e)
    }
  }, [])

  // Save preferences to localStorage
  const savePreferences = (configs: ReportConfig[]) => {
    setReportConfigs(configs)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configs))
  }

  const toggleVisibility = (id: ReportType) => {
    const updated = reportConfigs.map(r =>
      r.id === id ? { ...r, visible: !r.visible } : r
    )
    savePreferences(updated)
  }

  const toggleFavorite = (id: ReportType) => {
    const updated = reportConfigs.map(r =>
      r.id === id ? { ...r, favorite: !r.favorite } : r
    )
    savePreferences(updated)
  }

  const moveReport = (id: ReportType, direction: 'up' | 'down') => {
    const index = reportConfigs.findIndex(r => r.id === id)
    if (direction === 'up' && index > 0) {
      const updated = [...reportConfigs]
      ;[updated[index - 1], updated[index]] = [updated[index], updated[index - 1]]
      savePreferences(updated)
    } else if (direction === 'down' && index < reportConfigs.length - 1) {
      const updated = [...reportConfigs]
      ;[updated[index], updated[index + 1]] = [updated[index + 1], updated[index]]
      savePreferences(updated)
    }
  }

  // Get sorted reports (favorites first, then by order)
  const sortedReports = [...reportConfigs]
    .filter(r => r.visible)
    .sort((a, b) => {
      if (a.favorite && !b.favorite) return -1
      if (!a.favorite && b.favorite) return 1
      return 0
    })

  const fetchReport = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        type: activeReport,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        _t: Date.now().toString() // Cache buster
      })

      const res = await fetch(`/api/reports?${params}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
      if (res.ok) {
        const response = await res.json()
        // Extract data and meta from new response format
        const data = response.data || response
        const meta = response.meta || null
        setReportMeta(meta)

        if (activeReport === 'weather-delays') setWeatherDelayReport(data)
        else if (activeReport === 'project-health') setProjectHealth(data)
        else if (activeReport === 'labor-productivity') setLaborReport(data)
        else if (activeReport === 'equipment-utilization') setEquipmentReport(data)
        else if (activeReport === 'safety') setSafetyReport(data)
        else if (activeReport === 'safety-incidents') setIncidentsReport(data)
        else if (activeReport === 'safety-inspections') setInspectionsReport(data)
        else if (activeReport === 'safety-meetings') setMeetingsReport(data)
        else if (activeReport === 'daily-logs') setDailyLogsReport(data)
      }
    } catch (error) {
      console.error('Error fetching report:', error)
    } finally {
      setLoading(false)
    }
  }, [activeReport, dateRange.startDate, dateRange.endDate])

  useEffect(() => {
    fetchReport()

    // Auto-refresh every 30 seconds to show latest data
    const intervalId = setInterval(() => {
      fetchReport()
    }, 30000) // 30 seconds

    return () => clearInterval(intervalId)
  }, [fetchReport])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)} hrs`
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reports</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">View project metrics and performance data</p>
        </div>

        {/* Date Range Filter and Export */}
        <div className="flex gap-4 items-center">
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
            />
            <span className="text-gray-500 dark:text-gray-400">to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => fetchReport()}
              disabled={loading}
              className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-1 disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowExportConfig(!showExportConfig)}
              className="px-3 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 flex items-center gap-1"
              title="Configure export columns"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                const typeMap: Record<ReportType, string> = {
                  'weather-delays': 'weather-delays',
                  'project-health': 'projects',
                  'labor-productivity': 'labor',
                  'equipment-utilization': 'equipment',
                  'safety': 'safety',
                  'safety-incidents': 'safety-incidents',
                  'safety-inspections': 'safety-inspections',
                  'safety-meetings': 'safety-meetings',
                  'daily-logs': 'daily-logs'
                }
                const columns = selectedColumns[activeReport]?.join(',') || ''
                window.open(`/api/reports/export?format=csv&type=${typeMap[activeReport]}&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&columns=${encodeURIComponent(columns)}`, '_blank')
              }}
              className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              CSV
            </button>
            <button
              onClick={async () => {
                const typeMap: Record<ReportType, string> = {
                  'weather-delays': 'weather-delays',
                  'project-health': 'projects',
                  'labor-productivity': 'labor',
                  'equipment-utilization': 'equipment',
                  'safety': 'safety',
                  'safety-incidents': 'safety-incidents',
                  'safety-inspections': 'safety-inspections',
                  'safety-meetings': 'safety-meetings',
                  'daily-logs': 'daily-logs'
                }
                const columns = selectedColumns[activeReport]?.join(',') || ''
                const res = await fetch(`/api/reports/export?format=json&type=${typeMap[activeReport]}&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&columns=${encodeURIComponent(columns)}`)
                if (res.ok) {
                  const { data, filename } = await res.json()
                  if (data.length === 0) {
                    alert('No data to export')
                    return
                  }
                  const ws = XLSX.utils.json_to_sheet(data)
                  const wb = XLSX.utils.book_new()
                  XLSX.utils.book_append_sheet(wb, ws, 'Report')
                  XLSX.writeFile(wb, filename.replace('.json', '.xlsx'))
                }
              }}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              XLSX
            </button>
            <button
              onClick={async () => {
                const typeMap: Record<ReportType, string> = {
                  'weather-delays': 'weather-delays',
                  'project-health': 'projects',
                  'labor-productivity': 'labor',
                  'equipment-utilization': 'equipment',
                  'safety': 'safety',
                  'safety-incidents': 'safety-incidents',
                  'safety-inspections': 'safety-inspections',
                  'safety-meetings': 'safety-meetings',
                  'daily-logs': 'daily-logs'
                }
                const columns = selectedColumns[activeReport]?.join(',') || ''
                const res = await fetch(`/api/reports/export?format=json&type=${typeMap[activeReport]}&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&columns=${encodeURIComponent(columns)}`)
                if (res.ok) {
                  const { data, filename } = await res.json()
                  if (data.length === 0) {
                    alert('No data to export')
                    return
                  }
                  // Use landscape mode for safety reports
                  const doc = new jsPDF(activeReport === 'safety' ? 'landscape' : 'portrait')
                  const reportTitle = reportConfigs.find(r => r.id === activeReport)?.name || 'Report'

                  // Enhanced PDF styling for safety reports
                  if (activeReport === 'safety') {
                    const pageWidth = doc.internal.pageSize.width

                    // Header with background
                    doc.setFillColor(249, 250, 251)
                    doc.rect(0, 0, pageWidth, 40, 'F')

                    // Title
                    doc.setFontSize(22)
                    doc.setTextColor(31, 41, 55)
                    doc.text(reportTitle, 14, 18)

                    // Metadata
                    doc.setFontSize(9)
                    doc.setTextColor(107, 114, 128)
                    doc.text(`Date Range: ${dateRange.startDate} to ${dateRange.endDate}`, 14, 27)
                    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 33)

                    // Summary stats
                    const incidents = data.filter((r: any) => r.Type === 'Incident')
                    const inspections = data.filter((r: any) => r.Type === 'Inspection')
                    const meetings = data.filter((r: any) => r.Type === 'Safety Meeting')

                    let yPos = 48
                    doc.setFontSize(12)
                    doc.setTextColor(31, 41, 55)
                    doc.text('Summary', 14, yPos)

                    yPos += 6
                    doc.setFontSize(10)

                    // Summary cards - adjusted for landscape
                    const cardWidth = 70
                    const cardHeight = 18
                    const spacing = 8

                    // Incidents card
                    doc.setFillColor(254, 242, 242)
                    doc.roundedRect(14, yPos, cardWidth, cardHeight, 2, 2, 'F')
                    doc.setTextColor(185, 28, 28)
                    doc.setFontSize(18)
                    doc.text(String(incidents.length), 14 + cardWidth/2, yPos + 9, { align: 'center' })
                    doc.setFontSize(8)
                    doc.setTextColor(107, 114, 128)
                    doc.text('Incidents', 14 + cardWidth/2, yPos + 14, { align: 'center' })

                    // Inspections card
                    doc.setFillColor(239, 246, 255)
                    doc.roundedRect(14 + cardWidth + spacing, yPos, cardWidth, cardHeight, 2, 2, 'F')
                    doc.setTextColor(29, 78, 216)
                    doc.setFontSize(18)
                    doc.text(String(inspections.length), 14 + cardWidth + spacing + cardWidth/2, yPos + 9, { align: 'center' })
                    doc.setFontSize(8)
                    doc.setTextColor(107, 114, 128)
                    doc.text('Inspections', 14 + cardWidth + spacing + cardWidth/2, yPos + 14, { align: 'center' })

                    // Meetings card
                    doc.setFillColor(236, 253, 245)
                    doc.roundedRect(14 + (cardWidth + spacing) * 2, yPos, cardWidth, cardHeight, 2, 2, 'F')
                    doc.setTextColor(21, 128, 61)
                    doc.setFontSize(18)
                    doc.text(String(meetings.length), 14 + (cardWidth + spacing) * 2 + cardWidth/2, yPos + 9, { align: 'center' })
                    doc.setFontSize(8)
                    doc.setTextColor(107, 114, 128)
                    doc.text('Safety Meetings', 14 + (cardWidth + spacing) * 2 + cardWidth/2, yPos + 14, { align: 'center' })

                    yPos += cardHeight + 10

                    // Detailed table
                    doc.setFontSize(12)
                    doc.setTextColor(31, 41, 55)
                    doc.text('Detailed Records', 14, yPos)

                    const headers = Object.keys(data[0])
                    const rows = data.map((row: Record<string, unknown>) => headers.map(h => String(row[h] || '')))

                    autoTable(doc, {
                      head: [headers],
                      body: rows,
                      startY: yPos + 4,
                      theme: 'striped',
                      styles: {
                        fontSize: 8,
                        cellPadding: 2.5,
                        textColor: [31, 41, 55],
                        lineColor: [229, 231, 235],
                        lineWidth: 0.1,
                        overflow: 'linebreak',
                        cellWidth: 'wrap'
                      },
                      headStyles: {
                        fillColor: [59, 130, 246],
                        textColor: [255, 255, 255],
                        fontSize: 8,
                        fontStyle: 'bold',
                        halign: 'left'
                      },
                      alternateRowStyles: {
                        fillColor: [249, 250, 251]
                      },
                      columnStyles: {
                        0: { cellWidth: 28, fontStyle: 'bold' },  // Type
                        1: { cellWidth: 22 },  // Date
                        2: { cellWidth: 40 },  // Project
                        3: { cellWidth: 35 },  // Category
                        4: { cellWidth: 26 },  // Status
                        5: { cellWidth: 32 },  // Reporter
                        6: { cellWidth: 'auto' }  // Description - takes remaining space
                      },
                      didDrawCell: (data: any) => {
                        // Color code the Type column by record type
                        if (data.column.index === 0 && data.section === 'body') {
                          const type = data.cell.raw
                          let color = [31, 41, 55] // default gray

                          if (type === 'Incident') {
                            color = [185, 28, 28] // red
                          } else if (type === 'Inspection') {
                            color = [29, 78, 216] // blue
                          } else if (type === 'Safety Meeting') {
                            color = [21, 128, 61] // green
                          }

                          data.cell.styles.textColor = color
                        }
                      }
                    })

                    // Footer
                    const pageCount = (doc as any).internal.getNumberOfPages()
                    for (let i = 1; i <= pageCount; i++) {
                      doc.setPage(i)
                      doc.setFontSize(8)
                      doc.setTextColor(156, 163, 175)
                      doc.text(
                        `Page ${i} of ${pageCount}`,
                        doc.internal.pageSize.width / 2,
                        doc.internal.pageSize.height - 10,
                        { align: 'center' }
                      )
                      doc.text(
                        'ConstructionPro Safety Report',
                        14,
                        doc.internal.pageSize.height - 10
                      )
                    }
                  } else {
                    // Default PDF styling for other reports
                    doc.setFontSize(18)
                    doc.text(reportTitle, 14, 22)
                    doc.setFontSize(10)
                    doc.text(`Date Range: ${dateRange.startDate} to ${dateRange.endDate}`, 14, 30)
                    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 36)

                    const headers = Object.keys(data[0])
                    const rows = data.map((row: Record<string, unknown>) => headers.map(h => String(row[h] || '')))

                    autoTable(doc, {
                      head: [headers],
                      body: rows,
                      startY: 42,
                      styles: { fontSize: 8 },
                      headStyles: { fillColor: [59, 130, 246] }
                    })
                  }

                  doc.save(filename.replace('.json', '.pdf'))
                }
              }}
              className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              PDF
            </button>
          </div>
        </div>
      </div>

      {/* Export Column Configuration Modal */}
      {showExportConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowExportConfig(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Configure Export Columns
              </h3>
              <button onClick={() => setShowExportConfig(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Select which columns to include in exports for {reportConfigs.find(r => r.id === activeReport)?.name}
            </p>

            <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
              {EXPORT_COLUMNS[activeReport]?.map(column => (
                <label key={column.key} className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedColumns[activeReport]?.includes(column.key)}
                    onChange={() => toggleColumn(column.key)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100">{column.label}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={selectAllColumns}
                className="flex-1 px-3 py-1.5 text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50"
              >
                Select All
              </button>
              <button
                onClick={deselectAllColumns}
                className="flex-1 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Deselect All
              </button>
            </div>

            <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
              <span>{selectedColumns[activeReport]?.length || 0} of {EXPORT_COLUMNS[activeReport]?.length || 0} columns selected</span>
              <button
                onClick={() => setShowExportConfig(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Type Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto items-center">
        {sortedReports.map(report => (
          <button
            key={report.id}
            onClick={() => setActiveReport(report.id)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeReport === report.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {report.favorite && <Star className="h-4 w-4 fill-current" />}
            {report.name}
          </button>
        ))}
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ml-auto"
          title="Manage Reports"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Manage Reports</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Customize which reports appear and in what order. Favorites appear first.
              </p>
              {reportConfigs.map((report, index) => (
                <div
                  key={report.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => moveReport(report.id, 'up')}
                      disabled={index === 0}
                      className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => moveReport(report.id, 'down')}
                      disabled={index === reportConfigs.length - 1}
                      className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  <span className={`flex-1 font-medium ${report.visible ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}>
                    {report.name}
                  </span>
                  <button
                    onClick={() => toggleFavorite(report.id)}
                    className={`p-1.5 rounded transition-colors ${
                      report.favorite
                        ? 'text-yellow-500 hover:text-yellow-600'
                        : 'text-gray-400 hover:text-yellow-500'
                    }`}
                    title={report.favorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {report.favorite ? <Star className="h-5 w-5 fill-current" /> : <StarOff className="h-5 w-5" />}
                  </button>
                  <button
                    onClick={() => toggleVisibility(report.id)}
                    className={`p-1.5 rounded transition-colors ${
                      report.visible
                        ? 'text-green-500 hover:text-green-600'
                        : 'text-gray-400 hover:text-green-500'
                    }`}
                    title={report.visible ? 'Hide report' : 'Show report'}
                  >
                    {report.visible ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                  </button>
                </div>
              ))}
            </div>
            <div className="p-4 border-t dark:border-gray-700">
              <button
                onClick={() => setShowSettings(false)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
          ))}
        </div>
      ) : (
        <>
          {/* Weather Delays Report */}
          {activeReport === 'weather-delays' && (
            <div className="space-y-6">
              {/* Limited Access Banner */}
              {reportMeta?.hasLimitedAccess && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-5 h-5 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center mt-0.5">
                      <svg className="w-3 h-3 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-200">Limited Data Access</p>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">{reportMeta.message}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
                  <div className="text-4xl font-bold text-amber-600 dark:text-amber-400">{weatherDelayReport?.total || 0}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total Weather Delays</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
                  <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">{weatherDelayReport?.totalDelayDays || 0}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Delay Days</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
                  <div className="text-4xl font-bold text-gray-900 dark:text-gray-100">{weatherDelayReport?.byProject.length || 0}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Projects Affected</div>
                </div>
              </div>

              {/* Delays by Project */}
              {weatherDelayReport?.byProject && weatherDelayReport.byProject.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Delays by Project</h2>
                  <div className="space-y-3">
                    {weatherDelayReport.byProject.map(project => (
                      <div key={project.id}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-900 dark:text-gray-100">{project.name}</span>
                          <span className="text-amber-600 dark:text-amber-400 font-medium">{project.count} delays</span>
                        </div>
                        <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-amber-500 rounded-full h-2"
                            style={{ width: `${(project.count / (weatherDelayReport?.total || 1)) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Delays */}
              {weatherDelayReport?.recentDelays && weatherDelayReport.recentDelays.length > 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Weather Delays</h2>
                  </div>
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {weatherDelayReport.recentDelays.map(delay => (
                      <div key={delay.id} className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">{delay.projectName}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{new Date(delay.date).toLocaleDateString('en-US', { timeZone: 'UTC' })}</div>
                          </div>
                          {delay.weather && (
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded text-xs font-medium">
                              {delay.weather}
                            </span>
                          )}
                        </div>
                        <div className="space-y-1 text-sm">
                          {delay.weatherDelayNotes && delay.generalNotes && delay.weatherDelayNotes !== delay.generalNotes ? (
                            // Show both if they're different
                            <>
                              <div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">Weather delay notes: </span>
                                <span className="text-gray-600 dark:text-gray-400">{delay.weatherDelayNotes}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">General notes: </span>
                                <span className="text-gray-600 dark:text-gray-400">{delay.generalNotes}</span>
                              </div>
                            </>
                          ) : delay.weatherDelayNotes || delay.generalNotes ? (
                            // Show whichever exists (or if they're the same, just show once)
                            <div>
                              <span className="font-medium text-gray-700 dark:text-gray-300">Notes: </span>
                              <span className="text-gray-600 dark:text-gray-400">{delay.weatherDelayNotes || delay.generalNotes}</span>
                            </div>
                          ) : (
                            <p className="text-gray-400 dark:text-gray-500 italic">No notes provided</p>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-2">Reported by {delay.authorName}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                  <p className="text-gray-600 dark:text-gray-400">No weather delays recorded in this period</p>
                </div>
              )}
            </div>
          )}

          {/* Project Health Report */}
          {activeReport === 'project-health' && (
            <div className="space-y-4">
              {projectHealth.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                  <p className="text-gray-600 dark:text-gray-400">No active projects found</p>
                </div>
              ) : (
                projectHealth.map(project => (
                  <div key={project.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{project.name}</h3>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${HEALTH_COLORS[project.health as keyof typeof HEALTH_COLORS]}`}>
                            {project.health}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{project.status}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(project.totalSpent)}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">of {formatCurrency(project.budget)} budget</div>
                      </div>
                    </div>

                    <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-4">
                      <div
                        className={`rounded-full h-3 transition-all ${
                          project.budgetUsed > 100 ? 'bg-red-500' : project.budgetUsed > 80 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(project.budgetUsed, 100)}%` }}
                      ></div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 text-center text-sm">
                      <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{project.dailyLogsCount}</div>
                        <div className="text-gray-500 dark:text-gray-400">Daily Logs</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{project.timeEntriesCount}</div>
                        <div className="text-gray-500 dark:text-gray-400">Time Entries</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{project.incidentsCount}</div>
                        <div className="text-gray-500 dark:text-gray-400">Incidents</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{project.budgetUsed.toFixed(1)}%</div>
                        <div className="text-gray-500 dark:text-gray-400">Budget Used</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Labor Productivity Report */}
          {activeReport === 'labor-productivity' && laborReport && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Summary */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Summary</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatHours(laborReport.totalHours)}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Total Hours</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{laborReport.totalEntries}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Time Entries</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{formatHours(laborReport.averageHoursPerEntry)}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Avg per Entry</div>
                  </div>
                </div>
              </div>

              {/* Hours by Day */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Hours by Day of Week</h2>
                <div className="flex items-end justify-between h-32 gap-2">
                  {DAY_NAMES.map((day, index) => {
                    const hours = laborReport.byDayOfWeek[index] || 0
                    const maxHours = Math.max(...Object.values(laborReport.byDayOfWeek))
                    const height = maxHours > 0 ? (hours / maxHours) * 100 : 0
                    return (
                      <div key={day} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-blue-500 rounded-t"
                          style={{ height: `${height}%`, minHeight: hours > 0 ? '4px' : '0' }}
                        ></div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{day}</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* By User */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Hours by Employee</h2>
                <div className="space-y-3">
                  {laborReport.byUser.slice(0, 5).map(user => (
                    <div key={user.id} className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{user.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{user.role.replace('_', ' ')}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-900 dark:text-gray-100">{formatHours(user.hours)}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{user.entries} entries</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* By Project */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Hours by Project</h2>
                <div className="space-y-3">
                  {laborReport.byProject.slice(0, 5).map(project => (
                    <div key={project.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-900 dark:text-gray-100">{project.name}</span>
                        <span className="text-gray-600 dark:text-gray-400">{formatHours(project.hours)}</span>
                      </div>
                      <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-green-500 rounded-full h-2"
                          style={{ width: `${(project.hours / laborReport.totalHours) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Equipment Utilization Report */}
          {activeReport === 'equipment-utilization' && equipmentReport && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{equipmentReport.summary.totalEquipment}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Total Equipment</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{equipmentReport.summary.available}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Available</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{equipmentReport.summary.inUse}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">In Use</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{equipmentReport.summary.maintenance}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Maintenance</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">{equipmentReport.summary.outOfService}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Out of Service</div>
                </div>
              </div>

              {/* Equipment List */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Equipment Details</h2>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {equipmentReport.equipment.map(eq => (
                    <div key={eq.id} className="p-4 flex justify-between items-center">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{eq.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{eq.type}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-medium text-gray-900 dark:text-gray-100">{formatHours(eq.totalHours)}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">logged</div>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          eq.status === 'AVAILABLE' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' :
                          eq.status === 'IN_USE' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400' :
                          eq.status === 'MAINTENANCE' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400' :
                          'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                        }`}>
                          {eq.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Safety Report */}
          {activeReport === 'safety' && safetyReport && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
                  <div className="text-3xl font-bold text-red-600 dark:text-red-400">{safetyReport.incidents.total}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Incidents</div>
                  <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">{safetyReport.incidents.openCount} open</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{safetyReport.inspections.total}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Inspections</div>
                  <div className="text-xs text-green-600 dark:text-green-400 mt-1">{safetyReport.inspections.passRate.toFixed(1)}% pass rate</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">{safetyReport.meetings.total}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Safety Meetings</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{safetyReport.meetings.totalAttendees}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Total Attendees</div>
                </div>
              </div>

              {/* Detailed Breakdown Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Incidents by Type & Severity */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Incidents by Type</h2>
                  <div className="space-y-2 mb-6">
                    {Object.entries(safetyReport.incidents.byType).map(([type, count]) => (
                      <div key={type} className="flex justify-between items-center text-sm">
                        <span className="text-gray-600 dark:text-gray-400">{type.replace(/_/g, ' ')}</span>
                        <span className="font-medium px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">{count}</span>
                      </div>
                    ))}
                    {Object.keys(safetyReport.incidents.byType).length === 0 && (
                      <div className="text-sm text-gray-400 dark:text-gray-500 italic">No incidents recorded</div>
                    )}
                  </div>
                  <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">By Severity</h3>
                  <div className="space-y-2">
                    {Object.entries(safetyReport.incidents.bySeverity).map(([severity, count]) => {
                      const severityColors: Record<string, string> = {
                        'CRITICAL': 'bg-red-500 text-white',
                        'SERIOUS': 'bg-orange-500 text-white',
                        'MODERATE': 'bg-yellow-500 text-gray-900',
                        'MINOR': 'bg-green-500 text-white'
                      }
                      return (
                        <div key={severity} className="flex justify-between items-center text-sm">
                          <span className="text-gray-600 dark:text-gray-400">{severity}</span>
                          <span className={`font-medium px-2 py-0.5 rounded ${severityColors[severity] || 'bg-gray-200 dark:bg-gray-700'}`}>{count}</span>
                        </div>
                      )
                    })}
                    {Object.keys(safetyReport.incidents.bySeverity).length === 0 && (
                      <div className="text-sm text-gray-400 dark:text-gray-500 italic">No severity data</div>
                    )}
                  </div>
                </div>

                {/* Inspections by Status & Category */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Inspections by Status</h2>
                  <div className="space-y-2 mb-6">
                    {Object.entries(safetyReport.inspections.byStatus).map(([status, count]) => {
                      const statusColors: Record<string, string> = {
                        'PASSED': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
                        'FAILED': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
                        'PENDING': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
                        'REQUIRES_FOLLOWUP': 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                      }
                      return (
                        <div key={status} className="flex justify-between items-center text-sm">
                          <span className="text-gray-600 dark:text-gray-400">{status.replace(/_/g, ' ')}</span>
                          <span className={`font-medium px-2 py-0.5 rounded ${statusColors[status] || 'bg-gray-200 dark:bg-gray-700'}`}>{count}</span>
                        </div>
                      )
                    })}
                    {Object.keys(safetyReport.inspections.byStatus).length === 0 && (
                      <div className="text-sm text-gray-400 dark:text-gray-500 italic">No inspections recorded</div>
                    )}
                  </div>
                  {safetyReport.inspections.byCategory && Object.keys(safetyReport.inspections.byCategory).length > 0 && (
                    <>
                      <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">By Category</h3>
                      <div className="space-y-2">
                        {Object.entries(safetyReport.inspections.byCategory).map(([category, count]) => (
                          <div key={category} className="flex justify-between items-center text-sm">
                            <span className="text-gray-600 dark:text-gray-400">{category}</span>
                            <span className="font-medium px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">{count}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Meetings by Topic */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Meetings by Topic</h2>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {safetyReport.meetings.byTopic && Object.entries(safetyReport.meetings.byTopic)
                      .sort(([, a], [, b]) => b - a)
                      .map(([topic, count]) => (
                        <div key={topic} className="flex justify-between items-center text-sm">
                          <span className="text-gray-600 dark:text-gray-400 truncate max-w-[70%]">{topic}</span>
                          <span className="font-medium px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">{count}</span>
                        </div>
                      ))}
                    {(!safetyReport.meetings.byTopic || Object.keys(safetyReport.meetings.byTopic).length === 0) && (
                      <div className="text-sm text-gray-400 dark:text-gray-500 italic">No meetings recorded</div>
                    )}
                  </div>
                  <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Avg Attendees/Meeting</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {safetyReport.meetings.total > 0
                          ? (safetyReport.meetings.totalAttendees / safetyReport.meetings.total).toFixed(1)
                          : '0'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Items */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Incidents */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Incidents</h2>
                  </div>
                  <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-80 overflow-y-auto">
                    {safetyReport.incidents.recentIncidents && safetyReport.incidents.recentIncidents.length > 0 ? (
                      safetyReport.incidents.recentIncidents.map(incident => (
                        <div key={incident.id} className="p-3">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">{incident.type.replace(/_/g, ' ')}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              incident.severity === 'CRITICAL' ? 'bg-red-500 text-white' :
                              incident.severity === 'SERIOUS' ? 'bg-orange-500 text-white' :
                              incident.severity === 'MODERATE' ? 'bg-yellow-500 text-gray-900' :
                              'bg-green-500 text-white'
                            }`}>{incident.severity}</span>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{new Date(incident.date).toLocaleDateString('en-US', { timeZone: 'UTC' })}</div>
                          {incident.projectName && <div className="text-xs text-blue-600 dark:text-blue-400">{incident.projectName}</div>}
                          {incident.location && <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">@ {incident.location}</div>}
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-sm text-gray-400 dark:text-gray-500 text-center">No recent incidents</div>
                    )}
                  </div>
                </div>

                {/* Recent Inspections */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Inspections</h2>
                  </div>
                  <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-80 overflow-y-auto">
                    {safetyReport.inspections.recentInspections && safetyReport.inspections.recentInspections.length > 0 ? (
                      safetyReport.inspections.recentInspections.map(inspection => (
                        <div key={inspection.id} className="p-3">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">{inspection.templateName}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              inspection.status === 'PASSED' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                              inspection.status === 'FAILED' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                              'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                            }`}>{inspection.status}</span>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{new Date(inspection.date).toLocaleDateString('en-US', { timeZone: 'UTC' })}</div>
                          {inspection.projectName && <div className="text-xs text-blue-600 dark:text-blue-400">{inspection.projectName}</div>}
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{inspection.category}</div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-sm text-gray-400 dark:text-gray-500 text-center">No recent inspections</div>
                    )}
                  </div>
                </div>

                {/* Recent Meetings */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Meetings</h2>
                  </div>
                  <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-80 overflow-y-auto">
                    {safetyReport.meetings.recentMeetings && safetyReport.meetings.recentMeetings.length > 0 ? (
                      safetyReport.meetings.recentMeetings.map(meeting => (
                        <div key={meeting.id} className="p-3">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate max-w-[70%]">{meeting.topic}</span>
                            {meeting.duration && (
                              <span className="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">{meeting.duration} min</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{new Date(meeting.date).toLocaleDateString('en-US', { timeZone: 'UTC' })}</div>
                          {meeting.projectName && <div className="text-xs text-blue-600 dark:text-blue-400">{meeting.projectName}</div>}
                          <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
                            <span>{meeting.attendeeCount} attendees</span>
                            {meeting.location && <span>@ {meeting.location}</span>}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-sm text-gray-400 dark:text-gray-500 text-center">No recent meetings</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Safety Incidents Report */}
          {activeReport === 'safety-incidents' && incidentsReport && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
                  <div className="text-3xl font-bold text-red-600 dark:text-red-400">{incidentsReport?.total || 0}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Total Incidents</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
                  <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{incidentsReport?.openCount || 0}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Open</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">{(incidentsReport?.total || 0) - (incidentsReport?.openCount || 0)}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Closed</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
                  <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{incidentsReport?.byType ? Object.keys(incidentsReport.byType).length : 0}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Incident Types</div>
                </div>
              </div>

              {/* Breakdown Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* By Type */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">By Type</h2>
                  <div className="space-y-2">
                    {incidentsReport?.byType && Object.keys(incidentsReport.byType).length > 0 ? (
                      Object.entries(incidentsReport.byType).map(([type, count]) => (
                        <div key={type} className="flex justify-between items-center text-sm">
                          <span className="text-gray-600 dark:text-gray-400">{type.replace(/_/g, ' ')}</span>
                          <span className="font-medium px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">{count}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-400 dark:text-gray-500 italic">No incident types recorded</div>
                    )}
                  </div>
                </div>

                {/* By Severity */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">By Severity</h2>
                  <div className="space-y-2">
                    {incidentsReport?.bySeverity && Object.keys(incidentsReport.bySeverity).length > 0 ? (
                      Object.entries(incidentsReport.bySeverity).map(([severity, count]) => {
                        const severityColors: Record<string, string> = {
                          'CRITICAL': 'bg-red-500 text-white',
                          'SERIOUS': 'bg-orange-500 text-white',
                          'MODERATE': 'bg-yellow-500 text-gray-900',
                          'MINOR': 'bg-green-500 text-white'
                        }
                        return (
                          <div key={severity} className="flex justify-between items-center text-sm">
                            <span className="text-gray-600 dark:text-gray-400">{severity}</span>
                            <span className={`font-medium px-2 py-0.5 rounded ${severityColors[severity] || 'bg-gray-200 dark:bg-gray-700'}`}>{count}</span>
                          </div>
                        )
                      })
                    ) : (
                      <div className="text-sm text-gray-400 dark:text-gray-500 italic">No severity data</div>
                    )}
                  </div>
                </div>

                {/* By Status */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">By Status</h2>
                  <div className="space-y-2">
                    {incidentsReport?.byStatus && Object.keys(incidentsReport.byStatus).length > 0 ? (
                      Object.entries(incidentsReport.byStatus).map(([status, count]) => (
                        <div key={status} className="flex justify-between items-center text-sm">
                          <span className="text-gray-600 dark:text-gray-400">{status.replace(/_/g, ' ')}</span>
                          <span className="font-medium px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">{count}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-400 dark:text-gray-500 italic">No status data</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Incidents */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Incidents</h2>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {incidentsReport?.recentIncidents && incidentsReport.recentIncidents.length > 0 ? (
                    incidentsReport.recentIncidents.map(incident => (
                      <div key={incident.id} className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-medium text-gray-900 dark:text-gray-100">{incident.type.replace(/_/g, ' ')}</span>
                            <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
                              incident.severity === 'CRITICAL' ? 'bg-red-500 text-white' :
                              incident.severity === 'SERIOUS' ? 'bg-orange-500 text-white' :
                              incident.severity === 'MODERATE' ? 'bg-yellow-500 text-gray-900' :
                              'bg-green-500 text-white'
                            }`}>{incident.severity}</span>
                          </div>
                          <span className="text-sm text-gray-500 dark:text-gray-400">{new Date(incident.date).toLocaleDateString('en-US', { timeZone: 'UTC' })}</span>
                        </div>
                        {incident.projectName && <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">{incident.projectName}</div>}
                        {incident.location && <div className="text-sm text-gray-500 dark:text-gray-400">Location: {incident.location}</div>}
                        {incident.description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{incident.description}</p>}
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">No incidents recorded in this period</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Safety Inspections Report */}
          {activeReport === 'safety-inspections' && inspectionsReport && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{inspectionsReport?.total || 0}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Total Inspections</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">{inspectionsReport?.passRate ? inspectionsReport.passRate.toFixed(1) : 0}%</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Pass Rate</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
                  <div className="text-3xl font-bold text-red-600 dark:text-red-400">{inspectionsReport?.byStatus?.['FAILED'] || 0}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Failed</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
                  <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{inspectionsReport?.byStatus?.['PENDING'] || 0}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Pending</div>
                </div>
              </div>

              {/* Breakdown Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* By Status */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">By Status</h2>
                  <div className="space-y-2">
                    {inspectionsReport?.byStatus && Object.keys(inspectionsReport.byStatus).length > 0 ? (
                      Object.entries(inspectionsReport.byStatus).map(([status, count]) => {
                        const statusColors: Record<string, string> = {
                          'PASSED': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
                          'FAILED': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
                          'PENDING': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
                          'REQUIRES_FOLLOWUP': 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                        }
                        return (
                          <div key={status} className="flex justify-between items-center text-sm">
                            <span className="text-gray-600 dark:text-gray-400">{status.replace(/_/g, ' ')}</span>
                            <span className={`font-medium px-2 py-0.5 rounded ${statusColors[status] || 'bg-gray-200 dark:bg-gray-700'}`}>{count}</span>
                          </div>
                        )
                      })
                    ) : (
                      <div className="text-sm text-gray-400 dark:text-gray-500 italic">No status data</div>
                    )}
                  </div>
                </div>

                {/* By Category */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">By Category</h2>
                  <div className="space-y-2">
                    {inspectionsReport?.byCategory && Object.keys(inspectionsReport.byCategory).length > 0 ? (
                      Object.entries(inspectionsReport.byCategory).map(([category, count]) => (
                        <div key={category} className="flex justify-between items-center text-sm">
                          <span className="text-gray-600 dark:text-gray-400">{category}</span>
                          <span className="font-medium px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">{count}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-400 dark:text-gray-500 italic">No category data</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Inspections */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Inspections</h2>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {inspectionsReport?.recentInspections && inspectionsReport.recentInspections.length > 0 ? (
                    inspectionsReport.recentInspections.map(inspection => (
                      <div key={inspection.id} className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-medium text-gray-900 dark:text-gray-100">{inspection.templateName}</span>
                            <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
                              inspection.status === 'PASSED' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                              inspection.status === 'FAILED' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                              'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                            }`}>{inspection.status}</span>
                          </div>
                          <span className="text-sm text-gray-500 dark:text-gray-400">{new Date(inspection.date).toLocaleDateString('en-US', { timeZone: 'UTC' })}</span>
                        </div>
                        {inspection.projectName && <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">{inspection.projectName}</div>}
                        <div className="text-sm text-gray-500 dark:text-gray-400">Category: {inspection.category}</div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">No inspections recorded in this period</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Safety Meetings Report */}
          {activeReport === 'safety-meetings' && meetingsReport && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">{meetingsReport?.total || 0}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Total Meetings</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{meetingsReport?.totalAttendees || 0}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Total Attendees</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{meetingsReport?.averageAttendance ? meetingsReport.averageAttendance.toFixed(1) : 0}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Avg Attendance</div>
                </div>
              </div>

              {/* Meetings by Topic */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Meetings by Topic</h2>
                <div className="space-y-2">
                  {meetingsReport?.byTopic && Object.keys(meetingsReport.byTopic).length > 0 ? (
                    Object.entries(meetingsReport.byTopic)
                      .sort(([, a], [, b]) => b - a)
                      .map(([topic, count]) => (
                        <div key={topic} className="flex justify-between items-center text-sm">
                          <span className="text-gray-600 dark:text-gray-400 truncate max-w-[70%]">{topic}</span>
                          <span className="font-medium px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">{count}</span>
                        </div>
                      ))
                  ) : (
                    <div className="text-sm text-gray-400 dark:text-gray-500 italic">No topic data</div>
                  )}
                </div>
              </div>

              {/* Recent Meetings */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Meetings</h2>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {meetingsReport?.recentMeetings && meetingsReport.recentMeetings.length > 0 ? (
                    meetingsReport.recentMeetings.map(meeting => (
                      <div key={meeting.id} className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <span className="font-medium text-gray-900 dark:text-gray-100">{meeting.topic}</span>
                            {meeting.duration && (
                              <span className="ml-2 text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">{meeting.duration} min</span>
                            )}
                          </div>
                          <span className="text-sm text-gray-500 dark:text-gray-400">{new Date(meeting.date).toLocaleDateString('en-US', { timeZone: 'UTC' })}</span>
                        </div>
                        {meeting.projectName && <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">{meeting.projectName}</div>}
                        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                          <span>{meeting.attendeeCount} attendees</span>
                          {meeting.location && <span>@ {meeting.location}</span>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">No meetings recorded in this period</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Daily Logs Report */}
          {activeReport === 'daily-logs' && dailyLogsReport && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{dailyLogsReport?.total || 0}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Total Logs</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{dailyLogsReport?.totalHours || 0}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Total Hours</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">{dailyLogsReport?.totalWorkers || 0}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Total Workers</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
                  <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{dailyLogsReport?.byProject?.length || 0}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Projects</div>
                </div>
              </div>

              {/* Breakdown Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* By Project */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Logs by Project</h2>
                  <div className="space-y-3">
                    {dailyLogsReport?.byProject && dailyLogsReport.byProject.length > 0 ? (
                      dailyLogsReport.byProject.map(project => (
                        <div key={project.id}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-gray-900 dark:text-gray-100">{project.name}</span>
                            <span className="text-blue-600 dark:text-blue-400 font-medium">{project.count} logs</span>
                          </div>
                          <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-blue-500 rounded-full h-2"
                              style={{ width: `${(project.count / (dailyLogsReport?.total || 1)) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-400 dark:text-gray-500 italic">No project data</div>
                    )}
                  </div>
                </div>

                {/* By Status */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">By Status</h2>
                  <div className="space-y-2">
                    {dailyLogsReport?.byStatus && Object.keys(dailyLogsReport.byStatus).length > 0 ? (
                      Object.entries(dailyLogsReport.byStatus).map(([status, count]) => {
                        const statusColors: Record<string, string> = {
                          'APPROVED': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
                          'SUBMITTED': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
                          'DRAFT': 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }
                        return (
                          <div key={status} className="flex justify-between items-center text-sm">
                            <span className="text-gray-600 dark:text-gray-400">{status}</span>
                            <span className={`font-medium px-2 py-0.5 rounded ${statusColors[status] || 'bg-gray-200 dark:bg-gray-700'}`}>{count}</span>
                          </div>
                        )
                      })
                    ) : (
                      <div className="text-sm text-gray-400 dark:text-gray-500 italic">No status data</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Logs */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Daily Logs</h2>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {dailyLogsReport?.recentLogs && dailyLogsReport.recentLogs.length > 0 ? (
                    dailyLogsReport.recentLogs.map(log => (
                      <div key={log.id} className={`p-4 ${log.weatherDelay ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 dark:text-gray-100">{log.projectName}</span>
                              {log.weatherDelay && (
                                <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded">Weather Delay</span>
                              )}
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              log.status === 'APPROVED' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                              log.status === 'SUBMITTED' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                              'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}>{log.status}</span>
                          </div>
                          <span className="text-sm text-gray-500 dark:text-gray-400">{new Date(log.date).toLocaleDateString('en-US', { timeZone: 'UTC' })}</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mt-2">
                          <span>Submitted by {log.submitterName}</span>
                          {log.totalHours > 0 && <span>{log.totalHours}h logged</span>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">No daily logs recorded in this period</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
