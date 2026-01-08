'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSession } from '@/hooks/useSession'
import Link from 'next/link'

type TabType = 'inspections' | 'punch-lists' | 'incidents' | 'meetings'

interface Inspection {
  id: string
  date: string
  location: string | null
  overall_status: string
  template_id: string
  template_name: string | null
  template_category: string | null
  project_id: string
  project_name: string | null
  inspector_id: string
  inspector_name: string | null
  photo_count: number
}

interface PunchList {
  id: string
  title: string
  description: string | null
  status: string
  due_date: string | null
  project_id: string
  project_name: string | null
  created_by: string | null
  created_by_name: string | null
  completed_count: number
  total_count: number
}

interface Incident {
  id: string
  incident_date: string
  incident_type: string
  severity: string
  location: string
  status: string
  project_id: string
  project_name: string | null
  reported_by: string
  reporter_name: string | null
  description: string
}

interface Meeting {
  id: string
  date: string
  topic: string
  duration: number | null
  attendee_count: number
  project_id: string | null
  project_name: string | null
  conducted_by: string
  conductor_name: string | null
}

const STATUS_COLORS: Record<string, string> = {
  PASSED: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
  FAILED: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400',
  PENDING: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400',
  REQUIRES_FOLLOWUP: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400',
  OPEN: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400',
  IN_PROGRESS: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400',
  COMPLETED: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
  REPORTED: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400',
  UNDER_INVESTIGATION: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400',
  CLOSED: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
}

const SEVERITY_COLORS: Record<string, string> = {
  MINOR: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300',
  MODERATE: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400',
  SERIOUS: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400',
  CRITICAL: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
}

const INCIDENT_TYPES: Record<string, string> = {
  INJURY: 'Injury',
  NEAR_MISS: 'Near Miss',
  PROPERTY_DAMAGE: 'Property Damage',
  ENVIRONMENTAL: 'Environmental',
  OTHER: 'Other'
}

