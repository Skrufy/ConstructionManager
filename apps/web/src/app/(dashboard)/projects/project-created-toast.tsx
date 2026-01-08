'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, X } from 'lucide-react'

export function ProjectCreatedToast() {
  const searchParams = useSearchParams()
  const [showToast, setShowToast] = useState(false)
  const [projectName, setProjectName] = useState('')

  useEffect(() => {
    const created = searchParams.get('created')
    if (created) {
      setProjectName(created)
      setShowToast(true)

      // Clear the URL parameter without a full page reload
      const url = new URL(window.location.href)
      url.searchParams.delete('created')
      window.history.replaceState({}, '', url.pathname)

      // Auto-hide after 5 seconds
      const timer = setTimeout(() => setShowToast(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [searchParams])

  if (!showToast) return null

  return (
    <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-right duration-300">
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 shadow-lg flex items-center gap-3 max-w-md">
        <div className="p-2 bg-green-100 rounded-full">
          <CheckCircle className="h-5 w-5 text-green-600" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-green-800">Project Created!</p>
          <p className="text-sm text-green-600">"{projectName}" has been added to your projects.</p>
        </div>
        <button
          onClick={() => setShowToast(false)}
          className="p-1 hover:bg-green-100 rounded-lg transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4 text-green-600" />
        </button>
      </div>
    </div>
  )
}
