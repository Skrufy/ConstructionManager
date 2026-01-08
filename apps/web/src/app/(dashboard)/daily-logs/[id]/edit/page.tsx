'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  MapPin,
  Users,
  Cloud,
  CloudOff,
  CheckCircle,
  Package,
  AlertTriangle,
  UserCheck,
  Sun,
  CloudRain,
  Thermometer,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DEFAULT_LABELS } from '@/lib/utils'
import { useSettings } from '@/components/providers/settings-provider'
import { useSession } from '@/hooks/useSession'

interface Project {
  id: string
  name: string
  gps_latitude?: number
  gps_longitude?: number
}

interface WorkEntry {
  id: string
  activity: string
  locationBuilding: string
  locationFloor: string
  locationZone: string
  status: string
  percentComplete: number
  notes: string
}

interface MaterialEntry {
  id: string
  material: string
  quantity: number
  unit: string
  notes: string
}

interface IssueEntry {
  id: string
  issueType: string
  delayHours: number
  description: string
}

interface VisitorEntry {
  id: string
  visitorType: string
  time: string
  result: string
  notes: string
}

interface WeatherData {
  temp: number
  conditions: string
  humidity: number
  wind: number
}

const UNITS = ['units', 'sq ft', 'linear ft', 'cubic yards', 'tons', 'bags', 'pallets', 'boxes', 'gallons']

