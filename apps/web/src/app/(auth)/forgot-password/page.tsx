'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Building2, Loader2, ArrowLeft, CheckCircle } from 'lucide-react'
import { createBrowserSupabaseClient } from '@/lib/supabase-client'
import { useBranding } from '@/hooks/use-branding'

export default function ForgotPasswordPage() {
  const { branding } = useBranding()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  // Create supabase client lazily - only on client side
  const supabase = useMemo(() => {
    if (typeof window === 'undefined') return null
    return createBrowserSupabaseClient()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setLoading(true)
    setError('')

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (resetError) {
        throw resetError
      }

      setSuccess(true)
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
          </div>

          <div className="bg-green-50 rounded-lg p-6">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Check your email
            </h2>
            <p className="text-gray-600">
              We&apos;ve sent a password reset link to <strong>{email}</strong>.
              Please check your inbox and follow the instructions to reset your password.
            </p>
          </div>

          <Link
            href="/login"
            className="inline-flex items-center text-primary-600 hover:text-primary-500"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to sign in
          </Link>
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
            Reset your password
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="label">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input mt-1"
              placeholder="you@company.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full py-3 text-base"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                Sending reset link...
              </>
            ) : (
              'Send reset link'
            )}
          </button>

          <div className="text-center">
            <Link
              href="/login"
              className="inline-flex items-center text-sm text-primary-600 hover:text-primary-500"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
