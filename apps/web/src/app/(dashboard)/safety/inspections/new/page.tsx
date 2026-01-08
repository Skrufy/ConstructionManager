'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface Project {
  id: string
  name: string
  address: string | null
}

interface InspectionTemplate {
  id: string
  name: string
  category: string
  items: ChecklistItem[]
}

interface ChecklistItem {
  id: string
  text: string
  required: boolean
}

interface ItemResponse {
  status: 'PASS' | 'FAIL' | 'NA'
  notes?: string
}

const CATEGORIES = ['SAFETY', 'QUALITY', 'ENVIRONMENTAL', 'PRE_WORK']

const DEFAULT_ITEMS: ChecklistItem[] = [
  { id: '1', text: 'PPE is being worn correctly by all workers', required: true },
  { id: '2', text: 'Work area is clean and organized', required: true },
  { id: '3', text: 'Fire extinguishers are accessible', required: true },
  { id: '4', text: 'First aid kit is stocked and accessible', required: true },
  { id: '5', text: 'Proper signage is in place', required: false },
  { id: '6', text: 'Emergency exits are clear', required: true },
  { id: '7', text: 'Equipment is in good working condition', required: true },
  { id: '8', text: 'MSDS sheets are available', required: false },
]

export default function NewInspectionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [templates, setTemplates] = useState<InspectionTemplate[]>([])

  // Form state
  const [projectId, setProjectId] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [responses, setResponses] = useState<Record<string, ItemResponse>>({})

  // Use default items if no template selected
  const [items, setItems] = useState<ChecklistItem[]>(DEFAULT_ITEMS)

  useEffect(() => {
    // Fetch projects
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => setProjects(data.projects || []))
      .catch(console.error)
  }, [])

  // Auto-populate location when project is selected
  const handleProjectChange = (selectedProjectId: string) => {
    setProjectId(selectedProjectId)
    const project = projects.find(p => p.id === selectedProjectId)
    if (project?.address && !location) {
      setLocation(project.address)
    }
  }

  useEffect(() => {
    // Fetch templates
    fetch('/api/safety/inspection-templates')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setTemplates(data)
        }
      })
      .catch(console.error)

    // Initialize responses for default items
    const initialResponses: Record<string, ItemResponse> = {}
    DEFAULT_ITEMS.forEach(item => {
      initialResponses[item.id] = { status: 'NA' }
    })
    setResponses(initialResponses)
  }, [])

  const handleTemplateChange = (tid: string) => {
    setTemplateId(tid)
    const template = templates.find(t => t.id === tid)
    if (template?.items) {
      const templateItems = Array.isArray(template.items) ? template.items : []
      setItems(templateItems)
      const newResponses: Record<string, ItemResponse> = {}
      templateItems.forEach((item: ChecklistItem) => {
        newResponses[item.id] = { status: 'NA' }
      })
      setResponses(newResponses)
    } else {
      setItems(DEFAULT_ITEMS)
      const newResponses: Record<string, ItemResponse> = {}
      DEFAULT_ITEMS.forEach(item => {
        newResponses[item.id] = { status: 'NA' }
      })
      setResponses(newResponses)
    }
  }

  const setItemResponse = (itemId: string, status: 'PASS' | 'FAIL' | 'NA') => {
    setResponses(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], status }
    }))
  }

  const setItemNotes = (itemId: string, notes: string) => {
    setResponses(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], notes }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!projectId) {
      setError('Please select a project')
      return
    }

    // Check required items
    const unansweredRequired = items.filter(
      item => item.required && responses[item.id]?.status === 'NA'
    )
    if (unansweredRequired.length > 0) {
      setError(`Please answer all required items (${unansweredRequired.length} remaining)`)
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/safety/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: templateId || 'default',
          projectId,
          date,
          location,
          responses,
          notes,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create inspection')
      }

      router.push('/safety?tab=inspections')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const passedCount = Object.values(responses).filter(r => r.status === 'PASS').length
  const failedCount = Object.values(responses).filter(r => r.status === 'FAIL').length

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/safety" className="p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700">
          <ArrowLeft className="h-6 w-6 text-gray-900 dark:text-gray-100" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">New Inspection</h1>
          <p className="text-gray-600 dark:text-gray-400">Complete a safety or quality inspection</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-4 rounded-xl mb-6 font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Inspection Details */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Inspection Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="project" className="label">Project *</label>
              <select
                id="project"
                value={projectId}
                onChange={(e) => handleProjectChange(e.target.value)}
                className="input mt-1"
                required
              >
                <option value="">Select a project</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="date" className="label">Date *</label>
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input mt-1"
                required
              />
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="location" className="label">Location</label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="input mt-1"
              placeholder="e.g., Building A, Floor 2"
            />
          </div>

          {templates.length > 0 && (
            <div className="mt-4">
              <label htmlFor="template" className="label">Inspection Template</label>
              <select
                id="template"
                value={templateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="input mt-1"
              >
                <option value="">Use Default Checklist</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Checklist */}
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Checklist Items</h2>
            <div className="flex gap-3 text-sm">
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle className="h-4 w-4" /> {passedCount} Pass
              </span>
              <span className="flex items-center gap-1 text-red-600">
                <XCircle className="h-4 w-4" /> {failedCount} Fail
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={item.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {index + 1}. {item.text}
                      {item.required && <span className="text-red-500 ml-1">*</span>}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setItemResponse(item.id, 'PASS')}
                      className={`p-2 rounded-lg transition-colors ${
                        responses[item.id]?.status === 'PASS'
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-green-900/30'
                      }`}
                    >
                      <CheckCircle className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setItemResponse(item.id, 'FAIL')}
                      className={`p-2 rounded-lg transition-colors ${
                        responses[item.id]?.status === 'FAIL'
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-red-100 dark:hover:bg-red-900/30'
                      }`}
                    >
                      <XCircle className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setItemResponse(item.id, 'NA')}
                      className={`p-2 rounded-lg transition-colors ${
                        responses[item.id]?.status === 'NA'
                          ? 'bg-gray-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                      }`}
                    >
                      <AlertCircle className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                {responses[item.id]?.status === 'FAIL' && (
                  <div className="mt-3">
                    <input
                      type="text"
                      value={responses[item.id]?.notes || ''}
                      onChange={(e) => setItemNotes(item.id, e.target.value)}
                      className="input text-sm"
                      placeholder="Add notes about the failure..."
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Additional Notes</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input"
            rows={4}
            placeholder="Any additional observations or comments..."
          />
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <Link href="/safety" className="btn btn-outline flex-1 py-3">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary flex-1 py-3"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Complete Inspection'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
