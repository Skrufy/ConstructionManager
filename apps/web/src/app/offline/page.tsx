'use client'

import { WifiOff, RefreshCw, Clock, FileText, MapPin } from 'lucide-react'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-yellow-100 p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
          <WifiOff className="h-10 w-10 text-yellow-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">You're Offline</h1>
        <p className="text-gray-600 mb-8">
          Don't worry! You can still access some features while offline.
        </p>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Available Offline</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-left">
              <div className="bg-green-100 p-2 rounded-lg">
                <FileText className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Create Daily Logs</p>
                <p className="text-sm text-gray-500">Will sync when back online</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-left">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Track Time</p>
                <p className="text-sm text-gray-500">Clock in/out saved locally</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-left">
              <div className="bg-purple-100 p-2 rounded-lg">
                <MapPin className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">GPS Tagged Photos</p>
                <p className="text-sm text-gray-500">Take photos with location data</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-blue-700 mb-2">
            <RefreshCw className="h-4 w-4" />
            <span className="font-medium">Auto-Sync Enabled</span>
          </div>
          <p className="text-sm text-blue-600">
            Your data will automatically sync once you're back online. No action needed!
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-gray-900 text-white px-4 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="h-5 w-5" />
            Try Again
          </button>
          <button
            onClick={() => window.history.back()}
            className="w-full bg-white text-gray-700 px-4 py-3 rounded-lg font-medium border hover:bg-gray-50 transition-colors"
          >
            Go Back
          </button>
        </div>

        <p className="text-sm text-gray-500 mt-8">
          Last synced: Check your connection and try again
        </p>
      </div>
    </div>
  )
}
