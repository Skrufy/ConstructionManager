'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from '@/hooks/useSession'
import {
  Shield,
  Users,
  Plus,
  Search,
  Loader2,
  AlertCircle,
  Check,
  X,
  Trash2,
  Edit2,
  Crown,
  Building2,
  FolderKanban,
  FileText,
  Clock,
  Calendar,
  Truck,
  Image,
  Camera,
  DollarSign,
  BarChart3,
  Settings,
  UserCog,
  CheckSquare,
  AlertTriangle,
  Plane,
  MessageSquare,
  Package,
  Tag,
  Lock,
  Eye,
  Pencil,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Copy,
  RefreshCw,
  HardHat,
  TrendingUp,
  Award,
} from 'lucide-react'

// Types for the new permission system
interface PermissionTemplate {
  id: string
  name: string
  description: string | null
  scope: 'company' | 'project'
  tool_permissions: Record<string, string>
  granular_permissions: Record<string, string[]>
  is_system_default: boolean
  is_protected: boolean
  sort_order: number
  usage_count: number
  created_at: string
  updated_at: string
}

interface UserWithPermissions {
  id: string
  name: string
  email: string
  role: string
  company_template?: string
  project_count: number
}

interface ProjectWithAssignments {
  id: string
  name: string
  status: string
  assignments: {
    id: string
    userId: string
    projectTemplateId: string | null
    user: {
      id: string
      name: string
      email: string
    }
    projectTemplate?: {
      id: string
      name: string
    } | null
  }[]
}

// Tool definitions matching Settings > Modules (source of truth)
const PROJECT_TOOLS = [
  { key: 'daily_logs', name: 'Daily Logs', icon: FileText },
  { key: 'time_tracking', name: 'Time Tracking', icon: Clock },
  { key: 'equipment', name: 'Equipment', icon: Truck },
  { key: 'documents', name: 'Documents', icon: Image },
  { key: 'drawings', name: 'Drawings', icon: FolderKanban },
  { key: 'schedule', name: 'Scheduling', icon: Calendar },
  { key: 'punch_lists', name: 'Punch Lists', icon: CheckSquare },
  { key: 'safety', name: 'Quality & Safety', icon: Shield },
  { key: 'drone_flights', name: 'DroneDeploy', icon: Plane },
  { key: 'rfis', name: 'RFIs', icon: MessageSquare },
  { key: 'materials', name: 'Materials', icon: Package },
  { key: 'approvals', name: 'Approvals', icon: CheckSquare },
]

const COMPANY_TOOLS = [
  { key: 'directory', name: 'Directory', icon: Users },
  { key: 'subcontractors', name: 'Subcontractors', icon: HardHat },
  { key: 'certifications', name: 'Certifications', icon: Award },
  { key: 'financials', name: 'Financials', icon: DollarSign },
  { key: 'reports', name: 'Reports', icon: BarChart3 },
  { key: 'analytics', name: 'Analytics', icon: TrendingUp },
  { key: 'label_library', name: 'Label Library', icon: Tag },
  { key: 'settings', name: 'Settings', icon: Settings },
  { key: 'user_management', name: 'User Management', icon: UserCog },
  { key: 'warnings', name: 'Employee Warnings', icon: AlertTriangle },
]

