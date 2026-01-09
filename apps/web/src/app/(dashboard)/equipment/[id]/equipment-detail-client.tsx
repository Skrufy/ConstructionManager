'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Truck,
  Wrench,
  Plus,
  Trash2,
  DollarSign,
  Calendar,
  Gauge,
  User,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { getEquipmentStatusColor } from '@/lib/status-colors'

interface Equipment {
  id: string
  name: string
  type: string
  status: string
  samsaraId: string | null
  lastUpdated: string | null
}

interface ServiceLog {
  id: string
  service_type: string
  date: string
  meter_reading: number | null
  cost: number | null
  parts_used: string | null
  technician: string | null
  notes: string | null
  next_service_due: string | null
  next_service_hours: number | null
}

const SERVICE_TYPES = [
  { value: 'OIL_CHANGE', label: 'Oil Change' },
  { value: 'FILTER_REPLACEMENT', label: 'Filter Replacement' },
  { value: 'INSPECTION', label: 'Inspection' },
  { value: 'REPAIR', label: 'Repair' },
  { value: 'TIRE_SERVICE', label: 'Tire Service' },
  { value: 'BRAKE_SERVICE', label: 'Brake Service' },
  { value: 'HYDRAULIC_SERVICE', label: 'Hydraulic Service' },
  { value: 'ELECTRICAL', label: 'Electrical' },
  { value: 'SCHEDULED_MAINTENANCE', label: 'Scheduled Maintenance' },
  { value: 'OTHER', label: 'Other' },
]

interface EquipmentDetailClientProps {
  equipmentId: string
}

