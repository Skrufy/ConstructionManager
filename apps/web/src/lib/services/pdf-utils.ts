/**
 * PDF Utilities for Document Splitting
 * Uses pdf-lib for extracting individual pages from multi-page PDFs
 */

import { PDFDocument } from 'pdf-lib'

/**
 * Get the number of pages in a PDF
 */
export async function getPdfPageCount(pdfBuffer: Buffer): Promise<number> {
  const pdfDoc = await PDFDocument.load(pdfBuffer)
  return pdfDoc.getPageCount()
}

/**
 * Extract a single page from a PDF as a new PDF document
 * @param pdfBuffer - The original PDF buffer
 * @param pageNumber - 1-indexed page number to extract
 * @returns Buffer containing the single-page PDF
 */
export async function extractPdfPage(
  pdfBuffer: Buffer,
  pageNumber: number
): Promise<Buffer> {
  const sourcePdf = await PDFDocument.load(pdfBuffer)
  const pageCount = sourcePdf.getPageCount()

  if (pageNumber < 1 || pageNumber > pageCount) {
    throw new Error(`Page ${pageNumber} is out of range. PDF has ${pageCount} pages.`)
  }

  // Create a new PDF with just the one page
  const newPdf = await PDFDocument.create()

  // Copy the page (pdf-lib uses 0-indexed)
  const [copiedPage] = await newPdf.copyPages(sourcePdf, [pageNumber - 1])
  newPdf.addPage(copiedPage)

  // Save and return
  const pdfBytes = await newPdf.save()
  return Buffer.from(pdfBytes)
}

/**
 * Extract multiple pages from a PDF as separate PDF documents
 * @param pdfBuffer - The original PDF buffer
 * @param pageNumbers - Array of 1-indexed page numbers to extract
 * @returns Array of objects with pageNumber and buffer
 */
export async function extractPdfPages(
  pdfBuffer: Buffer,
  pageNumbers: number[]
): Promise<Array<{ pageNumber: number; buffer: Buffer }>> {
  const sourcePdf = await PDFDocument.load(pdfBuffer)
  const pageCount = sourcePdf.getPageCount()

  const results: Array<{ pageNumber: number; buffer: Buffer }> = []

  for (const pageNumber of pageNumbers) {
    if (pageNumber < 1 || pageNumber > pageCount) {
      console.warn(`Skipping page ${pageNumber} - out of range`)
      continue
    }

    const newPdf = await PDFDocument.create()
    const [copiedPage] = await newPdf.copyPages(sourcePdf, [pageNumber - 1])
    newPdf.addPage(copiedPage)

    const pdfBytes = await newPdf.save()
    results.push({
      pageNumber,
      buffer: Buffer.from(pdfBytes)
    })
  }

  return results
}

/**
 * Extract all pages from a PDF as separate PDF documents
 * @param pdfBuffer - The original PDF buffer
 * @returns Array of objects with pageNumber and buffer
 */
export async function extractAllPdfPages(
  pdfBuffer: Buffer
): Promise<Array<{ pageNumber: number; buffer: Buffer }>> {
  const sourcePdf = await PDFDocument.load(pdfBuffer)
  const pageCount = sourcePdf.getPageCount()

  const pageNumbers = Array.from({ length: pageCount }, (_, i) => i + 1)
  return extractPdfPages(pdfBuffer, pageNumbers)
}

/**
 * Validate that a buffer is a valid PDF
 */
export async function isValidPdf(buffer: Buffer): Promise<boolean> {
  try {
    await PDFDocument.load(buffer)
    return true
  } catch {
    return false
  }
}

/**
 * Get PDF metadata
 */
export async function getPdfMetadata(pdfBuffer: Buffer): Promise<{
  pageCount: number
  title?: string
  author?: string
  subject?: string
  creator?: string
  producer?: string
  creationDate?: Date
  modificationDate?: Date
}> {
  const pdfDoc = await PDFDocument.load(pdfBuffer)

  return {
    pageCount: pdfDoc.getPageCount(),
    title: pdfDoc.getTitle(),
    author: pdfDoc.getAuthor(),
    subject: pdfDoc.getSubject(),
    creator: pdfDoc.getCreator(),
    producer: pdfDoc.getProducer(),
    creationDate: pdfDoc.getCreationDate(),
    modificationDate: pdfDoc.getModificationDate()
  }
}

/**
 * Discipline prefixes for construction drawings
 */
