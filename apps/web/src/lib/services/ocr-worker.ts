import { prisma } from '@/lib/prisma'
import { createClient } from '@supabase/supabase-js'
import {
  extractDocumentMetadata,
  extractAllPagesMetadata,
  type ProjectInfo
} from './document-ocr'
import { auditLog, logFailure } from '@/lib/audit-log'
import { createNotification } from './notification-service'

// Initialize Supabase client for file downloads
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || 'construction-files'

// Valid status transitions for OCR jobs
const VALID_TRANSITIONS: Record<string, string[]> = {
  'PENDING': ['PROCESSING', 'FAILED'],
  'PROCESSING': ['COMPLETED', 'FAILED'],
  'COMPLETED': [], // Terminal state
  'FAILED': []     // Terminal state
}

// Timeout for stuck jobs (15 minutes)
const JOB_TIMEOUT_MS = 15 * 60 * 1000

/**
 * Validate status transition
 */
function isValidTransition(currentStatus: string, newStatus: string): boolean {
  return VALID_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false
}

/**
 * Process an OCR job in the background
 * This function is called with setImmediate so it doesn't block the API response
 */
export async function processOcrJobInBackground(
  jobId: string,
  allPages: boolean = true
): Promise<void> {
  console.log(`[OcrWorker] Starting job ${jobId}, allPages: ${allPages}`)

  try {
    // Get the job
    const job = await prisma.ocrJob.findUnique({
      where: { id: jobId }
    })

    if (!job) {
      console.error(`[OcrWorker] Job ${jobId} not found`)
      return
    }

    // Validate status transition
    if (!isValidTransition(job.status, 'PROCESSING')) {
      console.log(`[OcrWorker] Job ${jobId} has status ${job.status}, cannot transition to PROCESSING`)
      return
    }

    // Verify file still exists if fileId is set
    if (job.fileId) {
      const file = await prisma.file.findUnique({
        where: { id: job.fileId }
      })
      if (!file) {
        throw new Error('File has been deleted')
      }
    }

    // Mark as processing with audit log
    await prisma.ocrJob.update({
      where: { id: jobId },
      data: {
        status: 'PROCESSING',
        startedAt: new Date()
      }
    })

    // Log status transition
    await auditLog.update(
      'DOCUMENT',
      { id: job.userId },
      jobId,
      { status: 'PENDING' },
      { status: 'PROCESSING', fileName: job.fileName },
      job.projectId || undefined
    )

    // Download the file from Supabase
    if (!job.storagePath) {
      throw new Error('No storage path for job')
    }

    console.log(`[OcrWorker] Downloading file from bucket: ${BUCKET_NAME}, path: ${job.storagePath}`)
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(BUCKET_NAME)
      .download(job.storagePath)

    if (downloadError || !fileData) {
      const errorDetails = downloadError
        ? JSON.stringify(downloadError)
        : 'No file data returned'
      throw new Error(`Failed to download file from storage: ${downloadError?.message || errorDetails}`)
    }

    // Convert blob to buffer
    const arrayBuffer = await fileData.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    console.log(`[OcrWorker] File downloaded, size: ${buffer.length} bytes`)

    // Get project info for matching
    let projects: ProjectInfo[] = []
    if (job.projectId) {
      const project = await prisma.project.findUnique({
        where: { id: job.projectId },
        select: { id: true, name: true, address: true }
      })
      if (project) {
        projects = [project]
      }
    }

    // Process the document
    const mimeType = job.fileType || 'application/pdf'
    let result

    if (allPages && mimeType === 'application/pdf') {
      // Multi-page processing with progress updates
      result = await extractAllPagesMetadataWithProgress(
        buffer,
        mimeType,
        projects,
        jobId,
        { maxPages: 50, concurrency: 3 }
      )
    } else {
      // Single page processing
      result = await extractDocumentMetadata(buffer, mimeType, projects)

      // Update progress to 100%
      await prisma.ocrJob.update({
        where: { id: jobId },
        data: {
          progress: 100,
          processedPages: 1,
          totalPages: 1
        }
      })
    }

    // Save results with audit log
    await prisma.ocrJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        result: result as object,
        progress: 100
      }
    })

    // Log successful completion
    const pagesProcessed = 'pageCount' in result ? result.pageCount : 1
    await auditLog.update(
      'DOCUMENT',
      { id: job.userId },
      jobId,
      { status: 'PROCESSING' },
      { status: 'COMPLETED', pagesProcessed },
      job.projectId || undefined
    )

    console.log(`[OcrWorker] Job ${jobId} completed successfully`)

    // Send push notification to user
    createNotification({
      userId: job.userId,
      type: 'OCR_COMPLETE',
      title: 'Document Analysis Complete',
      message: `Finished analyzing "${job.fileName}" (${pagesProcessed} page${pagesProcessed === 1 ? '' : 's'})`,
      severity: 'INFO',
      category: 'DOCUMENT',
      actionUrl: job.projectId ? `/documents?project=${job.projectId}` : '/documents',
      data: {
        jobId,
        fileName: job.fileName,
        pagesProcessed,
        projectId: job.projectId,
      },
    }).catch((notifError) => {
      console.error('[OcrWorker] Failed to send completion notification:', notifError)
    })

    // Also update DocumentMetadata if this was for an existing file
    if (job.fileId && !result.error) {
      await saveDocumentMetadata(job.fileId, result)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[OcrWorker] Job ${jobId} failed:`, errorMessage)

    // Get job for user info (may have been fetched earlier)
    const failedJob = await prisma.ocrJob.findUnique({
      where: { id: jobId },
      select: { userId: true, projectId: true, fileName: true, status: true }
    })

    // Mark job as failed
    await prisma.ocrJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        error: errorMessage,
        progress: 0
      }
    })

    // Log failure in audit trail and send notification
    if (failedJob) {
      await logFailure(
        'UPDATE',
        'DOCUMENT',
        { id: failedJob.userId },
        errorMessage,
        {
          resourceId: jobId,
          projectId: failedJob.projectId || undefined,
          extra: { fileName: failedJob.fileName, previousStatus: failedJob.status }
        }
      )

      // Send push notification for failure
      createNotification({
        userId: failedJob.userId,
        type: 'OCR_FAILED',
        title: 'Document Analysis Failed',
        message: `Failed to analyze "${failedJob.fileName}": ${errorMessage}`,
        severity: 'ERROR',
        category: 'DOCUMENT',
        actionUrl: failedJob.projectId ? `/documents?project=${failedJob.projectId}` : '/documents',
        data: {
          jobId,
          fileName: failedJob.fileName,
          error: errorMessage,
          projectId: failedJob.projectId,
        },
      }).catch((notifError) => {
        console.error('[OcrWorker] Failed to send failure notification:', notifError)
      })
    }
  }
}

/**
 * Clean up stuck/timed-out OCR jobs
 * Call this periodically (e.g., via cron job or on page load)
 */
export async function cleanupStuckOcrJobs(): Promise<number> {
  const timeoutThreshold = new Date(Date.now() - JOB_TIMEOUT_MS)

  const stuckJobs = await prisma.ocrJob.findMany({
    where: {
      status: 'PROCESSING',
      startedAt: {
        lt: timeoutThreshold
      }
    },
    select: { id: true, userId: true, projectId: true, fileName: true }
  })

  if (stuckJobs.length === 0) {
    return 0
  }

  console.log(`[OcrWorker] Found ${stuckJobs.length} stuck jobs, marking as failed`)

  for (const job of stuckJobs) {
    await prisma.ocrJob.update({
      where: { id: job.id },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        error: 'Job timeout - exceeded maximum processing time (15 minutes)',
        progress: 0
      }
    })

    await logFailure(
      'UPDATE',
      'DOCUMENT',
      { id: job.userId },
      'Job timeout - exceeded maximum processing time',
      {
        resourceId: job.id,
        projectId: job.projectId || undefined,
        extra: { fileName: job.fileName, reason: 'timeout' }
      }
    )
  }

  return stuckJobs.length
}

/**
 * Extract metadata from all pages with progress updates
 */
async function extractAllPagesMetadataWithProgress(
  buffer: Buffer,
  mimeType: string,
  projects: ProjectInfo[],
  jobId: string,
  options: { maxPages?: number; concurrency?: number } = {}
) {
  const { maxPages = 50, concurrency = 3 } = options

  // First, get page count using pdf-lib (more reliable than pdfjs-dist)
  const { getPdfPageCount } = await import('./pdf-utils')
  let pageCount = 1

  if (mimeType === 'application/pdf') {
    pageCount = await getPdfPageCount(buffer)
    pageCount = Math.min(pageCount, maxPages)
  }

  // Update job with total pages
  await prisma.ocrJob.update({
    where: { id: jobId },
    data: { totalPages: pageCount, progress: 0, processedPages: 0 }
  })

  console.log(`[OcrWorker] Processing ${pageCount} pages for job ${jobId}`)

  // Create a progress callback that updates the database
  const onProgress = async (processedPages: number, totalPages: number) => {
    const progress = totalPages > 0 ? Math.round((processedPages / totalPages) * 100) : 0
    console.log(`[OcrWorker] Job ${jobId} progress: ${processedPages}/${totalPages} (${progress}%)`)
    await prisma.ocrJob.update({
      where: { id: jobId },
      data: {
        processedPages,
        progress
      }
    })
  }

  // Use extractAllPagesMetadata with progress callback
  const result = await extractAllPagesMetadata(buffer, mimeType, projects, {
    maxPages,
    concurrency,
    onProgress
  })

  // Final progress update (ensure 100%)
  await prisma.ocrJob.update({
    where: { id: jobId },
    data: {
      processedPages: result.pageCount,
      progress: 100
    }
  })

  return result
}

/**
 * Save extracted metadata to DocumentMetadata record
 */
async function saveDocumentMetadata(fileId: string, result: {
  projectMatch?: { id: string; name: string; confidence: number }
  drawingInfo?: {
    drawingNumber?: string
    sheetNumber?: string
    sheetTitle?: string
    revision?: string
    scale?: string
    discipline?: string
  }
  locationInfo?: {
    building?: string
    floor?: string
    zone?: string
    room?: string
  }
  dates?: {
    documentDate?: string
    revisionDate?: string
  }
  error?: string
  // Multi-page result fields
  summary?: {
    projectMatch?: { id: string; name: string; confidence: number }
    uniqueDrawings?: string[]
    sheetTitles?: string[]
    disciplines?: string[]
  }
}) {
  try {
    // Handle both single-page and multi-page results
    const drawingInfo = result.drawingInfo || {}
    const locationInfo = result.locationInfo || {}
    const projectMatch = result.projectMatch || result.summary?.projectMatch

    // For multi-page results, use summary data
    if (result.summary) {
      if (result.summary.uniqueDrawings?.length === 1) {
        drawingInfo.drawingNumber = result.summary.uniqueDrawings[0]
      }
      if (result.summary.disciplines?.length === 1) {
        drawingInfo.discipline = result.summary.disciplines[0]
      }
      if (result.summary.sheetTitles?.length === 1) {
        drawingInfo.sheetTitle = result.summary.sheetTitles[0]
      }
    }

    await prisma.documentMetadata.upsert({
      where: { fileId },
      create: {
        fileId,
        drawingNumber: drawingInfo.drawingNumber,
        sheetNumber: drawingInfo.sheetNumber,
        sheetTitle: drawingInfo.sheetTitle,
        revision: drawingInfo.revision,
        discipline: drawingInfo.discipline,
        scale: drawingInfo.scale,
        building: locationInfo.building,
        floor: locationInfo.floor,
        zone: locationInfo.zone,
        room: locationInfo.room,
        ocrProvider: 'openai',
        ocrConfidence: projectMatch?.confidence,
        rawResponse: result as object
      },
      update: {
        drawingNumber: drawingInfo.drawingNumber,
        sheetNumber: drawingInfo.sheetNumber,
        sheetTitle: drawingInfo.sheetTitle,
        revision: drawingInfo.revision,
        discipline: drawingInfo.discipline,
        scale: drawingInfo.scale,
        building: locationInfo.building,
        floor: locationInfo.floor,
        zone: locationInfo.zone,
        room: locationInfo.room,
        ocrProvider: 'openai',
        ocrConfidence: projectMatch?.confidence,
        rawResponse: result as object
      }
    })

    console.log(`[OcrWorker] Saved metadata for file ${fileId}`)
  } catch (error) {
    console.error(`[OcrWorker] Failed to save metadata for file ${fileId}:`, error)
  }
}
