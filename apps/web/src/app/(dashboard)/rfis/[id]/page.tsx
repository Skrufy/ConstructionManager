'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  FileQuestion,
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Calendar,
  User,
  Building2,
  Send,
  Edit3,
  Trash2,
  MessageSquare,
  ChevronDown,
  X,
  Save,
} from 'lucide-react'
import { getRfiStatusColor } from '@/lib/status-colors'

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
  answered_by: string | null
  created_by: string | null
  created_by_name: string | null
  created_at: string
  updated_at: string
  attachments: string[] | null
}

interface UserOption {
  id: string
  name: string
  email: string
  role: string
}

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft', color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-400' },
  { value: 'SUBMITTED', label: 'Submitted', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400' },
  { value: 'UNDER_REVIEW', label: 'Under Review', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400' },
  { value: 'ANSWERED', label: 'Answered', color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' },
  { value: 'CLOSED', label: 'Closed', color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-400' },
]

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low', color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-400' },
  { value: 'MEDIUM', label: 'Medium', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400' },
  { value: 'HIGH', label: 'High', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400' },
  { value: 'CRITICAL', label: 'Critical', color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400' },
]

interface PageProps {
  params: Promise<{ id: string }>
}

export default function RFIDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [rfi, setRfi] = useState<RFI | null>(null)
  const [users, setUsers] = useState<UserOption[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Edit mode states
  const [isEditing, setIsEditing] = useState(false)
  const [editedSubject, setEditedSubject] = useState('')
  const [editedQuestion, setEditedQuestion] = useState('')
  const [editedPriority, setEditedPriority] = useState('')
  const [editedAssignee, setEditedAssignee] = useState('')
  const [editedDueDate, setEditedDueDate] = useState('')

  // Answer mode states
  const [showAnswerForm, setShowAnswerForm] = useState(false)
  const [answer, setAnswer] = useState('')
  const [submittingAnswer, setSubmittingAnswer] = useState(false)

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    fetchRFI()
    fetchUsers()
  }, [id])

  const fetchRFI = async () => {
    try {
      const response = await fetch(`/api/rfis/${id}`)
      if (response.ok) {
        const data = await response.json()
        setRfi(data)
        // Initialize edit fields
        setEditedSubject(data.subject)
        setEditedQuestion(data.question)
        setEditedPriority(data.priority)
        setEditedAssignee(data.assigned_to || '')
        setEditedDueDate(data.due_date ? new Date(data.due_date).toISOString().split('T')[0] : '')
        setAnswer(data.answer || '')
      } else if (response.status === 404) {
        router.push('/rfis')
      } else {
        setError('Failed to load RFI')
      }
    } catch (err) {
      console.error('Error fetching RFI:', err)
      setError('Failed to load RFI')
    } finally {
      setLoading(false)
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

  const handleStatusChange = async (newStatus: string) => {
    if (!rfi) return
    setUpdating(true)
    setError('')

    try {
      const response = await fetch(`/api/rfis/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        const updatedRfi = await response.json()
        setRfi(updatedRfi)
        setSuccessMessage('Status updated successfully')
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to update status')
      }
    } catch (err) {
      console.error('Error updating status:', err)
      setError('Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!rfi) return
    setUpdating(true)
    setError('')

    try {
      const response = await fetch(`/api/rfis/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: editedSubject,
          question: editedQuestion,
          priority: editedPriority,
          assignedTo: editedAssignee || null,
          dueDate: editedDueDate || null,
        }),
      })

      if (response.ok) {
        const updatedRfi = await response.json()
        setRfi(updatedRfi)
        setIsEditing(false)
        setSuccessMessage('RFI updated successfully')
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to update RFI')
      }
    } catch (err) {
      console.error('Error updating RFI:', err)
      setError('Failed to update RFI')
    } finally {
      setUpdating(false)
    }
  }

  const handleSubmitAnswer = async () => {
    if (!rfi || !answer.trim()) return
    setSubmittingAnswer(true)
    setError('')

    try {
      const response = await fetch(`/api/rfis/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answer: answer,
          status: 'ANSWERED',
        }),
      })

      if (response.ok) {
        const updatedRfi = await response.json()
        setRfi(updatedRfi)
        setShowAnswerForm(false)
        setSuccessMessage('Answer submitted successfully')
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to submit answer')
      }
    } catch (err) {
      console.error('Error submitting answer:', err)
      setError('Failed to submit answer')
    } finally {
      setSubmittingAnswer(false)
    }
  }

  const handleDelete = async () => {
    if (!rfi) return
    setDeleting(true)
    setError('')

    try {
      const response = await fetch(`/api/rfis/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.push('/rfis')
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to delete RFI')
        setShowDeleteConfirm(false)
      }
    } catch (err) {
      console.error('Error deleting RFI:', err)
      setError('Failed to delete RFI')
      setShowDeleteConfirm(false)
    } finally {
      setDeleting(false)
    }
  }

  const cancelEdit = () => {
    if (!rfi) return
    setIsEditing(false)
    setEditedSubject(rfi.subject)
    setEditedQuestion(rfi.question)
    setEditedPriority(rfi.priority)
    setEditedAssignee(rfi.assigned_to || '')
    setEditedDueDate(rfi.due_date ? new Date(rfi.due_date).toISOString().split('T')[0] : '')
  }

  const getPriorityColor = (priority: string) => {
    const option = PRIORITY_OPTIONS.find(p => p.value === priority)
    return option?.color || 'bg-gray-100 text-gray-800'
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return <AlertTriangle className="h-4 w-4" />
      case 'HIGH':
        return <AlertCircle className="h-4 w-4" />
      default:
        return null
    }
  }

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse max-w-4xl mx-auto">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!rfi) {
    return (
      <div className="p-6 text-center">
        <FileQuestion className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">RFI not found</p>
        <Link href="/rfis" className="text-primary-600 hover:text-primary-700 mt-4 inline-block">
          Back to RFIs
        </Link>
      </div>
    )
  }

  const overdue = isOverdue(rfi.due_date) && rfi.status !== 'CLOSED' && rfi.status !== 'ANSWERED'

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/rfis"
          className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 flex items-center gap-2 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to RFIs
        </Link>

        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="font-mono text-sm text-gray-500 dark:text-gray-400">
                {rfi.rfi_number}
              </span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${getRfiStatusColor(rfi.status)}`}>
                {rfi.status.replace('_', ' ')}
              </span>
              <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${getPriorityColor(rfi.priority)}`}>
                {getPriorityIcon(rfi.priority)}
                {rfi.priority}
              </span>
              {overdue && (
                <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Overdue
                </span>
              )}
            </div>
            {isEditing ? (
              <input
                type="text"
                value={editedSubject}
                onChange={(e) => setEditedSubject(e.target.value)}
                className="input text-xl font-bold w-full"
              />
            ) : (
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {rfi.subject}
              </h1>
            )}
          </div>

          {!isEditing && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="btn btn-outline px-3 py-2 flex items-center gap-2"
              >
                <Edit3 className="h-4 w-4" />
                Edit
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="btn btn-outline px-3 py-2 flex items-center gap-2 text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-6 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          {successMessage}
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
          <button onClick={() => setError('')} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="space-y-6">
        {/* RFI Details Card */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            RFI Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">Project</label>
              <div className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-400" />
                {rfi.project_name || 'N/A'}
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">Assigned To</label>
              {isEditing ? (
                <select
                  value={editedAssignee}
                  onChange={(e) => setEditedAssignee(e.target.value)}
                  className="input mt-1"
                >
                  <option value="">Unassigned</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  {rfi.assigned_to_name || 'Unassigned'}
                </div>
              )}
            </div>

            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">Priority</label>
              {isEditing ? (
                <select
                  value={editedPriority}
                  onChange={(e) => setEditedPriority(e.target.value)}
                  className="input mt-1"
                >
                  {PRIORITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium mt-1 ${getPriorityColor(rfi.priority)}`}>
                  {getPriorityIcon(rfi.priority)}
                  {rfi.priority}
                </div>
              )}
            </div>

            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">Due Date</label>
              {isEditing ? (
                <input
                  type="date"
                  value={editedDueDate}
                  onChange={(e) => setEditedDueDate(e.target.value)}
                  className="input mt-1"
                />
              ) : (
                <div className={`font-medium flex items-center gap-2 ${overdue ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                  <Calendar className="h-4 w-4 text-gray-400" />
                  {rfi.due_date ? formatDate(rfi.due_date) : 'No due date'}
                </div>
              )}
            </div>

            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">Submitted By</label>
              <div className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                {rfi.created_by_name || 'N/A'}
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">Created</label>
              <div className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                {formatDateTime(rfi.created_at)}
              </div>
            </div>
          </div>

          {/* Edit Mode Actions */}
          {isEditing && (
            <div className="flex gap-3 pt-4 border-t dark:border-gray-700">
              <button
                onClick={cancelEdit}
                className="btn btn-outline px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={updating}
                className="btn btn-primary px-4 py-2 flex items-center gap-2"
              >
                {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
              </button>
            </div>
          )}
        </div>

        {/* Question Section */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-gray-400" />
            Question
          </h3>
          {isEditing ? (
            <textarea
              value={editedQuestion}
              onChange={(e) => setEditedQuestion(e.target.value)}
              className="input min-h-[150px] w-full"
            />
          ) : (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                {rfi.question}
              </p>
            </div>
          )}
        </div>

        {/* Answer Section */}
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-gray-400" />
              Answer
            </h3>
            {!rfi.answer && !showAnswerForm && rfi.status !== 'CLOSED' && (
              <button
                onClick={() => setShowAnswerForm(true)}
                className="btn btn-primary px-4 py-2 flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                Provide Answer
              </button>
            )}
          </div>

          {rfi.answer ? (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap mb-4">
                {rfi.answer}
              </p>
              {rfi.answered_at && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Answered on {formatDateTime(rfi.answered_at)}
                </p>
              )}
            </div>
          ) : showAnswerForm ? (
            <div className="space-y-4">
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="input min-h-[150px] w-full"
                placeholder="Provide a detailed answer to this RFI..."
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAnswerForm(false)}
                  className="btn btn-outline px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitAnswer}
                  disabled={submittingAnswer || !answer.trim()}
                  className="btn btn-primary px-4 py-2 flex items-center gap-2"
                >
                  {submittingAnswer ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Submit Answer
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                No answer provided yet
              </p>
            </div>
          )}
        </div>

        {/* Status Actions */}
        {!isEditing && (
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Actions
            </h3>
            <div className="flex flex-wrap gap-3">
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status.value}
                  onClick={() => handleStatusChange(status.value)}
                  disabled={updating || rfi.status === status.value}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    rfi.status === status.value
                      ? `${status.color} ring-2 ring-offset-2 ring-primary-500`
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {updating && rfi.status !== status.value ? null : (
                    rfi.status === status.value ? <CheckCircle className="h-4 w-4" /> : null
                  )}
                  {status.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Timeline
          </h3>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">RFI Created</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDateTime(rfi.created_at)}
                  {rfi.created_by_name && ` by ${rfi.created_by_name}`}
                </div>
              </div>
            </div>

            {rfi.answered_at && (
              <div className="flex gap-4">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Answer Provided</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDateTime(rfi.answered_at)}
                  </div>
                </div>
              </div>
            )}

            {rfi.status === 'CLOSED' && (
              <div className="flex gap-4">
                <div className="w-2 h-2 bg-gray-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">RFI Closed</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDateTime(rfi.updated_at)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Delete RFI
              </h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete <strong>{rfi.rfi_number}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn btn-outline flex-1 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="btn bg-red-600 hover:bg-red-700 text-white flex-1 py-2 flex items-center justify-center gap-2"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
