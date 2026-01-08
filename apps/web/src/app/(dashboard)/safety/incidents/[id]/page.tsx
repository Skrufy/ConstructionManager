'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Calendar, Clock, AlertTriangle, User, Building2 } from 'lucide-react'

interface Incident {
  id: string
  incident_date: string
  incident_time: string | null
  incident_type: string
  severity: string
  location: string
  status: string
  description: string
  root_cause: string | null
  immediate_actions: string | null
  witnesses: string[] | null
  injured_parties: string[] | null
  project_id: string
  project_name: string | null
  reported_by: string
  reporter_name: string | null
  created_at: string
}

const INCIDENT_TYPES: Record<string, string> = {
  INJURY: 'Injury',
  NEAR_MISS: 'Near Miss',
  PROPERTY_DAMAGE: 'Property Damage',
  ENVIRONMENTAL: 'Environmental',
  OTHER: 'Other'
}

const SEVERITY_COLORS: Record<string, string> = {
  MINOR: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300',
  MODERATE: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400',
  SERIOUS: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400',
  CRITICAL: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
}

const STATUS_COLORS: Record<string, string> = {
  REPORTED: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400',
  UNDER_INVESTIGATION: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400',
  CLOSED: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
}

export default function IncidentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [incident, setIncident] = useState<Incident | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (params.id) {
      fetchIncident(params.id as string)
    }
  }, [params.id])

  const fetchIncident = async (id: string) => {
    try {
      const res = await fetch(`/api/safety/incidents/${id}`)
      if (!res.ok) {
        throw new Error('Incident not found')
      }
      const data = await res.json()
      setIncident(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load incident')
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

  if (error || !incident) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-4 rounded-xl">
          {error || 'Incident not found'}
        </div>
        <Link href="/safety?tab=incidents" className="mt-4 inline-block text-blue-600 dark:text-blue-400">
          &larr; Back to Incidents
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/safety?tab=incidents" className="p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700">
          <ArrowLeft className="h-6 w-6 text-gray-900 dark:text-gray-100" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${SEVERITY_COLORS[incident.severity]}`}>
              {incident.severity}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[incident.status]}`}>
              {incident.status.replace('_', ' ')}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {INCIDENT_TYPES[incident.incident_type] || incident.incident_type}
          </h1>
        </div>
      </div>

      <div className="space-y-6">
        {/* Details Card */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Incident Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Date</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{formatDate(incident.incident_date)}</p>
              </div>
            </div>

            {incident.incident_time && (
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Time</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{incident.incident_time}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Location</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{incident.location}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Project</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{incident.project_name}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Reported By</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{incident.reporter_name}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">What Happened</h2>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{incident.description}</p>
        </div>

        {/* Root Cause */}
        {incident.root_cause && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Root Cause</h2>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{incident.root_cause}</p>
          </div>
        )}

        {/* Immediate Actions */}
        {incident.immediate_actions && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Immediate Actions Taken</h2>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{incident.immediate_actions}</p>
          </div>
        )}

        {/* People Involved */}
        {((incident.injured_parties && incident.injured_parties.length > 0) ||
          (incident.witnesses && incident.witnesses.length > 0)) && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">People Involved</h2>

            {incident.injured_parties && incident.injured_parties.length > 0 && (
              <div className="mb-4">
                <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Injured Parties</h3>
                <ul className="space-y-1">
                  {incident.injured_parties.map((person, i) => (
                    <li key={i} className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/30 rounded-lg text-gray-900 dark:text-gray-100">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      {person}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {incident.witnesses && incident.witnesses.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Witnesses</h3>
                <ul className="space-y-1">
                  {incident.witnesses.map((person, i) => (
                    <li key={i} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-gray-100">
                      <User className="h-4 w-4 text-gray-400 dark:text-gray-300" />
                      {person}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
