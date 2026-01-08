import OpenAI from 'openai'
import { createCanvas, DOMMatrix as CanvasDOMMatrix, ImageData as CanvasImageData } from 'canvas'

// Polyfill DOM types needed by pdfjs-dist in Node.js environment
// These are normally provided by the browser but missing in Node
if (typeof globalThis.DOMMatrix === 'undefined') {
  // @ts-expect-error - Polyfilling global for pdfjs-dist
  globalThis.DOMMatrix = CanvasDOMMatrix
}
if (typeof globalThis.ImageData === 'undefined') {
  // @ts-expect-error - Polyfilling global for pdfjs-dist
  globalThis.ImageData = CanvasImageData
}
if (typeof globalThis.Path2D === 'undefined') {
  // Path2D is exported from canvas as well
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Path2D: CanvasPath2D } = require('canvas')
    globalThis.Path2D = CanvasPath2D
  } catch {
    // Path2D may not be available in all canvas builds
  }
}

// Lazy-initialize OpenAI client (created on first use, not at build time)
let openaiClient: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not configured')
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openaiClient
}

// Timeout for OpenAI API calls (30 seconds)
const OPENAI_TIMEOUT_MS = 30000

/**
 * Wrap a promise with a timeout
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
  })
  return Promise.race([promise, timeoutPromise])
}

export interface ExtractedDocumentData {
  projectMatch?: {
    id: string
    name: string
    confidence: number
  }
  drawingInfo?: {
    drawingNumber?: string
    sheetNumber?: string
    sheetTitle?: string // e.g., "COVER SHEET", "GRADING PLAN", "FLOOR PLAN - LEVEL 1"
    revision?: string
    scale?: string
    discipline?: string // ARCHITECTURAL, STRUCTURAL, MECHANICAL, ELECTRICAL, PLUMBING, CIVIL, LANDSCAPE, GENERAL, FIRE_PROTECTION
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
    approvalDate?: string
  }
  rawText?: string
  error?: string
}

export interface ProjectInfo {
  id: string
  name: string
  address?: string | null
}

export interface PageExtraction {
  pageNumber: number
  data: ExtractedDocumentData
}

export interface MultiPageExtractionResult {
  pageCount: number
  pages: PageExtraction[]
  summary?: {
    projectMatch?: ExtractedDocumentData['projectMatch']
    uniqueDrawings: string[]
    sheetTitles: string[]
    disciplines: string[]
  }
  error?: string
}

/**
 * Progress callback for multi-page extraction
 */
export type ExtractionProgressCallback = (processed: number, total: number) => void | Promise<void>

/**
 * Render a PDF page to a canvas and return as PNG buffer
 */
async function renderPdfPage(
  pdfDoc: { getPage: (num: number) => Promise<unknown> },
  pageNum: number,
  scale: number = 2
): Promise<Buffer> {
  const page = await pdfDoc.getPage(pageNum) as {
    getViewport: (opts: { scale: number }) => { width: number; height: number }
    render: (opts: { canvasContext: unknown; viewport: unknown }) => { promise: Promise<void> }
  }

  const viewport = page.getViewport({ scale })
  const canvas = createCanvas(viewport.width, viewport.height)
  const context = canvas.getContext('2d')

  await page.render({
    canvasContext: context,
    viewport: viewport
  }).promise

  return canvas.toBuffer('image/png')
}

/**
 * Load pdfjs-dist dynamically
 * Since this runs on the server in Next.js, we need to use dynamic import
 */
async function getPdfjsLib(): Promise<typeof import('pdfjs-dist')> {
  // Dynamic import works in ES modules environment
  // Use legacy build for Node.js server-side compatibility (v3.x path)
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf')
  return pdfjs
}

/**
 * Create a canvas factory for pdfjs-dist to use with node-canvas
 */
function createCanvasFactory() {
  return {
    create: (width: number, height: number) => {
      const canvas = createCanvas(width, height)
      return {
        canvas,
        context: canvas.getContext('2d')
      }
    },
    reset: (canvasAndContext: { canvas: ReturnType<typeof createCanvas> }, width: number, height: number) => {
      canvasAndContext.canvas.width = width
      canvasAndContext.canvas.height = height
    },
    destroy: () => {
      // No cleanup needed for node-canvas
    }
  }
}

