'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from '@/hooks/useSession'
import {
  Tags,
  Plus,
  Search,
  Loader2,
  AlertCircle,
  Edit2,
  Trash2,
  X,
  Check,
  ChevronDown,
  ChevronRight,
  Building2,
  Activity,
  MapPin,
  Layers,
  Package,
  AlertTriangle,
  Eye,
  EyeOff,
  Sparkles,
  Globe,
  FolderOpen,
  Users as UsersIcon,
  RotateCcw,
} from 'lucide-react'

// Tailwind color class mappings (must be static for purging)
const COLOR_CLASSES = {
  blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', bgLight: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', ring: 'ring-blue-500', focusRing: 'focus:ring-blue-500', bgSolid: 'bg-blue-600' },
  purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', bgLight: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800', ring: 'ring-purple-500', focusRing: 'focus:ring-purple-500', bgSolid: 'bg-purple-600' },
  indigo: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400', bgLight: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-800', ring: 'ring-indigo-500', focusRing: 'focus:ring-indigo-500', bgSolid: 'bg-indigo-600' },
  cyan: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-600 dark:text-cyan-400', bgLight: 'bg-cyan-50 dark:bg-cyan-900/20', border: 'border-cyan-200 dark:border-cyan-800', ring: 'ring-cyan-500', focusRing: 'focus:ring-cyan-500', bgSolid: 'bg-cyan-600' },
  teal: { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-600 dark:text-teal-400', bgLight: 'bg-teal-50 dark:bg-teal-900/20', border: 'border-teal-200 dark:border-teal-800', ring: 'ring-teal-500', focusRing: 'focus:ring-teal-500', bgSolid: 'bg-teal-600' },
  green: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400', bgLight: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', ring: 'ring-green-500', focusRing: 'focus:ring-green-500', bgSolid: 'bg-green-600' },
  orange: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400', bgLight: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800', ring: 'ring-orange-500', focusRing: 'focus:ring-orange-500', bgSolid: 'bg-orange-600' },
  red: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', bgLight: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', ring: 'ring-red-500', focusRing: 'focus:ring-red-500', bgSolid: 'bg-red-600' },
  gray: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-400', bgLight: 'bg-gray-50 dark:bg-gray-800', border: 'border-gray-200 dark:border-gray-700', ring: 'ring-gray-500', focusRing: 'focus:ring-gray-500', bgSolid: 'bg-gray-600' },
} as const

type ColorKey = keyof typeof COLOR_CLASSES

// Label categories configuration
const CATEGORIES: Array<{
  value: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: ColorKey
  description: string
  examples: string[]
}> = [
  { value: 'ACTIVITY', label: 'Activities', icon: Activity, color: 'blue', description: 'Types of work being performed', examples: ['Framing', 'Electrical', 'Plumbing', 'HVAC'] },
  { value: 'LOCATION_BUILDING', label: 'Buildings', icon: Building2, color: 'purple', description: 'Building names or sections', examples: ['Building A', 'Main Office', 'Warehouse'] },
  { value: 'LOCATION_FLOOR', label: 'Floors', icon: Layers, color: 'indigo', description: 'Floor levels', examples: ['1st Floor', 'Basement', 'Roof'] },
  { value: 'LOCATION_ZONE', label: 'Zones', icon: MapPin, color: 'cyan', description: 'Work areas or zones', examples: ['North Wing', 'Loading Dock', 'Parking'] },
  { value: 'LOCATION_ROOM', label: 'Rooms', icon: MapPin, color: 'teal', description: 'Room identifiers', examples: ['Room 101', 'Conference A', 'Break Room'] },
  { value: 'STATUS', label: 'Status', icon: Activity, color: 'green', description: 'Work progress status', examples: ['In Progress', 'Complete', 'On Hold'] },
  { value: 'MATERIAL', label: 'Materials', icon: Package, color: 'orange', description: 'Materials used on site', examples: ['Concrete', 'Steel', 'Lumber', 'Drywall'] },
  { value: 'ISSUE', label: 'Issues', icon: AlertTriangle, color: 'red', description: 'Types of issues or delays', examples: ['Weather Delay', 'Material Shortage', 'Safety Concern'] },
  { value: 'VISITOR', label: 'Visitors', icon: UsersIcon, color: 'gray', description: 'Types of site visitors', examples: ['Inspector', 'Client', 'Subcontractor'] },
]

