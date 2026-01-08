'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Download,
  FileImage,
  FileText,
  Map,
  ChevronDown,
  Check,
  Loader2,
  X,
} from 'lucide-react'

interface ExportOption {
  id: string
  label: string
  description: string
  icon: any
  format: string
  available: boolean
}

interface ExportMenuProps {
  mapName: string
  mapId: string
  onExport?: (format: string) => Promise<void>
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    id: 'jpeg',
    label: 'JPEG Image',
    description: 'High-quality image for presentations',
    icon: FileImage,
    format: 'jpeg',
    available: true,
  },
  {
    id: 'png',
    label: 'PNG Image',
    description: 'Lossless image with transparency',
    icon: FileImage,
    format: 'png',
    available: true,
  },
  {
    id: 'pdf',
    label: 'PDF Report',
    description: 'Print-ready document with metadata',
    icon: FileText,
    format: 'pdf',
    available: true,
  },
  {
    id: 'geotiff',
    label: 'GeoTIFF',
    description: 'Georeferenced image for GIS',
    icon: Map,
    format: 'geotiff',
    available: false, // Requires backend processing
  },
  {
    id: 'kmz',
    label: 'KMZ (Google Earth)',
    description: 'View in Google Earth',
    icon: Map,
    format: 'kmz',
    available: false, // Requires backend processing
  },
]

export function ExportMenu({ mapName, mapId, onExport }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [exporting, setExporting] = useState<string | null>(null)
  const [exportSuccess, setExportSuccess] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleExport = async (option: ExportOption) => {
    if (!option.available || exporting) return

    setExporting(option.id)
    try {
      if (onExport) {
        await onExport(option.format)
      } else {
        // Default export behavior - simulate download
        await simulateExport(option.format, mapName)
      }
      setExportSuccess(option.id)
      setTimeout(() => {
        setExportSuccess(null)
        setIsOpen(false)
      }, 1500)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setExporting(null)
    }
  }

  const simulateExport = async (format: string, name: string) => {
    // Simulate export delay
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // For demo purposes, create a simple download
    const filename = `${name.replace(/\s+/g, '_')}_export.${format}`

    if (format === 'pdf') {
      // Generate a simple PDF report
      const pdfContent = `
        DroneDeploy Export Report
        ========================
        Map: ${name}
        Date: ${new Date().toLocaleDateString()}
        Format: ${format.toUpperCase()}
      `
      const blob = new Blob([pdfContent], { type: 'application/pdf' })
      downloadBlob(blob, filename)
    } else {
      // For images, we'd normally capture the map canvas
      // For demo, create a placeholder
      const canvas = document.createElement('canvas')
      canvas.width = 1920
      canvas.height = 1080
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#1a1a2e'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = '#ffffff'
        ctx.font = '48px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(name, canvas.width / 2, canvas.height / 2)
        ctx.font = '24px sans-serif'
        ctx.fillStyle = '#888888'
        ctx.fillText('Orthomosaic Export', canvas.width / 2, canvas.height / 2 + 50)
      }

      canvas.toBlob((blob) => {
        if (blob) downloadBlob(blob, filename)
      }, `image/${format}`)
    }
  }

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
      >
        <Download className="h-4 w-4" />
        Export
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Export Map</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{mapName}</p>
          </div>

          <div className="py-2">
            {EXPORT_OPTIONS.map((option) => {
              const Icon = option.icon
              const isExporting = exporting === option.id
              const isSuccess = exportSuccess === option.id

              return (
                <button
                  key={option.id}
                  onClick={() => handleExport(option)}
                  disabled={!option.available || isExporting}
                  className={`w-full px-4 py-3 flex items-start gap-3 transition-colors ${
                    option.available
                      ? 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer'
                      : 'opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg ${
                      option.available
                        ? 'bg-blue-100 dark:bg-blue-900/30'
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}
                  >
                    {isExporting ? (
                      <Loader2 className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin" />
                    ) : isSuccess ? (
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <Icon
                        className={`h-4 w-4 ${
                          option.available
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-gray-400 dark:text-gray-500'
                        }`}
                      />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <p
                        className={`text-sm font-medium ${
                          option.available
                            ? 'text-gray-900 dark:text-gray-100'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {option.label}
                      </p>
                      {!option.available && (
                        <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-500 dark:text-gray-400">
                          Coming Soon
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{option.description}</p>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              GeoTIFF and KMZ exports require DroneDeploy API integration
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
