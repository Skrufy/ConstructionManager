'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from '@/hooks/useSession'
import { useRouter } from 'next/navigation'
import {
  UserPlus,
  Mail,
  Clock,
  Check,
  X,
  AlertCircle,
  Loader2,
  Send,
  Trash2,
  RefreshCw,
  Calendar,
  Users,
  HardHat,
  Briefcase,
  Crown,
  Building2,
  UserCheck,
} from 'lucide-react'

interface Invitation {
  id: string
  email: string
  role: string
  status: string
  message: string | null
  expires_at: string
  accepted_at: string | null
  created_at: string
  updated_at: string
  invited_by: {
    id: string
    name: string
    email: string
  }
}

const ROLES = [
  { value: 'ADMIN', label: 'Administrator', icon: Crown, color: 'red' },
  { value: 'PROJECT_MANAGER', label: 'Project Manager', icon: Briefcase, color: 'purple' },
  { value: 'DEVELOPER', label: 'Developer', icon: Building2, color: 'indigo' },
  { value: 'ARCHITECT', label: 'Architect/Engineer', icon: Briefcase, color: 'cyan' },
  { value: 'FOREMAN', label: 'Foreman', icon: HardHat, color: 'blue' },
  { value: 'CREW_LEADER', label: 'Crew Leader', icon: HardHat, color: 'teal' },
  { value: 'OFFICE', label: 'Office Staff', icon: Building2, color: 'yellow' },
  { value: 'FIELD_WORKER', label: 'Field Worker', icon: HardHat, color: 'green' },
  { value: 'VIEWER', label: 'Viewer', icon: UserCheck, color: 'gray' },
]

