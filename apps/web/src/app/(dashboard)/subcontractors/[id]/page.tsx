'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2, Mail, Phone, MapPin, Star, Calendar, FileText, Briefcase } from 'lucide-react'

interface SubcontractorProject {
  id: string
  project: {
    id: string
    name: string
    status: string
  }
  startDate: string | null
  endDate: string | null
  contractAmount: number | null
}

interface SubcontractorCertification {
  id: string
  certType: string
  certName: string
  certNumber: string | null
  expiryDate: string | null
  status: string
}

interface Subcontractor {
  id: string
  companyName: string
  contactName: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  trades: string[]
  licenseNumber: string | null
  insuranceExpiry: string | null
  rating: number | null
  status: string
  notes: string | null
  projects: SubcontractorProject[]
  certifications: SubcontractorCertification[]
  createdAt: string
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
  INACTIVE: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300',
  SUSPENDED: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400',
  PENDING: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
}

const CERT_STATUS_COLORS: Record<string, string> = {
  VALID: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
  EXPIRING_SOON: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400',
  EXPIRED: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
}

export default function SubcontractorDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [subcontractor, setSubcontractor] = useState<Subcontractor | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (params.id) {
      fetchSubcontractor(params.id as string)
    }
  }, [params.id])

  const fetchSubcontractor = async (id: string) => {
    try {
      const res = await fetch(`/api/subcontractors/${id}`)
      if (!res.ok) throw new Error('Subcontractor not found')
      const data = await res.json()
      setSubcontractor(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subcontractor')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC'
    })
  }

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return 'N/A'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    )
  }

  if (error || !subcontractor) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-4 rounded-xl">
          {error || 'Subcontractor not found'}
        </div>
        <Link href="/subcontractors" className="mt-4 inline-block text-blue-600 dark:text-blue-400">
          &larr; Back to Subcontractors
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/subcontractors" className="p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700">
          <ArrowLeft className="h-6 w-6 text-gray-900 dark:text-gray-100" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[subcontractor.status] || STATUS_COLORS.PENDING}`}>
              {subcontractor.status}
            </span>
            {subcontractor.rating && (
              <span className="flex items-center gap-1 text-yellow-500">
                <Star className="h-4 w-4 fill-current" />
                {subcontractor.rating.toFixed(1)}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {subcontractor.companyName}
          </h1>
        </div>
      </div>

      <div className="space-y-6">
        {/* Contact Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Contact Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subcontractor.contactName && (
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Contact Name</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{subcontractor.contactName}</p>
                </div>
              </div>
            )}

            {subcontractor.email && (
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                  <a href={`mailto:${subcontractor.email}`} className="font-medium text-blue-600 dark:text-blue-400">
                    {subcontractor.email}
                  </a>
                </div>
              </div>
            )}

            {subcontractor.phone && (
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                  <a href={`tel:${subcontractor.phone}`} className="font-medium text-blue-600 dark:text-blue-400">
                    {subcontractor.phone}
                  </a>
                </div>
              </div>
            )}

            {(subcontractor.address || subcontractor.city) && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Address</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {[subcontractor.address, subcontractor.city, subcontractor.state, subcontractor.zip]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Trades & License */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Trades & Licensing</h2>

          {subcontractor.trades && subcontractor.trades.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Trades</p>
              <div className="flex flex-wrap gap-2">
                {subcontractor.trades.map((trade, i) => (
                  <span key={i} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded-full text-sm">
                    {trade}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subcontractor.licenseNumber && (
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">License Number</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{subcontractor.licenseNumber}</p>
                </div>
              </div>
            )}

            {subcontractor.insuranceExpiry && (
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Insurance Expiry</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{formatDate(subcontractor.insuranceExpiry)}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Certifications */}
        {subcontractor.certifications && subcontractor.certifications.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Certifications</h2>
            <div className="space-y-3">
              {subcontractor.certifications.map(cert => (
                <div key={cert.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{cert.certName}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {cert.certType} {cert.certNumber && `- ${cert.certNumber}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${CERT_STATUS_COLORS[cert.status] || CERT_STATUS_COLORS.VALID}`}>
                      {cert.status.replace('_', ' ')}
                    </span>
                    {cert.expiryDate && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Expires: {formatDate(cert.expiryDate)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Projects */}
        {subcontractor.projects && subcontractor.projects.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Project Assignments</h2>
            <div className="space-y-3">
              {subcontractor.projects.map(assignment => (
                <Link
                  key={assignment.id}
                  href={`/projects/${assignment.project.id}`}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{assignment.project.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {assignment.startDate && `Started: ${formatDate(assignment.startDate)}`}
                        {assignment.endDate && ` - ${formatDate(assignment.endDate)}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      assignment.project.status === 'ACTIVE'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-300'
                    }`}>
                      {assignment.project.status}
                    </span>
                    {assignment.contractAmount && (
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
                        {formatCurrency(assignment.contractAmount)}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {subcontractor.notes && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Notes</h2>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{subcontractor.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
