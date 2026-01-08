'use client'

import { useState, useEffect } from 'react'
import { Loader2, Sparkles, ChevronDown, ChevronUp, Check, X } from 'lucide-react'
import { type ExtractedDocumentData } from '@/hooks/useDocumentAnalysis'

interface OcrSuggestionsProps {
  file: File
  extractedData: ExtractedDocumentData | null
  isLoading: boolean
  error: string | null
  onApplySuggestion?: (field: string, value: string) => void
  onApplyProject?: (projectId: string, projectName: string) => void
  compact?: boolean
}

export function OcrSuggestions({
  file,
  extractedData,
  isLoading,
  error,
  onApplySuggestion,
  onApplyProject,
  compact = false
}: OcrSuggestionsProps) {
  const [expanded, setExpanded] = useState(!compact)
  const [appliedFields, setAppliedFields] = useState<Set<string>>(new Set())

  // Reset applied fields when file changes
  useEffect(() => {
    setAppliedFields(new Set())
  }, [file])

  // Check if file type supports OCR
  const supportedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  if (!supportedTypes.includes(file.type)) {
    return null
  }

  if (isLoading) {
    return (
      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-2 text-blue-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Analyzing document...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
        <p className="text-sm text-yellow-700">
          Could not analyze document: {error}
        </p>
      </div>
    )
  }

  if (!extractedData) {
    return null
  }

  const hasDrawingInfo = extractedData.drawingInfo && Object.values(extractedData.drawingInfo).some(v => v)
  const hasLocationInfo = extractedData.locationInfo && Object.values(extractedData.locationInfo).some(v => v)
  const hasDates = extractedData.dates && Object.values(extractedData.dates).some(v => v)
  const hasSuggestions = extractedData.projectMatch || hasDrawingInfo || hasLocationInfo || hasDates

  if (!hasSuggestions) {
    return (
      <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No metadata could be extracted from this document.
        </p>
      </div>
    )
  }

  const handleApply = (field: string, value: string) => {
    if (onApplySuggestion) {
      onApplySuggestion(field, value)
      setAppliedFields(prev => new Set(prev).add(field))
    }
  }

  const handleApplyProjectMatch = () => {
    if (extractedData.projectMatch && onApplyProject) {
      onApplyProject(extractedData.projectMatch.id, extractedData.projectMatch.name)
      setAppliedFields(prev => new Set(prev).add('project'))
    }
  }

  const SuggestionItem = ({ label, value, field }: { label: string; value: string; field: string }) => {
    const isApplied = appliedFields.has(field)
    return (
      <div className="flex items-center justify-between py-1">
        <span className="text-sm text-gray-600 dark:text-gray-400">{label}:</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{value}</span>
          {onApplySuggestion && !isApplied && (
            <button
              onClick={() => handleApply(field, value)}
              className="p-1 hover:bg-green-100 rounded text-green-600"
              title="Apply suggestion"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          )}
          {isApplied && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <Check className="h-3 w-3" />
              Applied
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-2 text-purple-700">
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-medium">AI-Extracted Metadata</span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-purple-600" />
        ) : (
          <ChevronDown className="h-4 w-4 text-purple-600" />
        )}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {/* Project Match */}
          {extractedData.projectMatch && (
            <div className="p-2 bg-white rounded border border-purple-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Matched Project</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{extractedData.projectMatch.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Confidence: {Math.round(extractedData.projectMatch.confidence * 100)}%
                  </p>
                </div>
                {onApplyProject && !appliedFields.has('project') && (
                  <button
                    onClick={handleApplyProjectMatch}
                    className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 flex items-center gap-1"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Use Project
                  </button>
                )}
                {appliedFields.has('project') && (
                  <span className="text-sm text-green-600 flex items-center gap-1">
                    <Check className="h-4 w-4" />
                    Applied
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Drawing Info */}
          {hasDrawingInfo && (
            <div className="p-2 bg-white rounded border border-purple-100">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Drawing Information</p>
              {extractedData.drawingInfo?.drawingNumber && (
                <SuggestionItem label="Drawing #" value={extractedData.drawingInfo.drawingNumber} field="drawingNumber" />
              )}
              {extractedData.drawingInfo?.sheetNumber && (
                <SuggestionItem label="Sheet #" value={extractedData.drawingInfo.sheetNumber} field="sheetNumber" />
              )}
              {extractedData.drawingInfo?.revision && (
                <SuggestionItem label="Revision" value={extractedData.drawingInfo.revision} field="revision" />
              )}
              {extractedData.drawingInfo?.discipline && (
                <SuggestionItem label="Discipline" value={extractedData.drawingInfo.discipline} field="discipline" />
              )}
              {extractedData.drawingInfo?.scale && (
                <SuggestionItem label="Scale" value={extractedData.drawingInfo.scale} field="scale" />
              )}
            </div>
          )}

          {/* Location Info */}
          {hasLocationInfo && (
            <div className="p-2 bg-white rounded border border-purple-100">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Location</p>
              {extractedData.locationInfo?.building && (
                <SuggestionItem label="Building" value={extractedData.locationInfo.building} field="building" />
              )}
              {extractedData.locationInfo?.floor && (
                <SuggestionItem label="Floor" value={extractedData.locationInfo.floor} field="floor" />
              )}
              {extractedData.locationInfo?.zone && (
                <SuggestionItem label="Zone" value={extractedData.locationInfo.zone} field="zone" />
              )}
              {extractedData.locationInfo?.room && (
                <SuggestionItem label="Room" value={extractedData.locationInfo.room} field="room" />
              )}
            </div>
          )}

          {/* Dates */}
          {hasDates && (
            <div className="p-2 bg-white rounded border border-purple-100">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Dates</p>
              {extractedData.dates?.documentDate && (
                <SuggestionItem label="Document Date" value={extractedData.dates.documentDate} field="documentDate" />
              )}
              {extractedData.dates?.revisionDate && (
                <SuggestionItem label="Revision Date" value={extractedData.dates.revisionDate} field="revisionDate" />
              )}
              {extractedData.dates?.approvalDate && (
                <SuggestionItem label="Approval Date" value={extractedData.dates.approvalDate} field="approvalDate" />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