const ACCESS_LEVELS = [
  { key: 'none', label: 'None', color: 'bg-gray-200 dark:bg-gray-700 text-gray-500', icon: X },
  { key: 'read_only', label: 'View', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400', icon: Eye },
  { key: 'standard', label: 'Edit', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400', icon: Pencil },
  { key: 'admin', label: 'Admin', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400', icon: ShieldCheck },
]

function AccessLevelBadge({ level }: { level: string }) {
  const config = ACCESS_LEVELS.find(l => l.key === level) || ACCESS_LEVELS[0]
  const Icon = config.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  )
}

function AccessLevelSelector({
  value,
  onChange,
  disabled = false
}: {
  value: string
  onChange: (level: string) => void
  disabled?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const current = ACCESS_LEVELS.find(l => l.key === value) || ACCESS_LEVELS[0]
  const CurrentIcon = current.icon

  if (disabled) {
    return <AccessLevelBadge level={value} />
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${current.color} hover:opacity-80 transition-opacity`}
      >
        <CurrentIcon className="h-3 w-3" />
        {current.label}
        <ChevronDown className="h-3 w-3 ml-1" />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 z-20 min-w-[120px]">
            {ACCESS_LEVELS.map((level) => {
              const LevelIcon = level.icon
              return (
                <button
                  key={level.key}
                  onClick={() => {
                    onChange(level.key)
                    setIsOpen(false)
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg ${
                    value === level.key ? 'bg-gray-50 dark:bg-gray-700' : ''
                  }`}
                >
                  <LevelIcon className="h-4 w-4" />
                  {level.label}
                  {value === level.key && <Check className="h-4 w-4 ml-auto text-green-500" />}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default function PermissionsPage() {
  const { data: session } = useSession()
  const [templates, setTemplates] = useState<PermissionTemplate[]>([])
  const [users, setUsers] = useState<UserWithPermissions[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'project' | 'company' | 'users' | 'projectAssignments'>('project')
  const [searchQuery, setSearchQuery] = useState('')

  // Template editor state
  const [editingTemplate, setEditingTemplate] = useState<PermissionTemplate | null>(null)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    scope: 'project' as 'project' | 'company',
    tool_permissions: {} as Record<string, string>,
    granular_permissions: {} as Record<string, string[]>,
  })
  const [saving, setSaving] = useState(false)

  // User assignment state
  const [showUserAssignModal, setShowUserAssignModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserWithPermissions | null>(null)
  const [selectedCompanyTemplate, setSelectedCompanyTemplate] = useState<string>('')

  // Project assignments state
  const [projects, setProjects] = useState<ProjectWithAssignments[]>([])
  const [showProjectAssignModal, setShowProjectAssignModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState<ProjectWithAssignments | null>(null)
  const [assignUserId, setAssignUserId] = useState<string>('')
  const [assignTemplateId, setAssignTemplateId] = useState<string>('')
  const [assigning, setAssigning] = useState(false)

  // Edit assignment state
  const [showEditAssignmentModal, setShowEditAssignmentModal] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<{
    id: string
    userId: string
    userName: string
    userEmail: string
    projectTemplateId: string | null
    projectId: string
    projectName: string
  } | null>(null)
  const [editTemplateId, setEditTemplateId] = useState<string>('')
  const [updating, setUpdating] = useState(false)

  // Expanded template view
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Always fetch projects to ensure the count is accurate on initial load
      const requests = [
        fetch('/api/permissions'),
        fetch('/api/users'),
        fetch('/api/projects?includeAssignments=true'),
      ]

      const responses = await Promise.all(requests)
      const [permissionsRes, usersRes, projectsRes] = responses

      if (!permissionsRes.ok) {
        throw new Error('Failed to fetch permissions')
      }

      const permissionsData = await permissionsRes.json()
      const usersData = await usersRes.json()
      const projectsData = await projectsRes.json()

      setTemplates(permissionsData.templates || [])
      setProjects(Array.isArray(projectsData) ? projectsData : projectsData.projects || [])

      // Transform users data
      const usersArray = Array.isArray(usersData) ? usersData : usersData.users || []
      setUsers(usersArray.map((u: { id: string; name: string; email: string; role: string; companyPermission?: { companyTemplate?: { name: string } }; project_count?: number }) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        company_template: u.companyPermission?.companyTemplate?.name,
        project_count: u.project_count || 0,
      })))
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Failed to load permissions data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const projectTemplates = templates.filter(t => t.scope === 'project')
  const companyTemplates = templates.filter(t => t.scope === 'company')

  const handleCreateTemplate = () => {
    setEditingTemplate(null)
    const tools = activeTab === 'company' ? COMPANY_TOOLS : PROJECT_TOOLS
    const initialPermissions: Record<string, string> = {}
    tools.forEach(t => {
      initialPermissions[t.key] = 'none'
    })
    setTemplateForm({
      name: '',
      description: '',
      scope: activeTab === 'company' ? 'company' : 'project',
      tool_permissions: initialPermissions,
      granular_permissions: {},
    })
    setShowTemplateModal(true)
  }

  const handleEditTemplate = (template: PermissionTemplate) => {
    if (template.is_protected) return
    setEditingTemplate(template)
    setTemplateForm({
      name: template.name,
      description: template.description || '',
      scope: template.scope,
      tool_permissions: { ...template.tool_permissions },
      granular_permissions: { ...template.granular_permissions },
    })
    setShowTemplateModal(true)
  }

  const handleDuplicateTemplate = (template: PermissionTemplate) => {
    setEditingTemplate(null)
    setTemplateForm({
      name: `${template.name} (Copy)`,
      description: template.description || '',
      scope: template.scope,
      tool_permissions: { ...template.tool_permissions },
      granular_permissions: { ...template.granular_permissions },
    })
    setShowTemplateModal(true)
  }

  const handleSaveTemplate = async () => {
    if (!templateForm.name.trim()) {
      setError('Template name is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const url = editingTemplate
        ? `/api/permissions/${editingTemplate.id}`
        : '/api/permissions'

      const response = await fetch(url, {
        method: editingTemplate ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateForm.name.trim(),
          description: templateForm.description.trim() || null,
          scope: templateForm.scope,
          tool_permissions: templateForm.tool_permissions,
          granular_permissions: templateForm.granular_permissions,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save template')
      }

      setShowTemplateModal(false)
      setEditingTemplate(null)
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTemplate = async (template: PermissionTemplate) => {
    if (template.is_protected || template.is_system_default) return
    if (template.usage_count > 0) {
      setError(`Cannot delete template in use by ${template.usage_count} user(s)`)
      return
    }
    if (!confirm(`Delete template "${template.name}"?`)) return

    try {
      const response = await fetch(`/api/permissions/${template.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete template')
      }

      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template')
    }
  }

  const handleAssignCompanyTemplate = async () => {
    if (!selectedUser || !selectedCompanyTemplate) return

    setSaving(true)
    try {
      const response = await fetch('/api/permissions/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedUser.id,
          company_template_id: selectedCompanyTemplate,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to assign template')
      }

      setShowUserAssignModal(false)
      setSelectedUser(null)
      setSelectedCompanyTemplate('')
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign template')
    } finally {
      setSaving(false)
    }
  }

  const handleMigrateAll = async () => {
    if (!confirm('Migrate all users without permissions to the new system?')) return

    setSaving(true)
    try {
      const response = await fetch('/api/permissions/assign', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ migrateAll: true }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to migrate users')
      }

      const data = await response.json()
      alert(`Successfully migrated ${data.migrated_users} users`)
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to migrate users')
    } finally {
      setSaving(false)
    }
  }

  const filteredUsers = users.filter(
    user =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const unmigrated = users.filter(u => !u.company_template).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Loading permissions...</p>
        </div>
      </div>
    )
  }

  const currentTools = activeTab === 'company' ? COMPANY_TOOLS : PROJECT_TOOLS
  const currentTemplates = activeTab === 'company' ? companyTemplates : projectTemplates

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-white/20 rounded-lg">
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">Permission Templates</h1>
        </div>
        <p className="text-indigo-100">
          Configure permission templates for company and project access
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Migration Banner */}
      {unmigrated > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-300">
                {unmigrated} user(s) need migration
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400">
                These users don&apos;t have permission templates assigned yet
              </p>
            </div>
          </div>
          <button
            onClick={handleMigrateAll}
            disabled={saving}
            className="btn bg-amber-600 hover:bg-amber-700 text-white"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Migrate All'}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="card">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-6 px-4">
            {[
              { id: 'project', name: 'Project Templates', icon: FolderKanban, count: projectTemplates.length },
              { id: 'company', name: 'Company Templates', icon: Building2, count: companyTemplates.length },
              { id: 'users', name: 'User Assignments', icon: Users, count: users.length },
              { id: 'projectAssignments', name: 'Project Access', icon: Shield, count: projects.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'project' | 'company' | 'users' | 'projectAssignments')}
                className={`py-5 px-2 border-b-2 font-semibold text-base flex items-center gap-3 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                {tab.name}
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Project/Company Templates Tab */}
          {(activeTab === 'project' || activeTab === 'company') && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <p className="text-gray-600 dark:text-gray-400">
                  {activeTab === 'project'
                    ? 'Define what users can do within specific projects'
                    : 'Define what users can do at the company level'
                  }
                </p>
                <button
                  onClick={handleCreateTemplate}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <Plus className="h-5 w-5" />
                  New Template
                </button>
              </div>

              {/* Templates List */}
              <div className="space-y-4">
                {currentTemplates.map((template) => (
                  <div
                    key={template.id}
                    className={`card border-2 ${
                      template.is_protected
                        ? 'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    {/* Template Header */}
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setExpandedTemplate(expandedTemplate === template.id ? null : template.id)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                          {expandedTemplate === template.id ? (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            {template.is_protected && (
                              <Lock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            )}
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                              {template.name}
                            </h3>
                            {template.is_system_default && (
                              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs">
                                System
                              </span>
                            )}
                          </div>
                          {template.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {template.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {template.usage_count} user{template.usage_count !== 1 ? 's' : ''}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDuplicateTemplate(template)}
                            className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            title="Duplicate"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          {!template.is_protected && (
                            <>
                              <button
                                onClick={() => handleEditTemplate(template)}
                                className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                title="Edit"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              {!template.is_system_default && template.usage_count === 0 && (
                                <button
                                  onClick={() => handleDeleteTemplate(template)}
                                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Permissions View */}
                    {expandedTemplate === template.id && (
                      <div className="border-t dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                          {currentTools.map((tool) => {
                            const Icon = tool.icon
                            const level = template.tool_permissions[tool.key] || 'none'
                            return (
                              <div
                                key={tool.key}
                                className="flex flex-col items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700"
                              >
                                <Icon className="h-5 w-5 text-gray-400" />
                                <span className="text-xs text-gray-600 dark:text-gray-400 text-center">
                                  {tool.name}
                                </span>
                                <AccessLevelBadge level={level} />
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input pl-10"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Legacy Role
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Company Template
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Projects
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{user.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs">
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {user.company_template ? (
                            <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded text-xs font-medium">
                              {user.company_template}
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-xs">
                              Not assigned
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {user.project_count} project{user.project_count !== 1 ? 's' : ''}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <button
                            onClick={() => {
                              setSelectedUser(user)
                              setSelectedCompanyTemplate(companyTemplates.find(t => t.name === user.company_template)?.id || '')
                              setShowUserAssignModal(true)
                            }}
                            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Project Access Tab */}
          {activeTab === 'projectAssignments' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <p className="text-gray-600 dark:text-gray-400">
                  Manage which users have access to each project and their permission templates
                </p>
                <div className="relative flex-1 max-w-md ml-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input pl-10"
                  />
                </div>
              </div>

              {/* Projects List */}
              <div className="space-y-4">
                {projects
                  .filter(project =>
                    project.name.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((project) => (
                    <div
                      key={project.id}
                      className="card border-2 border-gray-200 dark:border-gray-700"
                    >
                      {/* Project Header */}
                      <div className="p-4 flex items-center justify-between border-b dark:border-gray-700">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                            <FolderKanban className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                              {project.name}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {project.assignments.length} team member{project.assignments.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              project.status === 'ACTIVE'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : project.status === 'COMPLETED'
                                ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                            }`}
                          >
                            {project.status}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedProject(project)
                            setAssignUserId('')
                            setAssignTemplateId('')
                            setShowProjectAssignModal(true)
                          }}
                          className="btn btn-primary flex items-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Add User
                        </button>
                      </div>

                      {/* Team Members */}
                      {project.assignments.length > 0 ? (
                        <div className="p-4">
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                              <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                    User
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                    Permission Template
                                  </th>
                                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                    Actions
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {project.assignments.map((assignment) => (
                                  <tr key={assignment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <div>
                                        <p className="font-medium text-gray-900 dark:text-gray-100">
                                          {assignment.user.name}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                          {assignment.user.email}
                                        </p>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      {assignment.projectTemplate ? (
                                        <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded text-xs font-medium">
                                          {assignment.projectTemplate.name}
                                        </span>
                                      ) : (
                                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs">
                                          Default Access
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-right">
                                      <div className="flex items-center justify-end gap-3">
                                        <button
                                          onClick={() => {
                                            setEditingAssignment({
                                              id: assignment.id,
                                              userId: assignment.userId,
                                              userName: assignment.user.name,
                                              userEmail: assignment.user.email,
                                              projectTemplateId: assignment.projectTemplateId,
                                              projectId: project.id,
                                              projectName: project.name,
                                            })
                                            setEditTemplateId(assignment.projectTemplateId || '')
                                            setShowEditAssignmentModal(true)
                                          }}
                                          className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={async () => {
                                            if (!confirm(`Remove ${assignment.user.name} from ${project.name}?`)) return
                                            try {
                                              const response = await fetch(
                                                `/api/projects/${project.id}/team?assignmentId=${assignment.id}`,
                                                { method: 'DELETE' }
                                              )
                                              if (!response.ok) throw new Error('Failed to remove user')
                                              await fetchData()
                                            } catch (err) {
                                              setError(err instanceof Error ? err.message : 'Failed to remove user')
                                            }
                                          }}
                                          className="text-red-600 hover:text-red-700 text-sm font-medium"
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="p-8 text-center">
                          <Users className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                          <p className="text-gray-500 dark:text-gray-400">No team members assigned yet</p>
                          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                            Click &quot;Add User&quot; to assign users to this project
                          </p>
                        </div>
                      )}
                    </div>
                  ))}

                {projects.length === 0 && (
                  <div className="text-center py-12">
                    <FolderKanban className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 text-lg">No projects found</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                      Projects will appear here once they are created
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Template Editor Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h3 className="text-lg font-semibold dark:text-gray-100">
                {editingTemplate ? 'Edit Template' : 'Create Template'}
              </h3>
              <button
                onClick={() => {
                  setShowTemplateModal(false)
                  setEditingTemplate(null)
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="h-5 w-5 dark:text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
              {/* Template Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label mb-2 block dark:text-gray-300">Template Name *</label>
                  <input
                    type="text"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    placeholder="e.g., Senior Field Worker"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label mb-2 block dark:text-gray-300">Scope</label>
                  <select
                    value={templateForm.scope}
                    onChange={(e) => {
                      const newScope = e.target.value as 'project' | 'company'
                      const tools = newScope === 'company' ? COMPANY_TOOLS : PROJECT_TOOLS
                      const initialPermissions: Record<string, string> = {}
                      tools.forEach(t => {
                        initialPermissions[t.key] = templateForm.tool_permissions[t.key] || 'none'
                      })
                      setTemplateForm({
                        ...templateForm,
                        scope: newScope,
                        tool_permissions: initialPermissions,
                      })
                    }}
                    className="input"
                    disabled={!!editingTemplate}
                  >
                    <option value="project">Project Template</option>
                    <option value="company">Company Template</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label mb-2 block dark:text-gray-300">Description (Optional)</label>
                <textarea
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                  placeholder="Describe who this template is for..."
                  className="input"
                  rows={2}
                />
              </div>

              {/* Tool Permissions Matrix */}
              <div>
                <label className="label mb-3 block dark:text-gray-300">Tool Permissions</label>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(templateForm.scope === 'company' ? COMPANY_TOOLS : PROJECT_TOOLS).map((tool) => {
                      const Icon = tool.icon
                      const level = templateForm.tool_permissions[tool.key] || 'none'
                      return (
                        <div
                          key={tool.key}
                          className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700"
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="h-5 w-5 text-gray-400" />
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {tool.name}
                            </span>
                          </div>
                          <AccessLevelSelector
                            value={level}
                            onChange={(newLevel) => {
                              setTemplateForm({
                                ...templateForm,
                                tool_permissions: {
                                  ...templateForm.tool_permissions,
                                  [tool.key]: newLevel,
                                },
                              })
                            }}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-3 border-t dark:border-gray-700 pt-4">
                <button
                  onClick={() => {
                    const tools = templateForm.scope === 'company' ? COMPANY_TOOLS : PROJECT_TOOLS
                    const allNone: Record<string, string> = {}
                    tools.forEach(t => { allNone[t.key] = 'none' })
                    setTemplateForm({ ...templateForm, tool_permissions: allNone })
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  Set All to None
                </button>
                <button
                  onClick={() => {
                    const tools = templateForm.scope === 'company' ? COMPANY_TOOLS : PROJECT_TOOLS
                    const allReadOnly: Record<string, string> = {}
                    tools.forEach(t => { allReadOnly[t.key] = 'read_only' })
                    setTemplateForm({ ...templateForm, tool_permissions: allReadOnly })
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  Set All to View
                </button>
                <button
                  onClick={() => {
                    const tools = templateForm.scope === 'company' ? COMPANY_TOOLS : PROJECT_TOOLS
                    const allStandard: Record<string, string> = {}
                    tools.forEach(t => { allStandard[t.key] = 'standard' })
                    setTemplateForm({ ...templateForm, tool_permissions: allStandard })
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  Set All to Edit
                </button>
                <button
                  onClick={() => {
                    const tools = templateForm.scope === 'company' ? COMPANY_TOOLS : PROJECT_TOOLS
                    const allAdmin: Record<string, string> = {}
                    tools.forEach(t => { allAdmin[t.key] = 'admin' })
                    setTemplateForm({ ...templateForm, tool_permissions: allAdmin })
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  Set All to Admin
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t dark:border-gray-700">
              <button
                onClick={() => {
                  setShowTemplateModal(false)
                  setEditingTemplate(null)
                }}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={!templateForm.name.trim() || saving}
                className="btn btn-primary"
              >
                {saving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : editingTemplate ? (
                  'Save Changes'
                ) : (
                  'Create Template'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Assignment Modal */}
      {showUserAssignModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h3 className="text-lg font-semibold dark:text-gray-100">
                Assign Company Template
              </h3>
              <button
                onClick={() => {
                  setShowUserAssignModal(false)
                  setSelectedUser(null)
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="h-5 w-5 dark:text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                  <Users className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{selectedUser.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{selectedUser.email}</p>
                </div>
              </div>

              <div>
                <label className="label mb-2 block dark:text-gray-300">Company Template</label>
                <select
                  value={selectedCompanyTemplate}
                  onChange={(e) => setSelectedCompanyTemplate(e.target.value)}
                  className="input"
                >
                  <option value="">Select a template...</option>
                  {companyTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                      {template.is_protected && ' 🔒'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t dark:border-gray-700">
              <button
                onClick={() => {
                  setShowUserAssignModal(false)
                  setSelectedUser(null)
                }}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignCompanyTemplate}
                disabled={!selectedCompanyTemplate || saving}
                className="btn btn-primary"
              >
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Assign Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project Assignment Modal */}
      {showProjectAssignModal && selectedProject && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h3 className="text-lg font-semibold dark:text-gray-100">
                Add User to Project
              </h3>
              <button
                onClick={() => {
                  setShowProjectAssignModal(false)
                  setSelectedProject(null)
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="h-5 w-5 dark:text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                  <FolderKanban className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{selectedProject.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedProject.assignments.length} team member{selectedProject.assignments.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <div>
                <label className="label mb-2 block dark:text-gray-300">Select User *</label>
                <select
                  value={assignUserId}
                  onChange={(e) => setAssignUserId(e.target.value)}
                  className="input"
                >
                  <option value="">Select a user...</option>
                  {users
                    .filter(user => !selectedProject.assignments.some(a => a.userId === user.id))
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="label mb-2 block dark:text-gray-300">
                  Project Template (Optional)
                </label>
                <select
                  value={assignTemplateId}
                  onChange={(e) => setAssignTemplateId(e.target.value)}
                  className="input"
                >
                  <option value="">Default Access</option>
                  {projectTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                      {template.description ? ` - ${template.description}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t dark:border-gray-700">
              <button
                onClick={() => {
                  setShowProjectAssignModal(false)
                  setSelectedProject(null)
                }}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!assignUserId) return
                  setAssigning(true)
                  try {
                    const response = await fetch(`/api/projects/${selectedProject.id}/team`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        userId: assignUserId,
                        projectTemplateId: assignTemplateId || null,
                      }),
                    })
                    if (!response.ok) {
                      const data = await response.json()
                      throw new Error(data.error || 'Failed to add user')
                    }
                    setShowProjectAssignModal(false)
                    setSelectedProject(null)
                    setAssignUserId('')
                    setAssignTemplateId('')
                    await fetchData()
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed to add user to project')
                  } finally {
                    setAssigning(false)
                  }
                }}
                disabled={!assignUserId || assigning}
                className="btn btn-primary"
              >
                {assigning ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Add User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Assignment Modal */}
      {showEditAssignmentModal && editingAssignment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h3 className="text-lg font-semibold dark:text-gray-100">
                Edit Project Permission
              </h3>
              <button
                onClick={() => {
                  setShowEditAssignmentModal(false)
                  setEditingAssignment(null)
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="h-5 w-5 dark:text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                  <Users className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {editingAssignment.userName}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {editingAssignment.userEmail}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                  <FolderKanban className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {editingAssignment.projectName}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Project</p>
                </div>
              </div>

              <div>
                <label className="label mb-2 block dark:text-gray-300">
                  Permission Template
                </label>
                <select
                  value={editTemplateId}
                  onChange={(e) => setEditTemplateId(e.target.value)}
                  className="input"
                >
                  <option value="">Default Access</option>
                  {projectTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                      {template.description ? ` - ${template.description}` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Change the permission template for this user on this project
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t dark:border-gray-700">
              <button
                onClick={() => {
                  setShowEditAssignmentModal(false)
                  setEditingAssignment(null)
                }}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setUpdating(true)
                  try {
                    const response = await fetch(`/api/projects/${editingAssignment.projectId}/team`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        assignmentId: editingAssignment.id,
                        projectTemplateId: editTemplateId || null,
                      }),
                    })
                    if (!response.ok) {
                      const data = await response.json()
                      throw new Error(data.error || 'Failed to update permission')
                    }
                    setShowEditAssignmentModal(false)
                    setEditingAssignment(null)
                    setEditTemplateId('')
                    await fetchData()
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed to update permission')
                  } finally {
                    setUpdating(false)
                  }
                }}
                disabled={updating}
                className="btn btn-primary"
              >
                {updating ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
