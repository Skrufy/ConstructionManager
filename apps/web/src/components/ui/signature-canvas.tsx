'use client'

import { useRef, useEffect, useState } from 'react'
import { X, RotateCcw, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SignatureCanvasProps {
  onSave: (signature: string) => void
  onCancel: () => void
  className?: string
}

export function SignatureCanvas({ onSave, onCancel, className }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    // Set canvas size to match container
    const resize = () => {
      const rect = container.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height

      // Redraw with white background after resize
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
    }

    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  const getPosition = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()

    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      }
    }

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    e.preventDefault()
    setIsDrawing(true)
    const { x, y } = getPosition(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    e.preventDefault()
    const { x, y } = getPosition(e)

    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#1f2937'
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasSignature(true)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  const saveSignature = () => {
    const canvas = canvasRef.current
    if (!canvas || !hasSignature) return

    const dataUrl = canvas.toDataURL('image/png')
    onSave(dataUrl)
  }

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Sign Below</h3>
        <button
          type="button"
          onClick={onCancel}
          className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div
        ref={containerRef}
        className="relative bg-white border-2 border-gray-300 rounded-xl overflow-hidden touch-none"
        style={{ height: '200px' }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="absolute inset-0 cursor-crosshair"
        />

        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-gray-400 text-sm">Draw your signature here</p>
          </div>
        )}

        {/* Guide line */}
        <div className="absolute bottom-12 left-4 right-4 border-b border-gray-300 border-dashed pointer-events-none" />
      </div>

      <div className="flex gap-3 mt-4">
        <button
          type="button"
          onClick={clearCanvas}
          className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 flex items-center justify-center gap-2 font-medium"
        >
          <RotateCcw className="h-5 w-5" />
          Clear
        </button>
        <button
          type="button"
          onClick={saveSignature}
          disabled={!hasSignature}
          className="flex-1 py-3 px-4 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
        >
          <Check className="h-5 w-5" />
          Save Signature
        </button>
      </div>
    </div>
  )
}

interface SignatureDisplayProps {
  signature: string
  onClear: () => void
  className?: string
}

export function SignatureDisplay({ signature, onClear, className }: SignatureDisplayProps) {
  return (
    <div className={cn('relative', className)}>
      <div className="bg-white border-2 border-green-200 rounded-xl p-4">
        <img
          src={signature}
          alt="Signature"
          className="max-h-24 mx-auto"
        />
      </div>
      <button
        type="button"
        onClick={onClear}
        className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
      >
        <X className="h-4 w-4" />
      </button>
      <p className="text-xs text-green-600 text-center mt-2 font-medium">Signature captured</p>
    </div>
  )
}
