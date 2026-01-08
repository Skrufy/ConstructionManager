'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/hooks/useSession'
import {
  Users,
  Plus,
  Search,
  Loader2,
  AlertCircle,
  Edit2,
  Trash2,
  X,
  Check,
  Mail,
  Phone,
  Shield,
  UserPlus,
  Sparkles,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronLeft,
  Crown,
  Briefcase,
  HardHat,
  Building2,
  UserCheck,
  FolderKanban,
  FileText,
  Clock,
  Calendar,
  Truck,
  Image,
  DollarSign,
  BarChart3,
  TrendingUp,
  Award,
  Plane,
  CheckSquare,
  AlertTriangle,
  SkipForward,
  Minus,
  Plus as PlusIcon,
  Send,
  RefreshCw,
  XCircle,
} from 'lucide-react'

// Permission template interface
interface PermissionTemplate {
  id: string
  name: string
  description: string | null
  scope: 'PROJECT' | 'COMPANY'
  isDefault: boolean
  permissions: Record<string, unknown>
}

interface Project {
  id: string
  name: string
  status: string
}

// Role configuration with descriptions for non-technical users
const ROLES = [
  {
    value: 'ADMIN',
    label: 'Administrator',
    description: 'Full access to all features and settings',
    icon: Crown,
    color: 'red',
    bgClass: 'bg-red-100',
    textClass: 'text-red-700',
    borderClass: 'border-red-400',
    ringClass: 'ring-red-200',
  },
  {
    value: 'PROJECT_MANAGER',
    label: 'Project Manager',
    description: 'Manage projects, teams, and reports',
    icon: Briefcase,
    color: 'purple',
    bgClass: 'bg-purple-100',
    textClass: 'text-purple-700',
    borderClass: 'border-purple-400',
    ringClass: 'ring-purple-200',
  },
  {
    value: 'DEVELOPER',
    label: 'Developer',
    description: 'Real estate developer/client - view financials and progress',
    icon: Building2,
    color: 'indigo',
    bgClass: 'bg-indigo-100',
    textClass: 'text-indigo-700',
    borderClass: 'border-indigo-400',
    ringClass: 'ring-indigo-200',
  },
  {
    value: 'ARCHITECT',
    label: 'Architect/Engineer',
    description: 'Design professional - full document access',
    icon: Briefcase,
    color: 'cyan',
    bgClass: 'bg-cyan-100',
    textClass: 'text-cyan-700',
    borderClass: 'border-cyan-400',
    ringClass: 'ring-cyan-200',
  },
  {
    value: 'FOREMAN',
    label: 'Foreman',
    description: 'Site supervisor - oversee daily operations',
    icon: HardHat,
    color: 'blue',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-700',
    borderClass: 'border-blue-400',
    ringClass: 'ring-blue-200',
  },
  {
    value: 'CREW_LEADER',
    label: 'Crew Leader',
    description: 'Lead a specific crew or trade',
    icon: HardHat,
    color: 'teal',
    bgClass: 'bg-teal-100',
    textClass: 'text-teal-700',
    borderClass: 'border-teal-400',
    ringClass: 'ring-teal-200',
  },
  {
    value: 'OFFICE',
    label: 'Office Staff',
    description: 'Handle administrative tasks and reports',
    icon: Building2,
    color: 'yellow',
    bgClass: 'bg-yellow-100',
    textClass: 'text-yellow-700',
    borderClass: 'border-yellow-400',
    ringClass: 'ring-yellow-200',
  },
  {
    value: 'FIELD_WORKER',
    label: 'Field Worker',
    description: 'Log time, activities, and daily work',
    icon: HardHat,
    color: 'green',
    bgClass: 'bg-green-100',
    textClass: 'text-green-700',
    borderClass: 'border-green-400',
    ringClass: 'ring-green-200',
  },
  {
    value: 'VIEWER',
    label: 'Viewer',
    description: 'View-only access to projects and reports',
    icon: UserCheck,
    color: 'gray',
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-700',
    borderClass: 'border-gray-400',
    ringClass: 'ring-gray-200',
  },
]

