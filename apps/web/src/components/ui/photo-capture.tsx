'use client'

import { useState, useRef, useEffect } from 'react'
import { Camera, Upload, X, Image as ImageIcon, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PhotoCaptureProps {
  photos: File[]
  onPhotosChange: (photos: File[]) => void
  maxPhotos?: number
  className?: string
}

export function PhotoCapture({
  photos,
  onPhotosChange,
  maxPhotos = 10,
  className
}: PhotoCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [previews, setPreviews] = useState<string[]>([])
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile device for UI hints
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase())
      setIsMobile(isMobileDevice)
    }
    checkMobile()
  }, [])

  // Generate preview URLs when photos change
  const updatePreviews = (files: File[]) => {
    // Revoke old URLs to prevent memory leaks
    previews.forEach(url => URL.revokeObjectURL(url))

    const newPreviews = files.map(file => URL.createObjectURL(file))
    setPreviews(newPreviews)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const newPhotos = [...photos, ...files].slice(0, maxPhotos)
    onPhotosChange(newPhotos)
    updatePreviews(newPhotos)

    // Reset input so same file can be selected again
    e.target.value = ''
  }

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const newPhotos = [...photos, ...files].slice(0, maxPhotos)
    onPhotosChange(newPhotos)
    updatePreviews(newPhotos)

    // Reset input
    e.target.value = ''
  }

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index)
    onPhotosChange(newPhotos)

    // Revoke the URL being removed
    if (previews[index]) {
      URL.revokeObjectURL(previews[index])
    }
    setPreviews(previews.filter((_, i) => i !== index))
  }

  const canAddMore = photos.length < maxPhotos

  return (
    <div className={cn('space-y-4', className)}>
      {/* Photo Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {photos.map((photo, index) => (
            <div
              key={`${photo.name}-${index}`}
              className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group"
            >
              {previews[index] && (
                <img
                  src={previews[index]}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              )}
              {/* Always visible delete button on mobile for easier tap */}
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className={cn(
                  'absolute top-1 right-1 p-2 bg-red-500 text-white rounded-full transition-opacity',
                  'min-w-[36px] min-h-[36px] flex items-center justify-center',
                  isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                )}
                aria-label={`Remove photo ${index + 1}`}
              >
                <X className="h-4 w-4" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-2 py-1 truncate">
                {photo.name}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Photo Buttons - Large tap targets for mobile */}
      {canAddMore && (
        <div className="flex gap-3">
          {/* Take Photo Button - Opens camera directly on mobile */}
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="flex-1 min-h-[100px] p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary-500 hover:bg-primary-50 active:bg-primary-100 transition-colors touch-manipulation"
          >
            <div className="flex flex-col items-center gap-2 text-gray-600 dark:text-gray-400">
              <Camera className="h-10 w-10" />
              <span className="font-semibold text-base">Take Photo</span>
              {isMobile && (
                <span className="text-xs text-gray-400">Opens camera</span>
              )}
            </div>
          </button>

          {/* Upload Photo Button - Opens file picker / photo library */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 min-h-[100px] p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary-500 hover:bg-primary-50 active:bg-primary-100 transition-colors touch-manipulation"
          >
            <div className="flex flex-col items-center gap-2 text-gray-600 dark:text-gray-400">
              <Upload className="h-10 w-10" />
              <span className="font-semibold text-base">
                {isMobile ? 'Photo Library' : 'Upload'}
              </span>
              {isMobile && (
                <span className="text-xs text-gray-400">Choose existing</span>
              )}
            </div>
          </button>
        </div>
      )}

      {/* Hidden File Input - For selecting from gallery/files */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/heic,image/heif,image/webp,image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        aria-label="Select photos from library"
      />

      {/* Hidden Camera Input - For taking new photos
          capture="environment" = rear camera (preferred for work documentation)
          Works on iOS Safari, Android Chrome, and other mobile browsers
      */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/heic,image/heif,image/webp,image/*"
        capture="environment"
        onChange={handleCameraCapture}
        className="hidden"
        aria-label="Take photo with camera"
      />

      {/* Photo Count & Help Text */}
      <div className="text-center space-y-1">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {photos.length} of {maxPhotos} photos
          {!canAddMore && ' (maximum reached)'}
        </p>
        {isMobile && photos.length === 0 && (
          <p className="text-xs text-gray-400">
            Tap buttons above to add photos from your device
          </p>
        )}
      </div>
    </div>
  )
}
