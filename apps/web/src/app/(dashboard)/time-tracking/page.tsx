'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@/hooks/useSession'
import {
  Clock,
  Play,
  Square,
  MapPin,
  Calendar,
  Loader2,
  CheckCircle,
  Building2,
  Check,
} from 'lucide-react'
import { formatDate, formatTime, calculateHours, cn } from '@/lib/utils'

interface Project {
  id: string
  name: string
  address?: string
}

interface TimeEntry {
  id: string
  projectId: string
  clockIn: string
  clockOut: string | null
  status: string
  project: { name: string }
  user: { name: string }
}

export default function TimeTrackingPage() {
  const { data: session } = useSession()
  const [projects, setProjects] = useState<Project[]>([])
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null)
  const [selectedProject, setSelectedProject] = useState('')
  const [loading, setLoading] = useState(false)
  const [clockingIn, setClockingIn] = useState(false)
  const [clockingOut, setClockingOut] = useState(false)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)

  // UI States
  const [showConfirmClockOut, setShowConfirmClockOut] = useState(false)
  const [showSuccessScreen, setShowSuccessScreen] = useState<'in' | 'out' | null>(null)
  const [successTime, setSuccessTime] = useState('')

  useEffect(() => {
    fetchData()
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        },
        (err) => console.error('Location error:', err)
      )
    }
  }, [])

  // Auto-hide success screen
  useEffect(() => {
    if (showSuccessScreen) {
      const timer = setTimeout(() => setShowSuccessScreen(null), 2500)
      return () => clearTimeout(timer)
    }
  }, [showSuccessScreen])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [projectsRes, entriesRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/time-entries'),
      ])
      const projectsData = await projectsRes.json()
      const entriesData = await entriesRes.json()

      setProjects(projectsData.projects || [])
      setTimeEntries(entriesData.timeEntries || [])

      const active = entriesData.timeEntries?.find(
        (e: TimeEntry) => !e.clockOut
      )
      setActiveEntry(active || null)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClockIn = async () => {
    if (!selectedProject) return

    setClockingIn(true)
    try {
      const response = await fetch('/api/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject,
          gpsInLat: location?.lat,
          gpsInLng: location?.lng,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to clock in')
      }

      setSuccessTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
      setShowSuccessScreen('in')
      await fetchData()
      setSelectedProject('')
    } catch (error) {
      console.error('Clock in error:', error)
      alert(error instanceof Error ? error.message : 'Failed to clock in')
    } finally {
      setClockingIn(false)
    }
  }

  const handleClockOut = async () => {
    if (!activeEntry) return

    setClockingOut(true)
    setShowConfirmClockOut(false)
    try {
      const response = await fetch(`/api/time-entries/${activeEntry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clockOut: new Date().toISOString(),
          gpsOutLat: location?.lat,
          gpsOutLng: location?.lng,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to clock out')
      }

      setSuccessTime(getElapsedTime(activeEntry.clockIn))
      setShowSuccessScreen('out')
      await fetchData()
    } catch (error) {
      console.error('Clock out error:', error)
      alert(error instanceof Error ? error.message : 'Failed to clock out')
    } finally {
      setClockingOut(false)
    }
  }

  const getElapsedTime = (clockIn: string) => {
    const start = new Date(clockIn)
    const now = new Date()
    const hours = calculateHours(start, now)
    const wholeHours = Math.floor(hours)
    const minutes = Math.round((hours - wholeHours) * 60)
    return `${wholeHours}h ${minutes}m`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <>
      {/* Success Screen - Clock In */}
      {showSuccessScreen === 'in' && (
        <div className="success-screen animate-in fade-in duration-300">
          <div className="text-center">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-16 w-16" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Clocked In!</h1>
            <p className="text-xl opacity-90">Started at {successTime}</p>
          </div>
        </div>
      )}

      {/* Success Screen - Clock Out */}
      {showSuccessScreen === 'out' && (
        <div className="fixed inset-0 bg-blue-600 flex flex-col items-center justify-center z-50 text-white animate-in fade-in duration-300">
          <div className="text-center">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-16 w-16" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Clocked Out!</h1>
            <p className="text-xl opacity-90">You worked {successTime} today</p>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmClockOut && activeEntry && (
        <div className="modal-overlay" onClick={() => setShowConfirmClockOut(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Square className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Clock Out?</h2>
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-2">
                You've worked <span className="font-bold text-primary-600 dark:text-primary-400">{getElapsedTime(activeEntry.clockIn)}</span> today
              </p>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                on {activeEntry.project.name}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowConfirmClockOut(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClockOut}
                  disabled={clockingOut}
                  className="btn btn-destructive"
                >
                  {clockingOut ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : null}
                  Clock Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Time Tracking</h1>
          <p className="text-gray-700 dark:text-gray-300">Clock in and out of your work sessions</p>
        </div>

        {/* Clock In/Out Card */}
        <div className="card p-6">
          {activeEntry ? (
            // Currently Clocked In
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                <Clock className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Currently Clocked In
              </h2>
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-1">
                {activeEntry.project.name}
              </p>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Started at {formatTime(activeEntry.clockIn)}
              </p>
              <div className="text-4xl font-bold text-primary-600 dark:text-primary-400 mb-8">
                {getElapsedTime(activeEntry.clockIn)}
              </div>
              <button
                onClick={() => setShowConfirmClockOut(true)}
                disabled={clockingOut}
                className="btn btn-xl btn-destructive w-full max-w-sm mx-auto flex items-center justify-center gap-3"
              >
                {clockingOut ? (
                  <Loader2 className="h-7 w-7 animate-spin" />
                ) : (
                  <Square className="h-7 w-7" />
                )}
                <span>Clock Out</span>
              </button>
            </div>
          ) : (
            // Not Clocked In
            <div>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
                  <Clock className="h-12 w-12 text-gray-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Ready to Clock In?
                </h2>
                {location && (
                  <p className="text-gray-600 dark:text-gray-400 flex items-center justify-center gap-2">
                    <MapPin className="h-5 w-5 text-green-500" />
                    Location detected
                  </p>
                )}
              </div>

              {/* Project Selection - Tap Cards */}
              <div className="mb-6">
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Which project are you working on?
                </p>
                <div className="tap-card-grid grid-cols-1 sm:grid-cols-2">
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
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-10 h-10 rounded-lg flex items-center justify-center',
                            selectedProject === project.id ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700'
                          )}>
                            <Building2 className="h-5 w-5" />
                          </div>
                          <div className="text-left">
                            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100 block">
                              {project.name}
                            </span>
                            {project.address && (
                              <span className="text-sm text-gray-600 dark:text-gray-400">{project.address}</span>
                            )}
                          </div>
                        </div>
                        {selectedProject === project.id && (
                          <Check className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                {projects.length === 0 && (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                    No projects available
                  </p>
                )}
              </div>

              <button
                onClick={handleClockIn}
                disabled={clockingIn || !selectedProject}
                className="btn btn-xl btn-success w-full flex items-center justify-center gap-3"
              >
                {clockingIn ? (
                  <Loader2 className="h-7 w-7 animate-spin" />
                ) : (
                  <Play className="h-7 w-7" />
                )}
                <span>Clock In</span>
              </button>
            </div>
          )}
        </div>

        {/* Recent Time Entries */}
        <div className="card p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Recent Time Entries
          </h2>
          {timeEntries.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400 text-center py-8 text-lg">
              No time entries yet. Clock in to get started!
            </p>
          ) : (
            <div className="space-y-3">
              {timeEntries.slice(0, 5).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${
                      entry.clockOut ? 'bg-gray-100 dark:bg-gray-600' : 'bg-green-100 dark:bg-green-900/30'
                    }`}>
                      <Clock className={`h-6 w-6 ${
                        entry.clockOut ? 'text-gray-500 dark:text-gray-400' : 'text-green-600 dark:text-green-400'
                      }`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                        {entry.project.name}
                      </p>
                      <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(entry.clockIn)}
                        </span>
                        <span>
                          {formatTime(entry.clockIn)}
                          {entry.clockOut && ` - ${formatTime(entry.clockOut)}`}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900 dark:text-gray-100 text-lg">
                      {entry.clockOut
                        ? `${calculateHours(
                            new Date(entry.clockIn),
                            new Date(entry.clockOut)
                          ).toFixed(1)}h`
                        : 'Active'}
                    </p>
                    <span className={`text-sm px-3 py-1 rounded-full font-medium ${
                      entry.status === 'APPROVED' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                      entry.status === 'REJECTED' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                      'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                    }`}>
                      {entry.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Weekly Summary */}
        <div className="card p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            This Week
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-5 bg-primary-50 dark:bg-primary-900/30 rounded-xl">
              <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                {timeEntries
                  .filter((e) => {
                    const entryDate = new Date(e.clockIn)
                    const weekAgo = new Date()
                    weekAgo.setDate(weekAgo.getDate() - 7)
                    return entryDate >= weekAgo && e.clockOut
                  })
                  .reduce((acc, e) => {
                    return acc + calculateHours(
                      new Date(e.clockIn),
                      new Date(e.clockOut!)
                    )
                  }, 0)
                  .toFixed(1)}h
              </p>
              <p className="text-gray-700 dark:text-gray-300 font-medium mt-1">Total Hours</p>
            </div>
            <div className="text-center p-5 bg-green-50 dark:bg-green-900/30 rounded-xl">
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {timeEntries.filter((e) => e.status === 'APPROVED').length}
              </p>
              <p className="text-gray-700 dark:text-gray-300 font-medium mt-1">Approved</p>
            </div>
            <div className="text-center p-5 bg-yellow-50 dark:bg-yellow-900/30 rounded-xl">
              <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                {timeEntries.filter((e) => e.status === 'PENDING').length}
              </p>
              <p className="text-gray-700 dark:text-gray-300 font-medium mt-1">Pending</p>
            </div>
            <div className="text-center p-5 bg-gray-100 dark:bg-gray-700 rounded-xl">
              <p className="text-3xl font-bold text-gray-700 dark:text-gray-300">
                {new Set(timeEntries.map((e) => e.projectId)).size}
              </p>
              <p className="text-gray-700 dark:text-gray-300 font-medium mt-1">Projects</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