const STATUSES = [
  { value: 'ACTIVE', label: 'Active', color: 'green', bgClass: 'bg-green-100', textClass: 'text-green-800', ringClass: 'ring-green-200' },
  { value: 'INACTIVE', label: 'Inactive', color: 'gray', bgClass: 'bg-gray-100', textClass: 'text-gray-800 dark:text-gray-200', ringClass: 'ring-gray-200' },
  { value: 'SUSPENDED', label: 'Suspended', color: 'red', bgClass: 'bg-red-100', textClass: 'text-red-800', ringClass: 'ring-red-200' },
  { value: 'PENDING_SETUP', label: 'Pending Setup', color: 'amber', bgClass: 'bg-amber-100', textClass: 'text-amber-800', ringClass: 'ring-amber-200' },
]

interface User {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
  status: string
  isBlaster?: boolean
  createdAt: string
  updatedAt: string
}

interface Invitation {
  id: string
  email: string
  role: string
  status: string
  expires_at: string
  created_at: string
  invited_by: {
    id: string
    name: string
    email: string
  }
}

interface UserFormData {
  name: string
  email: string
  password: string
  phone: string
  role: string
  status: string
  isBlaster: boolean
}

const initialFormData: UserFormData = {
  name: '',
  email: '',
  password: '',
  phone: '',
  role: 'FIELD_WORKER',
  status: 'ACTIVE',
  isBlaster: false,
}