export const DISCIPLINE_PREFIXES: Record<string, string> = {
  'C': 'CIVIL',
  'L': 'LANDSCAPE',
  'A': 'ARCHITECTURAL',
  'S': 'STRUCTURAL',
  'M': 'MECHANICAL',
  'P': 'PLUMBING',
  'FP': 'FIRE_PROTECTION',
  'E': 'ELECTRICAL',
  'T': 'TELECOMMUNICATIONS',
  'I': 'INSTRUMENTATION',
  'G': 'GENERAL',
}

/**
 * Infer discipline from drawing number
 * @param drawingNumber - e.g., "C0.00", "A1.01", "S2.00"
 * @returns Discipline string or null if cannot determine
 */
export function inferDisciplineFromDrawingNumber(drawingNumber: string): string | null {
  if (!drawingNumber) return null

  const upper = drawingNumber.toUpperCase().trim()

  // Check for two-letter prefixes first (like FP)
  for (const [prefix, discipline] of Object.entries(DISCIPLINE_PREFIXES)) {
    if (prefix.length === 2 && upper.startsWith(prefix)) {
      return discipline
    }
  }

  // Check single-letter prefixes
  const firstChar = upper[0]
  if (firstChar && DISCIPLINE_PREFIXES[firstChar]) {
    return DISCIPLINE_PREFIXES[firstChar]
  }

  return null
}

/**
 * Format drawing number for consistent display
 * Ensures proper formatting like "C0.00" instead of "c0.0" or "C0.0"
 */
export function formatDrawingNumber(drawingNumber: string): string {
  if (!drawingNumber) return ''

  const trimmed = drawingNumber.trim().toUpperCase()

  // Try to parse common formats: C0.00, C0.0, C0-00, C0-0
  const match = trimmed.match(/^([A-Z]{1,2})(\d+)[\.\-]?(\d+)?$/)
  if (match) {
    const [, prefix, major, minor = '00'] = match
    return `${prefix}${major}.${minor.padEnd(2, '0')}`
  }

  // Return as-is if format not recognized
  return trimmed
}

/**
 * Category mapping from discipline
 */
export function disciplineToCategory(discipline: string): string {
  // Most disciplines map to DRAWINGS
  const drawingDisciplines = [
    'CIVIL', 'LANDSCAPE', 'ARCHITECTURAL', 'STRUCTURAL',
    'MECHANICAL', 'PLUMBING', 'FIRE_PROTECTION', 'ELECTRICAL',
    'TELECOMMUNICATIONS', 'INSTRUMENTATION', 'GENERAL'
  ]

  if (drawingDisciplines.includes(discipline)) {
    return 'DRAWINGS'
  }

  // Default to OTHER
  return 'OTHER'
}

/**
 * Common architectural/engineering scales
 * Used for dropdown suggestions
 */
export const COMMON_SCALES = [
  // Architectural scales (imperial)
  '1/8" = 1\'-0"',
  '3/16" = 1\'-0"',
  '1/4" = 1\'-0"',
  '3/8" = 1\'-0"',
  '1/2" = 1\'-0"',
  '3/4" = 1\'-0"',
  '1" = 1\'-0"',
  '1-1/2" = 1\'-0"',
  '3" = 1\'-0"',
  // Engineering scales (imperial)
  '1" = 10\'',
  '1" = 20\'',
  '1" = 30\'',
  '1" = 40\'',
  '1" = 50\'',
  '1" = 60\'',
  '1" = 100\'',
  '1" = 200\'',
  // Site/civil scales
  '1" = 10\'-0"',
  '1" = 20\'-0"',
  '1" = 40\'-0"',
  // Detail scales
  '1-1/2" = 1\'-0"',
  '3" = 1\'-0"',
  '6" = 1\'-0"',
  // Full scale
  'FULL SCALE',
  '1:1',
  // Metric scales
  '1:10',
  '1:20',
  '1:50',
  '1:100',
  '1:200',
  '1:500',
  // Special
  'NTS',
  'AS NOTED',
  'VARIES',
]

/**
 * Normalize scale string to consistent format
 * - Uses ' for feet and " for inches
 * - Removes extra spaces
 * - Standardizes common variations
 */