// Standard font data URL for pdfjs-dist (matching installed v3.11.174)
const STANDARD_FONT_DATA_URL = 'https://unpkg.com/pdfjs-dist@3.11.174/standard_fonts/'

/**
 * Convert PDF first page to base64 image using pdf-to-img
 * Falls back to pdfjs-dist if pdf-to-img fails
 */
async function pdfToImage(pdfBuffer: Buffer): Promise<{ success: true; data: string } | { success: false; error: string }> {
  console.log('[DocumentOCR] pdfToImage: Starting conversion, buffer size:', pdfBuffer.length)

  try {
    // Try using pdf-to-img first (better rendering quality)
    console.log('[DocumentOCR] pdfToImage: Trying pdf-to-img...')
    const pdfToImg = await import('pdf-to-img')
    const document = await pdfToImg.pdf(pdfBuffer, { scale: 2 })

    // Get the first page
    for await (const image of document) {
      const base64 = image.toString('base64')
      console.log('[DocumentOCR] pdfToImage: pdf-to-img SUCCESS, image size:', base64.length)
      return { success: true, data: `data:image/png;base64,${base64}` }
    }

    console.log('[DocumentOCR] pdfToImage: pdf-to-img returned no pages')
    return { success: false, error: 'PDF contains no pages' }
  } catch (pdfToImgError) {
    console.error('[DocumentOCR] pdf-to-img failed, trying pdfjs-dist fallback:', pdfToImgError instanceof Error ? pdfToImgError.message : pdfToImgError)

    // Fallback to pdfjs-dist with canvas
    try {
      const pdfjsLib = await getPdfjsLib()
      const uint8Array = new Uint8Array(pdfBuffer.buffer, pdfBuffer.byteOffset, pdfBuffer.byteLength)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const loadingTask = pdfjsLib.getDocument({
        data: uint8Array,
        canvasFactory: createCanvasFactory(),
        standardFontDataUrl: STANDARD_FONT_DATA_URL,
        useSystemFonts: true,
        disableFontFace: true
      } as any)
      const pdfDoc = await loadingTask.promise

      if (pdfDoc.numPages === 0) {
        return { success: false, error: 'PDF contains no pages' }
      }

      const pngBuffer = await renderPdfPage(pdfDoc, 1, 2)
      const base64 = pngBuffer.toString('base64')
      return { success: true, data: `data:image/png;base64,${base64}` }
    } catch (fallbackError) {
      const errorMsg = fallbackError instanceof Error ? fallbackError.message : 'Unknown error'
      console.error('[DocumentOCR] PDF to image conversion failed:', errorMsg)
      return { success: false, error: 'Failed to process PDF. The file may be corrupted or in an unsupported format.' }
    }
  }
}

/**
 * Convert all PDF pages to base64 images using pdf-to-img
 * Falls back to pdfjs-dist if pdf-to-img fails
 */
async function pdfToAllImages(pdfBuffer: Buffer): Promise<{ success: true; pages: string[]; pageCount: number } | { success: false; error: string }> {
  console.log('[DocumentOCR] pdfToAllImages: Starting conversion, buffer size:', pdfBuffer.length)

  try {
    // Try using pdf-to-img first (better rendering quality)
    console.log('[DocumentOCR] pdfToAllImages: Trying pdf-to-img...')
    const pdfToImg = await import('pdf-to-img')
    const document = await pdfToImg.pdf(pdfBuffer, { scale: 2 })

    const pages: string[] = []
    let pageNum = 0
    for await (const image of document) {
      pageNum++
      const base64 = image.toString('base64')
      pages.push(`data:image/png;base64,${base64}`)
      console.log(`[DocumentOCR] pdfToAllImages: Page ${pageNum} rendered, image size: ${base64.length}`)
    }

    if (pages.length === 0) {
      console.log('[DocumentOCR] pdfToAllImages: pdf-to-img returned no pages')
      return { success: false, error: 'PDF contains no pages' }
    }

    console.log(`[DocumentOCR] pdfToAllImages: pdf-to-img SUCCESS, ${pages.length} pages rendered`)
    return { success: true, pages, pageCount: pages.length }
  } catch (pdfToImgError) {
    console.error('[DocumentOCR] pdf-to-img failed for all pages, trying pdfjs-dist fallback:', pdfToImgError instanceof Error ? pdfToImgError.message : pdfToImgError)

    // Fallback to pdfjs-dist with canvas
    try {
      const pdfjsLib = await getPdfjsLib()
      const uint8Array = new Uint8Array(pdfBuffer.buffer, pdfBuffer.byteOffset, pdfBuffer.byteLength)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const loadingTask = pdfjsLib.getDocument({
        data: uint8Array,
        canvasFactory: createCanvasFactory(),
        standardFontDataUrl: STANDARD_FONT_DATA_URL,
        useSystemFonts: true,
        disableFontFace: true
      } as any)
      const pdfDoc = await loadingTask.promise
      const pages: string[] = []

      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const pngBuffer = await renderPdfPage(pdfDoc, i, 2)
        const base64 = pngBuffer.toString('base64')
        pages.push(`data:image/png;base64,${base64}`)
      }

      if (pages.length === 0) {
        return { success: false, error: 'PDF contains no pages or could not be rendered' }
      }

      return { success: true, pages, pageCount: pages.length }
    } catch (fallbackError) {
      const errorMsg = fallbackError instanceof Error ? fallbackError.message : 'Unknown error'
      console.error('[DocumentOCR] PDF to images conversion failed:', errorMsg)
      return { success: false, error: 'Failed to process PDF. The file may be corrupted or in an unsupported format.' }
    }
  }
}

