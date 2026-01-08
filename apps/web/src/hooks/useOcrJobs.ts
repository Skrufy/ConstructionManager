'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

export interface OcrJob {
  id: string
  fileId: string | null
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  progress: number
  totalPages: number
  processedPages: number
  fileName: string | null
  result: unknown | null
  error: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
}

interface UseOcrJobsOptions {
  pollingInterval?: number // ms, default 2000
  autoStart?: boolean
}

/**
 * Hook to manage background OCR jobs
 */
export function useOcrJobs(options: UseOcrJobsOptions = {}) {
  const { pollingInterval = 2000, autoStart = true } = options

  const [jobs, setJobs] = useState<OcrJob[]>([])
  const [activeCount, setActiveCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const activeCountRef = useRef(activeCount)

  // Keep ref in sync with state
  useEffect(() => {
    activeCountRef.current = activeCount
  }, [activeCount])

  // Fetch user's OCR jobs
  const fetchJobs = useCallback(async () => {
    try {
      const response = await fetch('/api/documents/ocr/jobs')
      if (response.ok) {
        const data = await response.json()
        setJobs(data.jobs || [])
        setActiveCount(data.activeCount || 0)
      }
    } catch (error) {
      console.error('[useOcrJobs] Failed to fetch jobs:', error)
    }
  }, [])

  // Start a new OCR job
  const startJob = useCallback(async (
    fileId: string,
    mode: 'single' | 'all-pages' = 'all-pages'
  ): Promise<{ success: boolean; jobId?: string; error?: string }> => {
    setLoading(true)
    try {
      const response = await fetch('/api/documents/ocr/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, mode })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Immediately fetch jobs to update state
        await fetchJobs()
        return { success: true, jobId: data.job?.id }
      } else {
        return { success: false, error: data.error || 'Failed to start OCR' }
      }
    } catch (error) {
      return { success: false, error: 'Failed to start OCR job' }
    } finally {
      setLoading(false)
    }
  }, [fetchJobs])

  // Get job status
  const getJobStatus = useCallback(async (jobId: string): Promise<OcrJob | null> => {
    try {
      const response = await fetch(`/api/documents/ocr/${jobId}`)
      if (response.ok) {
        const data = await response.json()
        return data.job
      }
    } catch (error) {
      console.error('[useOcrJobs] Failed to get job status:', error)
    }
    return null
  }, [])

  // Get job by file ID
  const getJobForFile = useCallback((fileId: string): OcrJob | undefined => {
    return jobs.find(job => job.fileId === fileId)
  }, [jobs])

  // Delete a job
  const deleteJob = useCallback(async (jobId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/documents/ocr/${jobId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        await fetchJobs()
        return true
      }
    } catch (error) {
      console.error('[useOcrJobs] Failed to delete job:', error)
    }
    return false
  }, [fetchJobs])

  // Track if we should continue polling (use ref to avoid stale closure)
  const shouldPollRef = useRef(false)
  const pollCountAfterComplete = useRef(0)

  // Start polling for active jobs
  const startPolling = useCallback(() => {
    if (pollingRef.current) return
    shouldPollRef.current = true
    pollCountAfterComplete.current = 0

    pollingRef.current = setInterval(() => {
      // Use ref to get current value, not stale closure
      if (activeCountRef.current > 0) {
        pollCountAfterComplete.current = 0
        fetchJobs()
      } else if (pollCountAfterComplete.current < 3) {
        // Continue polling a few more times after jobs complete
        // This ensures the UI updates with completed results
        pollCountAfterComplete.current++
        fetchJobs()
      } else {
        // All jobs done and we've confirmed it - stop polling
        shouldPollRef.current = false
      }
    }, pollingInterval)
  }, [fetchJobs, pollingInterval])

  // Stop polling
  const stopPolling = useCallback(() => {
    shouldPollRef.current = false
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  // Auto-fetch on mount
  useEffect(() => {
    if (autoStart) {
      fetchJobs()
    }
  }, [autoStart, fetchJobs])

  // Poll when there are active jobs
  useEffect(() => {
    if (activeCount > 0) {
      startPolling()
    }
    // Don't immediately stop polling when activeCount goes to 0
    // The polling logic above handles the graceful stop

    return () => stopPolling()
  }, [activeCount, startPolling, stopPolling])

  return {
    jobs,
    activeCount,
    loading,
    fetchJobs,
    startJob,
    getJobStatus,
    getJobForFile,
    deleteJob,
    startPolling,
    stopPolling
  }
}
