'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Calendar, Clock, Users, Building2, FileText } from 'lucide-react'

interface Attendee {
  id: string
  name: string
  company: string | null
}

interface Meeting {
  id: string
  date: string
  time: string | null
  topic: string
  description: string | null
  duration: number | null
  location: string | null
  notes: string | null
  project_id: string | null
  project_name: string | null
  conducted_by: string
  conductor_name: string | null
  attendees: Attendee[]
  attendee_count: number
  photo_url: string | null
  leader_signature: string | null
  created_at: string
}

export default function MeetingDetailPage() {
  const params = useParams()
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (params.id) {
      fetchMeeting(params.id as string)
    }
  }, [params.id])

  const fetchMeeting = async (id: string) => {
    try {
      const res = await fetch(`/api/safety/meetings/${id}`)
      if (!res.ok) {
        throw new Error('Meeting not found')
      }
      const data = await res.json()
      setMeeting(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load meeting')
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

  if (error || !meeting) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-4 rounded-xl">
          {error || 'Meeting not found'}
        </div>
        <Link href="/safety?tab=meetings" className="mt-4 inline-block text-blue-600 dark:text-blue-400">
          &larr; Back to Meetings
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/safety?tab=meetings" className="p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700">
          <ArrowLeft className="h-6 w-6 text-gray-900 dark:text-gray-100" />
        </Link>
        <div className="flex-1">
          <p className="text-sm text-gray-500 dark:text-gray-400">Safety Meeting</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{meeting.topic}</h1>
        </div>
      </div>

      <div className="space-y-6">
        {/* Details Card */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Meeting Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Date</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{formatDate(meeting.date)}</p>
              </div>
            </div>

            {meeting.time && (
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Time</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{meeting.time}</p>
                </div>
              </div>
            )}

            {meeting.location && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Location</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{meeting.location}</p>
                </div>
              </div>
            )}

            {meeting.project_name && (
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Project</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{meeting.project_name}</p>
                </div>
              </div>
            )}

            {meeting.duration && (
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Duration</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{meeting.duration} minutes</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Conducted By</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{meeting.conductor_name}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        {meeting.description && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Description</h2>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{meeting.description}</p>
          </div>
        )}

        {/* Attendees */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Attendees ({meeting.attendee_count || meeting.attendees?.length || 0})
          </h2>

          {meeting.attendees && meeting.attendees.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {meeting.attendees.map(attendee => (
                <div key={attendee.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="font-medium text-gray-900 dark:text-gray-100">{attendee.name}</p>
                  {attendee.company && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{attendee.company}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No attendee details available</p>
          )}
        </div>

        {/* Photo */}
        {meeting.photo_url && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Meeting Photo</h2>
            <img
              src={meeting.photo_url}
              alt="Meeting attendees"
              className="w-full rounded-xl object-cover max-h-96"
            />
          </div>
        )}

        {/* Notes */}
        {meeting.notes && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-400 dark:text-gray-300" />
              Notes
            </h2>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{meeting.notes}</p>
          </div>
        )}

        {/* Signature */}
        {meeting.leader_signature && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Leader Signature</h2>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
              <img
                src={meeting.leader_signature}
                alt="Leader signature"
                className="max-h-24"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
