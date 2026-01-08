'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/hooks/useSession'
import Link from 'next/link'
import { ArrowLeft, Loader2, MapPin, Eye, Lock, Users, ShieldAlert, Crown, Briefcase, HardHat, Building2, UserCheck, Plus } from 'lucide-react'

// Role configuration for bulk assignment
const ASSIGNABLE_ROLES = [
  { value: 'PROJECT_MANAGER', label: 'Project Managers', icon: Briefcase, color: 'purple' },
  { value: 'FOREMAN', label: 'Foremen', icon: HardHat, color: 'blue' },
  { value: 'CREW_LEADER', label: 'Crew Leaders', icon: HardHat, color: 'teal' },
  { value: 'FIELD_WORKER', label: 'Field Workers', icon: HardHat, color: 'green' },
  { value: 'OFFICE', label: 'Office Staff', icon: Building2, color: 'yellow' },
  { value: 'VIEWER', label: 'Viewers', icon: UserCheck, color: 'gray' },
]
import { AddressAutocomplete } from '@/components/ui/address-autocomplete'
import { ParsedAddress } from '@/lib/geocode'
import { UserSelector } from '@/components/ui/user-selector'

interface EditProjectPageProps {
  params: { id: string }
}

interface ProjectData {
  id: string
  name: string
  address: string | null
  gpsLatitude: number | null
  gpsLongitude: number | null
  startDate: string | null
  endDate: string | null
  status: string
  visibilityMode: string
  description: string | null
  assignments: Array<{
    id: string
    userId: string
    user: {
      id: string
      name: string
      email: string
      role: string
    }
  }>
}