/**
 * Build the extraction prompt for OpenAI Vision
 */
function buildExtractionPrompt(projects: ProjectInfo[]): string {
  const projectList = projects.map(p => `- ${p.name}${p.address ? ` (${p.address})` : ''}`).join('\n')

  return `You are analyzing a construction document image. Extract the following information and return it as JSON.

KNOWN PROJECTS (try to match the document to one of these):
${projectList || 'No projects provided'}

EXTRACT THE FOLLOWING:

1. PROJECT IDENTIFICATION:
   - Look for project name, project number, job number, or address in the title block
   - Match against the known projects list above
   - If a match is found, include the project name and confidence (0-1)

2. DRAWING INFORMATION:
   - drawingNumber: The drawing/sheet identifier - IMPORTANT: Look in the title block corners
     Common formats with discipline prefix:
     * C0.00, C1.00, C2.00 = Civil drawings
     * A1.00, A1.01, A2.00 = Architectural drawings
     * S1.00, S2.00 = Structural drawings
     * M1.00, M2.00 = Mechanical drawings
     * E1.00, E2.00 = Electrical drawings
     * P1.00, P2.00 = Plumbing drawings
     * L1.00 = Landscape drawings
     * G0.00 = General/Cover sheets
   - sheetTitle: The descriptive title of this sheet (e.g., "COVER SHEET", "SITE PLAN", "GRADING PLAN", "FLOOR PLAN - LEVEL 1", "ENLARGED RESTROOM PLAN")
   - revision: Revision mark (e.g., "Rev A", "R1", "Revision 2", "0")
   - scale: Drawing scale (e.g., "1/4\" = 1'-0\"", "1:50", "NTS", "AS NOTED")
   - discipline: Infer from drawing number prefix OR title block discipline indicator:
     * C prefix = CIVIL
     * A prefix = ARCHITECTURAL
     * S prefix = STRUCTURAL
     * M prefix = MECHANICAL
     * E prefix = ELECTRICAL
     * P prefix = PLUMBING
     * L prefix = LANDSCAPE
     * G prefix = GENERAL
     * FP prefix = FIRE_PROTECTION

3. LOCATION INFORMATION:
   - building: Building name or number
   - floor: Floor level (e.g., "1st Floor", "Level 2", "Basement")
   - zone: Zone or area name
   - room: Room name or number

4. DATES:
   - documentDate: Original document date
   - revisionDate: Date of last revision
   - approvalDate: Approval or issued date

Return ONLY valid JSON in this exact format (omit fields that aren't found):
{
  "projectMatch": { "name": "string", "confidence": 0.0-1.0 },
  "drawingInfo": { "drawingNumber": "string", "sheetTitle": "string", "revision": "string", "scale": "string", "discipline": "string" },
  "locationInfo": { "building": "string", "floor": "string", "zone": "string", "room": "string" },
  "dates": { "documentDate": "YYYY-MM-DD", "revisionDate": "YYYY-MM-DD", "approvalDate": "YYYY-MM-DD" },
  "rawText": "first 200 chars of any readable text"
}

If this is not a construction document or you cannot extract meaningful data, return:
{ "error": "reason" }`
}

