'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Calendar, User, Building2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface InspectionItem {
  id: string
  text: string
  status: string
  notes: string | null
}

interface Inspection {
  id: string
  date: string
  location: string | null
  overall_status: string
  notes: string | null
  template_id: string
  template_name: string | null
  template_category: string | null
  project_id: string
  project_name: string | null
  inspector_id: string
  inspector_name: string | null
  items: InspectionItem[]
  photo_count: number
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  PASSED: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
  FAILED: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400',
  PENDING: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400',
  REQUIRES_FOLLOWUP: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400'
}

export default function InspectionDetailPage() {
  const params = useParams()
  const [inspection, setInspection] = useState<Inspection | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (params.id) {
      fetchInspection(params.id as string)
    }
  }, [params.id])

  const fetchInspection = async (id: string) => {
    try {
      const res = await fetch(`/api/safety/inspections/${id}`)
      if (!res.ok) {
        throw new Error('Inspection not found')
      }
      const data = await res.json()
      setInspection(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inspection')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC'
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'FAIL':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  if (error || !inspection) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-4 rounded-xl">
          {error || 'Inspection not found'}
        </div>
        <Link href="/safety?tab=inspections" className="mt-4 inline-block text-blue-600 dark:text-blue-400">
          &larr; Back to Inspections
        </Link>
      </div>
    )
  }

  const passedCount = inspection.items?.filter(i => i.status === 'PASS').length || 0
  const failedCount = inspection.items?.filter(i => i.status === 'FAIL').length || 0

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/safety?tab=inspections" className="p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700">
          <ArrowLeft className="h-6 w-6 text-gray-900 dark:text-gray-100" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[inspection.overall_status]}`}>
              {inspection.overall_status.replace('_', ' ')}
            </span>
            {inspection.template_category && (
              <span className="text-sm text-gray-500 dark:text-gray-400">{inspection.template_category}</span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {inspection.template_name || 'Inspection'}
          </h1>
        </div>
      </div>

      <div className="space-y-6">
        {/* Details Card */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Inspection Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Date</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{formatDate(inspection.date)}</p>
              </div>
            </div>

            {inspection.location && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Location</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{inspection.location}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Project</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{inspection.project_name}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Inspector</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{inspection.inspector_name}</p>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-medium text-gray-900 dark:text-gray-100">{passedCount} Passed</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="font-medium text-gray-900 dark:text-gray-100">{failedCount} Failed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Checklist Items */}
        {inspection.items && inspection.items.length > 0 && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Checklist Items</h2>
            <div className="space-y-3">
              {inspection.items.map((item, index) => (
                <div key={item.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(item.status)}
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {index + 1}. {item.text}
                      </p>
                      {item.notes && (
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{item.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {inspection.notes && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Additional Notes</h2>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{inspection.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
