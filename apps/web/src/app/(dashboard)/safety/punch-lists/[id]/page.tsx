'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, Building2, User, CheckCircle, Circle } from 'lucide-react'

interface PunchListItem {
  id: string
  description: string
  location: string | null
  trade: string | null
  priority: string
  status: string
  assigned_to: string | null
  assignee_name: string | null
  due_date: string | null
}

interface PunchList {
  id: string
  title: string
  description: string | null
  status: string
  due_date: string | null
  project_id: string
  project_name: string | null
  created_by: string
  created_by_name: string | null
  items: PunchListItem[]
  completed_count: number
  total_count: number
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400',
  IN_PROGRESS: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400',
  COMPLETED: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200',
  MEDIUM: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300',
  HIGH: 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300',
  CRITICAL: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
}

export default function PunchListDetailPage() {
  const params = useParams()
  const [punchList, setPunchList] = useState<PunchList | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (params.id) {
      fetchPunchList(params.id as string)
    }
  }, [params.id])

  const fetchPunchList = async (id: string) => {
    try {
      const res = await fetch(`/api/safety/punch-lists/${id}`)
      if (!res.ok) {
        throw new Error('Punch list not found')
      }
      const data = await res.json()
      setPunchList(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load punch list')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
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

  if (error || !punchList) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-4 rounded-xl">
          {error || 'Punch list not found'}
        </div>
        <Link href="/safety?tab=punch-lists" className="mt-4 inline-block text-blue-600 dark:text-blue-400">
          &larr; Back to Punch Lists
        </Link>
      </div>
    )
  }

  const progress = punchList.total_count > 0
    ? Math.round((punchList.completed_count / punchList.total_count) * 100)
    : 0

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/safety?tab=punch-lists" className="p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700">
          <ArrowLeft className="h-6 w-6 text-gray-900 dark:text-gray-100" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[punchList.status]}`}>
              {punchList.status.replace('_', ' ')}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{punchList.title}</h1>
        </div>
      </div>

      <div className="space-y-6">
        {/* Details Card */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Project</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{punchList.project_name}</p>
              </div>
            </div>

            {punchList.due_date && (
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Due Date</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{formatDate(punchList.due_date)}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Created By</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{punchList.created_by_name}</p>
              </div>
            </div>
          </div>

          {punchList.description && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-gray-700 dark:text-gray-300">{punchList.description}</p>
            </div>
          )}

          {/* Progress */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {punchList.completed_count} of {punchList.total_count} completed ({progress}%)
              </span>
            </div>
            <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className="bg-green-500 rounded-full h-3 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Punch List Items ({punchList.total_count})
          </h2>

          {punchList.items && punchList.items.length > 0 ? (
            <div className="space-y-3">
              {punchList.items.map((item, index) => (
                <div key={item.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="flex items-start gap-3">
                    {item.status === 'COMPLETED' ? (
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-400 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {index + 1}. {item.description}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_COLORS[item.priority]}`}>
                          {item.priority}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-gray-500 dark:text-gray-400 space-x-3">
                        {item.trade && <span>{item.trade}</span>}
                        {item.location && <span>{item.location}</span>}
                        {item.assignee_name && <span>Assigned to: {item.assignee_name}</span>}
                        {item.due_date && <span>Due: {formatDate(item.due_date)}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No items in this punch list</p>
          )}
        </div>
      </div>
    </div>
  )
}
