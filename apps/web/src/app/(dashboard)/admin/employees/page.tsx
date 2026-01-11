'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@/hooks/useSession'
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  User,
  Phone,
  Mail,
  Building,
  Briefcase,
  X,
  Loader2,
  UserCheck,
  UserX,
  Link2,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Download,
} from 'lucide-react'

interface Employee {
  id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  job_title: string | null
  user_id: string | null
  is_active: boolean
  created_at: string
  user: {
    id: string
    name: string
    email: string
  } | null
}

interface User {
  id: string
  name: string
  email: string
}

export default function EmployeeRosterPage() {
  const { data: session } = useSession()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    jobTitle: '',
    userId: '',
  })

  // Bulk upload state
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{
    message: string
    summary: { total: number; created: number; skipped: number; failed: number }
    results: Array<{ success: boolean; row: number; name?: string; error?: string }>
  } | null>(null)

  useEffect(() => {
    fetchEmployees()
    fetchUsers()
  }, [showInactive])

  const fetchEmployees = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (showInactive) params.set('active', 'all')
      const res = await fetch(`/api/employees?${params}`)
      if (res.ok) {
        const data = await res.json()
        setEmployees(data.employees || [])
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || data)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const openAddModal = () => {
    setEditingEmployee(null)
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      jobTitle: '',
      userId: '',
    })
    setError('')
    setShowModal(true)
  }

  const openEditModal = (employee: Employee) => {
    setEditingEmployee(employee)
    setFormData({
      name: employee.name,
      email: employee.email || '',
      phone: employee.phone || '',
      company: employee.company || '',
      jobTitle: employee.job_title || '',
      userId: employee.user_id || '',
    })
    setError('')
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setError('Name is required')
      return
    }

    setSaving(true)
    setError('')

    try {
      const url = editingEmployee
        ? `/api/employees/${editingEmployee.id}`
        : '/api/employees'
      const method = editingEmployee ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          company: formData.company || null,
          jobTitle: formData.jobTitle || null,
          userId: formData.userId || null,
        }),
      })

      if (res.ok) {
        setShowModal(false)
        fetchEmployees()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to save employee')
      }
    } catch (error) {
      setError('Failed to save employee')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (employee: Employee) => {
    try {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !employee.is_active }),
      })
      if (res.ok) {
        fetchEmployees()
      }
    } catch (error) {
      console.error('Error toggling employee status:', error)
    }
  }

  const deleteEmployee = async (employee: Employee) => {
    if (!confirm(`Are you sure you want to delete ${employee.name}? This cannot be undone.`)) {
      return
    }

    try {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        fetchEmployees()
      }
    } catch (error) {
      console.error('Error deleting employee:', error)
    }
  }

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadResult(null)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('skipDuplicates', 'true')

      const res = await fetch('/api/employees/bulk', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Upload failed')
      } else {
        setUploadResult(data)
        fetchEmployees() // Refresh the list
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      setError('Failed to upload file')
    } finally {
      setUploading(false)
      // Reset the input
      e.target.value = ''
    }
  }

  const downloadTemplate = () => {
    const csv = 'name,email,phone,company,jobTitle\nJohn Smith,john@example.com,555-0100,ABC Construction,Foreman\nJane Doe,jane@example.com,555-0101,ABC Construction,Carpenter'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'employee_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredEmployees = employees.filter(employee => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      employee.name.toLowerCase().includes(query) ||
      employee.email?.toLowerCase().includes(query) ||
      employee.company?.toLowerCase().includes(query) ||
      employee.job_title?.toLowerCase().includes(query)
    )
  })

  // Get unlinked users for the dropdown
  const unlinkedUsers = users.filter(
    user => !employees.some(emp => emp.user_id === user.id) ||
            (editingEmployee && editingEmployee.user_id === user.id)
  )

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Employee Roster</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage all employees including those without app access
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Add Employee
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search employees..."
              className="input pl-10 w-full"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Show inactive</span>
          </label>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
              <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {employees.filter(e => e.is_active).length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Employees</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
              <Link2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {employees.filter(e => e.user_id).length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">With App Access</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-lg">
              <UserX className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {employees.filter(e => !e.user_id && e.is_active).length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">No App Access</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">
              <Building className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {new Set(employees.filter(e => e.company).map(e => e.company)).size}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Companies</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Upload Section */}
      <div className="card p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
              <Upload className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Bulk Import Employees</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Upload a CSV file to import multiple employees at once</p>
            </div>
          </div>
          <button
            onClick={() => setShowBulkUpload(!showBulkUpload)}
            className="text-purple-600 hover:text-purple-700 dark:text-purple-400 text-sm font-medium"
          >
            {showBulkUpload ? 'Hide' : 'Show'} Import Options
          </button>
        </div>

        {showBulkUpload && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                CSV Format Requirements
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Your CSV file should have a header row with the following columns:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
                <div className="bg-white dark:bg-gray-700 px-3 py-2 rounded border border-gray-200 dark:border-gray-600">
                  <span className="font-mono text-sm text-purple-600 dark:text-purple-400">name</span>
                  <span className="text-red-500 ml-1">*</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Required</p>
                </div>
                <div className="bg-white dark:bg-gray-700 px-3 py-2 rounded border border-gray-200 dark:border-gray-600">
                  <span className="font-mono text-sm">email</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Optional</p>
                </div>
                <div className="bg-white dark:bg-gray-700 px-3 py-2 rounded border border-gray-200 dark:border-gray-600">
                  <span className="font-mono text-sm">phone</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Optional</p>
                </div>
                <div className="bg-white dark:bg-gray-700 px-3 py-2 rounded border border-gray-200 dark:border-gray-600">
                  <span className="font-mono text-sm">company</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Optional</p>
                </div>
                <div className="bg-white dark:bg-gray-700 px-3 py-2 rounded border border-gray-200 dark:border-gray-600">
                  <span className="font-mono text-sm">jobTitle</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Optional</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <strong>QuickBooks Export:</strong> Export your employee list to CSV, then rename columns to match the format above.
                Duplicate emails will be skipped automatically.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={downloadTemplate}
                className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                Download Template
              </button>

              <label className="flex-1">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleBulkUpload}
                  disabled={uploading}
                  className="hidden"
                />
                <div className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                  uploading
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}>
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Select CSV File to Upload
                    </>
                  )}
                </div>
              </label>
            </div>

            {/* Upload Results */}
            {uploadResult && (
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-green-800 dark:text-green-200">{uploadResult.message}</p>
                    <div className="grid grid-cols-4 gap-4 mt-2 text-sm">
                      <div>
                        <span className="text-green-600 dark:text-green-400">Total:</span> {uploadResult.summary.total}
                      </div>
                      <div>
                        <span className="text-green-600 dark:text-green-400">Created:</span> {uploadResult.summary.created}
                      </div>
                      <div>
                        <span className="text-amber-600 dark:text-amber-400">Skipped:</span> {uploadResult.summary.skipped}
                      </div>
                      <div>
                        <span className="text-red-600 dark:text-red-400">Failed:</span> {uploadResult.summary.failed}
                      </div>
                    </div>
                    {uploadResult.results.some(r => !r.success) && (
                      <details className="mt-2">
                        <summary className="text-sm text-green-700 dark:text-green-300 cursor-pointer">
                          View details ({uploadResult.results.filter(r => !r.success).length} issues)
                        </summary>
                        <ul className="mt-2 text-sm space-y-1 max-h-32 overflow-y-auto">
                          {uploadResult.results.filter(r => !r.success).map((r, i) => (
                            <li key={i} className="text-red-600 dark:text-red-400">
                              Row {r.row}: {r.error}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                  <button
                    onClick={() => setUploadResult(null)}
                    className="text-green-600 dark:text-green-400 hover:text-green-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <p className="text-red-800 dark:text-red-200">{error}</p>
                  <button
                    onClick={() => setError('')}
                    className="ml-auto text-red-600 dark:text-red-400 hover:text-red-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Employee List */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-gray-500 dark:text-gray-400 mt-2">Loading employees...</p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="p-8 text-center">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery ? 'No employees match your search' : 'No employees yet'}
            </p>
            <button
              onClick={openAddModal}
              className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              Add your first employee
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    App Access
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id} className={!employee.is_active ? 'opacity-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {employee.name}
                          </div>
                          {employee.job_title && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {employee.job_title}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {employee.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <Mail className="h-4 w-4" />
                            {employee.email}
                          </div>
                        )}
                        {employee.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <Phone className="h-4 w-4" />
                            {employee.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {employee.company ? (
                        <div className="flex items-center gap-2 text-sm text-gray-900 dark:text-gray-100">
                          <Building className="h-4 w-4 text-gray-400" />
                          {employee.company}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {employee.user ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                          <UserCheck className="h-3 w-3" />
                          Linked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                          <UserX className="h-3 w-3" />
                          No Access
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleActive(employee)}
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          employee.is_active
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                        }`}
                      >
                        {employee.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(employee)}
                          className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteEmployee(employee)}
                          className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {editingEmployee ? 'Edit Employee' : 'Add Employee'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input w-full"
                  placeholder="John Smith"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input w-full"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input w-full"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Company
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="input w-full"
                    placeholder="ABC Contractors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Job Title
                  </label>
                  <input
                    type="text"
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                    className="input w-full"
                    placeholder="Electrician"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Link to App User
                </label>
                <select
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  className="input w-full"
                >
                  <option value="">No app access</option>
                  {unlinkedUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Optionally link to an existing user account for app access
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingEmployee ? 'Save Changes' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