const STATUS_FILTERS = [
  { value: '', label: 'All Invitations' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

export default function InvitationsPage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'FIELD_WORKER',
    message: '',
  })
  const [sending, setSending] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const isAdmin = session?.user?.role === 'ADMIN'

  // Redirect non-admins
  useEffect(() => {
    if (sessionStatus === 'authenticated' && !isAdmin) {
      router.push('/dashboard')
    }
  }, [sessionStatus, isAdmin, router])

  const fetchInvitations = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)

      const response = await fetch(`/api/admin/invitations?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch invitations')

      const data = await response.json()
      setInvitations(data.invitations || [])
    } catch (err) {
      console.error('Error fetching invitations:', err)
      setError('Failed to load invitations')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    if (isAdmin) {
      fetchInvitations()
    }
  }, [fetchInvitations, isAdmin])

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteForm.email || !inviteForm.role) return

    setSending(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteForm.email,
          role: inviteForm.role,
          message: inviteForm.message || null,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to send invitation')

      setSuccessMessage(`Invitation sent to ${inviteForm.email}`)
      setTimeout(() => setSuccessMessage(null), 3000)
      setShowInviteModal(false)
      setInviteForm({ email: '', role: 'FIELD_WORKER', message: '' })
      fetchInvitations()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation')
    } finally {
      setSending(false)
    }
  }

  const handleResend = async (id: string) => {
    setActionLoading(id)
    try {
      const response = await fetch(`/api/admin/invitations/${id}/resend`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to resend invitation')

      setSuccessMessage('Invitation resent successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
      fetchInvitations()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend invitation')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancel = async (id: string) => {
    setActionLoading(id)
    try {
      const response = await fetch(`/api/admin/invitations/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to cancel invitation')

      setSuccessMessage('Invitation cancelled')
      setTimeout(() => setSuccessMessage(null), 3000)
      fetchInvitations()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel invitation')
    } finally {
      setActionLoading(null)
    }
  }

  const getRoleConfig = (role: string) => {
    return ROLES.find(r => r.value === role) || ROLES[7]
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
      case 'ACCEPTED':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
      case 'EXPIRED':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
      case 'CANCELLED':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
    }
  }

  const getDaysUntilExpiry = (expiresAt: string) => {
    const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return Math.max(0, days)
  }

  // Stats
  const stats = {
    total: invitations.length,
    pending: invitations.filter(i => i.status === 'PENDING').length,
    accepted: invitations.filter(i => i.status === 'ACCEPTED').length,
    expired: invitations.filter(i => i.status === 'EXPIRED').length,
  }

  if (sessionStatus === 'loading' || (sessionStatus === 'authenticated' && !isAdmin)) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-lg">
                <UserPlus className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold">Invitations</h1>
            </div>
            <p className="text-indigo-100">
              Invite new team members and manage pending invitations
            </p>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 transition-all shadow-lg"
          >
            <Send className="h-5 w-5" />
            Send Invitation
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">
              <Users className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.pending}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
              <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.accepted}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Accepted</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">
              <AlertCircle className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.expired}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Expired</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400 p-4 rounded-xl flex items-center gap-3 border border-red-100 dark:border-red-800">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-400 p-4 rounded-xl flex items-center gap-3 border border-green-100 dark:border-green-800">
          <Check className="h-5 w-5 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-gray-100"
        >
          {STATUS_FILTERS.map((filter) => (
            <option key={filter.value} value={filter.value}>
              {filter.label}
            </option>
          ))}
        </select>
        <button
          onClick={fetchInvitations}
          disabled={loading}
          className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Invitations List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading && invitations.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : invitations.length === 0 ? (
          <div className="text-center py-16">
            <UserPlus className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600 dark:text-gray-400" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No invitations</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {statusFilter ? 'No invitations match this filter' : 'Send your first invitation to grow your team'}
            </p>
            {!statusFilter && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all"
              >
                <Send className="h-5 w-5" />
                Send Invitation
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {invitations.map((invitation) => {
              const roleConfig = getRoleConfig(invitation.role)
              const RoleIcon = roleConfig.icon
              const daysLeft = getDaysUntilExpiry(invitation.expires_at)

              return (
                <div
                  key={invitation.id}
                  className="p-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                        <Mail className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                            {invitation.email}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(invitation.status)}`}>
                            {invitation.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <RoleIcon className="h-4 w-4" />
                            <span>{roleConfig.label}</span>
                          </div>
                          {invitation.status === 'PENDING' && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {daysLeft > 0 ? `${daysLeft} days left` : 'Expires today'}
                              </span>
                            </div>
                          )}
                          <span>
                            Invited by {invitation.invited_by.name}
                          </span>
                        </div>
                        {invitation.message && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 italic">
                            "{invitation.message}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    {invitation.status === 'PENDING' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleResend(invitation.id)}
                          disabled={actionLoading === invitation.id}
                          className="px-3 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg flex items-center gap-1"
                        >
                          {actionLoading === invitation.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                          Resend
                        </button>
                        <button
                          onClick={() => handleCancel(invitation.id)}
                          disabled={actionLoading === invitation.id}
                          className="px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex items-center gap-1"
                        >
                          <Trash2 className="h-4 w-4" />
                          Cancel
                        </button>
                      </div>
                    )}
                    {invitation.status === 'EXPIRED' && (
                      <button
                        onClick={() => handleResend(invitation.id)}
                        disabled={actionLoading === invitation.id}
                        className="px-3 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg flex items-center gap-1"
                      >
                        {actionLoading === invitation.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        Resend
                      </button>
                    )}
                    {invitation.status === 'ACCEPTED' && (
                      <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                        <Check className="h-4 w-4" />
                        Joined {new Date(invitation.accepted_at!).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Send Invitation Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 py-8">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowInviteModal(false)}
            />
            <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Send className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Send Invitation</h3>
                      <p className="text-indigo-200 text-sm">Invite a new team member</p>
                    </div>
                  </div>
                  <button onClick={() => setShowInviteModal(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSendInvitation} className="p-6 space-y-5">
                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      required
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                      placeholder="colleague@company.com"
                    />
                  </div>
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Role *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {ROLES.map((role) => {
                      const RoleIcon = role.icon
                      const isSelected = inviteForm.role === role.value
                      const colorClasses = {
                        red: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', border: 'border-red-400', ring: 'ring-red-200' },
                        purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-400', ring: 'ring-purple-200' },
                        indigo: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-400', border: 'border-indigo-400', ring: 'ring-indigo-200' },
                        cyan: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-400', border: 'border-cyan-400', ring: 'ring-cyan-200' },
                        blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-400', ring: 'ring-blue-200' },
                        teal: { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-400', border: 'border-teal-400', ring: 'ring-teal-200' },
                        yellow: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-400', ring: 'ring-yellow-200' },
                        green: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', border: 'border-green-400', ring: 'ring-green-200' },
                        gray: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-400', ring: 'ring-gray-200' },
                      }
                      const colors = colorClasses[role.color as keyof typeof colorClasses]

                      return (
                        <button
                          key={role.value}
                          type="button"
                          onClick={() => setInviteForm({ ...inviteForm, role: role.value })}
                          className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${
                            isSelected
                              ? `${colors.bg} ${colors.border} ring-2 ${colors.ring}`
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                          }`}
                        >
                          <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-white/50 dark:bg-white/10' : colors.bg}`}>
                            <RoleIcon className={`h-4 w-4 ${colors.text}`} />
                          </div>
                          <span className={`font-medium text-sm ${isSelected ? colors.text : 'text-gray-700 dark:text-gray-300'}`}>
                            {role.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Personal Message <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <textarea
                    value={inviteForm.message}
                    onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                    rows={3}
                    placeholder="Add a personal message to the invitation..."
                  />
                </div>

                {/* Info */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    The invitation will be valid for <strong>7 days</strong>. The recipient will receive an email with a link to create their account.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="flex-1 px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sending || !inviteForm.email}
                    className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5" />
                        Send Invitation
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
