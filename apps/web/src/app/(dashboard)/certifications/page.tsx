'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@/hooks/useSession'
import {
  Award,
  AlertTriangle,
  Clock,
  CheckCircle,
  Plus,
  Search,
  Building2,
  User,
  X,
  FileText
} from 'lucide-react'

interface UserCert {
  id: string
  userId: string
  certType: string
  certName: string
  certNumber: string | null
  issuingAuthority: string | null
  issueDate: string | null
  expiryDate: string | null
  documentUrl: string | null
  status: string
  notes: string | null
  user: { id: string; name: string; role: string }
}

interface SubCert {
  id: string
  subcontractorId: string
  certType: string
  certName: string
  certNumber: string | null
  issueDate: string | null
  expiryDate: string | null
  documentUrl: string | null
  status: string
  subcontractor: { id: string; companyName: string }
}

interface CertData {
  userCertifications: UserCert[]
  subcontractorCertifications: SubCert[]
  summary: {
    total: number
    valid: number
    expiringSoon: number
    expired: number
  }
}

const CERT_TYPES = [
  { value: 'LICENSE', label: 'License' },
  { value: 'CERTIFICATION', label: 'Certification' },
  { value: 'TRAINING', label: 'Training' },
  { value: 'OSHA', label: 'OSHA' },
  { value: 'SAFETY', label: 'Safety' },
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'BOND', label: 'Bond' },
  { value: 'OTHER', label: 'Other' }
]

const STATUS_CONFIG: Record<string, { bg: string; text: string; icon: typeof CheckCircle }> = {
  VALID: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-400', icon: CheckCircle },
  EXPIRING_SOON: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-400', icon: Clock },
  EXPIRED: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-400', icon: AlertTriangle }
}

const MANAGER_ROLES = ['ADMIN', 'PROJECT_MANAGER', 'OFFICE']

