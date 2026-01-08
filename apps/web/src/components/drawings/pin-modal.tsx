'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  X,
  MapPin,
  MessageSquare,
  AlertTriangle,
  FileQuestion,
  ClipboardList,
  Search,
  Plus,
  Check,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import type { LinkedEntity, NormalizedPoint } from '@/types/annotations'

type LinkType = 'COMMENT' | 'ISSUE' | 'RFI' | 'PUNCH_LIST_ITEM'

interface PinModalProps {
  isOpen: boolean
  onClose: () => void
  position: NormalizedPoint
  pageNumber: number
  drawingId: string
  projectId: string
  onSave: (data: {
    position: NormalizedPoint
    pageNumber: number
    label?: string
    linkedEntity?: LinkedEntity
    comment?: string
  }) => Promise<void>
}

interface SearchResult {
  id: string
  title: string
  status?: string
  type: LinkType
}

const LINK_TYPES = [
  { type: 'COMMENT' as LinkType, icon: MessageSquare, label: 'Comment', description: 'Add a text note' },
  { type: 'ISSUE' as LinkType, icon: AlertTriangle, label: 'Issue', description: 'Link to a project issue' },
  { type: 'RFI' as LinkType, icon: FileQuestion, label: 'RFI', description: 'Link to an RFI' },
  { type: 'PUNCH_LIST_ITEM' as LinkType, icon: ClipboardList, label: 'Punch List', description: 'Create or link punch list item' },
]

