'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileQuestion,
  Plus,
  Search,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Calendar,
  User,
  ChevronRight,
  X,
  AlertTriangle,
  Filter,
  Building2,
} from 'lucide-react'

interface RFI {
  id: string
  project_id: string
  project_name: string | null
  rfi_number: string
  subject: string
  question: string
  answer: string | null
  status: string
  priority: string
  assigned_to: string | null
  assigned_to_name: string | null
  due_date: string | null
  answered_at: string | null
  created_by: string | null
  created_by_name: string | null
  created_at: string
}

interface Project {
  id: string
  name: string
}

interface UserOption {
  id: string
  name: string
  email: string
  role: string
}

export default function RFIsPage() {
  const router = useRouter()
  const [rfis, setRfis] = useState<RFI[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [projectFilter, setProjectFilter] = useState<string>('')
  const [priorityFilter, setPriorityFilter] = useState<string>('')
  const [assigneeFilter, setAssigneeFilter] = useState<string>('')
  const [showNewModal, setShowNewModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const [newRfi, setNewRfi] = useState({
    projectId: '',
    subject: '',
    question: '',
    priority: 'MEDIUM',
    assigneeId: '',
    dueDate: '',
  })

  useEffect(() => {
    fetchRFIs()
    fetchProjects()
    fetchUsers()
  }, [statusFilter, projectFilter])

  const fetchRFIs = async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.append('status', statusFilter)
      if (projectFilter) params.append('projectId', projectFilter)

      const response = await fetch(`/api/rfis?${params}`)
      const data = await response.json()
      setRfis(data.rfis || [])
    } catch (error) {
      console.error('Error fetching RFIs:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects')
      const data = await response.json()
      setProjects(data.projects || [])
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      const data = await response.json()
      const userList = Array.isArray(data) ? data : (data.users || [])
      setUsers(userList)
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const handleCreateRFI = async () => {
    if (!newRfi.projectId || !newRfi.subject || !newRfi.question) return
    setCreating(true)

    try {
      const response = await fetch('/api/rfis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: newRfi.projectId,
          subject: newRfi.subject,
          question: newRfi.question,
          priority: newRfi.priority,
          assigneeId: newRfi.assigneeId || undefined,
          dueDate: newRfi.dueDate || undefined,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        await fetchRFIs()
        setShowNewModal(false)
        setNewRfi({ projectId: '', subject: '', question: '', priority: 'MEDIUM', assigneeId: '', dueDate: '' })
        // Navigate to the new RFI detail page
        router.push(`/rfis/${data.id}`)
      }
    } catch (error) {
      console.error('Error creating RFI:', error)
    } finally {
      setCreating(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-400'
      case 'SUBMITTED':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
      case 'UNDER_REVIEW':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
      case 'ANSWERED':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
      case 'CLOSED':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-400'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-400'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
      case 'HIGH':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400'
      case 'MEDIUM':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
      case 'LOW':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-400'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-400'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return <AlertTriangle className="h-3 w-3" />
      case 'HIGH':
        return <AlertCircle className="h-3 w-3" />
      default:
        return null
    }
  }

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }

  const getDaysUntilDue = (dueDate: string | null) => {
    if (!dueDate) return null
    const due = new Date(dueDate)
    const now = new Date()
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  // Apply all filters
  const filteredRfis = rfis.filter(rfi => {
    // Search filter
    const matchesSearch =
      rfi.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rfi.rfi_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rfi.question.toLowerCase().includes(searchQuery.toLowerCase())

    // Priority filter (client-side since API might not support it)
    const matchesPriority = !priorityFilter || rfi.priority === priorityFilter

    // Assignee filter (client-side)
    const matchesAssignee = !assigneeFilter || rfi.assigned_to === assigneeFilter

    return matchesSearch && matchesPriority && matchesAssignee
  })

  const stats = {
    total: rfis.length,
    submitted: rfis.filter(r => r.status === 'SUBMITTED').length,
    underReview: rfis.filter(r => r.status === 'UNDER_REVIEW').length,
    answered: rfis.filter(r => r.status === 'ANSWERED').length,
    overdue: rfis.filter(r => r.status !== 'CLOSED' && r.status !== 'ANSWERED' && isOverdue(r.due_date)).length,
  }

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('')
    setProjectFilter('')
    setPriorityFilter('')
    setAssigneeFilter('')
  }

  const activeFilterCount = [statusFilter, projectFilter, priorityFilter, assigneeFilter].filter(Boolean).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Requests for Information
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track and manage RFIs across your projects
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="btn btn-primary px-4 py-2 flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          New RFI
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">
              <FileQuestion className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total RFIs</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.submitted}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Submitted</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.underReview}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Under Review</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.answered}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Answered</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.overdue}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Overdue</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by RFI number, subject, or question..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn ${showFilters ? 'btn-primary' : 'btn-outline'} px-4 py-2 flex items-center gap-2`}
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-full text-xs">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t dark:border-gray-700">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input w-full"
                >
                  <option value="">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="ANSWERED">Answered</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Project
                </label>
                <select
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                  className="input w-full"
                >
                  <option value="">All Projects</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Priority
                </label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="input w-full"
                >
                  <option value="">All Priorities</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Assigned To
                </label>
                <select
                  value={assigneeFilter}
                  onChange={(e) => setAssigneeFilter(e.target.value)}
                  className="input w-full"
                >
                  <option value="">All Assignees</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>
              {activeFilterCount > 0 && (
                <div className="md:col-span-4 flex justify-end">
                  <button
                    onClick={clearFilters}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 flex items-center gap-1"
                  >
                    <X className="h-4 w-4" />
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RFI List */}
      {filteredRfis.length === 0 ? (
        <div className="card p-12 text-center">
          <FileQuestion className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No RFIs found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {activeFilterCount > 0 || searchQuery
              ? 'Try adjusting your filters or search query'
              : 'Create your first RFI to start tracking information requests'}
          </p>
          {activeFilterCount === 0 && !searchQuery && (
            <button
              onClick={() => setShowNewModal(true)}
              className="btn btn-primary px-4 py-2 inline-flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              New RFI
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRfis.map((rfi) => {
            const daysUntilDue = getDaysUntilDue(rfi.due_date)
            const overdue = isOverdue(rfi.due_date) && rfi.status !== 'CLOSED' && rfi.status !== 'ANSWERED'

            return (
              <div
                key={rfi.id}
                className={`card p-4 hover:shadow-md transition-shadow cursor-pointer ${
                  overdue ? 'border-l-4 border-l-red-500' : ''
                }`}
                onClick={() => router.push(`/rfis/${rfi.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="font-mono text-sm text-gray-500 dark:text-gray-400">
                        {rfi.rfi_number}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(rfi.status)}`}>
                        {rfi.status.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${getPriorityColor(rfi.priority)}`}>
                        {getPriorityIcon(rfi.priority)}
                        {rfi.priority}
                      </span>
                      {overdue && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Overdue
                        </span>
                      )}
                      {rfi.answer && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Has Answer
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      {rfi.subject}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {rfi.question}
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                      {rfi.project_name && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {rfi.project_name}
                        </span>
                      )}
                      {rfi.assigned_to_name && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {rfi.assigned_to_name}
                        </span>
                      )}
                      {rfi.due_date && (
                        <span className={`flex items-center gap-1 ${overdue ? 'text-red-600 dark:text-red-400 font-medium' : ''}`}>
                          <Calendar className="h-3 w-3" />
                          Due: {new Date(rfi.due_date).toLocaleDateString()}
                          {daysUntilDue !== null && daysUntilDue > 0 && daysUntilDue <= 3 && (
                            <span className="text-yellow-600 dark:text-yellow-400">
                              ({daysUntilDue} day{daysUntilDue !== 1 ? 's' : ''} left)
                            </span>
                          )}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Created: {new Date(rfi.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0 ml-4" />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* New RFI Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Create New RFI
              </h2>
              <button onClick={() => setShowNewModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Project *</label>
                <select
                  value={newRfi.projectId}
                  onChange={(e) => setNewRfi((p) => ({ ...p, projectId: e.target.value }))}
                  className="input mt-1"
                >
                  <option value="">Select project...</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Subject *</label>
                <input
                  type="text"
                  value={newRfi.subject}
                  onChange={(e) => setNewRfi((p) => ({ ...p, subject: e.target.value }))}
                  className="input mt-1"
                  placeholder="Brief description of the RFI"
                />
              </div>
              <div>
                <label className="label">Question *</label>
                <textarea
                  value={newRfi.question}
                  onChange={(e) => setNewRfi((p) => ({ ...p, question: e.target.value }))}
                  className="input mt-1 min-h-[120px]"
                  placeholder="Detailed question or information request..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Priority</label>
                  <select
                    value={newRfi.priority}
                    onChange={(e) => setNewRfi((p) => ({ ...p, priority: e.target.value }))}
                    className="input mt-1"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="label">Due Date</label>
                  <input
                    type="date"
                    value={newRfi.dueDate}
                    onChange={(e) => setNewRfi((p) => ({ ...p, dueDate: e.target.value }))}
                    className="input mt-1"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
              <div>
                <label className="label">Assign To</label>
                <select
                  value={newRfi.assigneeId}
                  onChange={(e) => setNewRfi((p) => ({ ...p, assigneeId: e.target.value }))}
                  className="input mt-1"
                >
                  <option value="">Unassigned</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.role.replace(/_/g, ' ')})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowNewModal(false)} className="btn btn-outline flex-1 py-2">
                Cancel
              </button>
              <button
                onClick={handleCreateRFI}
                disabled={creating || !newRfi.projectId || !newRfi.subject || !newRfi.question}
                className="btn btn-primary flex-1 py-2"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create RFI'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