export default function EditDailyLogPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  // Settings hooks for module visibility
  const { data: session } = useSession()
  const userRole = session?.user?.role || 'FIELD_WORKER'
  const { isActivitiesEnabled, isModuleVisibleForRole, isBuildingInfoHidden } = useSettings()
  const activitiesEnabled = isActivitiesEnabled()
  const hideBuildingInfo = isBuildingInfoHidden()
  const isTimeTrackingEnabled = isModuleVisibleForRole('moduleTimeTracking', userRole)

  const [initialLoading, setInitialLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState('')
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')
  const [logStatus, setLogStatus] = useState('DRAFT')
  const [crewCount, setCrewCount] = useState(0)
  const [totalHours, setTotalHours] = useState(0)

  // Work entries
  const [workEntries, setWorkEntries] = useState<WorkEntry[]>([])
  const [currentEntry, setCurrentEntry] = useState<Partial<WorkEntry>>({})
  const [showEntryForm, setShowEntryForm] = useState(false)

  // Materials
  const [materials, setMaterials] = useState<MaterialEntry[]>([])
  const [currentMaterial, setCurrentMaterial] = useState<Partial<MaterialEntry>>({ unit: 'units' })
  const [showMaterialForm, setShowMaterialForm] = useState(false)

  // Issues
  const [issues, setIssues] = useState<IssueEntry[]>([])
  const [currentIssue, setCurrentIssue] = useState<Partial<IssueEntry>>({})
  const [showIssueForm, setShowIssueForm] = useState(false)

  // Visitors
  const [visitors, setVisitors] = useState<VisitorEntry[]>([])
  const [currentVisitor, setCurrentVisitor] = useState<Partial<VisitorEntry>>({})
  const [showVisitorForm, setShowVisitorForm] = useState(false)

  // Weather
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loadingWeather, setLoadingWeather] = useState(false)
  const [weatherDelay, setWeatherDelay] = useState(false)

  // Fetch projects
  useEffect(() => {
    fetch('/api/projects')
      .then((res) => res.json())
      .then((data) => setProjects(data.projects || []))
      .catch(console.error)
  }, [])

  // Fetch existing daily log data
  useEffect(() => {
    if (!id) return

    fetch(`/api/daily-logs/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.dailyLog) {
          const log = data.dailyLog
          setSelectedProject(log.projectId)
          setDate(new Date(log.date).toISOString().split('T')[0])
          setNotes(log.notes || '')
          setLogStatus(log.status)
          setCrewCount(log.crewCount || 0)
          setTotalHours(log.totalHours || 0)
          setWeatherDelay(log.weatherDelay || false)

          // Set weather data (already parsed from JSONB)
          if (log.weatherData && typeof log.weatherData === 'object') {
            const wd = log.weatherData as Record<string, unknown>
            if (typeof wd.temp === 'number' && typeof wd.conditions === 'string') {
              setWeather({
                temp: wd.temp,
                conditions: wd.conditions,
                humidity: typeof wd.humidity === 'number' ? wd.humidity : 0,
                wind: typeof wd.wind === 'number' ? wd.wind : 0,
              })
            }
          }

          // Convert entries to form format
          const formEntries: WorkEntry[] = log.entries.map((e: any) => {
            const locationLabels = (e.locationLabels as unknown as string[] | null) || []
            return {
              id: e.id,
              activity: e.activityLabel?.name || '',
              locationBuilding: locationLabels[0] || '',
              locationFloor: locationLabels[1] || '',
              locationZone: locationLabels[2] || '',
              status: e.statusLabel?.name || 'In Progress',
              percentComplete: e.percentComplete || 0,
              notes: e.notes || '',
            }
          })
          setWorkEntries(formEntries)

          // Convert materials
          const formMaterials: MaterialEntry[] = log.materials.map((m: any) => ({
            id: m.id,
            material: m.materialLabel?.name || '',
            quantity: m.quantity,
            unit: m.unit || 'units',
            notes: m.notes || '',
          }))
          setMaterials(formMaterials)

          // Convert issues
          const formIssues: IssueEntry[] = log.issues.map((i: any) => ({
            id: i.id,
            issueType: i.issueLabel?.name || '',
            delayHours: i.delayHours || 0,
            description: i.description || '',
          }))
          setIssues(formIssues)

          // Convert visitors
          const formVisitors: VisitorEntry[] = log.visitors.map((v: any) => ({
            id: v.id,
            visitorType: v.visitorLabel?.name || '',
            time: v.visitTime ? new Date(v.visitTime).toTimeString().slice(0, 5) : '',
            result: v.result || 'N/A',
            notes: v.notes || '',
          }))
          setVisitors(formVisitors)
        }
      })
      .catch((err) => {
        console.error('Error fetching daily log:', err)
        setError('Failed to load daily log')
      })
      .finally(() => setInitialLoading(false))
  }, [id])

  // Fetch weather when project changes
  useEffect(() => {
    if (selectedProject && projects.length > 0) {
      const project = projects.find(p => p.id === selectedProject)
      if (project?.gps_latitude && project?.gps_longitude) {
        fetchWeather(project.gps_latitude, project.gps_longitude)
      }
    }
  }, [selectedProject, projects])

  const fetchWeather = async (lat: number, lng: number) => {
    setLoadingWeather(true)
    try {
      const response = await fetch(`/api/weather?lat=${lat}&lng=${lng}`)
      if (response.ok) {
        const data = await response.json()
        // Map API response to our interface
        setWeather({
          temp: data.temperature,
          conditions: data.condition,
          humidity: data.humidity,
          wind: data.windSpeed,
        })
      }
    } catch (error) {
      console.error('Weather fetch error:', error)
    } finally {
      setLoadingWeather(false)
    }
  }

  // Work entry handlers
  const addWorkEntry = () => {
    if (!currentEntry.activity) return
    setWorkEntries((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        activity: currentEntry.activity || '',
        locationBuilding: currentEntry.locationBuilding || '',
        locationFloor: currentEntry.locationFloor || '',
        locationZone: currentEntry.locationZone || '',
        status: currentEntry.status || 'In Progress',
        percentComplete: currentEntry.percentComplete || 0,
        notes: currentEntry.notes || '',
      },
    ])
    setCurrentEntry({})
    setShowEntryForm(false)
  }

  // Material handlers
  const addMaterial = () => {
    if (!currentMaterial.material || !currentMaterial.quantity) return
    setMaterials((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        material: currentMaterial.material || '',
        quantity: currentMaterial.quantity || 0,
        unit: currentMaterial.unit || 'units',
        notes: currentMaterial.notes || '',
      },
    ])
    setCurrentMaterial({ unit: 'units' })
    setShowMaterialForm(false)
  }

  // Issue handlers
  const addIssue = () => {
    if (!currentIssue.issueType) return
    setIssues((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        issueType: currentIssue.issueType || '',
        delayHours: currentIssue.delayHours || 0,
        description: currentIssue.description || '',
      },
    ])
    setCurrentIssue({})
    setShowIssueForm(false)
  }

  // Visitor handlers
  const addVisitor = () => {
    if (!currentVisitor.visitorType) return
    setVisitors((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        visitorType: currentVisitor.visitorType || '',
        time: currentVisitor.time || new Date().toTimeString().slice(0, 5),
        result: currentVisitor.result || 'N/A',
        notes: currentVisitor.notes || '',
      },
    ])
    setCurrentVisitor({})
    setShowVisitorForm(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProject) {
      setError('Please select a project')
      return
    }

    // Validate notes required when weather delay is selected
    if (weatherDelay && !notes.trim()) {
      setError('Notes are required when reporting a weather delay')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/daily-logs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject,
          date,
          notes: notes || null,
          weatherDelayNotes: weatherDelay ? notes : null,
          entries: workEntries,
          materials,
          issues,
          visitors,
          weatherData: weather,
          status: logStatus,
          crewCount,
          totalHours,
          weatherDelay,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update daily log')
      }

      router.push(`/daily-logs/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/daily-logs/${id}`} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Edit Daily Log</h1>
          <p className="text-gray-600 dark:text-gray-400">Update daily log details</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-lg">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="project" className="label">Project *</label>
              <select
                id="project"
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="input mt-1"
                required
              >
                <option value="">Select a project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="date" className="label">Date *</label>
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input mt-1"
                required
              />
            </div>
          </div>

          {/* Weather Display */}
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Weather (Auto-populated)</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                {loadingWeather ? (
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                ) : weather ? (
                  <>
                    {weather.conditions?.toLowerCase().includes('rain') ? (
                      <CloudRain className="h-4 w-4 text-blue-500" />
                    ) : (
                      <Sun className="h-4 w-4 text-yellow-500" />
                    )}
                    <span className="text-gray-600 dark:text-gray-400">{weather.conditions || 'Unknown'}</span>
                  </>
                ) : (
                  <>
                    <Cloud className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">Select project</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-red-400" />
                <span className="text-gray-600 dark:text-gray-400">
                  {weather ? `${weather.temp}°F` : '--'}
                </span>
              </div>
            </div>
          </div>

          {/* Weather Delay Section */}
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <CloudOff className={cn(
                'h-5 w-5',
                weatherDelay ? 'text-amber-600' : 'text-gray-400'
              )} />
              <span className="font-medium text-gray-700 dark:text-gray-300">Weather Delay</span>
            </div>

            <button
              type="button"
              onClick={() => setWeatherDelay(!weatherDelay)}
              className={cn(
                'w-full p-3 rounded-lg border-2 text-left transition-all font-medium flex items-center justify-between',
                weatherDelay
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                  : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
              )}
            >
              <span>{weatherDelay ? 'Yes, there was a weather delay' : 'No weather delays'}</span>
              <div className={cn(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                weatherDelay
                  ? 'bg-amber-500 border-amber-500'
                  : 'border-gray-300 bg-white'
              )}>
                {weatherDelay && <Check className="h-3 w-3 text-white" />}
              </div>
            </button>

            {weatherDelay && (
              <p className="mt-2 text-sm text-amber-600">
                Please describe the weather delay in the Notes section below.
              </p>
            )}
          </div>

          {/* Crew & Hours - Only show if time tracking is enabled */}
          {isTimeTrackingEnabled && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label htmlFor="crewCount" className="label">Crew Count</label>
                <input
                  id="crewCount"
                  type="number"
                  min="0"
                  value={crewCount}
                  onChange={(e) => setCrewCount(parseInt(e.target.value) || 0)}
                  className="input mt-1"
                  placeholder="Number of workers on site"
                />
              </div>
              <div>
                <label htmlFor="totalHours" className="label">Total Labor Hours</label>
                <input
                  id="totalHours"
                  type="number"
                  min="0"
                  step="0.5"
                  value={totalHours}
                  onChange={(e) => setTotalHours(parseFloat(e.target.value) || 0)}
                  className="input mt-1"
                  placeholder="Total hours worked"
                />
              </div>
            </div>
          )}
        </div>

        {/* Work Entries - Only show if activities are enabled */}
        {activitiesEnabled && (
          <div className="card p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Work Activities
              </h2>
              <button
                type="button"
                onClick={() => setShowEntryForm(true)}
                className="btn btn-primary px-4 py-2 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Entry
              </button>
            </div>

            {workEntries.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>No work entries yet. Click &quot;Add Entry&quot; to start.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {workEntries.map((entry) => (
                  <div key={entry.id} className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="font-medium">{entry.activity}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">({entry.percentComplete}%)</span>
                      </div>
                      {!hideBuildingInfo && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {[entry.locationBuilding, entry.locationFloor, entry.locationZone].filter(Boolean).join(' > ') || 'No location'}
                        </div>
                      )}
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                        entry.status === 'Completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                        entry.status === 'In Progress' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}>{entry.status}</span>
                    </div>
                    <button type="button" onClick={() => setWorkEntries(prev => prev.filter(e => e.id !== entry.id))} className="p-1 text-gray-400 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Materials Section */}
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-500" />
              Materials Used
            </h2>
            <button
              type="button"
              onClick={() => setShowMaterialForm(true)}
              className="btn btn-outline px-4 py-2 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Material
            </button>
          </div>

          {materials.length === 0 ? (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400">
              <p>No materials logged. Click &quot;Add Material&quot; to track usage.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {materials.map((mat) => (
                <div key={mat.id} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
                  <div>
                    <span className="font-medium">{mat.material}</span>
                    <span className="ml-2 text-gray-600 dark:text-gray-400">{mat.quantity} {mat.unit}</span>
                    {mat.notes && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{mat.notes}</p>}
                  </div>
                  <button type="button" onClick={() => setMaterials(prev => prev.filter(m => m.id !== mat.id))} className="p-1 text-gray-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Issues/Delays Section */}
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Issues & Delays
            </h2>
            <button
              type="button"
              onClick={() => setShowIssueForm(true)}
              className="btn btn-outline px-4 py-2 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Issue
            </button>
          </div>

          {issues.length === 0 ? (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400">
              <p>No issues reported. Click &quot;Add Issue&quot; if there were any delays.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {issues.map((issue) => (
                <div key={issue.id} className="flex items-start justify-between p-3 bg-red-50 dark:bg-red-900/30 rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-red-800">{issue.issueType}</span>
                      {issue.delayHours > 0 && (
                        <span className="text-sm text-red-600">({issue.delayHours}h delay)</span>
                      )}
                    </div>
                    {issue.description && <p className="text-sm text-red-700 mt-1">{issue.description}</p>}
                  </div>
                  <button type="button" onClick={() => setIssues(prev => prev.filter(i => i.id !== issue.id))} className="p-1 text-gray-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Visitors Section */}
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-blue-500" />
              Visitors
            </h2>
            <button
              type="button"
              onClick={() => setShowVisitorForm(true)}
              className="btn btn-outline px-4 py-2 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Visitor
            </button>
          </div>

          {visitors.length === 0 ? (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400">
              <p>No visitors logged. Click &quot;Add Visitor&quot; to record visits.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {visitors.map((visitor) => (
                <div key={visitor.id} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{visitor.visitorType}</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">@ {visitor.time}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        visitor.result === 'PASSED' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                        visitor.result === 'FAILED' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}>{visitor.result}</span>
                    </div>
                    {visitor.notes && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{visitor.notes}</p>}
                  </div>
                  <button type="button" onClick={() => setVisitors(prev => prev.filter(v => v.id !== visitor.id))} className="p-1 text-gray-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* General Notes */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Notes {weatherDelay ? <span className="text-red-500">*</span> : ''}
          </h2>
          {weatherDelay && (
            <p className="text-sm text-amber-600 mb-3">
              Please describe the weather conditions and how they impacted work.
            </p>
          )}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={cn(
              "input",
              weatherDelay && !notes.trim() && "border-amber-400 focus:ring-amber-500"
            )}
            rows={4}
            placeholder={weatherDelay
              ? "Describe the weather conditions and impact on work..."
              : "Any additional notes for the day..."}
            required={weatherDelay}
          />
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <Link href={`/daily-logs/${id}`} className="btn btn-outline flex-1 py-3">Cancel</Link>
          <button type="submit" disabled={loading} className="btn btn-primary flex-1 py-3">
            {loading ? (<><Loader2 className="animate-spin h-5 w-5 mr-2" />Saving...</>) : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* Work Entry Modal */}
      {showEntryForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Add Work Entry</h3>
              <div>
                <label className="label mb-2 block">Activity *</label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_LABELS.ACTIVITY.map((activity) => (
                    <button key={activity} type="button" onClick={() => setCurrentEntry((p) => ({ ...p, activity }))}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentEntry.activity === activity ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                      {activity}
                    </button>
                  ))}
                </div>
              </div>
              {!hideBuildingInfo && (
                <>
                  <div>
                    <label className="label mb-2 block">Building</label>
                    <div className="flex flex-wrap gap-2">
                      {DEFAULT_LABELS.LOCATION_BUILDING.map((loc) => (
                        <button key={loc} type="button" onClick={() => setCurrentEntry((p) => ({ ...p, locationBuilding: loc }))}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentEntry.locationBuilding === loc ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                          {loc}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="label mb-2 block">Floor</label>
                    <div className="flex flex-wrap gap-2">
                      {DEFAULT_LABELS.LOCATION_FLOOR.map((loc) => (
                        <button key={loc} type="button" onClick={() => setCurrentEntry((p) => ({ ...p, locationFloor: loc }))}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentEntry.locationFloor === loc ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                          {loc}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <div>
                <label className="label mb-2 block">Status</label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_LABELS.STATUS.map((status) => (
                    <button key={status} type="button" onClick={() => setCurrentEntry((p) => ({ ...p, status }))}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentEntry.status === status ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                      {status}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">% Complete</label>
                <input type="range" min="0" max="100" step="5" value={currentEntry.percentComplete || 0}
                  onChange={(e) => setCurrentEntry((p) => ({ ...p, percentComplete: parseInt(e.target.value) }))} className="w-full mt-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">{currentEntry.percentComplete || 0}%</p>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea value={currentEntry.notes || ''} onChange={(e) => setCurrentEntry((p) => ({ ...p, notes: e.target.value }))}
                  className="input mt-1" rows={2} placeholder="Optional notes..." />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowEntryForm(false); setCurrentEntry({}) }} className="btn btn-outline flex-1 py-2">Cancel</button>
                <button type="button" onClick={addWorkEntry} disabled={!currentEntry.activity} className="btn btn-primary flex-1 py-2">Add Entry</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Material Modal */}
      {showMaterialForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Add Material</h3>
              <div>
                <label className="label mb-2 block">Material Type *</label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_LABELS.MATERIAL.map((mat) => (
                    <button key={mat} type="button" onClick={() => setCurrentMaterial((p) => ({ ...p, material: mat }))}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentMaterial.material === mat ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                      {mat}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Quantity *</label>
                  <input type="number" min="0" step="0.1" value={currentMaterial.quantity || ''} onChange={(e) => setCurrentMaterial((p) => ({ ...p, quantity: parseFloat(e.target.value) }))}
                    className="input mt-1" placeholder="0" />
                </div>
                <div>
                  <label className="label">Unit</label>
                  <select value={currentMaterial.unit} onChange={(e) => setCurrentMaterial((p) => ({ ...p, unit: e.target.value }))} className="input mt-1">
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea value={currentMaterial.notes || ''} onChange={(e) => setCurrentMaterial((p) => ({ ...p, notes: e.target.value }))}
                  className="input mt-1" rows={2} placeholder="Optional notes..." />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowMaterialForm(false); setCurrentMaterial({ unit: 'units' }) }} className="btn btn-outline flex-1 py-2">Cancel</button>
                <button type="button" onClick={addMaterial} disabled={!currentMaterial.material || !currentMaterial.quantity} className="btn btn-primary flex-1 py-2">Add Material</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Issue Modal */}
      {showIssueForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Add Issue/Delay</h3>
              <div>
                <label className="label mb-2 block">Issue Type *</label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_LABELS.ISSUE.map((issue) => (
                    <button key={issue} type="button" onClick={() => setCurrentIssue((p) => ({ ...p, issueType: issue }))}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentIssue.issueType === issue ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                      {issue}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Delay Duration (hours)</label>
                <input type="number" min="0" step="0.5" value={currentIssue.delayHours || ''} onChange={(e) => setCurrentIssue((p) => ({ ...p, delayHours: parseFloat(e.target.value) }))}
                  className="input mt-1" placeholder="0" />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea value={currentIssue.description || ''} onChange={(e) => setCurrentIssue((p) => ({ ...p, description: e.target.value }))}
                  className="input mt-1" rows={3} placeholder="Describe the issue..." />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowIssueForm(false); setCurrentIssue({}) }} className="btn btn-outline flex-1 py-2">Cancel</button>
                <button type="button" onClick={addIssue} disabled={!currentIssue.issueType} className="btn btn-primary flex-1 py-2">Add Issue</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visitor Modal */}
      {showVisitorForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Add Visitor</h3>
              <div>
                <label className="label mb-2 block">Visitor Type *</label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_LABELS.VISITOR.map((visitor) => (
                    <button key={visitor} type="button" onClick={() => setCurrentVisitor((p) => ({ ...p, visitorType: visitor }))}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentVisitor.visitorType === visitor ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                      {visitor}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Time</label>
                  <input type="time" value={currentVisitor.time || ''} onChange={(e) => setCurrentVisitor((p) => ({ ...p, time: e.target.value }))} className="input mt-1" />
                </div>
                <div>
                  <label className="label">Result</label>
                  <select value={currentVisitor.result || 'N/A'} onChange={(e) => setCurrentVisitor((p) => ({ ...p, result: e.target.value }))} className="input mt-1">
                    <option value="N/A">N/A</option>
                    <option value="PASSED">Passed</option>
                    <option value="FAILED">Failed</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea value={currentVisitor.notes || ''} onChange={(e) => setCurrentVisitor((p) => ({ ...p, notes: e.target.value }))}
                  className="input mt-1" rows={2} placeholder="Optional notes..." />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowVisitorForm(false); setCurrentVisitor({}) }} className="btn btn-outline flex-1 py-2">Cancel</button>
                <button type="button" onClick={addVisitor} disabled={!currentVisitor.visitorType} className="btn btn-primary flex-1 py-2">Add Visitor</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
