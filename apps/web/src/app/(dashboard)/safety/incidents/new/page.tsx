'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, AlertTriangle, Plus, X } from 'lucide-react'

interface Project {
  id: string
  name: string
  address: string | null
}

const INCIDENT_TYPES = [
  { value: 'INJURY', label: 'Injury' },
  { value: 'NEAR_MISS', label: 'Near Miss' },
  { value: 'PROPERTY_DAMAGE', label: 'Property Damage' },
  { value: 'ENVIRONMENTAL', label: 'Environmental' },
  { value: 'OTHER', label: 'Other' },
]

const SEVERITIES = [
  { value: 'MINOR', label: 'Minor', color: 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200', description: 'First aid only, no lost time' },
  { value: 'MODERATE', label: 'Moderate', color: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300', description: 'Medical attention needed' },
  { value: 'SERIOUS', label: 'Serious', color: 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300', description: 'Lost time injury' },
  { value: 'CRITICAL', label: 'Critical', color: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300', description: 'Hospitalization or fatality' },
]

export default function NewIncidentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [projects, setProjects] = useState<Project[]>([])

  // Form state
  const [projectId, setProjectId] = useState('')
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0])
  const [incidentTime, setIncidentTime] = useState('')
  const [location, setLocation] = useState('')
  const [incidentType, setIncidentType] = useState('')
  const [severity, setSeverity] = useState('')
  const [description, setDescription] = useState('')
  const [rootCause, setRootCause] = useState('')
  const [immediateActions, setImmediateActions] = useState('')
  const [witnesses, setWitnesses] = useState<string[]>([])
  const [newWitness, setNewWitness] = useState('')
  const [injuredParties, setInjuredParties] = useState<string[]>([])
  const [newInjured, setNewInjured] = useState('')

  useEffect(() => {
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

  const addWitness = () => {
    if (newWitness.trim()) {
      setWitnesses(prev => [...prev, newWitness.trim()])
      setNewWitness('')
    }
  }

  const removeWitness = (index: number) => {
    setWitnesses(prev => prev.filter((_, i) => i !== index))
  }

  const addInjured = () => {
    if (newInjured.trim()) {
      setInjuredParties(prev => [...prev, newInjured.trim()])
      setNewInjured('')
    }
  }

  const removeInjured = (index: number) => {
    setInjuredParties(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!projectId || !incidentDate || !location || !incidentType || !severity || !description) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/safety/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          incidentDate,
          incidentTime: incidentTime || undefined,
          location,
          incidentType,
          severity,
          description,
          rootCause: rootCause || undefined,
          immediateActions: immediateActions || undefined,
          witnesses: witnesses.length > 0 ? witnesses : undefined,
          injuredParties: injuredParties.length > 0 ? injuredParties : undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create incident report')
      }

      router.push('/safety?tab=incidents')
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Report Incident</h1>
          <p className="text-gray-600 dark:text-gray-400">Document a safety incident, near miss, or property damage</p>
        </div>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-800 dark:text-yellow-300">Important</p>
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              For serious injuries, call 911 first. Document as much detail as possible while it&apos;s fresh.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-4 rounded-xl mb-6 font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Incident Details</h2>
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
              <label htmlFor="location" className="label">Location *</label>
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="input mt-1"
                placeholder="Where did it happen?"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label htmlFor="incidentDate" className="label">Date *</label>
              <input
                id="incidentDate"
                type="date"
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
                className="input mt-1"
                required
              />
            </div>
            <div>
              <label htmlFor="incidentTime" className="label">Time</label>
              <input
                id="incidentTime"
                type="time"
                value={incidentTime}
                onChange={(e) => setIncidentTime(e.target.value)}
                className="input mt-1"
              />
            </div>
          </div>
        </div>

        {/* Incident Type */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Type of Incident *</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {INCIDENT_TYPES.map(type => (
              <button
                key={type.value}
                type="button"
                onClick={() => setIncidentType(type.value)}
                className={`p-4 rounded-xl text-left transition-colors ${
                  incidentType === type.value
                    ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-600 dark:border-blue-500'
                    : 'bg-gray-50 dark:bg-gray-700 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <span className="font-medium text-gray-900 dark:text-gray-100">{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Severity */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Severity *</h2>
          <div className="grid grid-cols-2 gap-3">
            {SEVERITIES.map(sev => (
              <button
                key={sev.value}
                type="button"
                onClick={() => setSeverity(sev.value)}
                className={`p-4 rounded-xl text-left transition-colors ${
                  severity === sev.value
                    ? sev.color + ' border-2 border-gray-400 dark:border-gray-500'
                    : 'bg-gray-50 dark:bg-gray-700 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <span className={`font-medium block ${severity === sev.value ? '' : 'text-gray-900 dark:text-gray-100'}`}>{sev.label}</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">{sev.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">What Happened? *</h2>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input"
            rows={4}
            placeholder="Describe the incident in detail..."
            required
          />

          <div className="mt-4">
            <label htmlFor="rootCause" className="label">Root Cause (if known)</label>
            <textarea
              id="rootCause"
              value={rootCause}
              onChange={(e) => setRootCause(e.target.value)}
              className="input mt-1"
              rows={2}
              placeholder="What caused the incident?"
            />
          </div>

          <div className="mt-4">
            <label htmlFor="immediateActions" className="label">Immediate Actions Taken</label>
            <textarea
              id="immediateActions"
              value={immediateActions}
              onChange={(e) => setImmediateActions(e.target.value)}
              className="input mt-1"
              rows={2}
              placeholder="What was done immediately after the incident?"
            />
          </div>
        </div>

        {/* People Involved */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">People Involved</h2>

          {/* Injured Parties */}
          {(incidentType === 'INJURY' || injuredParties.length > 0) && (
            <div className="mb-4">
              <label className="label">Injured Parties</label>
              <div className="flex gap-2 mt-1">
                <input
                  type="text"
                  value={newInjured}
                  onChange={(e) => setNewInjured(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInjured())}
                  className="input flex-1"
                  placeholder="Name of injured person..."
                />
                <button type="button" onClick={addInjured} className="btn btn-outline px-4">
                  <Plus className="h-5 w-5" />
                </button>
              </div>
              {injuredParties.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {injuredParties.map((person, i) => (
                    <li key={i} className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/30 rounded-lg">
                      <span className="flex-1 text-gray-900 dark:text-gray-100">{person}</span>
                      <button type="button" onClick={() => removeInjured(i)} className="text-gray-400 hover:text-red-500">
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Witnesses */}
          <div>
            <label className="label">Witnesses</label>
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                value={newWitness}
                onChange={(e) => setNewWitness(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addWitness())}
                className="input flex-1"
                placeholder="Name of witness..."
              />
              <button type="button" onClick={addWitness} className="btn btn-outline px-4">
                <Plus className="h-5 w-5" />
              </button>
            </div>
            {witnesses.length > 0 && (
              <ul className="mt-2 space-y-1">
                {witnesses.map((witness, i) => (
                  <li key={i} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="flex-1 text-gray-900 dark:text-gray-100">{witness}</span>
                    <button type="button" onClick={() => removeWitness(i)} className="text-gray-400 hover:text-red-500">
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
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
              'Submit Report'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
