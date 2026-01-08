'use client'

import { useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { useSettings } from '@/components/providers/settings-provider'
import {
  User,
  Mail,
  Phone,
  Shield,
  Bell,
  Palette,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
} from 'lucide-react'
import { Toggle } from '@/components/ui/toggle'

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession()
  const { company, user: userPrefs, updateUserPreferences, loading: prefsLoading } = useSettings()

  // Track user edits - only store what the user has explicitly changed
  const [profileEdits, setProfileEdits] = useState<{ name?: string; phone?: string }>({})
  const [prefsEdits, setPrefsEdits] = useState<{
    theme?: 'light' | 'dark' | 'system'
    emailDailyDigest?: boolean
    emailApprovals?: boolean
    emailCertExpiry?: boolean
    pushEnabled?: boolean
  }>({})

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })

  // UI state
  const [saving, setSaving] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Derive form values from session/settings with user edits taking precedence
  // NO useEffect needed - values are computed directly on each render
  const profileForm = {
    name: profileEdits.name ?? session?.user?.name ?? '',
    phone: profileEdits.phone ?? (session?.user as { phone?: string } | undefined)?.phone ?? '',
  }

  const prefsForm = {
    theme: prefsEdits.theme ?? (userPrefs?.theme as 'light' | 'dark' | 'system') ?? 'system',
    emailDailyDigest: prefsEdits.emailDailyDigest ?? userPrefs?.emailDailyDigest ?? true,
    emailApprovals: prefsEdits.emailApprovals ?? userPrefs?.emailApprovals ?? true,
    emailCertExpiry: prefsEdits.emailCertExpiry ?? userPrefs?.emailCertExpiry ?? true,
    pushEnabled: prefsEdits.pushEnabled ?? userPrefs?.pushEnabled ?? true,
  }

  // Update handlers that track edits
  const setProfileForm = (updates: { name?: string; phone?: string } | ((prev: typeof profileForm) => { name: string; phone: string })) => {
    if (typeof updates === 'function') {
      const newValues = updates(profileForm)
      setProfileEdits(prev => ({ ...prev, ...newValues }))
    } else {
      setProfileEdits(prev => ({ ...prev, ...updates }))
    }
  }

  const setPrefsForm = (updates: Partial<typeof prefsForm> | ((prev: typeof prefsForm) => typeof prefsForm)) => {
    if (typeof updates === 'function') {
      const newValues = updates(prefsForm)
      setPrefsEdits(prev => ({ ...prev, ...newValues }))
    } else {
      setPrefsEdits(prev => ({ ...prev, ...updates }))
    }
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  // Save profile
  const handleSaveProfile = async () => {
    if (!profileForm.name.trim()) {
      showMessage('error', 'Name is required')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileForm.name.trim(),
          phone: profileForm.phone.trim() || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update profile')
      }

      // Update session and clear edits
      await updateSession({ name: profileForm.name.trim() })
      setProfileEdits({}) // Clear edits after successful save
      showMessage('success', 'Profile updated successfully')
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  // Change password
  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      showMessage('error', 'All password fields are required')
      return
    }

    if (passwordForm.newPassword.length < 8) {
      showMessage('error', 'New password must be at least 8 characters')
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showMessage('error', 'New passwords do not match')
      return
    }

    setSavingPassword(true)
    try {
      const res = await fetch('/api/users/me/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to change password')
      }

      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      showMessage('success', 'Password changed successfully')
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'Failed to change password')
    } finally {
      setSavingPassword(false)
    }
  }

  // Save preferences
  const handleSavePreferences = async () => {
    setSavingPrefs(true)
    try {
      await updateUserPreferences(prefsForm)
      setPrefsEdits({}) // Clear edits after successful save
      showMessage('success', 'Preferences saved successfully')
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'Failed to save preferences')
    } finally {
      setSavingPrefs(false)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400'
      case 'PROJECT_MANAGER':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
      case 'SUPERINTENDENT':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
    }
  }

  const formatRole = (role: string) => {
    return role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center">
            <User className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{session.user?.name}</h1>
            <p className="text-primary-100">{session.user?.email}</p>
            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor((session.user as { role?: string }).role || 'FIELD_WORKER')}`}>
              {formatRole((session.user as { role?: string }).role || 'FIELD_WORKER')}
            </span>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${
          message.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-800'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
          )}
          <p className="font-medium">{message.text}</p>
        </div>
      )}

      {/* Profile Information */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-primary-600" />
          Profile Information
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={profileForm.name}
              onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
              className="input"
              placeholder="Enter your name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                value={session.user?.email || ''}
                disabled
                className="input pl-12 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Contact an administrator to change your email</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="tel"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                className="input pl-12"
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="btn btn-primary w-full flex items-center justify-center gap-2"
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>

      {/* Change Password */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary-600" />
          Change Password
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.current ? 'text' : 'password'}
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className="input pr-12"
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPasswords.current ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.new ? 'text' : 'password'}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="input pr-12"
                placeholder="Enter new password (min 8 characters)"
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPasswords.new ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="input pr-12"
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPasswords.confirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <button
            onClick={handleChangePassword}
            disabled={savingPassword}
            className="btn btn-outline w-full flex items-center justify-center gap-2"
          >
            {savingPassword ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Shield className="h-5 w-5" />
            )}
            {savingPassword ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </div>

      {/* Preferences */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary-600" />
          Notification Preferences
        </h2>

        <div className="space-y-4">
          <Toggle
            checked={prefsForm.emailDailyDigest}
            onChange={(checked) => setPrefsForm({ ...prefsForm, emailDailyDigest: checked })}
            label="Daily Digest Email"
            description="Receive a daily summary of activity"
          />

          <Toggle
            checked={prefsForm.emailApprovals}
            onChange={(checked) => setPrefsForm({ ...prefsForm, emailApprovals: checked })}
            label="Approval Notifications"
            description="Get notified when items need your approval"
          />

          {/* Only show certification alerts if user has access to certifications module */}
          {(() => {
            const userRole = session?.user?.role || 'VIEWER'
            const globalEnabled = company?.moduleCertifications ?? true
            if (!globalEnabled) return null

            const roleOverrides = (company?.roleModuleOverrides as Record<string, Record<string, boolean>> | null) ?? {}
            const userOverrides = roleOverrides[userRole]
            if (userOverrides && 'moduleCertifications' in userOverrides) {
              if (!userOverrides.moduleCertifications) return null
            }

            return (
              <Toggle
                checked={prefsForm.emailCertExpiry}
                onChange={(checked) => setPrefsForm({ ...prefsForm, emailCertExpiry: checked })}
                label="Certification Expiry Alerts"
                description="Get reminded before certifications expire"
              />
            )
          })()}

          <Toggle
            checked={prefsForm.pushEnabled}
            onChange={(checked) => setPrefsForm({ ...prefsForm, pushEnabled: checked })}
            label="Push Notifications"
            description="Receive push notifications on your device"
          />
        </div>

        <div className="mt-6 pt-4 border-t dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Appearance
          </h3>
          <div className="flex gap-3">
            {(['light', 'dark', 'system'] as const).map((theme) => (
              <button
                key={theme}
                onClick={() => setPrefsForm({ ...prefsForm, theme })}
                className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all ${
                  prefsForm.theme === theme
                    ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                }`}
              >
                {theme.charAt(0).toUpperCase() + theme.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSavePreferences}
          disabled={savingPrefs || prefsLoading}
          className="btn btn-primary w-full mt-6 flex items-center justify-center gap-2"
        >
          {savingPrefs ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Save className="h-5 w-5" />
          )}
          {savingPrefs ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  )
}
