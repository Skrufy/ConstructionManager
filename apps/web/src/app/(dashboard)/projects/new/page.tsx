'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, MapPin, Eye, Lock, Users } from 'lucide-react'
import { PROJECT_STATUS } from '@/lib/utils'
import { AddressAutocomplete } from '@/components/ui/address-autocomplete'
import { ParsedAddress } from '@/lib/geocode'
import { UserSelector } from '@/components/ui/user-selector'

export default function NewProjectPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    gpsLatitude: '',
    gpsLongitude: '',
    startDate: '',
    endDate: '',
    status: PROJECT_STATUS.ACTIVE,
    description: '',
    visibilityMode: 'ASSIGNED_ONLY' as 'ALL' | 'ASSIGNED_ONLY',
  })
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([])

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
      const response = await fetch('/api/projects', {
        method: 'POST',
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
        throw new Error(data.error || 'Failed to create project')
      }

      // Redirect to projects list with success message
      router.push(`/projects?created=${encodeURIComponent(data.project.name)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/projects"
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">New Project</h1>
          <p className="text-gray-600 dark:text-gray-400">Create a new construction project</p>
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
                    ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/30'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    formData.visibilityMode === 'ASSIGNED_ONLY'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
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
                    ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/30'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    formData.visibilityMode === 'ALL'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
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
            href="/projects"
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
                Creating...
              </>
            ) : (
              'Create Project'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