interface Label {
  id: string
  category: string
  name: string
  projectId: string | null
  isActive: boolean
  sortOrder: number
  createdAt: string
  project?: {
    id: string
    name: string
  } | null
}

interface Project {
  id: string
  name: string
}

export default function LabelsPage() {
  const { data: session } = useSession()
  const [labels, setLabels] = useState<Label[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  // Expanded categories for tree view
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(CATEGORIES.map(c => c.value)))

  // Quick add state (inline adding)
  const [quickAddCategory, setQuickAddCategory] = useState<string | null>(null)
  const [quickAddValue, setQuickAddValue] = useState('')
  const [quickAddSaving, setQuickAddSaving] = useState(false)
  const quickAddInputRef = useRef<HTMLInputElement>(null)

  // Edit state
  const [editingLabel, setEditingLabel] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const canManageLabels = ['ADMIN', 'PROJECT_MANAGER'].includes(session?.user?.role || '')

  // Fetch labels
  const fetchLabels = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('activeOnly', showInactive ? 'false' : 'true')

      const response = await fetch(`/api/labels?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch labels')

      const data = await response.json()
      setLabels(data)
    } catch (err) {
      console.error('Error fetching labels:', err)
      setError('Failed to load labels')
    } finally {
      setLoading(false)
    }
  }, [showInactive])

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    try {
      const response = await fetch('/api/projects')
      if (response.ok) {
        const data = await response.json()
        setProjects(Array.isArray(data) ? data : data.projects || [])
      }
    } catch (err) {
      console.error('Error fetching projects:', err)
    }
  }, [])

  useEffect(() => {
    fetchLabels()
    fetchProjects()
  }, [fetchLabels, fetchProjects])

  // Success message timeout ref for cleanup
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Focus quick add input when category is selected
  useEffect(() => {
    if (quickAddCategory && quickAddInputRef.current) {
      quickAddInputRef.current.focus()
    }
  }, [quickAddCategory])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current)
      }
    }
  }, [])

  // Show success message temporarily
  const showSuccess = (message: string) => {
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current)
    }
    setSuccessMessage(message)
    successTimeoutRef.current = setTimeout(() => setSuccessMessage(null), 3000)
  }

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  // Quick add label
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const labelName = quickAddValue.trim()
    if (!labelName || !quickAddCategory) return

    setQuickAddSaving(true)
    try {
      const response = await fetch('/api/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: quickAddCategory,
          name: labelName,
          isActive: true,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to create label')

      setQuickAddValue('')
      setQuickAddCategory(null)
      await fetchLabels()
      showSuccess(`"${labelName}" added successfully!`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create label')
    } finally {
      setQuickAddSaving(false)
    }
  }

  // Start editing a label
  const startEditing = (label: Label) => {
    setEditingLabel(label.id)
    setEditValue(label.name)
  }

  // Save edited label
  const saveEdit = async (labelId: string) => {
    if (!editValue.trim()) return

    try {
      const response = await fetch(`/api/labels/${labelId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editValue.trim() }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update label')
      }

      setEditingLabel(null)
      fetchLabels()
      showSuccess('Label updated!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update label')
    }
  }

  // Toggle label active status
  const handleToggleActive = async (label: Label) => {
    try {
      const response = await fetch(`/api/labels/${label.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !label.isActive }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || `Failed to update label (${response.status})`)
      }

      await fetchLabels()
      showSuccess(label.isActive ? 'Label hidden' : 'Label restored')
    } catch (err) {
      console.error('Error toggling label:', err)
      setError(err instanceof Error ? err.message : 'Failed to update label')
    }
  }

  // Delete label
  const handleDelete = async (labelId: string) => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/labels/${labelId}`, { method: 'DELETE' })
      const data = await response.json()

      if (!response.ok) throw new Error(data.error || 'Failed to delete label')

      setDeleteConfirmId(null)
      fetchLabels()
      showSuccess(data.deactivated ? 'Label hidden (in use)' : 'Label deleted')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete label')
    } finally {
      setDeleting(false)
    }
  }

  // Restore default labels
  const [restoring, setRestoring] = useState(false)
  const handleRestoreDefaults = async () => {
    setRestoring(true)
    setError(null)
    try {
      const response = await fetch('/api/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore' }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to restore labels')

      await fetchLabels()
      showSuccess(data.message || 'Default labels restored!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore labels')
    } finally {
      setRestoring(false)
    }
  }

  // Hide all labels in a category
  const [hidingCategory, setHidingCategory] = useState<string | null>(null)
  const handleHideAllInCategory = async (category: string) => {
    setHidingCategory(category)
    setError(null)
    try {
      const response = await fetch('/api/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'hideAll', category }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to hide labels')

      await fetchLabels()
      showSuccess(data.message || `Hidden all labels in ${category}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to hide labels')
    } finally {
      setHidingCategory(null)
    }
  }

  // Filter labels by search query
  const filteredLabels = labels.filter(label =>
    label.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Group labels by category
  const labelsByCategory = CATEGORIES.reduce((acc, cat) => {
    acc[cat.value] = filteredLabels.filter(l => l.category === cat.value)
    return acc
  }, {} as Record<string, Label[]>)

  if (loading && labels.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Loading labels...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-white/20 rounded-lg">
            <Tags className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">Labels</h1>
        </div>
        <p className="text-blue-100">
          Organize your daily logs with custom labels for activities, locations, materials, and more.
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400 p-4 rounded-xl flex items-center gap-3 shadow-sm border border-red-100 dark:border-red-800">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-400 p-4 rounded-xl flex items-center gap-3 shadow-sm border border-green-100 dark:border-green-800 animate-pulse">
          <Sparkles className="h-5 w-5 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search labels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg text-gray-900 dark:text-gray-100"
            aria-label="Search labels"
          />
        </div>
        <button
          onClick={() => setShowInactive(!showInactive)}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all ${
            showInactive
              ? 'bg-gray-800 text-white shadow-lg'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          {showInactive ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
          {showInactive ? 'Showing Hidden' : 'Show Hidden'}
        </button>
        {canManageLabels && (
          <button
            onClick={handleRestoreDefaults}
            disabled={restoring}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {restoring ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <RotateCcw className="h-5 w-5" />
            )}
            Restore Defaults
          </button>
        )}
      </div>

      {/* Category Cards */}
      <div className="space-y-4">
        {CATEGORIES.map((category) => {
          const categoryLabels = labelsByCategory[category.value] || []
          const isExpanded = expandedCategories.has(category.value)
          const IconComponent = category.icon
          const colorClasses = COLOR_CLASSES[category.color]
          const isQuickAdding = quickAddCategory === category.value

          return (
            <div
              key={category.value}
              className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border-2 overflow-hidden transition-all ${
                isExpanded ? colorClasses.border : 'border-transparent'
              }`}
            >
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category.value)}
                className="w-full flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                aria-expanded={isExpanded}
                aria-controls={`category-content-${category.value}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${colorClasses.bg}`}>
                    <IconComponent className={`h-6 w-6 ${colorClasses.text}`} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{category.label}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{category.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${colorClasses.bg} ${colorClasses.text}`}>
                    {categoryLabels.length}
                  </span>
                  {canManageLabels && categoryLabels.filter(l => l.isActive).length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleHideAllInCategory(category.value)
                      }}
                      disabled={hidingCategory === category.value}
                      className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all flex items-center gap-1"
                      title={`Hide all ${category.label.toLowerCase()}`}
                    >
                      {hidingCategory === category.value ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <EyeOff className="h-3 w-3" />
                      )}
                      Hide All
                    </button>
                  )}
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Category Content */}
              {isExpanded && (
                <div
                  id={`category-content-${category.value}`}
                  className={`p-5 border-t ${colorClasses.border}`}
                >
                  {/* Quick Add Section */}
                  {canManageLabels && (
                    <div className="mb-4">
                      {isQuickAdding ? (
                        <form onSubmit={handleQuickAdd} className="flex gap-2">
                          <input
                            ref={quickAddInputRef}
                            type="text"
                            placeholder={`Type a new ${category.label.toLowerCase().slice(0, -1)} name...`}
                            value={quickAddValue}
                            onChange={(e) => setQuickAddValue(e.target.value)}
                            disabled={quickAddSaving}
                            className={`flex-1 px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 ${colorClasses.focusRing} ${colorClasses.border} text-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
                            autoFocus
                            aria-label={`New ${category.label.toLowerCase().slice(0, -1)} name`}
                          />
                          <button
                            type="submit"
                            disabled={!quickAddValue.trim() || quickAddSaving}
                            className={`px-6 py-3 rounded-xl font-medium text-white ${colorClasses.bgSolid} hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2`}
                          >
                            {quickAddSaving ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <Check className="h-5 w-5" />
                            )}
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setQuickAddCategory(null)
                              setQuickAddValue('')
                            }}
                            className="px-4 py-3 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </form>
                      ) : (
                        <button
                          onClick={() => setQuickAddCategory(category.value)}
                          className={`w-full flex items-center justify-center gap-2 px-4 py-4 border-2 border-dashed rounded-xl text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all ${colorClasses.border}`}
                        >
                          <Plus className="h-5 w-5" />
                          <span className="font-medium">Add new {category.label.toLowerCase().slice(0, -1)}</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Labels Grid */}
                  {categoryLabels.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 dark:text-gray-500 dark:text-gray-400">
                      <Tags className="h-10 w-10 mx-auto mb-3 opacity-50" />
                      <p className="text-lg">No {category.label.toLowerCase()} yet</p>
                      <p className="text-sm mt-1">Examples: {category.examples.join(', ')}</p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {categoryLabels.map((label) => (
                        <div
                          key={label.id}
                          className={`group relative flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all ${
                            label.isActive
                              ? `${colorClasses.bgLight} ${colorClasses.border} ${colorClasses.text}`
                              : 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500'
                          } ${editingLabel === label.id ? `ring-2 ${colorClasses.ring}` : ''}`}
                        >
                          {editingLabel === label.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEdit(label.id)
                                  if (e.key === 'Escape') setEditingLabel(null)
                                }}
                                className="bg-transparent border-none focus:outline-none font-medium min-w-[100px] text-inherit"
                                autoFocus
                              />
                              <button
                                onClick={() => saveEdit(label.id)}
                                className="p-1 hover:bg-white/50 dark:hover:bg-black/20 rounded-lg"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setEditingLabel(null)}
                                className="p-1 hover:bg-white/50 dark:hover:bg-black/20 rounded-lg"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className="font-medium">{label.name}</span>
                              {!label.projectId && (
                                <span title="Global label">
                                  <Globe className="h-3 w-3 opacity-50" />
                                </span>
                              )}
                              {label.project && (
                                <span title={label.project.name}>
                                  <FolderOpen className="h-3 w-3 opacity-50" />
                                </span>
                              )}

                              {/* Action buttons on hover */}
                              {canManageLabels && deleteConfirmId !== label.id && (
                                <div className="hidden group-hover:flex items-center gap-1 ml-1">
                                  <button
                                    onClick={() => startEditing(label)}
                                    className="p-1 hover:bg-white/50 dark:hover:bg-black/20 rounded-lg"
                                    title="Edit"
                                    aria-label={`Edit ${label.name}`}
                                  >
                                    <Edit2 className="h-3.5 w-3.5" aria-hidden="true" />
                                  </button>
                                  <button
                                    onClick={() => handleToggleActive(label)}
                                    className="p-1 hover:bg-white/50 dark:hover:bg-black/20 rounded-lg"
                                    title={label.isActive ? 'Hide' : 'Show'}
                                    aria-label={label.isActive ? `Hide ${label.name}` : `Show ${label.name}`}
                                  >
                                    {label.isActive ? (
                                      <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                                    ) : (
                                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                                    )}
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(label.id)}
                                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-red-500 dark:text-red-400"
                                    title="Delete"
                                    aria-label={`Delete ${label.name}`}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                  </button>
                                </div>
                              )}

                              {/* Delete confirmation */}
                              {deleteConfirmId === label.id && (
                                <div className="flex items-center gap-1 ml-1">
                                  <span className="text-xs text-red-600 dark:text-red-400 mr-1">Delete?</span>
                                  <button
                                    onClick={() => handleDelete(label.id)}
                                    disabled={deleting}
                                    className="p-1 bg-red-500 text-white rounded-lg"
                                  >
                                    {deleting ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Check className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Stats */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
        {filteredLabels.length} label{filteredLabels.length !== 1 ? 's' : ''} total
        {!showInactive && ' (active only)'}
      </div>
    </div>
  )
}
