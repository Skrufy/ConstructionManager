'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  UserPlus,
  X,
  User,
  Loader2,
  Search,
  Check,
  AlertCircle,
  Shield,
} from 'lucide-react'

interface TeamMember {
  id: string
  userId: string
  projectId: string
  roleOverride: string | null
  projectTemplateId: string | null
  createdAt: string
  user: {
    id: string
    name: string
    email: string
    role: string
  }
  projectTemplate?: {
    id: string
    name: string
  } | null
}

interface UserOption {
  id: string
  name: string
  email: string
  role: string
}

interface PermissionTemplate {
  id: string
  name: string
  description: string | null
  is_system_default?: boolean
  scope?: string
}

// Legacy role options for backwards compatibility
const LEGACY_ROLE_OPTIONS = [
  { value: '', label: 'Use Permission Template →' },
  { value: 'LEAD', label: 'Project Lead (Legacy)' },
  { value: 'MEMBER', label: 'Team Member (Legacy)' },
  { value: 'VIEWER', label: 'View Only (Legacy)' },
]

export default function TeamManagementPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [project, setProject] = useState<{ id: string; name: string } | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Permission templates
  const [projectTemplates, setProjectTemplates] = useState<PermissionTemplate[]>([])

  // Add member modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [availableUsers, setAvailableUsers] = useState<UserOption[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [addingMember, setAddingMember] = useState(false)

  // Remove member state
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)

  // Fetch project permission templates
  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/permissions?scope=project')
      if (res.ok) {
        const data = await res.json()
        setProjectTemplates(data.templates || [])
      } else {
        console.error('Failed to fetch templates:', res.status, res.statusText)
      }
    } catch (err) {
      console.error('Error fetching templates:', err)
    }
  }, [])

  // Fetch team members and templates
  useEffect(() => {
    const fetchTeam = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/projects/${projectId}/team`)
        if (!res.ok) {
          if (res.status === 404) {
            router.push('/projects')
            return
          }
          throw new Error('Failed to fetch team')
        }
        const data = await res.json()
        setMembers(data.assignments || [])
        setProject(data.project)
      } catch (err) {
        console.error('Error fetching team:', err)
        setError('Failed to load team members')
      } finally {
        setLoading(false)
      }
    }

    fetchTeam()
    fetchTemplates()
  }, [projectId, router, fetchTemplates])

  // Fetch available users when modal opens
  useEffect(() => {
    if (!showAddModal) return

    const fetchUsers = async () => {
      try {
        setLoadingUsers(true)
        const res = await fetch('/api/users')
        if (res.ok) {
          const data = await res.json()
          const userList = Array.isArray(data) ? data : (data.users || [])
          setAvailableUsers(userList)
        }
      } catch (err) {
        console.error('Error fetching users:', err)
      } finally {
        setLoadingUsers(false)
      }
    }

    fetchUsers()
  }, [showAddModal])

  // Filter users: exclude already assigned members
  const assignedUserIds = members.map(m => m.user.id)
  const filteredUsers = availableUsers.filter(user => {
    if (assignedUserIds.includes(user.id)) return false
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    )
  })

  const formatRole = (role: string) => {
    return role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-700'
      case 'PROJECT_MANAGER':
        return 'bg-blue-100 text-blue-700'
      case 'SUPERINTENDENT':
        return 'bg-green-100 text-green-700'
      case 'MECHANIC':
        return 'bg-orange-100 text-orange-700'
      case 'LEAD':
        return 'bg-indigo-100 text-indigo-700'
      case 'MEMBER':
        return 'bg-gray-100 text-gray-700'
      case 'VIEWER':
        return 'bg-gray-100 text-gray-500'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const handleAddMember = async () => {
    if (!selectedUserId) return

    try {
      setAddingMember(true)
      const res = await fetch(`/api/projects/${projectId}/team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          projectTemplateId: selectedTemplateId || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to add member')
      }

      const data = await res.json()
      setMembers(prev => [...prev, data.assignment])
      setShowAddModal(false)
      setSelectedUserId(null)
      setSelectedTemplateId('')
      setSearchQuery('')
    } catch (err) {
      console.error('Error adding member:', err)
      setError(err instanceof Error ? err.message : 'Failed to add member')
    } finally {
      setAddingMember(false)
    }
  }

  const handleRemoveMember = async (assignmentId: string) => {
    try {
      setRemovingMemberId(assignmentId)
      const res = await fetch(
        `/api/projects/${projectId}/team?assignmentId=${assignmentId}`,
        { method: 'DELETE' }
      )

      if (!res.ok) {
        throw new Error('Failed to remove member')
      }

      setMembers(prev => prev.filter(m => m.id !== assignmentId))
    } catch (err) {
      console.error('Error removing member:', err)
      setError('Failed to remove team member')
    } finally {
      setRemovingMemberId(null)
    }
  }

  const handleRoleChange = async (assignmentId: string, roleOverride: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/team`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId, roleOverride: roleOverride || null }),
      })

      if (!res.ok) {
        throw new Error('Failed to update role')
      }

      const data = await res.json()
      setMembers(prev =>
        prev.map(m => (m.id === assignmentId ? data.assignment : m))
      )
    } catch (err) {
      console.error('Error updating role:', err)
      setError('Failed to update team member role')
    }
  }

  const handleTemplateChange = async (assignmentId: string, templateId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/team`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId,
          projectTemplateId: templateId || null,
          roleOverride: null, // Clear legacy role when using template
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to update permissions')
      }

      const data = await res.json()
      setMembers(prev =>
        prev.map(m => (m.id === assignmentId ? data.assignment : m))
      )
    } catch (err) {
      console.error('Error updating permissions:', err)
      setError('Failed to update team member permissions')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header - Construction UI compliant with large touch targets */}
      <div className="flex items-center gap-4">
        <Link
          href={`/projects/${projectId}`}
          className="min-h-[48px] min-w-[48px] flex items-center justify-center
                     rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600
                     active:bg-gray-300 dark:active:bg-gray-500 transition-colors"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Manage Team</h1>
          {project && (
            <p className="text-gray-600 dark:text-gray-400">{project.name}</p>
          )}
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="min-h-[56px] px-6 flex items-center gap-2
                     bg-primary-600 text-white rounded-xl font-semibold
                     hover:bg-primary-700 active:bg-primary-800 transition-colors"
        >
          <UserPlus className="h-5 w-5" />
          <span className="hidden sm:inline">Add Member</span>
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto p-1 hover:bg-red-100 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Team members list */}
      <div className="card divide-y divide-gray-100">
        {members.length === 0 ? (
          <div className="p-8 text-center">
            <User className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">No team members assigned</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Click "Add Member" to assign users to this project
            </p>
          </div>
        ) : (
          members.map(member => (
            <div
              key={member.id}
              className="p-4 flex items-center gap-4"
            >
              {/* User avatar - 48px touch target */}
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="h-6 w-6 text-gray-500 dark:text-gray-400" />
              </div>

              {/* User info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {member.user.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {member.user.email}
                </p>
              </div>

              {/* Role badge and permission controls */}
              <div className="flex items-center gap-3">
                <span className={`hidden sm:inline-block text-xs px-2 py-1 rounded-full ${getRoleBadgeColor(member.user.role)}`}>
                  {formatRole(member.user.role)}
                </span>

                {/* Permission template selector - 48px height for touch */}
                {projectTemplates.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-gray-400 hidden sm:block" />
                    <select
                      value={member.projectTemplateId || ''}
                      onChange={(e) => handleTemplateChange(member.id, e.target.value)}
                      className="min-h-[48px] px-3 border border-gray-200 rounded-lg
                                 text-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500
                                 focus:border-primary-500"
                    >
                      <option value="">Default Access</option>
                      {projectTemplates.map(template => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  // Fallback to legacy role override if no templates
                  <select
                    value={member.roleOverride || ''}
                    onChange={(e) => handleRoleChange(member.id, e.target.value)}
                    className="min-h-[48px] px-3 border border-gray-200 rounded-lg
                               text-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500
                               focus:border-primary-500"
                  >
                    {LEGACY_ROLE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}

                {/* Remove button - 48px touch target */}
                <button
                  onClick={() => handleRemoveMember(member.id)}
                  disabled={removingMemberId === member.id}
                  className="min-h-[48px] min-w-[48px] flex items-center justify-center
                             text-red-600 hover:bg-red-50 active:bg-red-100
                             rounded-lg transition-colors disabled:opacity-50"
                  title="Remove from project"
                >
                  {removingMemberId === member.id ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <X className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div
            className="bg-white rounded-t-2xl sm:rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Add Team Member</h2>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setSelectedUserId(null)
                  setSelectedTemplateId('')
                  setSearchQuery('')
                }}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center
                           hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Search input */}
            <div className="p-4 border-b space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="w-full min-h-[48px] pl-12 pr-4 border border-gray-200 rounded-xl
                             focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Project Template Selector */}
              {projectTemplates.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Shield className="h-4 w-4 inline mr-2" />
                    Project Template (Permissions)
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full min-h-[48px] px-3 border border-gray-200 rounded-xl
                               bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500
                               focus:border-primary-500"
                  >
                    <option value="">Default Access</option>
                    {projectTemplates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                        {template.description ? ` - ${template.description}` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Choose what permissions this user will have on this project
                  </p>
                </div>
              )}
            </div>

            {/* User list */}
            <div className="flex-1 overflow-y-auto p-2">
              {loadingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  {searchQuery ? 'No users found' : 'All users are already assigned'}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredUsers.map(user => (
                    <button
                      key={user.id}
                      onClick={() => setSelectedUserId(
                        selectedUserId === user.id ? null : user.id
                      )}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                        selectedUserId === user.id
                          ? 'bg-primary-50 border-2 border-primary-500'
                          : 'hover:bg-gray-50 border-2 border-transparent'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        selectedUserId === user.id
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {selectedUserId === user.id ? (
                          <Check className="h-5 w-5" />
                        ) : (
                          <User className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{user.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${getRoleBadgeColor(user.role)}`}>
                        {formatRole(user.role)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="p-4 border-t flex gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setSelectedUserId(null)
                  setSelectedTemplateId('')
                  setSearchQuery('')
                }}
                className="flex-1 min-h-[56px] px-4 border border-gray-300 rounded-xl
                           font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                disabled={!selectedUserId || addingMember}
                className="flex-1 min-h-[56px] px-4 bg-primary-600 text-white rounded-xl
                           font-semibold hover:bg-primary-700 disabled:opacity-50
                           disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {addingMember ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-5 w-5" />
                    Add to Team
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
