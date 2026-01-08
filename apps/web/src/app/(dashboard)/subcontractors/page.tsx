'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@/hooks/useSession'
import { Plus, Search, Building2, Phone, Mail, Star, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { AddressAutocomplete } from '@/components/ui/address-autocomplete'
import { ParsedAddress } from '@/lib/geocode'

interface Subcontractor {
  id: string
  companyName: string
  contactName: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  trades: string
  licenseNumber: string | null
  insuranceExpiry: string | null
  rating: number | null
  status: string
  notes: string | null
  _count: { projects: number; certifications: number }
  certifications: Array<{
    id: string
    certName: string
    expiryDate: string | null
    status: string
  }>
}

const TRADES = [
  'Electrical',
  'Plumbing',
  'HVAC',
  'Roofing',
  'Concrete',
  'Framing',
  'Drywall',
  'Painting',
  'Flooring',
  'Masonry',
  'Landscaping',
  'Excavation',
  'Steel',
  'Glass/Glazing',
  'Fire Protection',
  'Insulation',
  'Carpentry',
  'Welding',
  'Demolition',
  'Other'
]

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
  INACTIVE: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300',
  PREFERRED: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400',
  BLACKLISTED: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
}

const AUTHORIZED_ROLES = ['ADMIN', 'PROJECT_MANAGER', 'OFFICE']

