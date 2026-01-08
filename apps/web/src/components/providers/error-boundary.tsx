'use client'

import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error) {
    // Log all errors for debugging
    console.error('Error caught by boundary:', error)

    // TEMPORARILY DISABLED: Auto-refresh was causing loops
    // Check if this is the webpack HMR error
    // if (
    //   error.message?.includes("Cannot read properties of undefined (reading 'call')") ||
    //   error.message?.includes('options.factory')
    // ) {
    //   // Auto-refresh for webpack chunk loading errors
    //   console.log('Webpack chunk error detected, refreshing...')
    //   window.location.reload()
    //   return
    // }
  }

  render() {
    if (this.state.hasError) {
      // Check if it's the webpack error - show nothing while refreshing
      if (
        this.state.error?.message?.includes("Cannot read properties of undefined (reading 'call')") ||
        this.state.error?.message?.includes('options.factory')
      ) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading...</p>
            </div>
          </div>
        )
      }

      // Generic error UI for other errors
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md mx-auto p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-4">An unexpected error occurred.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
