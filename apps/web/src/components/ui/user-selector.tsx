'use client'

import { useState, useEffect } from 'react'
import { Search, X, Check, User, Loader2 } from 'lucide-react'

interface UserOption {
  id: string
  name: string
  email: string
  role: string
}

interface UserSelectorProps {
  selectedUserIds: string[]
  onChange: (userIds: string[]) => void
  excludeUserId?: string // User ID to exclude from the list (e.g., current user)
  label?: string
  description?: string
}

export function UserSelector({
  selectedUserIds,
  onChange,
  excludeUserId,
  label = 'Assigned Users',
  description,
}: UserSelectorProps) {
  const [users, setUsers] = useState<UserOption[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/users')
        if (res.ok) {
          const data = await res.json()
          // API returns array directly or wrapped in users property
          const userList = Array.isArray(data) ? data : (data.users || [])
          setUsers(userList)
        }
      } catch (error) {
        console.error('Failed to fetch users:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [])

  const filteredUsers = users.filter(user => {
    if (excludeUserId && user.id === excludeUserId) return false
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query)
    )
  })

  const selectedUsers = users.filter(u => selectedUserIds.includes(u.id))

  const toggleUser = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      onChange(selectedUserIds.filter(id => id !== userId))
    } else {
      onChange([...selectedUserIds, userId])
    }
  }

  const removeUser = (userId: string) => {
    onChange(selectedUserIds.filter(id => id !== userId))
  }

  const formatRole = (role: string) => {
    return role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-700'
      case 'PROJECT_MANAGER':
        return 'bg-blue-100 text-blue-700'
      case 'SUPERINTENDENT':
        return 'bg-green-100 text-green-700'
      case 'MECHANIC':
        return 'bg-orange-100 text-orange-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
      )}

      {/* Selected users display */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
          {selectedUsers.map(user => (
            <div
              key={user.id}
              className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-200 shadow-sm"
            >
              <div className="h-6 w-6 rounded-full bg-primary-100 flex items-center justify-center">
                <User className="h-3 w-3 text-primary-600" />
              </div>
              <span className="text-sm font-medium">{user.name}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${getRoleBadgeColor(user.role)}`}>
                {formatRole(user.role)}
              </span>
              <button
                type="button"
                onClick={() => removeUser(user.id)}
                className="p-0.5 hover:bg-gray-100 rounded"
              >
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search and dropdown */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder="Search users to add..."
            className="input pl-12"
          />
        </div>

        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <div className="absolute z-20 w-full mt-2 bg-white rounded-xl shadow-lg border border-gray-200 max-h-64 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-gray-400" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No users found
                </div>
              ) : (
                <div className="py-1">
                  {filteredUsers.map(user => {
                    const isSelected = selectedUserIds.includes(user.id)
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => toggleUser(user.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                          isSelected ? 'bg-primary-50' : ''
                        }`}
                      >
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          isSelected ? 'bg-primary-600 text-white' : 'bg-gray-100'
                        }`}>
                          {isSelected ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <User className="h-4 w-4 text-gray-400 dark:text-gray-300" />
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-medium text-gray-900 dark:text-gray-100">{user.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${getRoleBadgeColor(user.role)}`}>
                          {formatRole(user.role)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        {selectedUserIds.length} user{selectedUserIds.length !== 1 ? 's' : ''} selected
      </p>
    </div>
  )
}
