'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle,
  Building2,
  Check,
  Camera,
  Sun,
  CloudRain,
  CloudOff,
  Thermometer,
  Plus,
  Trash2,
  Users,
  Image as ImageIcon,
} from 'lucide-react'
import { DEFAULT_LABELS, cn } from '@/lib/utils'
import { PhotoCapture } from '@/components/ui/photo-capture'
import { useSettings } from '@/components/providers/settings-provider'
import { useSession } from '@/hooks/useSession'

interface Project {
  id: string
  name: string
  address?: string
  gps_latitude?: number
  gps_longitude?: number
}

interface WorkEntry {
  id: string
  activity: string
  status: string
  percentComplete: number
  notes: string
}

interface WeatherData {
  temp: number
  conditions: string
  humidity: number
  wind: number
}

interface User {
  id: string
  name: string
  role: string
}

export default function NewDailyLogPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('project')
  const { data: session } = useSession()
  const userRole = session?.user?.role || 'FIELD_WORKER'
  const { isActivitiesEnabled, isModuleVisibleForRole } = useSettings()
  const activitiesEnabled = isActivitiesEnabled()
  const isTimeTrackingEnabled = isModuleVisibleForRole('moduleTimeTracking', userRole)

  // Wizard state - 2 steps if activities disabled, 3 if enabled
  const [step, setStep] = useState(1)
  const totalSteps = activitiesEnabled ? 3 : 2

  // Form state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState(projectId || '')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [totalHours, setTotalHours] = useState(0)

  // Crew/Employee selection
  const [users, setUsers] = useState<User[]>([])
  const [selectedCrewIds, setSelectedCrewIds] = useState<string[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  // Work entries
  const [workEntries, setWorkEntries] = useState<WorkEntry[]>([])
  const [selectedActivities, setSelectedActivities] = useState<string[]>([])

  // Weather
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loadingWeather, setLoadingWeather] = useState(false)
  const [weatherDelay, setWeatherDelay] = useState(false)

  // Photos
  const [photos, setPhotos] = useState<File[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)

  useEffect(() => {
    fetch('/api/projects')
      .then((res) => res.json())
      .then((data) => setProjects(data.projects || []))
      .catch(console.error)
  }, [])

  // Fetch weather when project changes
  useEffect(() => {
    console.log('🌤️ Weather effect triggered:', {
      selectedProject,
      projectsCount: projects.length
    })

    if (!selectedProject) {
      console.log('🌤️ No project selected, clearing weather')
      setWeather(null)
      return
    }

    if (projects.length === 0) {
      console.log('🌤️ Projects not loaded yet, waiting...')
      return
    }

    const project = projects.find(p => p.id === selectedProject)
    console.log('🌤️ Found project:', project?.name, {
      hasLat: !!project?.gps_latitude,
      hasLng: !!project?.gps_longitude
    })

    if (project?.gps_latitude && project?.gps_longitude) {
      fetchWeather(project.gps_latitude, project.gps_longitude)
    } else {
      console.log('🌤️ Project missing coordinates')
      setWeather(null)
    }
  }, [selectedProject, projects])

  // Fetch users when project is selected (for crew selection)
  useEffect(() => {
    if (selectedProject) {
      setLoadingUsers(true)
      fetch('/api/users')
        .then(res => res.json())
        .then(data => {
          // API returns array directly or wrapped in users property
          const userList = Array.isArray(data) ? data : (data.users || [])
          setUsers(userList)
        })
        .catch(console.error)
        .finally(() => setLoadingUsers(false))
    }
  }, [selectedProject])

  const fetchWeather = async (lat: number, lng: number) => {
    console.log('🌤️ fetchWeather called with:', { lat, lng })
    setLoadingWeather(true)

    try {
      const response = await fetch(`/api/weather?lat=${lat}&lng=${lng}`)
      console.log('🌤️ Weather API response:', response.status, response.ok)

      if (response.ok) {
        const data = await response.json()
        console.log('🌤️ Weather data received:', data)
        setWeather({
          temp: data.temperature,
          conditions: data.condition,
          humidity: data.humidity,
          wind: data.windSpeed,
        })
      } else {
        console.error('🌤️ Weather API returned non-OK status:', response.status)
        setWeather(null)
      }
    } catch (error) {
      console.error('🌤️ Weather fetch error:', error)
      setWeather(null)
    } finally {
      setLoadingWeather(false)
    }
  }

  const toggleActivity = (activity: string) => {
    setSelectedActivities(prev =>
      prev.includes(activity)
        ? prev.filter(a => a !== activity)
        : [...prev, activity]
    )
  }

  const toggleCrewMember = (userId: string) => {
    setSelectedCrewIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleNext = () => {
    if (step === 1 && !selectedProject) {
      setError('Please select a project')
      return
    }
    // Only validate activities if activities are enabled
    if (activitiesEnabled && step === 2 && selectedActivities.length === 0) {
      setError('Please select at least one activity')
      return
    }
    setError('')

    // Convert selected activities to work entries when moving from activities step
    if (activitiesEnabled && step === 2) {
      setWorkEntries(selectedActivities.map(activity => ({
        id: Date.now().toString() + activity,
        activity,
        status: 'In Progress',
        percentComplete: 50,
        notes: '',
      })))
    }

    setStep(s => Math.min(s + 1, totalSteps))
  }

  const handleBack = () => {
    setError('')
    setStep(s => Math.max(s - 1, 1))
  }

  const updateEntryPercent = (entryId: string, percent: number) => {
    setWorkEntries(prev => prev.map(entry =>
      entry.id === entryId ? { ...entry, percentComplete: percent } : entry
    ))
  }

  const uploadPhotos = async (dailyLogId: string): Promise<string[]> => {
    const uploadedPaths: string[] = []

    for (const photo of photos) {
      const formData = new FormData()
      formData.append('file', photo)
      formData.append('projectId', selectedProject)
      formData.append('dailyLogId', dailyLogId)
      formData.append('category', 'PHOTOS')

      try {
        const response = await fetch('/api/files/upload', {
          method: 'POST',
          body: formData,
        })

        if (response.ok) {
          const data = await response.json()
          uploadedPaths.push(data.file?.storagePath || data.storagePath)
        }
      } catch (err) {
        console.error('Error uploading photo:', err)
      }
    }

    return uploadedPaths
  }

  const handleSubmit = async () => {
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
      // Create daily log first
      const response = await fetch('/api/daily-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject,
          date,
          notes: notes || null,
          weatherDelayNotes: weatherDelay ? notes : null,
          entries: workEntries,
          materials: [],
          issues: [],
          visitors: [],
          weatherData: weather,
          status: 'SUBMITTED',
          crewCount: selectedCrewIds.length,
          totalHours,
          crewMembers: selectedCrewIds,
          weatherDelay,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create daily log')
      }

      // Upload photos if any
      if (photos.length > 0) {
        setUploadingPhotos(true)
        await uploadPhotos(data.dailyLog.id)
        setUploadingPhotos(false)
      }

      // Redirect to daily logs list with cache busting
      router.push(`/daily-logs?_t=${Date.now()}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
      setUploadingPhotos(false)
    }
  }

  const selectedProjectData = projects.find(p => p.id === selectedProject)

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/daily-logs" className="p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700">
          <ArrowLeft className="h-6 w-6 text-gray-900 dark:text-gray-100" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">New Daily Log</h1>
          <p className="text-gray-700 dark:text-gray-300">Step {step} of {totalSteps}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex gap-2 mb-8">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
          <div
            key={s}
            className={cn(
              'h-2 flex-1 rounded-full transition-colors',
              s <= step ? 'bg-primary-600' : 'bg-gray-200'
            )}
          />
        ))}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6 font-medium">
          {error}
        </div>
      )}

      {/* Step 1: Project Selection */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Which project are you logging?
            </h2>
            <p className="text-gray-600 dark:text-gray-400">Select your work site for today</p>
          </div>

          <div className="tap-card-grid grid-cols-1">
            {projects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => setSelectedProject(project.id)}
                className={cn(
                  'tap-card',
                  selectedProject === project.id && 'tap-card-selected'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center',
                      selectedProject === project.id ? 'bg-primary-600 text-white' : 'bg-gray-100'
                    )}>
                      <Building2 className="h-6 w-6" />
                    </div>
                    <div className="text-left">
                      <span className="text-lg font-bold text-gray-900 dark:text-gray-100 block">
                        {project.name}
                      </span>
                      {project.address && (
                        <span className="text-gray-600 dark:text-gray-400">{project.address}</span>
                      )}
                    </div>
                  </div>
                  {selectedProject === project.id && (
                    <Check className="h-7 w-7 text-primary-600" />
                  )}
                </div>
              </button>
            ))}
          </div>

          {projects.length === 0 && (
            <p className="text-center text-gray-500 py-8 text-lg">
              No projects available
            </p>
          )}

          {/* Weather Preview */}
          {selectedProjectData && (
            <div className="card p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700 dark:text-gray-300">Today's Weather</span>
                {loadingWeather ? (
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                ) : weather ? (
                  <div className="flex items-center gap-3">
                    {weather.conditions?.toLowerCase().includes('rain') ? (
                      <CloudRain className="h-6 w-6 text-blue-500" />
                    ) : (
                      <Sun className="h-6 w-6 text-yellow-500" />
                    )}
                    <span className="font-semibold">{weather.temp}°F</span>
                    <span className="text-gray-600 dark:text-gray-400">{weather.conditions}</span>
                  </div>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">Weather unavailable</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Activity Selection (only when activities are enabled) */}
      {activitiesEnabled && step === 2 && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              What did you work on?
            </h2>
            <p className="text-gray-600 dark:text-gray-400">Select all activities (tap to select)</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {DEFAULT_LABELS.ACTIVITY.map((activity) => (
              <button
                key={activity}
                type="button"
                onClick={() => toggleActivity(activity)}
                className={cn(
                  'p-4 rounded-xl border-2 text-left transition-all font-medium',
                  selectedActivities.includes(activity)
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                )}
              >
                <div className="flex items-center gap-2">
                  {selectedActivities.includes(activity) && (
                    <Check className="h-5 w-5 text-primary-600" />
                  )}
                  <span>{activity}</span>
                </div>
              </button>
            ))}
          </div>

          {selectedActivities.length > 0 && (
            <div className="card p-4 bg-primary-50 border-primary-200">
              <p className="font-semibold text-primary-700">
                {selectedActivities.length} {selectedActivities.length === 1 ? 'activity' : 'activities'} selected
              </p>
            </div>
          )}
        </div>
      )}

      {/* Step 3 (or Step 2 when activities disabled): Review & Notes */}
      {step === totalSteps && (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Final Details
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {selectedProjectData?.name} - {new Date(date).toLocaleDateString()}
            </p>
          </div>

          {/* Weather Delay Section */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                weatherDelay ? 'bg-amber-100' : 'bg-gray-100'
              )}>
                <CloudOff className={cn(
                  'h-5 w-5',
                  weatherDelay ? 'text-amber-600' : 'text-gray-500'
                )} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Weather Delay</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Was work impacted by weather today?</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setWeatherDelay(!weatherDelay)}
              className={cn(
                'w-full p-4 rounded-xl border-2 text-left transition-all font-medium flex items-center justify-between',
                weatherDelay
                  ? 'border-amber-500 bg-amber-50 text-amber-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              )}
            >
              <span>{weatherDelay ? 'Yes, there was a weather delay' : 'No weather delays'}</span>
              <div className={cn(
                'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors',
                weatherDelay
                  ? 'bg-amber-500 border-amber-500'
                  : 'border-gray-300 bg-white'
              )}>
                {weatherDelay && <Check className="h-4 w-4 text-white" />}
              </div>
            </button>

            {weatherDelay && (
              <p className="mt-3 text-sm text-amber-600">
                Please describe the weather delay in the Notes section below.
              </p>
            )}
          </div>

          {/* Crew Selection - Only show if time tracking is enabled */}
          {isTimeTrackingEnabled && (
            <div className="card p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                Crew On Site
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Select all workers who were on site today</p>

              {loadingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : users.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">No users available</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {users.map(user => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => toggleCrewMember(user.id)}
                      className={cn(
                        'p-3 rounded-xl text-left transition-all border-2',
                        selectedCrewIds.includes(user.id)
                          ? 'bg-primary-100 border-primary-600 text-primary-700'
                          : 'bg-gray-50 border-transparent text-gray-700 hover:bg-gray-100'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {selectedCrewIds.includes(user.id) && (
                          <Check className="h-4 w-4 text-primary-600 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <span className="font-medium block truncate">{user.name}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{user.role.replace(/_/g, ' ')}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedCrewIds.length > 0 && (
                <div className="mt-4 p-3 bg-primary-50 rounded-xl">
                  <p className="font-semibold text-primary-700">
                    {selectedCrewIds.length} crew member{selectedCrewIds.length !== 1 ? 's' : ''} selected
                  </p>
                </div>
              )}

              {/* Total Hours */}
              <div className="mt-4 pt-4 border-t">
                <label className="label mb-2 block">Total Labor Hours (Optional)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={totalHours || ''}
                  onChange={(e) => setTotalHours(parseFloat(e.target.value) || 0)}
                  className="input w-40"
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Combined hours worked by all crew</p>
              </div>
            </div>
          )}

          {/* Activity Completion - Only show if activities are enabled */}
          {activitiesEnabled && (
            <div className="card p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Activity Completion</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Set the completion % for each activity</p>
              <div className="space-y-4">
                {workEntries.map((entry) => (
                  <div key={entry.id} className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-900 dark:text-gray-100">{entry.activity}</span>
                      <span className="text-lg font-bold text-primary-600">{entry.percentComplete}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={entry.percentComplete}
                      onChange={(e) => updateEntryPercent(entry.id, parseInt(e.target.value))}
                      className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>Not Started</span>
                      <span>Complete</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="card p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              Notes {weatherDelay ? <span className="text-red-500">*</span> : '(Optional)'}
            </h3>
            {weatherDelay && (
              <p className="text-sm text-amber-600 mb-3">
                Please describe the weather conditions and how they impacted work.
              </p>
            )}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={cn(
                "input min-h-[120px]",
                weatherDelay && !notes.trim() && "border-amber-400 focus:ring-amber-500"
              )}
              placeholder={weatherDelay
                ? "Describe the weather conditions and impact on work..."
                : "Any additional notes about today's work..."}
              required={weatherDelay}
            />
          </div>

          {/* Photo Upload */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <ImageIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Site Photos</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Document your work with photos</p>
              </div>
            </div>

            <PhotoCapture
              photos={photos}
              onPhotosChange={setPhotos}
              maxPhotos={10}
            />
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-3 mt-8">
        {step > 1 && (
          <button
            type="button"
            onClick={handleBack}
            className="btn btn-outline flex-1"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back
          </button>
        )}

        {step < totalSteps ? (
          <button
            type="button"
            onClick={handleNext}
            className="btn btn-primary flex-1"
          >
            Continue
            <ArrowRight className="h-5 w-5 ml-2" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || uploadingPhotos}
            className="btn btn-lg btn-success flex-1"
          >
            {loading || uploadingPhotos ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                {uploadingPhotos ? 'Uploading photos...' : 'Saving...'}
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                Save Daily Log
                {photos.length > 0 && ` (${photos.length} photos)`}
              </>
            )}
          </button>
        )}
      </div>

      {/* Cancel Link */}
      <div className="text-center mt-6">
        <Link
          href="/daily-logs"
          className="text-gray-600 hover:text-gray-900 dark:text-gray-100 font-medium"
        >
          Cancel
        </Link>
      </div>
    </div>
  )
}