export default function SubcontractorsPage() {
  const { data: session } = useSession()
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [tradeFilter, setTradeFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    trades: [] as string[],
    licenseNumber: '',
    insuranceExpiry: '',
    rating: '',
    status: 'ACTIVE',
    notes: ''
  })

  const canManage = session?.user && AUTHORIZED_ROLES.includes(session.user.role)

  useEffect(() => {
    fetchSubcontractors()
  }, [statusFilter, tradeFilter])

  const fetchSubcontractors = async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (tradeFilter) params.set('trade', tradeFilter)

      const res = await fetch(`/api/subcontractors?${params}`)
      if (res.ok) {
        setSubcontractors(await res.json())
      }
    } catch (error) {
      console.error('Error fetching subcontractors:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/subcontractors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          trades: formData.trades,
          rating: formData.rating ? parseFloat(formData.rating) : null
        })
      })

      if (res.ok) {
        setShowForm(false)
        setFormData({
          companyName: '',
          contactName: '',
          email: '',
          phone: '',
          address: '',
          city: '',
          state: '',
          zip: '',
          trades: [],
          licenseNumber: '',
          insuranceExpiry: '',
          rating: '',
          status: 'ACTIVE',
          notes: ''
        })
        fetchSubcontractors()
      }
    } catch (error) {
      console.error('Error creating subcontractor:', error)
    }
  }

  const toggleTrade = (trade: string) => {
    setFormData(prev => ({
      ...prev,
      trades: prev.trades.includes(trade)
        ? prev.trades.filter(t => t !== trade)
        : [...prev.trades, trade]
    }))
  }

  const filteredSubcontractors = subcontractors.filter(sub =>
    sub.companyName.toLowerCase().includes(search.toLowerCase()) ||
    sub.contactName?.toLowerCase().includes(search.toLowerCase()) ||
    sub.email?.toLowerCase().includes(search.toLowerCase())
  )

  const renderStars = (rating: number | null) => {
    if (!rating) return <span className="text-gray-400 dark:text-gray-500 text-sm">Not rated</span>
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={`w-4 h-4 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
          />
        ))}
        <span className="ml-1 text-sm text-gray-600 dark:text-gray-400">{rating.toFixed(1)}</span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Subcontractor Directory</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage subcontractors, certifications, and assignments</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="w-5 h-5" />
            Add Subcontractor
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search subcontractors..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PREFERRED">Preferred</option>
            <option value="INACTIVE">Inactive</option>
            <option value="BLACKLISTED">Blacklisted</option>
          </select>
          <select
            value={tradeFilter}
            onChange={(e) => setTradeFilter(e.target.value)}
            className="px-4 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Trades</option>
            {TRADES.map(trade => (
              <option key={trade} value={trade}>{trade}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Subcontractors</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{subcontractors.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {subcontractors.filter(s => s.status === 'ACTIVE' || s.status === 'PREFERRED').length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Preferred</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {subcontractors.filter(s => s.status === 'PREFERRED').length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Expiring Certs</p>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {subcontractors.reduce((sum, s) => sum + s.certifications.filter(c => c.status === 'EXPIRING_SOON').length, 0)}
          </p>
        </div>
      </div>

      {/* Subcontractor List */}
      <div className="space-y-4">
        {filteredSubcontractors.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <Building2 className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No subcontractors found</p>
          </div>
        ) : (
          filteredSubcontractors.map(sub => {
            const trades = (sub.trades as unknown as string[] | null) || []
            const isExpanded = expandedId === sub.id
            const hasWarnings = sub.certifications.some(c => c.status === 'EXPIRED' || c.status === 'EXPIRING_SOON')

            return (
              <div key={sub.id} className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                  onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{sub.companyName}</h3>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[sub.status]}`}>
                            {sub.status}
                          </span>
                          {hasWarnings && (
                            <AlertTriangle className="w-4 h-4 text-yellow-500" />
                          )}
                        </div>
                        {sub.contactName && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">{sub.contactName}</p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {trades.slice(0, 3).map((trade: string) => (
                            <span key={trade} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-400">
                              {trade}
                            </span>
                          ))}
                          {trades.length > 3 && (
                            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-400">
                              +{trades.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        {renderStars(sub.rating)}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {sub._count.projects} projects
                        </p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t dark:border-gray-700 px-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Contact Info */}
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Contact Information</h4>
                        <div className="space-y-2">
                          {sub.email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="w-4 h-4 text-gray-400" />
                              <a href={`mailto:${sub.email}`} className="text-primary-600 dark:text-primary-400 hover:underline">
                                {sub.email}
                              </a>
                            </div>
                          )}
                          {sub.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <a href={`tel:${sub.phone}`} className="text-primary-600 dark:text-primary-400 hover:underline">
                                {sub.phone}
                              </a>
                            </div>
                          )}
                          {(sub.address || sub.city) && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {[sub.address, sub.city, sub.state].filter(Boolean).join(', ')}
                            </p>
                          )}
                          {sub.licenseNumber && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              License: {sub.licenseNumber}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Certifications */}
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Certifications & Insurance</h4>
                        {sub.certifications.length === 0 ? (
                          <p className="text-sm text-gray-500 dark:text-gray-400">No certifications on file</p>
                        ) : (
                          <div className="space-y-2">
                            {sub.certifications.map(cert => (
                              <div key={cert.id} className="flex items-center justify-between text-sm">
                                <span className="text-gray-700 dark:text-gray-300">{cert.certName}</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  cert.status === 'EXPIRED' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400' :
                                  cert.status === 'EXPIRING_SOON' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400' :
                                  'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                                }`}>
                                  {cert.expiryDate ? new Date(cert.expiryDate).toLocaleDateString() : 'No expiry'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        {sub.insuranceExpiry && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            Insurance expires: {new Date(sub.insuranceExpiry).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Notes */}
                    {sub.notes && (
                      <div className="mt-4 pt-4 border-t dark:border-gray-700">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Notes</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{sub.notes}</p>
                      </div>
                    )}

                    {/* All Trades */}
                    <div className="mt-4 pt-4 border-t dark:border-gray-700">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Trades</h4>
                      <div className="flex flex-wrap gap-2">
                        {trades.map((trade: string) => (
                          <span key={trade} className="px-3 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-full text-sm">
                            {trade}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Add Subcontractor Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Add Subcontractor</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Contact Name
                    </label>
                    <input
                      type="text"
                      value={formData.contactName}
                      onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                      className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
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
                      className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <AddressAutocomplete
                    value={formData.address}
                    onChange={(value) => setFormData({ ...formData, address: value })}
                    onSelect={(address: ParsedAddress) => {
                      setFormData({
                        ...formData,
                        address: address.streetAddress || address.fullAddress,
                        city: address.city,
                        state: address.state,
                        zip: address.zip,
                      })
                    }}
                    placeholder="Start typing an address..."
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="Auto-filled from address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">State</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="Auto-filled"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ZIP</label>
                    <input
                      type="text"
                      value={formData.zip}
                      onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                      className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="Auto-filled"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Trades *
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {TRADES.map(trade => (
                      <button
                        key={trade}
                        type="button"
                        onClick={() => toggleTrade(trade)}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          formData.trades.includes(trade)
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {trade}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      License Number
                    </label>
                    <input
                      type="text"
                      value={formData.licenseNumber}
                      onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                      className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Insurance Expiry
                    </label>
                    <input
                      type="date"
                      value={formData.insuranceExpiry}
                      onChange={(e) => setFormData({ ...formData, insuranceExpiry: e.target.value })}
                      className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="PREFERRED">Preferred</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500"
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
                    disabled={!formData.companyName || formData.trades.length === 0}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    Add Subcontractor
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