/**
 * Parse the OpenAI response into structured data
 */
function parseExtractionResponse(content: string): ExtractedDocumentData {
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return { error: 'No JSON found in response' }
    }

    const parsed = JSON.parse(jsonMatch[0])
    return parsed as ExtractedDocumentData
  } catch (error) {
    console.error('[DocumentOCR] Failed to parse response:', error)
    return { error: 'Failed to parse extraction response' }
  }
}

/**
 * Match extracted project name to known projects
 */
export function matchProjectToList(
  extractedData: ExtractedDocumentData,
  projects: ProjectInfo[]
): ExtractedDocumentData {
  if (!extractedData.projectMatch?.name || projects.length === 0) {
    return extractedData
  }

  const extractedName = extractedData.projectMatch.name.toLowerCase()

  // Try to find a matching project
  let bestMatch: ProjectInfo | null = null
  let bestScore = 0

  for (const project of projects) {
    const projectName = project.name.toLowerCase()
    const projectAddress = project.address?.toLowerCase() || ''

    // Check for exact match
    if (projectName === extractedName) {
      bestMatch = project
      bestScore = 1.0
      break
    }

    // Check for partial match
    if (projectName.includes(extractedName) || extractedName.includes(projectName)) {
      const score = Math.min(projectName.length, extractedName.length) /
                   Math.max(projectName.length, extractedName.length)
      if (score > bestScore) {
        bestMatch = project
        bestScore = score * 0.9 // Slightly lower confidence for partial matches
      }
    }

    // Check address match
    if (projectAddress && extractedName.includes(projectAddress.split(',')[0])) {
      if (0.7 > bestScore) {
        bestMatch = project
        bestScore = 0.7
      }
    }
  }

  if (bestMatch) {
    return {
      ...extractedData,
      projectMatch: {
        id: bestMatch.id,
        name: bestMatch.name,
        confidence: bestScore
      }
    }
  }

  return extractedData
}

/**
 * Main function to extract document metadata using OpenAI Vision
 */
export async function extractDocumentMetadata(
  fileBuffer: Buffer,
  mimeType: string,
  projects: ProjectInfo[]
): Promise<ExtractedDocumentData> {
  if (!process.env.OPENAI_API_KEY) {
    return { error: 'OpenAI API key not configured' }
  }

  try {
    let imageData: string

    // Handle different file types
    if (mimeType === 'application/pdf') {
      // Convert PDF first page to image
      const pdfResult = await pdfToImage(fileBuffer)
      if (!pdfResult.success) {
        return { error: pdfResult.error }
      }
      imageData = pdfResult.data
    } else if (mimeType.startsWith('image/')) {
      // Use image directly
      const base64 = fileBuffer.toString('base64')
      imageData = `data:${mimeType};base64,${base64}`
    } else {
      return { error: `Unsupported file type: ${mimeType}` }
    }

    // Build prompt with project context
    const prompt = buildExtractionPrompt(projects)

    // Call OpenAI Vision API with timeout
    const response = await withTimeout(
      getOpenAIClient().chat.completions.create({
        model: 'gpt-4o', // gpt-4o has vision capabilities
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageData,
                  detail: 'high' // Use high detail for construction drawings
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.1 // Low temperature for more consistent extraction
      }),
      OPENAI_TIMEOUT_MS,
      'Document analysis timed out. The file may be too large or complex.'
    )

    const content = response.choices[0]?.message?.content
    if (!content) {
      return { error: 'No response from OpenAI' }
    }

    // Parse the response
    const extractedData = parseExtractionResponse(content)

    // Match project to known projects if we found a name but no ID
    if (extractedData.projectMatch?.name && !extractedData.projectMatch?.id) {
      return matchProjectToList(extractedData, projects)
    }

    return extractedData
  } catch (error) {
    console.error('[DocumentOCR] Extraction failed:', {
      error: error instanceof Error ? error.message : String(error),
      mimeType,
      fileSize: fileBuffer.length,
      projectCount: projects.length,
    })

    // Handle OpenAI-specific errors with type checking
    if (error instanceof OpenAI.APIError) {
      if (error instanceof OpenAI.AuthenticationError) {
        return { error: 'Document analysis service is not configured correctly. Please contact your administrator.' }
      }
      if (error instanceof OpenAI.RateLimitError) {
        return { error: 'Document analysis rate limit exceeded. Please try again in a few minutes.' }
      }
      if (error instanceof OpenAI.APIConnectionTimeoutError || error instanceof OpenAI.APIConnectionError) {
        return { error: 'Unable to connect to document analysis service. Please check your internet connection.' }
      }
      if (error instanceof OpenAI.BadRequestError || error instanceof OpenAI.UnprocessableEntityError) {
        return { error: 'Invalid document format or content. Please try a different file.' }
      }
      if (error instanceof OpenAI.InternalServerError) {
        return { error: 'Document analysis service is temporarily unavailable. Please try again later.' }
      }
      // Generic API error with status code
      console.error(`[DocumentOCR] OpenAI API Error: ${error.status} - ${error.message}`)
      return { error: 'Document analysis failed. Please try again or contact support.' }
    }

    // Handle timeout from withTimeout wrapper
    if (error instanceof Error && error.message.includes('timed out')) {
      return { error: error.message }
    }

    // Handle other Error instances
    if (error instanceof Error) {
      const message = error.message.toLowerCase()
      if (message.includes('network') || message.includes('connection') || message.includes('econnrefused')) {
        return { error: 'Unable to connect to document analysis service. Please check your internet connection.' }
      }
    }

    return { error: 'An unexpected error occurred during document analysis.' }
  }
}