export default function CertificationsPage() {
  const { data: session } = useSession()
  const [data, setData] = useState<CertData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'employees' | 'subcontractors'>('all')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([])
  const [subcontractors, setSubcontractors] = useState<Array<{ id: string; companyName: string }>>([])
  const [formData, setFormData] = useState({
    type: 'user',
    userId: '',
    subcontractorId: '',
    certType: '',
    certName: '',
    certNumber: '',
    issuingAuthority: '',
    issueDate: '',
    expiryDate: '',
    notes: ''
  })

  const isManager = session?.user && MANAGER_ROLES.includes(session.user.role)

  useEffect(() => {
    fetchData()
    if (isManager) {
      fetchUsers()
      fetchSubcontractors()
    }
  }, [statusFilter, isManager])

  const fetchData = async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (activeTab === 'employees') params.set('type', 'user')
      if (activeTab === 'subcontractors') params.set('type', 'subcontractor')

      const res = await fetch(`/api/certifications?${params}`)
      if (res.ok) {
        setData(await res.json())
      }
    } catch (error) {
      console.error('Error fetching certifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users')
      if (res.ok) setUsers(await res.json())
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchSubcontractors = async () => {
    try {
      const res = await fetch('/api/subcontractors')
      if (res.ok) setSubcontractors(await res.json())
    } catch (error) {
      console.error('Error fetching subcontractors:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/certifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        setShowForm(false)
        setFormData({
          type: 'user',
          userId: '',
          subcontractorId: '',
          certType: '',
          certName: '',
          certNumber: '',
          issuingAuthority: '',
          issueDate: '',
          expiryDate: '',
          notes: ''
        })
        fetchData()
      }
    } catch (error) {
      console.error('Error creating certification:', error)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getDaysUntilExpiry = (dateStr: string | null) => {
    if (!dateStr) return null
    const expiry = new Date(dateStr)
    const now = new Date()
    const diff = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const filteredUserCerts = (data?.userCertifications || []).filter(cert =>
    cert.certName.toLowerCase().includes(search.toLowerCase()) ||
    cert.user.name.toLowerCase().includes(search.toLowerCase())
  )

  const filteredSubCerts = (data?.subcontractorCertifications || []).filter(cert =>
    cert.certName.toLowerCase().includes(search.toLowerCase()) ||
    cert.subcontractor.companyName.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Certifications & Licenses</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Track certifications, licenses, and expiration alerts</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Plus className="w-5 h-5" />
          Add Certification
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Certifications</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data?.summary.total || 0}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <Award className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Valid</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{data?.summary.valid || 0}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Expiring Soon</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{data?.summary.expiringSoon || 0}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Expired</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{data?.summary.expired || 0}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search certifications..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
          {isManager && (
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-lg ${activeTab === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab('employees')}
                className={`px-4 py-2 rounded-lg ${activeTab === 'employees' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
              >
                Employees
              </button>
              <button
                onClick={() => setActiveTab('subcontractors')}
                className={`px-4 py-2 rounded-lg ${activeTab === 'subcontractors' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
              >
                Subcontractors
              </button>
            </div>
          )}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Statuses</option>
            <option value="VALID">Valid</option>
            <option value="EXPIRING_SOON">Expiring Soon</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>
      </div>

      {/* Certifications List */}
      <div className="space-y-4">
        {/* Employee Certifications */}
        {(activeTab === 'all' || activeTab === 'employees') && filteredUserCerts.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-4 border-b dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <User className="w-5 h-5" />
                Employee Certifications
              </h2>
            </div>
            <div className="divide-y dark:divide-gray-700">
              {filteredUserCerts.map(cert => {
                const config = STATUS_CONFIG[cert.status] || STATUS_CONFIG.VALID
                const days = getDaysUntilExpiry(cert.expiryDate)
                const StatusIcon = config.icon

                return (
                  <div key={cert.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.bg}`}>
                          <StatusIcon className={`w-5 h-5 ${config.text}`} />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-gray-100">{cert.certName}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {cert.user.name} • {cert.certType}
                          </p>
                          {cert.certNumber && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">#{cert.certNumber}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.text}`}>
                          {cert.status.replace('_', ' ')}
                        </span>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Expires: {formatDate(cert.expiryDate)}
                        </p>
                        {days !== null && days > 0 && days <= 30 && (
                          <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                            {days} days remaining
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Subcontractor Certifications */}
        {isManager && (activeTab === 'all' || activeTab === 'subcontractors') && filteredSubCerts.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-4 border-b dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Subcontractor Certifications
              </h2>
            </div>
            <div className="divide-y dark:divide-gray-700">
              {filteredSubCerts.map(cert => {
                const config = STATUS_CONFIG[cert.status] || STATUS_CONFIG.VALID
                const days = getDaysUntilExpiry(cert.expiryDate)
                const StatusIcon = config.icon

                return (
                  <div key={cert.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.bg}`}>
                          <StatusIcon className={`w-5 h-5 ${config.text}`} />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-gray-100">{cert.certName}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {cert.subcontractor.companyName} • {cert.certType}
                          </p>
                          {cert.certNumber && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">#{cert.certNumber}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.text}`}>
                          {cert.status.replace('_', ' ')}
                        </span>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Expires: {formatDate(cert.expiryDate)}
                        </p>
                        {days !== null && days > 0 && days <= 30 && (
                          <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                            {days} days remaining
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredUserCerts.length === 0 && filteredSubCerts.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No certifications found</p>
          </div>
        )}
      </div>

      {/* Add Certification Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Add Certification</h2>
                <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {isManager && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Type
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <input
                          type="radio"
                          name="type"
                          value="user"
                          checked={formData.type === 'user'}
                          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                          className="w-4 h-4 text-primary-600"
                        />
                        Employee
                      </label>
                      <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <input
                          type="radio"
                          name="type"
                          value="subcontractor"
                          checked={formData.type === 'subcontractor'}
                          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                          className="w-4 h-4 text-primary-600"
                        />
                        Subcontractor
                      </label>
                    </div>
                  </div>
                )}

                {formData.type === 'user' && isManager && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Employee
                    </label>
                    <select
                      value={formData.userId}
                      onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                      className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">Select employee</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {formData.type === 'subcontractor' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Subcontractor *
                    </label>
                    <select
                      value={formData.subcontractorId}
                      onChange={(e) => setFormData({ ...formData, subcontractorId: e.target.value })}
                      className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      required
                    >
                      <option value="">Select subcontractor</option>
                      {subcontractors.map(s => (
                        <option key={s.id} value={s.id}>{s.companyName}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Type *
                    </label>
                    <select
                      value={formData.certType}
                      onChange={(e) => setFormData({ ...formData, certType: e.target.value })}
                      className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      required
                    >
                      <option value="">Select type</option>
                      {CERT_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Certificate Number
                    </label>
                    <input
                      type="text"
                      value={formData.certNumber}
                      onChange={(e) => setFormData({ ...formData, certNumber: e.target.value })}
                      className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Certification Name *
                  </label>
                  <input
                    type="text"
                    value={formData.certName}
                    onChange={(e) => setFormData({ ...formData, certName: e.target.value })}
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="e.g., OSHA 30-Hour, Electrician License"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Issuing Authority
                  </label>
                  <input
                    type="text"
                    value={formData.issuingAuthority}
                    onChange={(e) => setFormData({ ...formData, issuingAuthority: e.target.value })}
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="e.g., OSHA, State of California"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Issue Date
                    </label>
                    <input
                      type="date"
                      value={formData.issueDate}
                      onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                      className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      value={formData.expiryDate}
                      onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                      className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    Add Certification
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