export function normalizeScale(scale: string | null | undefined): string {
  if (!scale) return ''

  let normalized = scale.trim().toUpperCase()

  // Handle special cases first
  if (normalized === 'NTS' || normalized === 'N.T.S.' || normalized === 'NOT TO SCALE') {
    return 'NTS'
  }
  if (normalized === 'AS NOTED' || normalized === 'AS-NOTED') {
    return 'AS NOTED'
  }
  if (normalized === 'VARIES' || normalized === 'VAR' || normalized === 'VAR.') {
    return 'VARIES'
  }
  if (normalized === 'FULL' || normalized === 'FULL SCALE' || normalized === 'F.S.') {
    return 'FULL SCALE'
  }

  // Normalize metric scales (1:XX format)
  const metricMatch = normalized.match(/^1\s*:\s*(\d+)$/)
  if (metricMatch) {
    return `1:${metricMatch[1]}`
  }

  // Normalize feet/inches notation
  // Replace various feet notations with '
  normalized = normalized
    .replace(/\bFEET\b/gi, "'")
    .replace(/\bFT\.?\b/gi, "'")
    .replace(/'/g, "'")  // Smart quote to straight
    .replace(/′/g, "'")  // Prime symbol to apostrophe

  // Replace various inches notations with "
  normalized = normalized
    .replace(/\bINCHES\b/gi, '"')
    .replace(/\bIN\.?\b/gi, '"')
    .replace(/"/g, '"')  // Smart quote to straight
    .replace(/″/g, '"')  // Double prime to quote
    .replace(/''/g, '"') // Two apostrophes to quote

  // Remove extra spaces
  normalized = normalized.replace(/\s+/g, ' ').trim()

  // Try to parse and reformat architectural scale: X" = Y'-Z" or X/Y" = Z'-0"
  // Pattern: fraction or number, inches, equals, feet-inches
  const archMatch = normalized.match(
    /^(\d+(?:[-\/]\d+)?)\s*"\s*=\s*(\d+)\s*'(?:\s*[-]?\s*(\d+)\s*")?$/
  )
  if (archMatch) {
    const [, inches, feet, feetInches = '0'] = archMatch
    return `${inches}" = ${feet}'-${feetInches}"`
  }

  // Pattern for engineering: 1" = XX'
  const engMatch = normalized.match(/^(\d+)\s*"\s*=\s*(\d+)\s*'$/)
  if (engMatch) {
    const [, inches, feet] = engMatch
    return `${inches}" = ${feet}'`
  }

  // Clean up any remaining formatting issues
  // Ensure consistent spacing around =
  normalized = normalized.replace(/\s*=\s*/g, ' = ')

  // Ensure no space before ' or "
  normalized = normalized.replace(/\s+'/g, "'")
  normalized = normalized.replace(/\s+"/g, '"')

  // Ensure consistent feet-inches format: X'-Y"
  normalized = normalized.replace(/(\d+)'\s*-?\s*(\d+)"/g, "$1'-$2\"")

  return normalized
}

/**
 * Get scale suggestions based on OCR result
 * Returns array of possible scales, sorted by likelihood
 */
export function getScaleSuggestions(ocrScale: string | null | undefined): string[] {
  const suggestions: string[] = []

  if (!ocrScale) {
    // Return most common scales when no OCR data
    return ['1/4" = 1\'-0"', '1/8" = 1\'-0"', '1" = 20\'', 'NTS', 'AS NOTED']
  }

  const normalized = normalizeScale(ocrScale)

  // Add the normalized OCR result first if valid
  if (normalized && normalized !== ocrScale.trim().toUpperCase()) {
    suggestions.push(normalized)
  }

  // Find similar scales from common list
  const ocrLower = ocrScale.toLowerCase().replace(/\s+/g, '')

  for (const commonScale of COMMON_SCALES) {
    const commonLower = commonScale.toLowerCase().replace(/\s+/g, '')

    // Check for partial matches
    if (commonLower.includes(ocrLower) || ocrLower.includes(commonLower)) {
      if (!suggestions.includes(commonScale)) {
        suggestions.push(commonScale)
      }
    }

    // Check for number matches (e.g., "1/4" matches "1/4" = 1'-0"")
    const ocrNumbers: string[] = ocrScale.match(/\d+/g) || []
    const commonNumbers: string[] = commonScale.match(/\d+/g) || []

    if (ocrNumbers.length > 0 && commonNumbers.length > 0) {
      const hasMatchingNumber = ocrNumbers.some(n => commonNumbers.includes(n))
      if (hasMatchingNumber && !suggestions.includes(commonScale)) {
        suggestions.push(commonScale)
      }
    }
  }

  // Limit to top 5 suggestions
  return suggestions.slice(0, 5)
}