/**
 * Check if OCR is supported for a given MIME type
 */
export function isOcrSupported(mimeType: string): boolean {
  const supportedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/tiff'
  ]
  return supportedTypes.includes(mimeType.toLowerCase())
}

/**
 * Extract metadata from all pages of a PDF document
 * Processes each page separately and returns combined results
 * @param onProgress - Optional callback called after each batch with (processedPages, totalPages)
 */
export async function extractAllPagesMetadata(
  fileBuffer: Buffer,
  mimeType: string,
  projects: ProjectInfo[],
  options: { maxPages?: number; concurrency?: number; onProgress?: ExtractionProgressCallback } = {}
): Promise<MultiPageExtractionResult> {
  const { maxPages = 50, concurrency = 3, onProgress } = options

  if (!process.env.OPENAI_API_KEY) {
    return { pageCount: 0, pages: [], error: 'OpenAI API key not configured' }
  }

  if (mimeType !== 'application/pdf') {
    // For non-PDF files, just use the single-page extraction
    const result = await extractDocumentMetadata(fileBuffer, mimeType, projects)
    return {
      pageCount: 1,
      pages: [{ pageNumber: 1, data: result }],
      summary: {
        projectMatch: result.projectMatch,
        uniqueDrawings: result.drawingInfo?.drawingNumber ? [result.drawingInfo.drawingNumber] : [],
        sheetTitles: result.drawingInfo?.sheetTitle ? [result.drawingInfo.sheetTitle] : [],
        disciplines: result.drawingInfo?.discipline ? [result.drawingInfo.discipline] : []
      }
    }
  }

  try {
    // Convert PDF to images
    const pdfResult = await pdfToAllImages(fileBuffer)
    if (!pdfResult.success) {
      return { pageCount: 0, pages: [], error: pdfResult.error }
    }

    const { pages: pageImages, pageCount } = pdfResult
    const pagesToProcess = pageImages.slice(0, maxPages)
    const prompt = buildExtractionPrompt(projects)
    const results: PageExtraction[] = []

    // Process pages in batches for rate limiting
    for (let i = 0; i < pagesToProcess.length; i += concurrency) {
      const batch = pagesToProcess.slice(i, i + concurrency)
      const batchPromises = batch.map(async (imageData, batchIndex) => {
        const pageNum = i + batchIndex + 1
        try {
          const response = await withTimeout(
            getOpenAIClient().chat.completions.create({
              model: 'gpt-4o',
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: `Page ${pageNum} of ${pageCount}:\n\n${prompt}` },
                    { type: 'image_url', image_url: { url: imageData, detail: 'high' } }
                  ]
                }
              ],
              max_tokens: 1000,
              temperature: 0.1
            }),
            OPENAI_TIMEOUT_MS,
            `Page ${pageNum} analysis timed out`
          )

          const content = response.choices[0]?.message?.content
          console.log(`[DocumentOCR] Page ${pageNum} OpenAI response:`, content?.substring(0, 200) + '...')
          if (!content) {
            return { pageNumber: pageNum, data: { error: 'No response from OpenAI' } }
          }

          let extractedData = parseExtractionResponse(content)
          console.log(`[DocumentOCR] Page ${pageNum} parsed data:`, {
            hasProjectMatch: !!extractedData.projectMatch,
            hasDrawingInfo: !!extractedData.drawingInfo,
            hasError: !!extractedData.error
          })
          if (extractedData.projectMatch?.name && !extractedData.projectMatch?.id) {
            extractedData = matchProjectToList(extractedData, projects)
          }

          return { pageNumber: pageNum, data: extractedData }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          console.error(`[DocumentOCR] Page ${pageNum} analysis error:`, errorMsg)
          return { pageNumber: pageNum, data: { error: `Page analysis failed: ${errorMsg}` } }
        }
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      // Report progress after each batch
      if (onProgress) {
        try {
          await onProgress(results.length, pagesToProcess.length)
        } catch (progressError) {
          console.error('[DocumentOCR] Progress callback error:', progressError)
        }
      }

      // Small delay between batches to avoid rate limits
      if (i + concurrency < pagesToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    // Generate summary
    const uniqueDrawings = new Set<string>()
    const sheetTitles = new Set<string>()
    const disciplines = new Set<string>()
    let projectMatch: ExtractedDocumentData['projectMatch'] | undefined

    for (const page of results) {
      if (page.data.drawingInfo?.drawingNumber) {
        uniqueDrawings.add(page.data.drawingInfo.drawingNumber)
      }
      if (page.data.drawingInfo?.sheetTitle) {
        sheetTitles.add(page.data.drawingInfo.sheetTitle)
      }
      if (page.data.drawingInfo?.discipline) {
        disciplines.add(page.data.drawingInfo.discipline)
      }
      // Use highest confidence project match
      if (page.data.projectMatch && (!projectMatch || page.data.projectMatch.confidence > projectMatch.confidence)) {
        projectMatch = page.data.projectMatch
      }
    }

    return {
      pageCount,
      pages: results,
      summary: {
        projectMatch,
        uniqueDrawings: Array.from(uniqueDrawings),
        sheetTitles: Array.from(sheetTitles),
        disciplines: Array.from(disciplines)
      }
    }
  } catch (error) {
    console.error('[DocumentOCR] Multi-page extraction failed:', error)
    return {
      pageCount: 0,
      pages: [],
      error: error instanceof Error ? error.message : 'Multi-page extraction failed'
    }
  }
}