export default function EditProjectPage({ params }: EditProjectPageProps) {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')

  // Check if user is admin
  const isAdmin = session?.user?.role === 'ADMIN'

  // Redirect non-admins
  useEffect(() => {
    if (status === 'authenticated' && !isAdmin) {
      router.push(`/projects/${params.id}`)
    }
  }, [status, isAdmin, router, params.id])
  const [addingRole, setAddingRole] = useState<string | null>(null)

  const [formData, setFormData] = useState<{
    name: string
    address: string
    gpsLatitude: string
    gpsLongitude: string
    startDate: string
    endDate: string
    status: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED'
    description: string
    visibilityMode: 'ALL' | 'ASSIGNED_ONLY'
  }>({
    name: '',
    address: '',
    gpsLatitude: '',
    gpsLongitude: '',
    startDate: '',
    endDate: '',
    status: 'ACTIVE',
    description: '',
    visibilityMode: 'ASSIGNED_ONLY',
  })
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([])

  // Fetch existing project data
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await fetch(`/api/projects/${params.id}`)
        if (!res.ok) {
          throw new Error('Failed to fetch project')
        }
        const data = await res.json()
        const project: ProjectData = data.project

        setFormData({
          name: project.name,
          address: project.address || '',
          gpsLatitude: project.gpsLatitude?.toString() || '',
          gpsLongitude: project.gpsLongitude?.toString() || '',
          startDate: project.startDate ? project.startDate.split('T')[0] : '',
          endDate: project.endDate ? project.endDate.split('T')[0] : '',
          status: (project.status || 'ACTIVE') as typeof formData.status,
          description: project.description || '',
          visibilityMode: (project.visibilityMode || 'ASSIGNED_ONLY') as typeof formData.visibilityMode,
        })
        setAssignedUserIds(project.assignments.map(a => a.userId))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load project')
      } finally {
        setFetching(false)
      }
    }

    fetchProject()
  }, [params.id])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleGetLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData((prev) => ({
            ...prev,
            gpsLatitude: position.coords.latitude.toString(),
            gpsLongitude: position.coords.longitude.toString(),
          }))
        },
        (error) => {
          console.error('Error getting location:', error)
        }
      )
    }
  }

  const handleAddressSelect = (address: ParsedAddress) => {
    setFormData((prev) => ({
      ...prev,
      address: address.fullAddress,
      gpsLatitude: address.latitude?.toString() ?? '',
      gpsLongitude: address.longitude?.toString() ?? '',
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/projects/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          gpsLatitude: formData.gpsLatitude ? parseFloat(formData.gpsLatitude) : null,
          gpsLongitude: formData.gpsLongitude ? parseFloat(formData.gpsLongitude) : null,
          startDate: formData.startDate || null,
          endDate: formData.endDate || null,
          assignedUserIds,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update project')
      }

      // Redirect to project page
      router.push(`/projects/${params.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Add all users of a specific role
  const handleAddRole = async (role: string) => {
    setAddingRole(role)
    try {
      const res = await fetch(`/api/users?role=${role}`)
      if (!res.ok) throw new Error('Failed to fetch users')
      const users = await res.json()

      // Add all user IDs from this role
      const newUserIds = users.map((u: { id: string }) => u.id)
      setAssignedUserIds(prev => {
        const combined = new Set([...prev, ...newUserIds])
        return Array.from(combined)
      })
    } catch (err) {
      console.error('Error adding role users:', err)
    } finally {
      setAddingRole(null)
    }
  }

  // Show loading while checking auth or fetching project
  if (status === 'loading' || fetching) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  // Show access denied for non-admins (while redirect happens)
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <ShieldAlert className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Access Denied</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">Only administrators can edit projects.</p>
        <Link href={`/projects/${params.id}`} className="btn btn-primary">
          Back to Project
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/projects/${params.id}`}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Edit Project</h1>
          <p className="text-gray-600 dark:text-gray-400">Update project details and access settings</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="name" className="label">
            Project Name *
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            value={formData.name}
            onChange={handleChange}
            className="input mt-1"
            placeholder="e.g., Downtown Office Complex"
          />
        </div>

        <div>
          <label htmlFor="address" className="label">
            Address
          </label>
          <div className="mt-1">
            <AddressAutocomplete
              id="address"
              name="address"
              value={formData.address}
              onChange={(value) => setFormData((prev) => ({ ...prev, address: value }))}
              onSelect={handleAddressSelect}
              placeholder="Start typing an address..."
              showGpsFields={true}
              latitude={formData.gpsLatitude}
              longitude={formData.gpsLongitude}
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleGetLocation}
            className="btn btn-outline px-4 py-2 flex items-center gap-2"
          >
            <MapPin className="h-4 w-4" />
            Use Current Location
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Or enter an address above to auto-fill GPS coordinates
          </span>
        </div>

        {/* GPS fields (hidden but stored for admin access) */}
        <input type="hidden" name="gpsLatitude" value={formData.gpsLatitude} />
        <input type="hidden" name="gpsLongitude" value={formData.gpsLongitude} />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="startDate" className="label">
              Start Date
            </label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              value={formData.startDate}
              onChange={handleChange}
              className="input mt-1"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="label">
              End Date
            </label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              value={formData.endDate}
              onChange={handleChange}
              className="input mt-1"
            />
          </div>
        </div>

        <div>
          <label htmlFor="status" className="label">
            Status
          </label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="input mt-1"
          >
            <option value="ACTIVE">Active</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="COMPLETED">Completed</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>

        <div>
          <label htmlFor="description" className="label">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            value={formData.description}
            onChange={handleChange}
            className="input mt-1"
            placeholder="Brief description of the project..."
          />
        </div>

        {/* Access Control Section */}
        <div className="border-t pt-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary-600" />
              Access Control
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Control who can view and access this project
            </p>
          </div>

          {/* Visibility Mode Toggle */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Project Visibility
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, visibilityMode: 'ASSIGNED_ONLY' }))}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  formData.visibilityMode === 'ASSIGNED_ONLY'
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    formData.visibilityMode === 'ASSIGNED_ONLY'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    <Lock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">Assigned Only</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Only assigned users can view</p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, visibilityMode: 'ALL' }))}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  formData.visibilityMode === 'ALL'
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    formData.visibilityMode === 'ALL'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    <Eye className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">All Users</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Everyone can view this project</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Quick Role Assignment */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Quick Assign by Role
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Click a role to add all users of that role to this project
            </p>
            <div className="flex flex-wrap gap-2">
              {ASSIGNABLE_ROLES.map((role) => {
                const RoleIcon = role.icon
                const isLoading = addingRole === role.value
                return (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => handleAddRole(role.value)}
                    disabled={isLoading || addingRole !== null}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all disabled:opacity-50 ${
                      role.color === 'purple' ? 'border-purple-200 hover:border-purple-400 hover:bg-purple-50 text-purple-700' :
                      role.color === 'blue' ? 'border-blue-200 hover:border-blue-400 hover:bg-blue-50 text-blue-700' :
                      role.color === 'teal' ? 'border-teal-200 hover:border-teal-400 hover:bg-teal-50 text-teal-700' :
                      role.color === 'green' ? 'border-green-200 hover:border-green-400 hover:bg-green-50 text-green-700' :
                      role.color === 'yellow' ? 'border-yellow-200 hover:border-yellow-400 hover:bg-yellow-50 text-yellow-700' :
                      'border-gray-200 hover:border-gray-400 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RoleIcon className="h-4 w-4" />
                    )}
                    <Plus className="h-3 w-3" />
                    {role.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* User Assignment */}
          <UserSelector
            selectedUserIds={assignedUserIds}
            onChange={setAssignedUserIds}
            label="Assign Team Members"
            description={
              formData.visibilityMode === 'ASSIGNED_ONLY'
                ? "Only these users (plus you and admins) can access this project"
                : "These users will be assigned to the project for tracking purposes"
            }
          />
        </div>

        <div className="flex gap-4 pt-4">
          <Link
            href={`/projects/${params.id}`}
            className="btn btn-outline flex-1 py-2"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary flex-1 py-2"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