export default function SafetyPage() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab') as TabType | null
  const [activeTab, setActiveTab] = useState<TabType>(tabParam || 'inspections')
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [punchLists, setPunchLists] = useState<PunchList[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)

  // Update active tab when URL parameter changes
  useEffect(() => {
    if (tabParam && ['inspections', 'punch-lists', 'incidents', 'meetings'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  useEffect(() => {
    fetchData()
  }, [activeTab])

  const fetchData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'inspections') {
        const res = await fetch('/api/safety/inspections')
        if (res.ok) {
          const data = await res.json()
          // API returns { inspections: [...], total, page, pageSize }
          setInspections(data.inspections || [])
        }
      } else if (activeTab === 'punch-lists') {
        const res = await fetch('/api/safety/punch-lists')
        if (res.ok) {
          const data = await res.json()
          // API returns { punch_lists: [...], items, total, page, page_size }
          setPunchLists(data.punch_lists || [])
        }
      } else if (activeTab === 'incidents') {
        const res = await fetch('/api/safety/incidents')
        if (res.ok) {
          const data = await res.json()
          // API returns { incidents: [...], page, pageSize, total }
          setIncidents(data.incidents || [])
        }
      } else if (activeTab === 'meetings') {
        const res = await fetch('/api/safety/meetings')
        if (res.ok) {
          const data = await res.json()
          // API returns { meetings: [...], total }
          setMeetings(data.meetings || [])
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    // Parse date string and treat it as local date to avoid timezone shift
    // ISO strings like "2026-01-03T00:00:00.000Z" would shift when converted to local time
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC' // Display in UTC to match how date was entered
    })
  }

  const tabs = [
    { id: 'inspections' as TabType, name: 'Inspections' },
    { id: 'punch-lists' as TabType, name: 'Punch Lists' },
    { id: 'incidents' as TabType, name: 'Incidents' },
    { id: 'meetings' as TabType, name: 'Safety Meetings' }
  ]

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Quality & Safety</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage inspections, punch lists, incidents, and safety meetings</p>
        </div>
        <Link
          href={`/safety/${activeTab}/new`}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New {activeTab === 'punch-lists' ? 'Punch List' : activeTab === 'incidents' ? 'Incident Report' : activeTab === 'meetings' ? 'Meeting' : 'Inspection'}
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
          ))}
        </div>
      ) : (
        <>
          {/* Inspections Tab */}
          {activeTab === 'inspections' && (
            <div className="space-y-4">
              {inspections.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                  <p className="text-gray-600 dark:text-gray-400">No inspections found</p>
                  <Link href="/safety/inspections/new" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mt-2 inline-block">
                    Create your first inspection
                  </Link>
                </div>
              ) : (
                inspections.map(inspection => (
                  <Link key={inspection.id} href={`/safety/inspections/${inspection.id}`} className="block bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[inspection.overall_status]}`}>
                            {inspection.overall_status}
                          </span>
                          {inspection.template_category && (
                            <span className="text-sm text-gray-500 dark:text-gray-400">{inspection.template_category}</span>
                          )}
                        </div>
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">{inspection.template_name || 'Inspection'}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{inspection.project_name}</p>
                        {inspection.location && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">{inspection.location}</p>
                        )}
                      </div>
                      <div className="text-right text-sm">
                        <div className="text-gray-900 dark:text-gray-100">{formatDate(inspection.date)}</div>
                        <div className="text-gray-500 dark:text-gray-400">by {inspection.inspector_name}</div>
                        {inspection.photo_count > 0 && (
                          <div className="text-gray-400">{inspection.photo_count} photos</div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}

          {/* Punch Lists Tab */}
          {activeTab === 'punch-lists' && (
            <div className="space-y-4">
              {punchLists.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                  <p className="text-gray-600 dark:text-gray-400">No punch lists found</p>
                  <Link href="/safety/punch-lists/new" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mt-2 inline-block">
                    Create your first punch list
                  </Link>
                </div>
              ) : (
                punchLists.map(list => (
                  <Link key={list.id} href={`/safety/punch-lists/${list.id}`} className="block bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[list.status]}`}>
                            {list.status}
                          </span>
                        </div>
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">{list.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{list.project_name}</p>
                      </div>
                      <div className="text-right">
                        {list.due_date && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">Due: {formatDate(list.due_date)}</div>
                        )}
                        {list.created_by_name && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">by {list.created_by_name}</div>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex gap-4 text-sm">
                      <span className="text-blue-600 dark:text-blue-400">{list.total_count - list.completed_count} open</span>
                      <span className="text-green-600 dark:text-green-400">{list.completed_count} completed</span>
                    </div>
                    <div className="mt-2 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-green-500 rounded-full h-2 transition-all"
                        style={{ width: `${list.total_count > 0 ? (list.completed_count / list.total_count) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}

          {/* Incidents Tab */}
          {activeTab === 'incidents' && (
            <div className="space-y-4">
              {incidents.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                  <p className="text-gray-600 dark:text-gray-400">No incidents reported</p>
                  <Link href="/safety/incidents/new" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mt-2 inline-block">
                    Report an incident
                  </Link>
                </div>
              ) : (
                incidents.map(incident => (
                  <Link key={incident.id} href={`/safety/incidents/${incident.id}`} className="block bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${SEVERITY_COLORS[incident.severity]}`}>
                            {incident.severity}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[incident.status]}`}>
                            {incident.status}
                          </span>
                        </div>
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">
                          {INCIDENT_TYPES[incident.incident_type] || incident.incident_type}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{incident.project_name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{incident.location}</p>
                      </div>
                      <div className="text-right text-sm">
                        <div className="text-gray-900 dark:text-gray-100">{formatDate(incident.incident_date)}</div>
                        <div className="text-gray-500 dark:text-gray-400">Reported by {incident.reporter_name}</div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}

          {/* Meetings Tab */}
          {activeTab === 'meetings' && (
            <div className="space-y-4">
              {meetings.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                  <p className="text-gray-600 dark:text-gray-400">No safety meetings recorded</p>
                  <Link href="/safety/meetings/new" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mt-2 inline-block">
                    Log a safety meeting
                  </Link>
                </div>
              ) : (
                meetings.map(meeting => (
                  <Link key={meeting.id} href={`/safety/meetings/${meeting.id}`} className="block bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">{meeting.topic}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{meeting.project_name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {meeting.attendee_count} attendees
                          {meeting.duration && ` • ${meeting.duration} minutes`}
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        <div className="text-gray-900 dark:text-gray-100">{formatDate(meeting.date)}</div>
                        <div className="text-gray-500 dark:text-gray-400">by {meeting.conductor_name}</div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