export function EquipmentDetailClient({ equipmentId }: EquipmentDetailClientProps) {
  const [equipment, setEquipment] = useState<Equipment | null>(null)
  const [logs, setLogs] = useState<ServiceLog[]>([])
  const [loading, setLoading] = useState(true)
  const [logsLoading, setLogsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const [form, setForm] = useState({
    service_type: '',
    date: new Date().toISOString().split('T')[0],
    meter_reading: '',
    cost: '',
    parts_used: '',
    technician: '',
    notes: '',
    next_service_due: '',
    next_service_hours: '',
  })

  useEffect(() => {
    if (equipmentId) {
      fetchEquipment()
      fetchLogs()
    }
  }, [equipmentId])

  const fetchEquipment = async () => {
    try {
      const res = await fetch(`/api/equipment/${equipmentId}`)
      if (!res.ok) {
        setError(res.status === 404 ? 'Equipment not found' : 'Failed to load equipment')
        return
      }
      const data = await res.json()
      setEquipment(data.equipment)
    } catch {
      setError('Failed to load equipment')
    } finally {
      setLoading(false)
    }
  }

  const fetchLogs = async () => {
    setLogsLoading(true)
    try {
      const res = await fetch(`/api/equipment/${equipmentId}/service-logs`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.service_logs || [])
      }
    } catch (e) {
      console.error('Error fetching logs:', e)
    } finally {
      setLogsLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!form.service_type || !form.date) return
    setSaving(true)

    try {
      const body: Record<string, unknown> = {
        service_type: form.service_type,
        date: new Date(form.date).toISOString(),
      }
      if (form.meter_reading) body.meter_reading = parseFloat(form.meter_reading)
      if (form.cost) body.cost = parseFloat(form.cost)
      if (form.parts_used) body.parts_used = form.parts_used
      if (form.technician) body.technician = form.technician
      if (form.notes) body.notes = form.notes
      if (form.next_service_due) body.next_service_due = new Date(form.next_service_due).toISOString()
      if (form.next_service_hours) body.next_service_hours = parseFloat(form.next_service_hours)

      const res = await fetch(`/api/equipment/${equipmentId}/service-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        await fetchLogs()
        setShowModal(false)
        setForm({
          service_type: '',
          date: new Date().toISOString().split('T')[0],
          meter_reading: '',
          cost: '',
          parts_used: '',
          technician: '',
          notes: '',
          next_service_due: '',
          next_service_hours: '',
        })
      }
    } catch (e) {
      console.error('Error saving:', e)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (logId: string) => {
    try {
      const res = await fetch(`/api/equipment/${equipmentId}/service-logs/${logId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setLogs(prev => prev.filter(l => l.id !== logId))
        setDeleteConfirm(null)
      }
    } catch (e) {
      console.error('Error deleting:', e)
    }
  }

  const getTypeLabel = (type: string) => SERVICE_TYPES.find(t => t.value === type)?.label || type.replace(/_/g, ' ')

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'OIL_CHANGE':
      case 'FILTER_REPLACEMENT': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
      case 'INSPECTION':
      case 'SCHEDULED_MAINTENANCE': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
      case 'REPAIR': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (error || !equipment) {
    return (
      <div className="space-y-6">
        <Link href="/equipment" className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
          <ArrowLeft className="h-4 w-4" /> Back to Equipment
        </Link>
        <div className="card p-12 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">{error || 'Equipment not found'}</h3>
          <p className="text-gray-600 dark:text-gray-400">The equipment does not exist or you do not have permission to view it.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/equipment" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
              <Truck className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{equipment.name}</h1>
              <p className="text-gray-600 dark:text-gray-400">{equipment.type}</p>
            </div>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getEquipmentStatusColor(equipment.status)}`}>
          {equipment.status.replace('_', ' ')}
        </span>
      </div>

      {/* Equipment Info */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Equipment Details</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Type</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">{equipment.type}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">{equipment.status.replace('_', ' ')}</p>
          </div>
          {equipment.samsaraId && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Samsara ID</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">{equipment.samsaraId}</p>
            </div>
          )}
          {equipment.lastUpdated && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Last Updated</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">{new Date(equipment.lastUpdated).toLocaleDateString()}</p>
            </div>
          )}
        </div>
      </div>

      {/* Service Logs */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Service History</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Maintenance records</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn btn-primary px-4 py-2 flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Service Log
          </button>
        </div>

        {logsLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary-600" /></div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8">
            <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">No service records yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map(log => (
              <div key={log.id} className="border dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">
                      <Wrench className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(log.service_type)}`}>{getTypeLabel(log.service_type)}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">{new Date(log.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 mt-2">
                        {log.technician && <div className="flex items-center gap-1"><User className="h-4 w-4" /><span>{log.technician}</span></div>}
                        {log.meter_reading !== null && <div className="flex items-center gap-1"><Gauge className="h-4 w-4" /><span>{log.meter_reading.toLocaleString()} hrs</span></div>}
                        {log.cost !== null && <div className="flex items-center gap-1"><DollarSign className="h-4 w-4" /><span>${log.cost.toLocaleString()}</span></div>}
                        {log.next_service_due && <div className="flex items-center gap-1"><Calendar className="h-4 w-4" /><span>Next: {new Date(log.next_service_due).toLocaleDateString()}</span></div>}
                      </div>
                      {log.notes && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{log.notes}</p>}
                      {log.parts_used && <p className="text-sm text-gray-500 mt-1">Parts: {log.parts_used}</p>}
                    </div>
                  </div>
                  <div>
                    {deleteConfirm === log.id ? (
                      <div className="flex gap-2">
                        <button onClick={() => handleDelete(log.id)} className="text-red-600 text-sm font-medium">Confirm</button>
                        <button onClick={() => setDeleteConfirm(null)} className="text-gray-500 text-sm">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirm(log.id)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Add Service Log</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Service Type *</label>
                <select value={form.service_type} onChange={e => setForm(p => ({ ...p, service_type: e.target.value }))} className="input mt-1">
                  <option value="">Select type...</option>
                  {SERVICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Date *</label>
                <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="input mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Meter Reading (hrs)</label>
                  <input type="number" value={form.meter_reading} onChange={e => setForm(p => ({ ...p, meter_reading: e.target.value }))} className="input mt-1" placeholder="1500" />
                </div>
                <div>
                  <label className="label">Cost ($)</label>
                  <input type="number" value={form.cost} onChange={e => setForm(p => ({ ...p, cost: e.target.value }))} className="input mt-1" placeholder="250" />
                </div>
              </div>
              <div>
                <label className="label">Technician</label>
                <input type="text" value={form.technician} onChange={e => setForm(p => ({ ...p, technician: e.target.value }))} className="input mt-1" />
              </div>
              <div>
                <label className="label">Parts Used</label>
                <input type="text" value={form.parts_used} onChange={e => setForm(p => ({ ...p, parts_used: e.target.value }))} className="input mt-1" />
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="input mt-1" rows={3} />
              </div>
              <div className="border-t dark:border-gray-700 pt-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Next Service (Optional)</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Next Date</label>
                    <input type="date" value={form.next_service_due} onChange={e => setForm(p => ({ ...p, next_service_due: e.target.value }))} className="input mt-1" />
                  </div>
                  <div>
                    <label className="label">At Hours</label>
                    <input type="number" value={form.next_service_hours} onChange={e => setForm(p => ({ ...p, next_service_hours: e.target.value }))} className="input mt-1" />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn btn-outline flex-1 py-2">Cancel</button>
              <button onClick={handleSubmit} disabled={saving || !form.service_type || !form.date} className="btn btn-primary flex-1 py-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Service Log'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
