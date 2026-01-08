'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Truck,
  Plus,
  MapPin,
  Wrench,
  Fuel,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
} from 'lucide-react'

interface Equipment {
  id: string
  name: string
  type: string
  status: string
  currentLat: number | null
  currentLng: number | null
  lastUpdated: string | null
  _count?: {
    assignments: number
  }
}

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newEquipment, setNewEquipment] = useState({ name: '', type: '' })
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    fetchEquipment()
  }, [])

  const fetchEquipment = async () => {
    try {
      const response = await fetch('/api/equipment')
      const data = await response.json()
      setEquipment(data.equipment || [])
    } catch (error) {
      console.error('Error fetching equipment:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddEquipment = async () => {
    if (!newEquipment.name || !newEquipment.type) return
    setAdding(true)

    try {
      const response = await fetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEquipment),
      })

      if (response.ok) {
        await fetchEquipment()
        setShowAddModal(false)
        setNewEquipment({ name: '', type: '' })
      }
    } catch (error) {
      console.error('Error adding equipment:', error)
    } finally {
      setAdding(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'IN_USE':
        return <Clock className="h-5 w-5 text-blue-500" />
      case 'MAINTENANCE':
        return <Wrench className="h-5 w-5 text-yellow-500" />
      case 'OUT_OF_SERVICE':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500 dark:text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
      case 'IN_USE':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
      case 'MAINTENANCE':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
      case 'OUT_OF_SERVICE':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
    }
  }

  const equipmentTypes = [
    'Excavator',
    'Bulldozer',
    'Crane',
    'Loader',
    'Dump Truck',
    'Backhoe',
    'Forklift',
    'Concrete Mixer',
    'Generator',
    'Compressor',
    'Scaffolding',
    'Other',
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Equipment</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your construction equipment fleet</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary px-4 py-2 flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Add Equipment
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {equipment.filter((e) => e.status === 'AVAILABLE').length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Available</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {equipment.filter((e) => e.status === 'IN_USE').length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">In Use</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded-lg">
              <Wrench className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {equipment.filter((e) => e.status === 'MAINTENANCE').length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Maintenance</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">
              <Truck className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{equipment.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
            </div>
          </div>
        </div>
      </div>

      {/* Equipment Grid */}
      {equipment.length === 0 ? (
        <div className="card p-12 text-center">
          <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No equipment registered
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Add your first piece of equipment to start tracking
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary px-4 py-2 inline-flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Add Equipment
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {equipment.map((item) => (
            <div key={item.id} className="card p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                    <Truck className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{item.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{item.type}</p>
                  </div>
                </div>
                {getStatusIcon(item.status)}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(item.status)}`}>
                    {item.status.replace('_', ' ')}
                  </span>
                </div>

                {item.currentLat && item.currentLng && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {item.currentLat.toFixed(4)}, {item.currentLng.toFixed(4)}
                    </span>
                  </div>
                )}

                {item.lastUpdated && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Last updated: {new Date(item.lastUpdated).toLocaleDateString()}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t dark:border-gray-700 flex gap-2">
                <Link href={`/equipment/${item.id}`} className="btn btn-outline flex-1 py-2 text-sm text-center">
                  View Details
                </Link>
                <Link href={`/equipment/${item.id}`} className="btn btn-ghost py-2 px-3">
                  <Wrench className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Samsara Integration Notice */}
      <div className="card p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-4">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
            <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100">Samsara Integration</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Connect your Samsara account to automatically track equipment location,
              usage hours, and fuel consumption in real-time.
            </p>
            <button className="btn btn-outline mt-3 px-4 py-2 text-sm border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30">
              Configure Integration
            </button>
          </div>
        </div>
      </div>

      {/* Add Equipment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Add New Equipment
            </h2>
            <div className="space-y-4">
              <div>
                <label className="label">Equipment Name *</label>
                <input
                  type="text"
                  value={newEquipment.name}
                  onChange={(e) =>
                    setNewEquipment((p) => ({ ...p, name: e.target.value }))
                  }
                  className="input mt-1"
                  placeholder="e.g., CAT 320 Excavator"
                />
              </div>
              <div>
                <label className="label">Equipment Type *</label>
                <select
                  value={newEquipment.type}
                  onChange={(e) =>
                    setNewEquipment((p) => ({ ...p, type: e.target.value }))
                  }
                  className="input mt-1"
                >
                  <option value="">Select type...</option>
                  {equipmentTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="btn btn-outline flex-1 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleAddEquipment}
                disabled={adding || !newEquipment.name || !newEquipment.type}
                className="btn btn-primary flex-1 py-2"
              >
                {adding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Add Equipment'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
