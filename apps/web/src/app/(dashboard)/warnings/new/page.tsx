'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@/hooks/useSession'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface Project {
  id: string
  name: string
}

const WARNING_TYPES = [
  { value: 'TARDINESS', label: 'Tardiness', description: 'Late arrival to work or returning late from breaks' },
  { value: 'SAFETY_VIOLATION', label: 'Safety Violation', description: 'Not following safety protocols or PPE requirements' },
  { value: 'INSUBORDINATION', label: 'Insubordination', description: 'Refusing to follow instructions or disrespectful behavior' },
  { value: 'POOR_WORK_QUALITY', label: 'Poor Work Quality', description: 'Work not meeting quality standards or specifications' },
  { value: 'NO_SHOW', label: 'No Show / No Call', description: 'Absent without prior notice or approval' },
  { value: 'DRESS_CODE', label: 'Dress Code Violation', description: 'Not wearing required attire or PPE' },
  { value: 'EQUIPMENT_MISUSE', label: 'Equipment Misuse', description: 'Improper use or damage to equipment/tools' },
  { value: 'UNPROFESSIONAL_CONDUCT', label: 'Unprofessional Conduct', description: 'Behavior not appropriate for the workplace' }
]

const SEVERITY_LEVELS = [
  { value: 'VERBAL', label: 'Verbal Warning', description: 'First offense, documented verbal discussion', color: 'border-yellow-300 bg-yellow-50' },
  { value: 'WRITTEN', label: 'Written Warning', description: 'Formal written warning on record', color: 'border-orange-300 bg-orange-50' },
  { value: 'FINAL', label: 'Final Warning', description: 'Last warning before termination', color: 'border-red-300 bg-red-50' }
]

const AUTHORIZED_ROLES = ['ADMIN', 'PROJECT_MANAGER', 'SUPERINTENDENT']

export default function NewWarningPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [employees, setEmployees] = useState<User[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    employeeId: '',
    projectId: '',
    warningType: '',
    severity: '',
    description: '',
    incidentDate: new Date().toISOString().split('T')[0],
    witnessNames: '',
    actionRequired: ''
  })

  const canIssueWarnings = session?.user && AUTHORIZED_ROLES.includes(session.user.role)

  useEffect(() => {
    if (!canIssueWarnings) {
      router.push('/warnings')
      return
    }
    fetchData()
  }, [canIssueWarnings, router])

  const fetchData = async () => {
    try {
      const [usersRes, projectsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/projects')
      ])

      if (usersRes.ok) {
        const usersData = await usersRes.json()
        // Handle both array and { users: [...] } response formats
        const users = Array.isArray(usersData) ? usersData : usersData.users || []
        // Filter out the current user - can't issue warning to yourself
        setEmployees(users.filter((u: User) => u.id !== session?.user?.id))
      }

      if (projectsRes.ok) {
        const projectsData = await projectsRes.json()
        // Handle both array and { projects: [...] } response formats
        setProjects(Array.isArray(projectsData) ? projectsData : projectsData.projects || [])
      }
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.employeeId || !formData.warningType || !formData.severity || !formData.description) {
      setError('Please fill in all required fields')
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/warnings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          projectId: formData.projectId || null
        })
      })

      if (res.ok) {
        router.push('/warnings')
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to issue warning')
      }
    } catch (err) {
      console.error('Error creating warning:', err)
      setError('Failed to issue warning')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!canIssueWarnings) {
    return null
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/warnings"
          className="text-gray-600 hover:text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Warnings
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Issue Employee Warning</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Document a warning for an employee violation or issue</p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Employee Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Employee Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Employee <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              >
                <option value="">Select Employee</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.role.replace('_', ' ')})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Project (Optional)
              </label>
              <select
                value={formData.projectId}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="">No specific project</option>
                {projects.map(proj => (
                  <option key={proj.id} value={proj.id}>{proj.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Incident Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.incidentDate}
                onChange={(e) => setFormData({ ...formData, incidentDate: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Witnesses (Optional)
              </label>
              <input
                type="text"
                value={formData.witnessNames}
                onChange={(e) => setFormData({ ...formData, witnessNames: e.target.value })}
                placeholder="Names of witnesses, if any"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Warning Type */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Warning Type <span className="text-red-500">*</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {WARNING_TYPES.map(type => (
              <button
                key={type.value}
                type="button"
                onClick={() => setFormData({ ...formData, warningType: type.value })}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  formData.warningType === type.value
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/30'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="font-medium text-gray-900 dark:text-gray-100">{type.label}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{type.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Severity Level */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Severity Level <span className="text-red-500">*</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SEVERITY_LEVELS.map(level => (
              <button
                key={level.value}
                type="button"
                onClick={() => setFormData({ ...formData, severity: level.value })}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  formData.severity === level.value
                    ? `${level.color} border-current`
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700'
                }`}
              >
                <div className="font-medium text-gray-900 dark:text-gray-100">{level.label}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{level.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Details</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description of Incident <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                placeholder="Describe what happened in detail..."
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Required Corrective Action (Optional)
              </label>
              <textarea
                value={formData.actionRequired}
                onChange={(e) => setFormData({ ...formData, actionRequired: e.target.value })}
                rows={2}
                placeholder="What actions the employee must take to correct the issue..."
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Link
            href="/warnings"
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Issuing Warning...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Issue Warning
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
