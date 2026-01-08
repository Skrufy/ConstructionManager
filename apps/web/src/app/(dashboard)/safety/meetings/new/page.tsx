'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Loader2,
  Users,
  Plus,
  X,
  MapPin,
  Calendar,
  Clock,
  Camera,
  Upload,
  PenTool,
  Search,
  Building2,
  Check,
  ChevronDown
} from 'lucide-react'
import { SignatureCanvas, SignatureDisplay } from '@/components/ui/signature-canvas'

interface Project {
  id: string
  name: string
  address: string | null
}

interface Employee {
  id: string
  name: string
  email?: string
  company?: string
  jobTitle?: string
}

interface SafetyTopic {
  id: string
  name: string
  description?: string
  category?: string
}

export default function NewSafetyMeetingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [topics, setTopics] = useState<SafetyTopic[]>([])

  // Form state
  const [projectId, setProjectId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [time, setTime] = useState(
    new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  )
  const [location, setLocation] = useState('')
  const [loadingLocation, setLoadingLocation] = useState(false)
  const [topic, setTopic] = useState('')
  const [topicId, setTopicId] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState(30)
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([])
  const [notes, setNotes] = useState('')

  // Photo state
  const [photo, setPhoto] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Signature state
  const [signature, setSignature] = useState<string | null>(null)
  const [showSignatureModal, setShowSignatureModal] = useState(false)

  // Modal states
  const [showTopicPicker, setShowTopicPicker] = useState(false)
  const [showAttendeePicker, setShowAttendeePicker] = useState(false)
  const [showAddEmployee, setShowAddEmployee] = useState(false)
  const [topicSearch, setTopicSearch] = useState('')
  const [employeeSearch, setEmployeeSearch] = useState('')

  // New employee form
  const [newEmployeeName, setNewEmployeeName] = useState('')
  const [newEmployeeCompany, setNewEmployeeCompany] = useState('')
  const [addingEmployee, setAddingEmployee] = useState(false)

  // Fetch data on mount
  useEffect(() => {
    // Fetch projects
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => setProjects(data.projects || []))
      .catch(console.error)

    // Fetch employees
    fetch('/api/employees')
      .then(res => res.json())
      .then(data => setEmployees(data || []))
      .catch(console.error)

    // Fetch safety topics
    fetch('/api/safety/topics')
      .then(res => res.json())
      .then(data => setTopics(data || []))
      .catch(console.error)

    // Get location
    detectLocation()
  }, [])

  const detectLocation = () => {
    if (!navigator.geolocation) return

    setLoadingLocation(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // Use reverse geocoding to get city name
          const { latitude, longitude } = position.coords
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          )
          const data = await response.json()
          const city = data.address?.city || data.address?.town || data.address?.municipality || ''
          const state = data.address?.state || ''
          setLocation(city && state ? `${city}, ${state}` : city || state || '')
        } catch {
          console.error('Geocoding failed')
        } finally {
          setLoadingLocation(false)
        }
      },
      () => setLoadingLocation(false),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const toggleAttendee = (employeeId: string) => {
    setSelectedAttendees(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    )
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      setPhoto(event.target?.result as string)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const selectTopic = (t: SafetyTopic) => {
    setTopic(t.name)
    setTopicId(t.id)
    setShowTopicPicker(false)
    setTopicSearch('')
  }

  const handleCustomTopic = () => {
    if (topicSearch.trim()) {
      setTopic(topicSearch.trim())
      setTopicId(null)
      setShowTopicPicker(false)
      setTopicSearch('')
    }
  }

  const addNewEmployee = async () => {
    if (!newEmployeeName.trim()) return

    setAddingEmployee(true)
    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newEmployeeName.trim(),
          company: newEmployeeCompany.trim() || null
        })
      })

      if (!response.ok) throw new Error('Failed to add employee')

      const newEmployee = await response.json()
      setEmployees(prev => [...prev, newEmployee])
      setSelectedAttendees(prev => [...prev, newEmployee.id])
      setNewEmployeeName('')
      setNewEmployeeCompany('')
      setShowAddEmployee(false)
    } catch (err) {
      console.error('Error adding employee:', err)
    } finally {
      setAddingEmployee(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!topic) {
      setError('Please select a topic')
      return
    }

    if (selectedAttendees.length === 0) {
      setError('Please select at least one attendee')
      return
    }

    if (!photo) {
      setError('Please capture a photo of the attendees')
      return
    }

    if (!signature) {
      setError('Please provide your signature')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/safety/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projectId || null,
          date,
          time,
          location,
          topic,
          topicId,
          description,
          duration,
          attendeeIds: selectedAttendees,
          leaderSignature: signature,
          photoUrl: photo,
          notes
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create meeting')
      }

      router.push('/safety?tab=meetings')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Group topics by category
  const topicsByCategory = topics.reduce((acc, t) => {
    const cat = t.category || 'GENERAL'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(t)
    return acc
  }, {} as Record<string, SafetyTopic[]>)

  const filteredTopics = topicSearch
    ? topics.filter(t =>
        t.name.toLowerCase().includes(topicSearch.toLowerCase()) ||
        t.description?.toLowerCase().includes(topicSearch.toLowerCase())
      )
    : topics

  const filteredEmployees = employeeSearch
    ? employees.filter(e =>
        e.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        e.company?.toLowerCase().includes(employeeSearch.toLowerCase())
      )
    : employees

  const selectedEmployeeDetails = employees.filter(e => selectedAttendees.includes(e.id))

  const categoryLabels: Record<string, string> = {
    GENERAL: 'General Safety',
    HAZARDS: 'Hazards',
    PPE: 'Personal Protective Equipment',
    EQUIPMENT: 'Equipment',
    PROCEDURES: 'Procedures',
    EMERGENCY: 'Emergency'
  }

  return (
    <div className="max-w-3xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/safety" className="p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Log Safety Meeting</h1>
          <p className="text-gray-600 dark:text-gray-400">Record a safety meeting or toolbox talk</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-4 rounded-xl mb-6 font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Date, Time & Location */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">When & Where</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="date" className="label flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-300" />
                Date *
              </label>
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input mt-1"
                required
              />
            </div>
            <div>
              <label htmlFor="time" className="label flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400 dark:text-gray-300" />
                Time
              </label>
              <input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="input mt-1"
              />
            </div>
            <div>
              <label htmlFor="location" className="label flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-400 dark:text-gray-300" />
                Location
              </label>
              <div className="relative mt-1">
                <input
                  id="location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="input pr-10"
                  placeholder={loadingLocation ? 'Detecting...' : 'Enter location'}
                />
                {loadingLocation && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                )}
              </div>
            </div>
          </div>

          {/* Project (Optional) */}
          <div className="mt-4">
            <label htmlFor="project" className="label flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-400 dark:text-gray-300" />
              Project (Optional)
            </label>
            <select
              id="project"
              value={projectId}
              onChange={(e) => {
                const selectedProjectId = e.target.value
                setProjectId(selectedProjectId)
                // Auto-populate location from project address
                const project = projects.find(p => p.id === selectedProjectId)
                if (project?.address) {
                  setLocation(project.address)
                }
              }}
              className="input mt-1"
            >
              <option value="">No specific project</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="mt-4">
            <label htmlFor="duration" className="label">Duration (minutes)</label>
            <input
              id="duration"
              type="number"
              min="5"
              step="5"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
              className="input mt-1 w-32"
            />
          </div>
        </div>

        {/* Topic Selection */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Topic *</h2>

          {topic ? (
            <div className="flex items-center justify-between p-4 bg-primary-50 border border-primary-200 rounded-xl">
              <div>
                <p className="font-semibold text-primary-900">{topic}</p>
                {topicId && (
                  <p className="text-sm text-primary-600">From topic library</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => { setTopic(''); setTopicId(null) }}
                className="p-2 text-primary-600 hover:text-primary-800 hover:bg-primary-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowTopicPicker(true)}
              className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                <Search className="h-5 w-5" />
                <span>Search or select a topic...</span>
              </div>
            </button>
          )}

          <div className="mt-4">
            <label htmlFor="description" className="label">Description / Discussion Points</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input mt-1"
              rows={3}
              placeholder="What was covered in the meeting..."
            />
          </div>
        </div>

        {/* Attendees */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Attendees *
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {selectedAttendees.length} selected
            </span>
          </div>

          {selectedAttendees.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedEmployeeDetails.map(emp => (
                <div
                  key={emp.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  <span className="font-medium">{emp.name}</span>
                  {emp.company && (
                    <span className="text-blue-600">({emp.company})</span>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleAttendee(emp.id)}
                    className="p-0.5 hover:bg-blue-200 rounded-full"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowAttendeePicker(true)}
            className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400">
              <Plus className="h-5 w-5" />
              <span>{selectedAttendees.length > 0 ? 'Add More Attendees' : 'Select Attendees'}</span>
            </div>
          </button>
        </div>

        {/* Photo Capture */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Camera className="h-5 w-5 text-green-500" />
            Photo of Attendees *
          </h2>

          {photo ? (
            <div className="relative">
              <img
                src={photo}
                alt="Meeting attendees"
                className="w-full h-64 object-cover rounded-xl"
              />
              <button
                type="button"
                onClick={() => setPhoto(null)}
                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
              >
                <X className="h-5 w-5" />
              </button>
              <p className="text-sm text-green-600 text-center mt-2 font-medium">
                Photo captured
              </p>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex-1 min-h-[120px] p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-green-500 hover:bg-green-50 transition-colors"
              >
                <div className="flex flex-col items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Camera className="h-10 w-10" />
                  <span className="font-semibold">Take Photo</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="flex-1 min-h-[120px] p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-green-500 hover:bg-green-50 transition-colors"
              >
                <div className="flex flex-col items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Upload className="h-10 w-10" />
                  <span className="font-semibold">Upload Photo</span>
                </div>
              </button>
            </div>
          )}

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoSelect}
            className="hidden"
          />
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoSelect}
            className="hidden"
          />
        </div>

        {/* Leader Signature */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <PenTool className="h-5 w-5 text-purple-500" />
            Meeting Leader Signature *
          </h2>

          {signature ? (
            <SignatureDisplay
              signature={signature}
              onClear={() => setSignature(null)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowSignatureModal(true)}
              className="w-full min-h-[120px] p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-colors"
            >
              <div className="flex flex-col items-center gap-2 text-gray-600 dark:text-gray-400">
                <PenTool className="h-10 w-10" />
                <span className="font-semibold">Tap to Sign</span>
              </div>
            </button>
          )}
        </div>

        {/* Notes */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Notes</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input"
            rows={4}
            placeholder="Additional notes, key discussion points, concerns raised..."
          />
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <Link href="/safety" className="btn btn-outline flex-1 py-3">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary flex-1 py-3"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save Meeting'
            )}
          </button>
        </div>
      </form>

      {/* Topic Picker Modal */}
      {showTopicPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white dark:bg-gray-800 w-full max-w-lg max-h-[80vh] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Select Topic</h3>
              <button
                onClick={() => { setShowTopicPicker(false); setTopicSearch('') }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={topicSearch}
                  onChange={(e) => setTopicSearch(e.target.value)}
                  placeholder="Search topics or enter custom..."
                  className="input pl-10"
                  autoFocus
                />
              </div>
              {topicSearch && !filteredTopics.some(t => t.name.toLowerCase() === topicSearch.toLowerCase()) && (
                <button
                  onClick={handleCustomTopic}
                  className="mt-2 w-full p-3 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-lg text-left hover:bg-primary-100 dark:hover:bg-primary-900/50"
                >
                  <span className="font-medium">Use custom topic:</span> &quot;{topicSearch}&quot;
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {topicSearch ? (
                <div className="space-y-2">
                  {filteredTopics.map(t => (
                    <button
                      key={t.id}
                      onClick={() => selectTopic(t)}
                      className="w-full p-3 text-left rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <p className="font-medium text-gray-900 dark:text-gray-100">{t.name}</p>
                      {t.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{t.description}</p>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(topicsByCategory).map(([category, categoryTopics]) => (
                    <div key={category}>
                      <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                        {categoryLabels[category] || category}
                      </h4>
                      <div className="space-y-1">
                        {categoryTopics.slice(0, 10).map(t => (
                          <button
                            key={t.id}
                            onClick={() => selectTopic(t)}
                            className="w-full p-3 text-left rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <p className="font-medium text-gray-900 dark:text-gray-100">{t.name}</p>
                          </button>
                        ))}
                        {categoryTopics.length > 10 && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 px-3 py-2">
                            +{categoryTopics.length - 10} more topics
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Attendee Picker Modal */}
      {showAttendeePicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white dark:bg-gray-800 w-full max-w-lg max-h-[80vh] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Select Attendees</h3>
              <button
                onClick={() => { setShowAttendeePicker(false); setEmployeeSearch('') }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  placeholder="Search employees..."
                  className="input pl-10"
                  autoFocus
                />
              </div>
              <button
                onClick={() => { setShowAddEmployee(true) }}
                className="w-full p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center gap-2"
              >
                <Plus className="h-5 w-5" />
                Add New Employee
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                {filteredEmployees.map(emp => (
                  <button
                    key={emp.id}
                    onClick={() => toggleAttendee(emp.id)}
                    className={`w-full p-3 text-left rounded-lg flex items-center justify-between ${
                      selectedAttendees.includes(emp.id)
                        ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-transparent'
                    }`}
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{emp.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {emp.company || 'Internal'} {emp.jobTitle && `• ${emp.jobTitle}`}
                      </p>
                    </div>
                    {selectedAttendees.includes(emp.id) && (
                      <Check className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    )}
                  </button>
                ))}
                {filteredEmployees.length === 0 && (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                    No employees found. Add a new one above.
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => { setShowAttendeePicker(false); setEmployeeSearch('') }}
                className="btn btn-primary w-full py-3"
              >
                Done ({selectedAttendees.length} selected)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddEmployee && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Add New Employee</h3>
              <button
                onClick={() => { setShowAddEmployee(false); setNewEmployeeName(''); setNewEmployeeCompany('') }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="label">Name *</label>
                <input
                  type="text"
                  value={newEmployeeName}
                  onChange={(e) => setNewEmployeeName(e.target.value)}
                  className="input mt-1"
                  placeholder="Full name"
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Company</label>
                <input
                  type="text"
                  value={newEmployeeCompany}
                  onChange={(e) => setNewEmployeeCompany(e.target.value)}
                  className="input mt-1"
                  placeholder="Company name (optional)"
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
              <button
                onClick={() => { setShowAddEmployee(false); setNewEmployeeName(''); setNewEmployeeCompany('') }}
                className="btn btn-outline flex-1"
              >
                Cancel
              </button>
              <button
                onClick={addNewEmployee}
                disabled={!newEmployeeName.trim() || addingEmployee}
                className="btn btn-primary flex-1"
              >
                {addingEmployee ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'Add Employee'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Signature Modal */}
      {showSignatureModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl p-6">
            <SignatureCanvas
              onSave={(sig) => {
                setSignature(sig)
                setShowSignatureModal(false)
              }}
              onCancel={() => setShowSignatureModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