export default function UsersPage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [viewFilter, setViewFilter] = useState<'all' | 'users' | 'pending_invites'>('all')

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('FIELD_WORKER')
  const [inviteMessage, setInviteMessage] = useState('')
  const [sendingInvite, setSendingInvite] = useState(false)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [formData, setFormData] = useState<UserFormData>(initialFormData)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Multi-step wizard state (for create mode)
  const [wizardStep, setWizardStep] = useState(1)
  const [selectedCompanyTemplate, setSelectedCompanyTemplate] = useState<string | null>(null)
  const [companyTemplates, setCompanyTemplates] = useState<PermissionTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set())
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [createdUserId, setCreatedUserId] = useState<string | null>(null)

  const isAdmin = session?.user?.role === 'ADMIN'
  const totalSteps = 3

  // Redirect non-admins
  useEffect(() => {
    if (sessionStatus === 'authenticated' && !isAdmin) {
      router.push('/dashboard')
    }
  }, [sessionStatus, isAdmin, router])

  // Success message timeout ref for cleanup
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)

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

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchQuery) params.set('search', searchQuery)
      if (roleFilter) params.set('role', roleFilter)

      const response = await fetch(`/api/users?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch users')

      const data = await response.json()
      setUsers(data)
    } catch (err) {
      console.error('Error fetching users:', err)
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [searchQuery, roleFilter])

  const fetchInvitations = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/invitations?status=PENDING')
      if (response.ok) {
        const data = await response.json()
        setInvitations(data.invitations || data || [])
      }
    } catch (err) {
      console.error('Error fetching invitations:', err)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
    fetchInvitations()
  }, [fetchUsers, fetchInvitations])

  // Send invitation
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setSendingInvite(true)
    setFormError(null)

    try {
      const response = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          message: inviteMessage || undefined,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to send invitation')

      setShowInviteModal(false)
      setInviteEmail('')
      setInviteRole('FIELD_WORKER')
      setInviteMessage('')
      fetchInvitations()
      showSuccess(`Invitation sent to ${inviteEmail}`)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to send invitation')
    } finally {
      setSendingInvite(false)
    }
  }

  // Resend invitation
  const handleResendInvite = async (inviteId: string, email: string) => {
    try {
      const response = await fetch(`/api/admin/invitations/${inviteId}/resend`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to resend invitation')
      showSuccess(`Invitation resent to ${email}`)
      fetchInvitations()
    } catch (err) {
      console.error('Error resending invitation:', err)
      setError('Failed to resend invitation')
    }
  }

  // Cancel invitation
  const handleCancelInvite = async (inviteId: string) => {
    if (!confirm('Are you sure you want to cancel this invitation?')) return

    try {
      const response = await fetch(`/api/admin/invitations/${inviteId}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to cancel invitation')
      showSuccess('Invitation cancelled')
      fetchInvitations()
    } catch (err) {
      console.error('Error cancelling invitation:', err)
      setError('Failed to cancel invitation')
    }
  }

  // Fetch company permission templates for step 2
  const fetchCompanyTemplates = useCallback(async () => {
    setLoadingTemplates(true)
    try {
      const response = await fetch('/api/permissions?scope=COMPANY')
      if (response.ok) {
        const data = await response.json()
        setCompanyTemplates(data.templates || [])
      }
    } catch (err) {
      console.error('Error fetching company templates:', err)
    } finally {
      setLoadingTemplates(false)
    }
  }, [])

  // Fetch projects for step 3
  const fetchProjects = useCallback(async () => {
    setLoadingProjects(true)
    try {
      const response = await fetch('/api/projects')
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects || data || [])
      }
    } catch (err) {
      console.error('Error fetching projects:', err)
    } finally {
      setLoadingProjects(false)
    }
  }, [])

  // Open modal for creating (multi-step wizard)
  const handleCreateClick = () => {
    setFormData(initialFormData)
    setSelectedUser(null)
    setModalMode('create')
    setFormError(null)
    setShowPassword(false)
    setWizardStep(1)
    setSelectedCompanyTemplate(null)
    setSelectedProjects(new Set())
    setCreatedUserId(null)
    setShowModal(true)
    fetchCompanyTemplates()
    fetchProjects()
  }

  // Open modal for editing
  const handleEditClick = (user: User) => {
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      phone: user.phone || '',
      role: user.role,
      status: user.status,
      isBlaster: user.isBlaster || false,
    })
    setSelectedUser(user)
    setModalMode('edit')
    setFormError(null)
    setShowPassword(false)
    setShowModal(true)
  }

  // Close modal
  const handleCloseModal = () => {
    setShowModal(false)
    setSelectedUser(null)
    setFormData(initialFormData)
    setFormError(null)
    setWizardStep(1)
    setSelectedCompanyTemplate(null)
    setSelectedProjects(new Set())
    setCreatedUserId(null)
  }

  // Handle Step 1 submission - Create user
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setSaving(true)

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to create user')

      // Store the created user ID for later steps
      setCreatedUserId(data.id)
      setFormData(prev => ({ ...prev, password: '' }))
      setWizardStep(2)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create user')
    } finally {
      setSaving(false)
    }
  }

  // Handle Step 2 submission - Assign company permission template
  const handleStep2Submit = async () => {
    if (!createdUserId) return

    // If a template is selected, assign it to the user
    if (selectedCompanyTemplate) {
      setSaving(true)
      try {
        const response = await fetch('/api/permissions/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: createdUserId,
            templateId: selectedCompanyTemplate,
          }),
        })
        if (!response.ok) {
          console.error('Failed to assign permission template')
        }
      } catch (err) {
        console.error('Error assigning template:', err)
      } finally {
        setSaving(false)
      }
    }
    setWizardStep(3)
  }

  // Handle Step 3 submission - Assign to projects
  const handleStep3Submit = async () => {
    if (!createdUserId || selectedProjects.size === 0) {
      handleCloseModal()
      fetchUsers()
      showSuccess(`${formData.name} added successfully!`)
      return
    }

    setSaving(true)
    try {
      // Assign user to each selected project
      for (const projectId of selectedProjects) {
        const response = await fetch(`/api/projects/${projectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assignedUserIds: [createdUserId],
          }),
        })
        if (!response.ok) {
          console.error(`Failed to assign user to project ${projectId}`)
        }
      }
    } catch (err) {
      console.error('Error assigning projects:', err)
    } finally {
      setSaving(false)
    }

    handleCloseModal()
    fetchUsers()
    showSuccess(`${formData.name} added and assigned to ${selectedProjects.size} project(s)!`)
  }

  // Toggle project selection
  const toggleProjectSelection = (projectId: string) => {
    setSelectedProjects(prev => {
      const next = new Set(prev)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.add(projectId)
      }
      return next
    })
  }

  // Handle form submission (for edit mode - single step)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // For create mode, use wizard flow
    if (modalMode === 'create') {
      await handleStep1Submit(e)
      return
    }

    // For edit mode, direct submit
    setFormError(null)
    setSaving(true)

    try {
      const payload: Record<string, unknown> = { ...formData }
      if (!payload.password) {
        delete payload.password
      }

      const response = await fetch(`/api/users/${selectedUser?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to save user')

      setFormData(prev => ({ ...prev, password: '' }))
      handleCloseModal()
      fetchUsers()
      showSuccess('User updated!')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save user')
    } finally {
      setSaving(false)
    }
  }

  // Handle delete
  const handleDelete = async (userId: string) => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/users/${userId}`, { method: 'DELETE' })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete user')
      }

      setDeleteConfirmId(null)
      fetchUsers()
      showSuccess('User removed')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user')
    } finally {
      setDeleting(false)
    }
  }

  // Get role config
  const getRoleConfig = (role: string) => ROLES.find(r => r.value === role) || ROLES[3]

  // Get status config
  const getStatusConfig = (status: string) => STATUSES.find(s => s.value === status) || STATUSES[0]

  // Filter users
  const filteredUsers = users.filter(user => {
    if (viewFilter === 'pending_invites') return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (!user.name.toLowerCase().includes(query) && !user.email.toLowerCase().includes(query)) {
        return false
      }
    }
    return true
  })

  // Filter invitations
  const filteredInvitations = invitations.filter(invite => {
    if (viewFilter === 'users') return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (!invite.email.toLowerCase().includes(query)) {
        return false
      }
    }
    if (roleFilter && invite.role !== roleFilter) return false
    return true
  })

  // Pending invites count
  const pendingInvitesCount = invitations.filter(i => i.status === 'PENDING').length

  // Get initials (handles edge cases like empty/whitespace strings)
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    const initials = parts.map(n => n[0] || '').join('').toUpperCase().slice(0, 2)
    return initials || '??'
  }

  // Generate avatar color based on name
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500',
      'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-cyan-500'
    ]
    const index = name.charCodeAt(0) % colors.length
    return colors[index]
  }

  if (sessionStatus === 'loading' || (sessionStatus === 'authenticated' && !isAdmin) || (loading && users.length === 0)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Loading team members...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-lg">
                <Users className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold">Team Members</h1>
              {pendingInvitesCount > 0 && (
                <span className="px-2.5 py-1 bg-amber-400 text-amber-900 text-xs font-bold rounded-full">
                  {pendingInvitesCount} pending
                </span>
              )}
            </div>
            <p className="text-purple-100">
              Manage your team and their access levels
            </p>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-2 px-5 py-3 bg-white/20 text-white rounded-xl font-semibold hover:bg-white/30 transition-all border border-white/30"
              >
                <Send className="h-5 w-5" />
                Send Invite
              </button>
              <button
                onClick={handleCreateClick}
                className="flex items-center gap-2 px-5 py-3 bg-white text-purple-600 rounded-xl font-semibold hover:bg-purple-50 transition-all shadow-lg"
              >
                <UserPlus className="h-5 w-5" />
                Add Team Member
              </button>
            </div>
          )}
        </div>
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

      {/* Pending Setup Warning */}
      {users.filter(u => u.status === 'PENDING_SETUP').length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 p-4 rounded-xl flex items-center gap-3 shadow-sm border border-amber-200 dark:border-amber-800">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div className="flex-1">
            <strong>{users.filter(u => u.status === 'PENDING_SETUP').length} user(s) pending setup</strong>
            <p className="text-sm text-amber-700 dark:text-amber-500 mt-1">
              These users signed in via mobile but weren&apos;t in the system. Review and activate them to grant access.
            </p>
          </div>
          <button
            onClick={() => setRoleFilter('')}
            className="px-3 py-1 bg-amber-200 dark:bg-amber-800 hover:bg-amber-300 dark:hover:bg-amber-700 rounded-lg text-sm font-medium transition-colors"
          >
            Show All
          </button>
        </div>
      )}

      {/* View Filter Tabs */}
      <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1.5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 w-fit">
        <button
          onClick={() => setViewFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            viewFilter === 'all'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          All ({users.length + invitations.length})
        </button>
        <button
          onClick={() => setViewFilter('users')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            viewFilter === 'users'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users ({users.length})
          </span>
        </button>
        <button
          onClick={() => setViewFilter('pending_invites')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            viewFilter === 'pending_invites'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Pending Invites ({pendingInvitesCount})
          </span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg text-gray-900 dark:text-gray-100"
            aria-label="Search team members by name or email"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg min-w-[200px] text-gray-900 dark:text-gray-100"
          aria-label="Filter by role"
        >
          <option value="">All Roles</option>
          {ROLES.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
      </div>

      {/* Users & Invitations List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {filteredUsers.length === 0 && filteredInvitations.length === 0 ? (
          <div className="text-center py-16">
            <Users className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {viewFilter === 'pending_invites' ? 'No pending invitations' : 'No team members found'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {searchQuery || roleFilter
                ? 'Try adjusting your filters'
                : viewFilter === 'pending_invites'
                  ? 'Send an invite to add team members'
                  : 'Get started by adding your first team member'}
            </p>
            {isAdmin && !searchQuery && !roleFilter && (
              <div className="flex items-center justify-center gap-3">
                {viewFilter === 'pending_invites' ? (
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition-all"
                  >
                    <Send className="h-5 w-5" />
                    Send Invite
                  </button>
                ) : (
                  <button
                    onClick={handleCreateClick}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-all"
                  >
                    <UserPlus className="h-5 w-5" />
                    Add Team Member
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {/* Pending Invitations Section */}
            {filteredInvitations.map((invite) => {
              const roleConfig = getRoleConfig(invite.role)
              const RoleIcon = roleConfig.icon
              const expiresAt = new Date(invite.expires_at)
              const isExpired = expiresAt < new Date()

              return (
                <div
                  key={`invite-${invite.id}`}
                  className="flex items-center justify-between p-5 hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-colors group border-l-4 border-l-amber-400 bg-amber-50/30 dark:bg-amber-900/5"
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar Placeholder */}
                    <div className="w-14 h-14 rounded-xl bg-amber-100 dark:bg-amber-900/30 border-2 border-dashed border-amber-400 flex items-center justify-center">
                      <Send className="h-6 w-6 text-amber-500" />
                    </div>

                    {/* Invite Info */}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">{invite.email}</h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          isExpired
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}>
                          <Clock className="h-3 w-3" />
                          {isExpired ? 'Expired' : 'Pending Invite'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          Sent {new Date(invite.created_at).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          {isExpired ? 'Expired' : `Expires ${expiresAt.toLocaleDateString()}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Role Badge */}
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${roleConfig.bgClass} opacity-75`}>
                      <RoleIcon className={`h-4 w-4 ${roleConfig.textClass}`} />
                      <span className={`font-medium text-sm ${roleConfig.textClass}`}>{roleConfig.label}</span>
                    </div>

                    {/* Actions */}
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleResendInvite(invite.id, invite.email)}
                          className="p-2 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400"
                          title="Resend Invite"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleCancelInvite(invite.id)}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-red-500 dark:text-red-400"
                          title="Cancel Invite"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Users Section */}
            {filteredUsers.map((user) => {
              const roleConfig = getRoleConfig(user.role)
              const statusConfig = getStatusConfig(user.status)
              const RoleIcon = roleConfig.icon

              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className={`w-14 h-14 rounded-xl ${getAvatarColor(user.name)} flex items-center justify-center text-white font-bold text-lg shadow-sm`}>
                      {getInitials(user.name)}
                    </div>

                    {/* User Info */}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">{user.name}</h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgClass} ${statusConfig.textClass}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" />
                          {user.email}
                        </span>
                        {user.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" />
                            {user.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Role Badge */}
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${roleConfig.bgClass}`}>
                      <RoleIcon className={`h-4 w-4 ${roleConfig.textClass}`} />
                      <span className={`font-medium text-sm ${roleConfig.textClass}`}>{roleConfig.label}</span>
                    </div>

                    {/* Actions */}
                    {isAdmin && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {deleteConfirmId === user.id ? (
                          <>
                            <span className="text-sm text-red-600 dark:text-red-400 mr-2">Remove?</span>
                            <button
                              onClick={() => handleDelete(user.id)}
                              disabled={deleting}
                              className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                            >
                              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEditClick(user)}
                              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-600 dark:text-gray-400"
                              title="Edit"
                              aria-label={`Edit ${user.name}`}
                            >
                              <Edit2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                            {user.id !== session?.user?.id && (
                              <button
                                onClick={() => setDeleteConfirmId(user.id)}
                                className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-red-500 dark:text-red-400"
                                title="Remove"
                                aria-label={`Remove ${user.name}`}
                              >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    <ChevronRight className="h-5 w-5 text-gray-300 dark:text-gray-600" />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
        {viewFilter === 'all' && (
          <>
            {filteredUsers.length} team member{filteredUsers.length !== 1 ? 's' : ''}
            {filteredInvitations.length > 0 && ` • ${filteredInvitations.length} pending invite${filteredInvitations.length !== 1 ? 's' : ''}`}
          </>
        )}
        {viewFilter === 'users' && (
          <>{filteredUsers.length} team member{filteredUsers.length !== 1 ? 's' : ''}</>
        )}
        {viewFilter === 'pending_invites' && (
          <>{filteredInvitations.length} pending invite{filteredInvitations.length !== 1 ? 's' : ''}</>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          onKeyDown={(e) => {
            if (e.key === 'Escape') handleCloseModal()
          }}
        >
          <div className="flex items-center justify-center min-h-screen px-4 py-8">
            {/* Background overlay */}
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={handleCloseModal}
              aria-hidden="true"
            />

            {/* Modal panel */}
            <div
              ref={modalRef}
              className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      {modalMode === 'create' ? <UserPlus className="h-5 w-5" /> : <Edit2 className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 id="modal-title" className="text-xl font-bold">
                        {modalMode === 'create' ? 'Add Team Member' : 'Edit Team Member'}
                      </h3>
                      <p className="text-purple-200 text-sm">
                        {modalMode === 'create'
                          ? wizardStep === 1 ? 'Step 1: Enter team member details'
                            : wizardStep === 2 ? 'Step 2: Set permission overrides'
                            : 'Step 3: Assign to projects'
                          : 'Update their information'}
                      </p>
                    </div>
                  </div>
                  <button onClick={handleCloseModal} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Step Progress Indicator (create mode only) */}
                {modalMode === 'create' && (
                  <div className="flex items-center gap-2 mt-4">
                    {[1, 2, 3].map((step) => (
                      <div key={step} className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                          step < wizardStep ? 'bg-green-500 text-white'
                            : step === wizardStep ? 'bg-white text-purple-600'
                            : 'bg-white/30 text-white/70'
                        }`}>
                          {step < wizardStep ? <Check className="h-4 w-4" /> : step}
                        </div>
                        {step < 3 && (
                          <div className={`w-12 h-1 mx-1 rounded ${step < wizardStep ? 'bg-green-500' : 'bg-white/30'}`} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Error */}
              {formError && (
                <div className="mx-6 mt-6 p-4 bg-red-50 text-red-700 rounded-xl text-sm flex items-center gap-2 border border-red-100">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  {formError}
                </div>
              )}

              {/* Step 1: User Details (or Edit Form) */}
              {(modalMode === 'edit' || wizardStep === 1) && (
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg"
                      placeholder="John Smith"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg"
                        placeholder="john@company.com"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Password
                      {modalMode === 'edit' && (
                        <span className="text-gray-400 font-normal ml-2">(leave blank to keep current)</span>
                      )}
                    </label>
                    <div className="relative">
                      <Shield className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required={modalMode === 'create'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full pl-12 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg"
                        placeholder={modalMode === 'edit' ? '********' : 'Create a password'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-400"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {modalMode === 'create' && (
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        Must be 8+ characters with uppercase, lowercase, and a number
                      </p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Phone Number <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>

                  {/* Role Selection */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Role
                    </label>
                    <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Select role">
                      {ROLES.map((role) => {
                        const RoleIcon = role.icon
                        const isSelected = formData.role === role.value
                        return (
                          <button
                            key={role.value}
                            type="button"
                            onClick={() => setFormData({ ...formData, role: role.value })}
                            className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                              isSelected
                                ? `${role.bgClass} ${role.borderClass} ring-2 ${role.ringClass}`
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                            role="radio"
                            aria-checked={isSelected}
                          >
                            <div className={`p-2 rounded-lg ${isSelected ? 'bg-white/50' : role.bgClass}`}>
                              <RoleIcon className={`h-5 w-5 ${role.textClass}`} />
                            </div>
                            <div>
                              <div className={`font-semibold ${isSelected ? role.textClass : 'text-gray-900 dark:text-gray-100'}`}>
                                {role.label}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {role.description}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Status (edit mode only) */}
                  {modalMode === 'edit' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Status
                      </label>
                      <div className="flex gap-3" role="radiogroup" aria-label="Select status">
                        {STATUSES.map((status) => {
                          const isSelected = formData.status === status.value
                          return (
                            <button
                              key={status.value}
                              type="button"
                              onClick={() => setFormData({ ...formData, status: status.value })}
                              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                                isSelected
                                  ? `${status.bgClass} ${status.textClass} ring-2 ${status.ringClass}`
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                              role="radio"
                              aria-checked={isSelected}
                            >
                              {status.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Special Certifications (edit mode only) */}
                  {modalMode === 'edit' && (
                    <div className="pt-2 border-t border-gray-200">
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Special Certifications
                      </label>
                      <div className="flex items-start gap-3 p-4 rounded-xl bg-orange-50 border border-orange-200">
                        <input
                          type="checkbox"
                          id="isBlaster"
                          checked={formData.isBlaster}
                          onChange={(e) => setFormData({ ...formData, isBlaster: e.target.checked })}
                          className="h-5 w-5 rounded border-orange-300 text-orange-600 focus:ring-orange-500 mt-0.5 cursor-pointer"
                        />
                        <label htmlFor="isBlaster" className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-2 text-sm font-medium text-orange-900">
                            <HardHat className="h-4 w-4" />
                            Certified Blaster
                          </div>
                          <div className="text-xs text-orange-700 mt-1">
                            User can be assigned to blasting documents and will appear in the blaster dropdown on the documents page
                          </div>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          {modalMode === 'create' ? 'Creating...' : 'Saving...'}
                        </>
                      ) : (
                        <>
                          {modalMode === 'create' ? (
                            <>
                              Next
                              <ChevronRight className="h-5 w-5" />
                            </>
                          ) : (
                            <>
                              <Check className="h-5 w-5" />
                              Save Changes
                            </>
                          )}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Step 2: Permission Template Selection */}
              {modalMode === 'create' && wizardStep === 2 && (
                <div className="p-6 space-y-5">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-blue-800 text-sm">
                      Assign a <strong>company permission template</strong> to define what <strong>{formData.name}</strong> can access across all tools.
                      Templates control access to company-wide features like reports, financials, and user management.
                    </p>
                  </div>

                  {loadingTemplates ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                    </div>
                  ) : companyTemplates.length === 0 ? (
                    <div className="text-center py-8">
                      <Shield className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-gray-400 font-medium">No permission templates available</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                        Create templates in Admin → Permissions to assign them to users.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {companyTemplates.map((template) => {
                        const isSelected = selectedCompanyTemplate === template.id
                        return (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() => setSelectedCompanyTemplate(isSelected ? null : template.id)}
                            className={`w-full flex items-center justify-between p-4 rounded-xl border-2 text-left transition-all ${
                              isSelected
                                ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-200'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${isSelected ? 'bg-purple-100' : 'bg-gray-100'}`}>
                                <Shield className={`h-5 w-5 ${isSelected ? 'text-purple-600' : 'text-gray-500'}`} />
                              </div>
                              <div>
                                <p className={`font-medium ${isSelected ? 'text-purple-700' : 'text-gray-900 dark:text-gray-100'}`}>
                                  {template.name}
                                  {template.isDefault && (
                                    <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                                      Default
                                    </span>
                                  )}
                                </p>
                                {template.description && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{template.description}</p>
                                )}
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="h-5 w-5 text-purple-600" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {selectedCompanyTemplate && (
                    <p className="text-sm text-purple-600">
                      Template selected. This will determine company-wide access.
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setWizardStep(1)}
                      className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all flex items-center gap-2"
                    >
                      <ChevronLeft className="h-5 w-5" />
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCompanyTemplate(null)
                        setWizardStep(3)
                      }}
                      className="flex-1 px-6 py-3 border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                    >
                      <SkipForward className="h-5 w-5" />
                      Skip
                    </button>
                    <button
                      type="button"
                      onClick={handleStep2Submit}
                      disabled={saving}
                      className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          Next
                          <ChevronRight className="h-5 w-5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Project Assignments */}
              {modalMode === 'create' && wizardStep === 3 && (
                <div className="p-6 space-y-5">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-blue-800 text-sm">
                      Select which projects <strong>{formData.name}</strong> should be assigned to.
                      They will be able to access these projects based on their role permissions.
                    </p>
                  </div>

                  {loadingProjects ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                    </div>
                  ) : projects.length === 0 ? (
                    <div className="text-center py-8">
                      <FolderKanban className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-gray-400">No projects available</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {projects.map((project) => {
                        const isSelected = selectedProjects.has(project.id)
                        return (
                          <button
                            key={project.id}
                            type="button"
                            onClick={() => toggleProjectSelection(project.id)}
                            className={`w-full flex items-center justify-between p-4 rounded-xl border-2 text-left transition-all ${
                              isSelected
                                ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-200'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${isSelected ? 'bg-purple-100' : 'bg-gray-100'}`}>
                                <FolderKanban className={`h-5 w-5 ${isSelected ? 'text-purple-600' : 'text-gray-500'}`} />
                              </div>
                              <div>
                                <p className={`font-medium ${isSelected ? 'text-purple-700' : 'text-gray-900 dark:text-gray-100'}`}>
                                  {project.name}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{project.status}</p>
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="h-5 w-5 text-purple-600" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {selectedProjects.size > 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {selectedProjects.size} project(s) selected
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setWizardStep(2)}
                      className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all flex items-center gap-2"
                    >
                      <ChevronLeft className="h-5 w-5" />
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleCloseModal()
                        fetchUsers()
                        showSuccess(`${formData.name} added successfully!`)
                      }}
                      className="flex-1 px-6 py-3 border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                    >
                      <SkipForward className="h-5 w-5" />
                      Skip
                    </button>
                    <button
                      type="button"
                      onClick={handleStep3Submit}
                      disabled={saving || selectedProjects.size === 0}
                      className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Assigning...
                        </>
                      ) : (
                        <>
                          <Check className="h-5 w-5" />
                          Finish
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Send Invite Modal */}
      {showInviteModal && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-modal-title"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setShowInviteModal(false)
          }}
        >
          <div className="flex items-center justify-center min-h-screen px-4 py-8">
            {/* Background overlay */}
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowInviteModal(false)}
              aria-hidden="true"
            />

            {/* Modal panel */}
            <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Send className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 id="invite-modal-title" className="text-xl font-bold">
                        Send Invitation
                      </h3>
                      <p className="text-amber-100 text-sm">
                        Invite a new team member via email
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowInviteModal(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Form Error */}
              {formError && (
                <div className="mx-6 mt-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-xl text-sm flex items-center gap-2 border border-red-100 dark:border-red-800">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  {formError}
                </div>
              )}

              <form onSubmit={handleSendInvite} className="p-6 space-y-5">
                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                      placeholder="colleague@company.com"
                    />
                  </div>
                </div>

                {/* Role Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Role
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {ROLES.map((role) => {
                      const RoleIcon = role.icon
                      const isSelected = inviteRole === role.value
                      return (
                        <button
                          key={role.value}
                          type="button"
                          onClick={() => setInviteRole(role.value)}
                          className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${
                            isSelected
                              ? `${role.bgClass} ${role.borderClass} ring-2 ${role.ringClass}`
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          <RoleIcon className={`h-4 w-4 ${role.textClass}`} />
                          <span className={`font-medium text-sm ${isSelected ? role.textClass : 'text-gray-700 dark:text-gray-300'}`}>
                            {role.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Optional Message */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Personal Message <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                    placeholder="Add a personal note to your invitation..."
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowInviteModal(false)
                      setInviteEmail('')
                      setInviteRole('FIELD_WORKER')
                      setInviteMessage('')
                      setFormError(null)
                    }}
                    className="flex-1 px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendingInvite || !inviteEmail}
                    className="flex-1 px-6 py-3 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {sendingInvite ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5" />
                        Send Invitation
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
