'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Loader2, CheckCircle } from 'lucide-react'
import { createBrowserSupabaseClient } from '@/lib/supabase-client'
import { useBranding } from '@/hooks/use-branding'

export default function ResetPasswordPage() {
  const router = useRouter()
  const { branding } = useBranding()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [hasSession, setHasSession] = useState(false)

  // Create supabase client lazily - only on client side
  const supabase = useMemo(() => {
    if (typeof window === 'undefined') return null
    return createBrowserSupabaseClient()
  }, [])

  useEffect(() => {
    if (!supabase) return

    // Check if user has a valid reset session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setHasSession(true)
      }
    }
    checkSession()

    // Listen for auth events (Supabase sends PASSWORD_RECOVERY event)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === 'PASSWORD_RECOVERY') {
        setHasSession(true)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setLoading(true)
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      setLoading(false)
      return
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })

      if (updateError) {
        throw updateError
      }

      setSuccess(true)

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 2000)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An unexpected error occurred')
      }
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div>
            <Link href="/" className="flex items-center justify-center gap-3">
              {branding.companyLogo ? (
                <Image
                  src={branding.companyLogo}
                  alt={branding.companyName}
                  width={160}
                  height={48}
                  className="h-12 w-auto object-contain"
                />
              ) : (
                <>
                  <Image
                    src="/icon.png"
                    alt="Duggin Construction Co"
                    width={48}
                    height={48}
                    className="rounded-lg"
                  />
                  <span className="text-2xl font-bold text-gray-900">Duggin Construction Co</span>
                </>
              )}
            </Link>
          </div>

          <div className="bg-green-50 rounded-lg p-6">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Password updated!
            </h2>
            <p className="text-gray-600">
              Your password has been successfully reset. Redirecting you to the dashboard...
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!hasSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div>
            <Link href="/" className="flex items-center justify-center gap-3">
              {branding.companyLogo ? (
                <Image
                  src={branding.companyLogo}
                  alt={branding.companyName}
                  width={160}
                  height={48}
                  className="h-12 w-auto object-contain"
                />
              ) : (
                <>
                  <Image
                    src="/icon.png"
                    alt="Duggin Construction Co"
                    width={48}
                    height={48}
                    className="rounded-lg"
                  />
                  <span className="text-2xl font-bold text-gray-900">Duggin Construction Co</span>
                </>
              )}
            </Link>
          </div>

          <div className="bg-yellow-50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Invalid or expired link
            </h2>
            <p className="text-gray-600 mb-4">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <Link
              href="/forgot-password"
              className="btn btn-primary"
            >
              Request new reset link
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link href="/" className="flex items-center justify-center gap-2">
            {branding.companyLogo ? (
              <Image
                src={branding.companyLogo}
                alt={branding.companyName}
                width={160}
                height={48}
                className="h-12 w-auto object-contain"
              />
            ) : (
              <>
                <Building2 className="h-10 w-10 text-primary-600" />
                <span className="text-2xl font-bold text-gray-900">{branding.companyName}</span>
              </>
            )}
          </Link>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Set new password
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your new password below.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="password" className="label">
                New Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input mt-1"
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="label">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input mt-1"
                placeholder="Confirm your new password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full py-3 text-base"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                Updating password...
              </>
            ) : (
              'Update password'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