/**
 * Get page count from a PDF buffer
 * Uses pdfjs-dist first, falls back to pdf-lib if that fails
 */
export async function getPdfPageCount(pdfBuffer: Buffer): Promise<number> {
  // Try pdfjs-dist first
  try {
    const pdfjsLib = await getPdfjsLib()
    // Convert Buffer to Uint8Array (pdfjs-dist ES module requires Uint8Array, not Buffer)
    const uint8Array = new Uint8Array(pdfBuffer.buffer, pdfBuffer.byteOffset, pdfBuffer.byteLength)
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      standardFontDataUrl: STANDARD_FONT_DATA_URL,
      disableFontFace: true
    })
    const pdfDoc = await loadingTask.promise
    if (pdfDoc.numPages > 0) {
      return pdfDoc.numPages
    }
  } catch (pdfjsError) {
    console.warn('[DocumentOCR] pdfjs-dist failed to get page count:', pdfjsError instanceof Error ? pdfjsError.message : pdfjsError)
  }

  // Fallback to pdf-lib (often more permissive with malformed PDFs)
  try {
    const { PDFDocument } = await import('pdf-lib')
    const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true })
    const pageCount = pdfDoc.getPageCount()
    console.log('[DocumentOCR] pdf-lib fallback succeeded, pages:', pageCount)
    return pageCount
  } catch (pdfLibError) {
    console.error('[DocumentOCR] Both pdfjs-dist and pdf-lib failed to read PDF:', pdfLibError instanceof Error ? pdfLibError.message : pdfLibError)
    return 0
  }
}