export function PinModal({
  isOpen,
  onClose,
  position,
  pageNumber,
  drawingId,
  projectId,
  onSave,
}: PinModalProps) {
  const [linkType, setLinkType] = useState<LinkType>('COMMENT')
  const [isCreatingNew, setIsCreatingNew] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [selectedEntity, setSelectedEntity] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state for new entities
  const [comment, setComment] = useState('')
  const [issueTitle, setIssueTitle] = useState('')
  const [issueDescription, setIssueDescription] = useState('')
  const [punchListTitle, setPunchListTitle] = useState('')
  const [punchListDescription, setPunchListDescription] = useState('')

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLinkType('COMMENT')
      setIsCreatingNew(true)
      setSearchQuery('')
      setSearchResults([])
      setSelectedEntity(null)
      setComment('')
      setIssueTitle('')
      setIssueDescription('')
      setPunchListTitle('')
      setPunchListDescription('')
    }
  }, [isOpen])

  // Search for existing entities
  const searchEntities = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([])
      return
    }

    setSearchLoading(true)
    try {
      // In a real implementation, this would search the actual API
      // For now, we'll simulate the search
      const results: SearchResult[] = []

      if (linkType === 'ISSUE' || linkType === 'RFI') {
        // Simulated search - in production, call the actual API
        // const response = await fetch(`/api/issues?projectId=${projectId}&search=${query}`)
      } else if (linkType === 'PUNCH_LIST_ITEM') {
        // const response = await fetch(`/api/punch-list?projectId=${projectId}&search=${query}`)
      }

      setSearchResults(results)
    } catch (error) {
      console.error('Error searching entities:', error)
    } finally {
      setSearchLoading(false)
    }
  }, [linkType, projectId])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isCreatingNew && searchQuery) {
        searchEntities(searchQuery)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, isCreatingNew, searchEntities])

  const handleSave = async () => {
    setSaving(true)
    try {
      let linkedEntity: LinkedEntity | undefined
      let labelText: string | undefined

      if (linkType === 'COMMENT') {
        // Just a comment, no linked entity
        labelText = comment.slice(0, 50)
      } else if (isCreatingNew) {
        // Create new entity inline
        if (linkType === 'ISSUE') {
          // Create new issue and get its ID
          // const response = await fetch('/api/issues', { method: 'POST', body: ... })
          // linkedEntity = { type: 'ISSUE', id: response.id, title: issueTitle }
          labelText = issueTitle
          linkedEntity = {
            type: 'ISSUE',
            id: 'placeholder-' + Date.now(), // Would be actual ID from API
            title: issueTitle,
          }
        } else if (linkType === 'RFI') {
          labelText = issueTitle
          linkedEntity = {
            type: 'RFI',
            id: 'placeholder-' + Date.now(),
            title: issueTitle,
          }
        } else if (linkType === 'PUNCH_LIST_ITEM') {
          labelText = punchListTitle
          linkedEntity = {
            type: 'PUNCH_LIST_ITEM',
            id: 'placeholder-' + Date.now(),
            title: punchListTitle,
          }
        }
      } else if (selectedEntity) {
        // Link to existing entity
        linkedEntity = {
          type: selectedEntity.type,
          id: selectedEntity.id,
          title: selectedEntity.title,
          status: selectedEntity.status,
        }
        labelText = selectedEntity.title
      }

      await onSave({
        position,
        pageNumber,
        label: labelText,
        linkedEntity,
        comment: linkType === 'COMMENT' ? comment : undefined,
      })

      onClose()
    } catch (error) {
      console.error('Error saving pin:', error)
    } finally {
      setSaving(false)
    }
  }

  const canSave = () => {
    if (linkType === 'COMMENT') return comment.trim().length > 0
    if (isCreatingNew) {
      if (linkType === 'ISSUE' || linkType === 'RFI') return issueTitle.trim().length > 0
      if (linkType === 'PUNCH_LIST_ITEM') return punchListTitle.trim().length > 0
    }
    return selectedEntity !== null
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <MapPin className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Add Pin</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Position: ({(position.x * 100).toFixed(0)}%, {(position.y * 100).toFixed(0)}%)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Link type selector */}
        <div className="p-4 border-b bg-gray-50">
          <p className="text-sm font-medium text-gray-700 mb-3">What would you like to add?</p>
          <div className="grid grid-cols-2 gap-2">
            {LINK_TYPES.map(({ type, icon: Icon, label, description }) => (
              <button
                key={type}
                onClick={() => {
                  setLinkType(type)
                  setIsCreatingNew(true)
                  setSelectedEntity(null)
                }}
                className={`flex items-start gap-3 p-3 rounded-xl text-left transition-all ${
                  linkType === type
                    ? 'bg-indigo-100 border-2 border-indigo-500'
                    : 'bg-white border-2 border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon className={`h-5 w-5 mt-0.5 ${linkType === type ? 'text-indigo-600' : 'text-gray-400'}`} />
                <div>
                  <p className={`font-medium text-sm ${linkType === type ? 'text-indigo-900' : 'text-gray-900'}`}>
                    {label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Content based on link type */}
        <div className="p-4">
          {linkType === 'COMMENT' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comment
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Enter your note or observation..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                rows={4}
                autoFocus
              />
            </div>
          )}

          {(linkType === 'ISSUE' || linkType === 'RFI') && (
            <div>
              {/* Create new or link existing toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setIsCreatingNew(true)}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isCreatingNew
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Plus className="h-4 w-4 inline mr-1" />
                  Create New
                </button>
                <button
                  onClick={() => setIsCreatingNew(false)}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    !isCreatingNew
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Search className="h-4 w-4 inline mr-1" />
                  Link Existing
                </button>
              </div>

              {isCreatingNew ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={issueTitle}
                      onChange={(e) => setIssueTitle(e.target.value)}
                      placeholder={`Enter ${linkType === 'ISSUE' ? 'issue' : 'RFI'} title...`}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description (optional)
                    </label>
                    <textarea
                      value={issueDescription}
                      onChange={(e) => setIssueDescription(e.target.value)}
                      placeholder="Describe the issue or question..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                      rows={3}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <div className="relative mb-4">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={`Search ${linkType === 'ISSUE' ? 'issues' : 'RFIs'}...`}
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      autoFocus
                    />
                    {searchLoading && (
                      <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 animate-spin" />
                    )}
                  </div>

                  {/* Search results */}
                  <div className="max-h-48 overflow-y-auto">
                    {searchResults.length > 0 ? (
                      <div className="space-y-2">
                        {searchResults.map((result) => (
                          <button
                            key={result.id}
                            onClick={() => setSelectedEntity(result)}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                              selectedEntity?.id === result.id
                                ? 'bg-indigo-100 border-2 border-indigo-500'
                                : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                            }`}
                          >
                            {selectedEntity?.id === result.id && (
                              <Check className="h-5 w-5 text-indigo-600" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{result.title}</p>
                              {result.status && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">{result.status}</p>
                              )}
                            </div>
                            <ExternalLink className="h-4 w-4 text-gray-400" />
                          </button>
                        ))}
                      </div>
                    ) : searchQuery.length >= 2 && !searchLoading ? (
                      <p className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No {linkType === 'ISSUE' ? 'issues' : 'RFIs'} found
                      </p>
                    ) : (
                      <p className="text-center py-8 text-gray-400">
                        Type to search existing {linkType === 'ISSUE' ? 'issues' : 'RFIs'}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {linkType === 'PUNCH_LIST_ITEM' && (
            <div>
              {/* Create new or link existing toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setIsCreatingNew(true)}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isCreatingNew
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Plus className="h-4 w-4 inline mr-1" />
                  Create New
                </button>
                <button
                  onClick={() => setIsCreatingNew(false)}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    !isCreatingNew
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Search className="h-4 w-4 inline mr-1" />
                  Link Existing
                </button>
              </div>

              {isCreatingNew ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Item Title
                    </label>
                    <input
                      type="text"
                      value={punchListTitle}
                      onChange={(e) => setPunchListTitle(e.target.value)}
                      placeholder="E.g., Missing outlet cover plate"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description (optional)
                    </label>
                    <textarea
                      value={punchListDescription}
                      onChange={(e) => setPunchListDescription(e.target.value)}
                      placeholder="Additional details about the punch item..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                      rows={3}
                    />
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg">
                    <p className="text-sm text-amber-800">
                      The pin location will be saved with this punch list item for easy reference.
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="relative mb-4">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search punch list items..."
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      autoFocus
                    />
                    {searchLoading && (
                      <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 animate-spin" />
                    )}
                  </div>

                  {/* Search results */}
                  <div className="max-h-48 overflow-y-auto">
                    {searchResults.length > 0 ? (
                      <div className="space-y-2">
                        {searchResults.map((result) => (
                          <button
                            key={result.id}
                            onClick={() => setSelectedEntity(result)}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                              selectedEntity?.id === result.id
                                ? 'bg-indigo-100 border-2 border-indigo-500'
                                : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                            }`}
                          >
                            {selectedEntity?.id === result.id && (
                              <Check className="h-5 w-5 text-indigo-600" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{result.title}</p>
                              {result.status && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">{result.status}</p>
                              )}
                            </div>
                            <ExternalLink className="h-4 w-4 text-gray-400" />
                          </button>
                        ))}
                      </div>
                    ) : searchQuery.length >= 2 && !searchLoading ? (
                      <p className="text-center py-8 text-gray-500 dark:text-gray-400">No punch items found</p>
                    ) : (
                      <p className="text-center py-8 text-gray-400">
                        Type to search existing punch list items
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave() || saving}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4" />
                Save Pin
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
