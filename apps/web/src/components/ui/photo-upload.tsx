'use client'

import { useState, useRef } from 'react'
import { FileImage } from '@/components/ui/file-display'
import { uploadFile } from '@/lib/upload-client'

interface UploadedFile {
  id: string
  name: string
  storagePath: string
  type: string
  gpsLatitude: number | null
  gpsLongitude: number | null
}

interface PhotoUploadProps {
  projectId: string
  dailyLogId?: string
  onUpload?: (file: UploadedFile) => void
  onRemove?: (fileId: string) => void
  existingFiles?: UploadedFile[]
  maxFiles?: number
}

export function PhotoUpload({
  projectId,
  dailyLogId,
  onUpload,
  onRemove,
  existingFiles = [],
  maxFiles = 10
}: PhotoUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>(existingFiles)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const getGPSLocation = (): Promise<GeolocationPosition | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null)
        return
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 5000 }
      )
    })
  }

  const handleUpload = async (file: File) => {
    setError('')
    setUploading(true)

    try {
      // Get GPS location
      const position = await getGPSLocation()

      const result = await uploadFile(file, {
        projectId,
        dailyLogId,
        gpsLatitude: position?.coords.latitude,
        gpsLongitude: position?.coords.longitude
      })

      if (!result.success) {
        throw new Error(result.error || 'Upload failed')
      }

      const newFile: UploadedFile = {
        id: result.file!.id,
        name: result.file!.name,
        storagePath: result.file!.storagePath,
        type: result.file!.type,
        gpsLatitude: (result.file!.gpsLatitude as number) || null,
        gpsLongitude: (result.file!.gpsLongitude as number) || null
      }
      setFiles(prev => [...prev, newFile])
      onUpload?.(newFile)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles) return

    if (files.length + selectedFiles.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`)
      return
    }

    for (const file of Array.from(selectedFiles)) {
      await handleUpload(file)
    }

    // Reset input
    e.target.value = ''
  }

  const handleRemove = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
    onRemove?.(fileId)
  }

  const canAddMore = files.length < maxFiles

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Uploaded Files Grid */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {files.map(file => (
            <div key={file.id} className="relative group">
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                {file.type === 'image' ? (
                  <FileImage
                    fileId={file.id}
                    storagePath={file.storagePath}
                    alt={file.name}
                    className="w-full h-full object-cover"
                    fallback={
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    }
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                )}
              </div>
              <button
                onClick={() => handleRemove(file.id)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              {file.gpsLatitude && file.gpsLongitude && (
                <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                  <svg className="w-3 h-3 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  GPS
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Buttons */}
      {canAddMore && (
        <div className="flex gap-3">
          {/* Camera Button */}
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {uploading ? 'Uploading...' : 'Take Photo'}
          </button>

          {/* File Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {uploading ? 'Uploading...' : 'Choose File'}
          </button>
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      <p className="text-xs text-gray-500 dark:text-gray-400">
        {files.length}/{maxFiles} files uploaded. Supports images and PDFs (max 50MB each).
        {navigator.geolocation && ' GPS location will be captured automatically.'}
      </p>
    </div>
  )
}
