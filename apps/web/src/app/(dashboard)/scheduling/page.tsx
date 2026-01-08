'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@/hooks/useSession'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Users,
  Clock,
  MapPin,
  X
} from 'lucide-react'

interface User {
  id: string
  name: string
  role: string
}

interface Project {
  id: string
  name: string
}

interface CrewAssignment {
  id: string
  userId: string
  role: string | null
  confirmedAt: string | null
  user: User
}

interface CrewSchedule {
  id: string
  projectId: string
  date: string
  startTime: string | null
  endTime: string | null
  notes: string | null
  status: string
  project: Project
  assignments: CrewAssignment[]
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700',
  CONFIRMED: 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700',
  CANCELLED: 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700'
}

const MANAGER_ROLES = ['ADMIN', 'PROJECT_MANAGER', 'SUPERINTENDENT']

export default function SchedulingPage() {
  const { data: session } = useSession()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [schedules, setSchedules] = useState<CrewSchedule[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState<CrewSchedule | null>(null)
  const [formData, setFormData] = useState({
    projectId: '',
    date: '',
    startTime: '07:00',
    endTime: '16:00',
    notes: '',
    assignments: [] as { userId: string; role: string }[]
  })

  const canManage = session?.user && MANAGER_ROLES.includes(session.user.role)

  useEffect(() => {
    fetchData()
  }, [currentDate])

  const fetchData = async () => {
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

      const [schedulesRes, projectsRes, usersRes] = await Promise.all([
        fetch(`/api/scheduling?startDate=${startOfMonth.toISOString()}&endDate=${endOfMonth.toISOString()}`),
        fetch('/api/projects'),
        fetch('/api/users')
      ])

      if (schedulesRes.ok) setSchedules(await schedulesRes.json())
      if (projectsRes.ok) {
        const data = await projectsRes.json()
        setProjects(data.projects || data)
      }
      if (usersRes.ok) setUsers(await usersRes.json())
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days: (Date | null)[] = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null)
    }

    // Add days of the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i))
    }

    return days
  }

  const getSchedulesForDate = (date: Date) => {
    return schedules.filter(s => {
      const scheduleDate = new Date(s.date)
      return (
        scheduleDate.getFullYear() === date.getFullYear() &&
        scheduleDate.getMonth() === date.getMonth() &&
        scheduleDate.getDate() === date.getDate()
      )
    })
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    const daySchedules = getSchedulesForDate(date)
    if (daySchedules.length === 1) {
      setSelectedSchedule(daySchedules[0])
    } else {
      setSelectedSchedule(null)
    }
  }

  const handleAddSchedule = (date?: Date) => {
    setFormData({
      projectId: '',
      date: date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      startTime: '07:00',
      endTime: '16:00',
      notes: '',
      assignments: []
    })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/scheduling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        setShowForm(false)
        fetchData()
      }
    } catch (error) {
      console.error('Error creating schedule:', error)
    }
  }

  const toggleUserAssignment = (userId: string) => {
    setFormData(prev => {
      const exists = prev.assignments.find(a => a.userId === userId)
      if (exists) {
        return {
          ...prev,
          assignments: prev.assignments.filter(a => a.userId !== userId)
        }
      } else {
        return {
          ...prev,
          assignments: [...prev.assignments, { userId, role: '' }]
        }
      }
    })
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    )
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        </div>
      </div>
    )
  }

  const days = getDaysInMonth()

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Crew Scheduling</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage crew assignments and schedules</p>
        </div>
        {canManage && (
          <button
            onClick={() => handleAddSchedule()}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="w-5 h-5" />
            Add Schedule
          </button>
        )}
      </div>

      {/* Calendar Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b dark:border-gray-700">
          {DAYS.map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {days.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="h-32 border-b border-r dark:border-gray-700 bg-gray-50 dark:bg-gray-800" />
            }

            const daySchedules = getSchedulesForDate(date)
            const isSelected = selectedDate &&
              date.getFullYear() === selectedDate.getFullYear() &&
              date.getMonth() === selectedDate.getMonth() &&
              date.getDate() === selectedDate.getDate()

            return (
              <div
                key={date.toISOString()}
                className={`h-32 border-b border-r dark:border-gray-700 p-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  isSelected ? 'bg-primary-50 dark:bg-primary-900/30' : ''
                } ${isToday(date) ? 'bg-yellow-50 dark:bg-yellow-900/30' : ''}`}
                onClick={() => handleDateClick(date)}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-sm font-medium ${
                    isToday(date) ? 'bg-primary-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {date.getDate()}
                  </span>
                  {canManage && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAddSchedule(date)
                      }}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded opacity-0 group-hover:opacity-100"
                    >
                      <Plus className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                    </button>
                  )}
                </div>
                <div className="mt-1 space-y-1 overflow-y-auto max-h-20">
                  {daySchedules.slice(0, 3).map(schedule => (
                    <div
                      key={schedule.id}
                      className={`text-xs p-1 rounded border truncate ${STATUS_COLORS[schedule.status]}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedSchedule(schedule)
                      }}
                    >
                      <span className="font-medium">{schedule.project.name}</span>
                      <span className="text-gray-500 ml-1">
                        ({schedule.assignments.length})
                      </span>
                    </div>
                  ))}
                  {daySchedules.length > 3 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 pl-1">
                      +{daySchedules.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected Date Details */}
      {selectedDate && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </h3>
            {canManage && (
              <button
                onClick={() => handleAddSchedule(selectedDate)}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            )}
          </div>

          {getSchedulesForDate(selectedDate).length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No schedules for this date</p>
          ) : (
            <div className="space-y-4">
              {getSchedulesForDate(selectedDate).map(schedule => (
                <div
                  key={schedule.id}
                  className={`p-4 rounded-lg border-2 ${STATUS_COLORS[schedule.status]} cursor-pointer`}
                  onClick={() => setSelectedSchedule(schedule)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">{schedule.project.name}</h4>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {schedule.startTime && schedule.endTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {schedule.startTime} - {schedule.endTime}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {schedule.assignments.length} crew members
                        </span>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      schedule.status === 'CONFIRMED' ? 'bg-green-200 dark:bg-green-900/50 text-green-800 dark:text-green-300' :
                      schedule.status === 'CANCELLED' ? 'bg-red-200 dark:bg-red-900/50 text-red-800 dark:text-red-300' :
                      'bg-blue-200 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300'
                    }`}>
                      {schedule.status}
                    </span>
                  </div>
                  {schedule.assignments.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {schedule.assignments.map(a => (
                        <span
                          key={a.id}
                          className="px-2 py-1 bg-white dark:bg-gray-800 rounded-full text-xs text-gray-700 dark:text-gray-300 border dark:border-gray-600"
                        >
                          {a.user.name}
                          {a.role && <span className="text-gray-500 dark:text-gray-400"> ({a.role})</span>}
                        </span>
                      ))}
                    </div>
                  )}
                  {schedule.notes && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{schedule.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Schedule Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Add Schedule</h2>
                <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Project *
                  </label>
                  <select
                    value={formData.projectId}
                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                    className="w-full px-3 py-2 border dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    <option value="">Select project</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="w-full px-3 py-2 border dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="w-full px-3 py-2 border dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Assign Crew Members
                  </label>
                  <div className="max-h-48 overflow-y-auto border dark:border-gray-600 rounded-lg p-2 space-y-1">
                    {users.filter(u => u.role !== 'VIEWER').map(user => {
                      const isAssigned = formData.assignments.some(a => a.userId === user.id)
                      return (
                        <div
                          key={user.id}
                          className={`flex items-center justify-between p-2 rounded cursor-pointer ${
                            isAssigned ? 'bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                          onClick={() => toggleUserAssignment(user.id)}
                        >
                          <div>
                            <span className="font-medium text-gray-900 dark:text-gray-100">{user.name}</span>
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{user.role}</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={isAssigned}
                            onChange={() => {}}
                            className="w-4 h-4 text-primary-600 rounded"
                          />
                        </div>
                      )
                    })}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formData.assignments.length} selected
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Special instructions, meeting points, etc."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!formData.projectId || !formData.date}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    Create Schedule
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Detail Modal */}
      {selectedSchedule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{selectedSchedule.project.name}</h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    {new Date(selectedSchedule.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <button onClick={() => setSelectedSchedule(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4 text-sm">
                  {selectedSchedule.startTime && selectedSchedule.endTime && (
                    <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                      <Clock className="w-4 h-4" />
                      {selectedSchedule.startTime} - {selectedSchedule.endTime}
                    </span>
                  )}
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    selectedSchedule.status === 'CONFIRMED' ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300' :
                    selectedSchedule.status === 'CANCELLED' ? 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300' :
                    'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300'
                  }`}>
                    {selectedSchedule.status}
                  </span>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Assigned Crew ({selectedSchedule.assignments.length})</h3>
                  {selectedSchedule.assignments.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-sm">No crew assigned</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedSchedule.assignments.map(a => (
                        <div key={a.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                          <div>
                            <span className="font-medium text-gray-900 dark:text-gray-100">{a.user.name}</span>
                            {a.role && <span className="text-gray-500 dark:text-gray-400 text-sm ml-2">- {a.role}</span>}
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{a.user.role}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedSchedule.notes && (
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Notes</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">{selectedSchedule.notes}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t dark:border-gray-700 mt-6">
                <button
                  onClick={() => setSelectedSchedule(null)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
