'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Plus, X } from 'lucide-react'

interface Project {
  id: string
  name: string
}

interface User {
  id: string
  name: string
}

interface PunchListItem {
  id: string
  description: string
  location: string
  trade: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  assignedTo: string
  dueDate: string
}

const TRADES = [
  'General',
  'Electrical',
  'Plumbing',
  'HVAC',
  'Drywall',
  'Painting',
  'Flooring',
  'Roofing',
  'Framing',
  'Concrete',
  'Masonry',
  'Landscaping',
]

const PRIORITIES = [
  { value: 'LOW', label: 'Low', color: 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200' },
  { value: 'MEDIUM', label: 'Medium', color: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300' },
  { value: 'HIGH', label: 'High', color: 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300' },
  { value: 'CRITICAL', label: 'Critical', color: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300' },
]

export default function NewPunchListPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])

  // Form state
  const [projectId, setProjectId] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [items, setItems] = useState<PunchListItem[]>([])
  const [showItemForm, setShowItemForm] = useState(false)
  const [currentItem, setCurrentItem] = useState<Partial<PunchListItem>>({
    priority: 'MEDIUM',
  })

  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => setProjects(data.projects || []))
      .catch(console.error)

    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        // API returns array directly or wrapped in users property
        const userList = Array.isArray(data) ? data : (data.users || [])
        setUsers(userList)
      })
      .catch(console.error)
  }, [])

  const addItem = () => {
    if (!currentItem.description) return
    setItems(prev => [...prev, {
      id: Date.now().toString(),
      description: currentItem.description || '',
      location: currentItem.location || '',
      trade: currentItem.trade || 'General',
      priority: currentItem.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' || 'MEDIUM',
      assignedTo: currentItem.assignedTo || '',
      dueDate: currentItem.dueDate || '',
    }])
    setCurrentItem({ priority: 'MEDIUM' })
    setShowItemForm(false)
  }

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!projectId || !name) {
      setError('Please fill in the project and name')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/safety/punch-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          name,
          description,
          dueDate: dueDate || undefined,
          items: items.length > 0 ? items.map(item => ({
            description: item.description,
            location: item.location || undefined,
            trade: item.trade || undefined,
            priority: item.priority,
            assignedTo: item.assignedTo || undefined,
            dueDate: item.dueDate || undefined,
          })) : undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create punch list')
      }

      router.push('/safety?tab=punch-lists')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/safety" className="p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700">
          <ArrowLeft className="h-6 w-6 text-gray-900 dark:text-gray-100" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">New Punch List</h1>
          <p className="text-gray-600 dark:text-gray-400">Create a punch list to track items that need attention</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-4 rounded-xl mb-6 font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Punch List Details */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Punch List Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="project" className="label">Project *</label>
              <select
                id="project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
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
              <label htmlFor="dueDate" className="label">Due Date</label>
              <input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input mt-1"
              />
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="name" className="label">Punch List Name *</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input mt-1"
              placeholder="e.g., Building A Final Walkthrough"
              required
            />
          </div>

          <div className="mt-4">
            <label htmlFor="description" className="label">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input mt-1"
              rows={2}
              placeholder="Brief description of this punch list..."
            />
          </div>
        </div>

        {/* Items */}
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Punch List Items</h2>
            <button
              type="button"
              onClick={() => setShowItemForm(true)}
              className="btn btn-primary px-4 py-2 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Item
            </button>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>No items yet. Click &quot;Add Item&quot; to add punch list items.</p>
              <p className="text-sm mt-1">You can also add items after creating the list.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={item.id} className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-gray-100">{index + 1}. {item.description}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        PRIORITIES.find(p => p.value === item.priority)?.color
                      }`}>
                        {item.priority}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {item.trade && <span className="mr-3">{item.trade}</span>}
                      {item.location && <span className="mr-3">{item.location}</span>}
                      {item.assignedTo && (
                        <span>Assigned to: {users.find(u => u.id === item.assignedTo)?.name}</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
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
              'Create Punch List'
            )}
          </button>
        </div>
      </form>

      {/* Add Item Modal */}
      {showItemForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Add Punch List Item</h3>

              <div>
                <label className="label">Description *</label>
                <textarea
                  value={currentItem.description || ''}
                  onChange={(e) => setCurrentItem(p => ({ ...p, description: e.target.value }))}
                  className="input mt-1"
                  rows={2}
                  placeholder="What needs to be fixed or completed..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Location</label>
                  <input
                    type="text"
                    value={currentItem.location || ''}
                    onChange={(e) => setCurrentItem(p => ({ ...p, location: e.target.value }))}
                    className="input mt-1"
                    placeholder="e.g., Room 101"
                  />
                </div>
                <div>
                  <label className="label">Trade</label>
                  <select
                    value={currentItem.trade || ''}
                    onChange={(e) => setCurrentItem(p => ({ ...p, trade: e.target.value }))}
                    className="input mt-1"
                  >
                    <option value="">Select trade</option>
                    {TRADES.map(trade => (
                      <option key={trade} value={trade}>{trade}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Priority</label>
                <div className="flex gap-2 mt-1">
                  {PRIORITIES.map(p => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setCurrentItem(prev => ({ ...prev, priority: p.value as any }))}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        currentItem.priority === p.value
                          ? p.color + ' ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-800'
                          : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-500'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Assign To</label>
                  <select
                    value={currentItem.assignedTo || ''}
                    onChange={(e) => setCurrentItem(p => ({ ...p, assignedTo: e.target.value }))}
                    className="input mt-1"
                  >
                    <option value="">Select person</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>{user.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Item Due Date</label>
                  <input
                    type="date"
                    value={currentItem.dueDate || ''}
                    onChange={(e) => setCurrentItem(p => ({ ...p, dueDate: e.target.value }))}
                    className="input mt-1"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowItemForm(false); setCurrentItem({ priority: 'MEDIUM' }) }}
                  className="btn btn-outline flex-1 py-2"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={addItem}
                  disabled={!currentItem.description}
                  className="btn btn-primary flex-1 py-2"
                >
                  Add Item
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
