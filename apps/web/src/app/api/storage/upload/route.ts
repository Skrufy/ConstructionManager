import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { uploadToSupabase } from '@/lib/supabase-storage'

export const dynamic = 'force-dynamic'

// POST /api/storage/upload - Upload a file from base64 data
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult

    const body = await request.json()
    const { path, data } = body

    if (!path || !data) {
      return NextResponse.json({ error: 'Path and data are required' }, { status: 400 })
    }

    // Validate path to prevent directory traversal
    if (path.includes('..') || path.startsWith('/')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }

    // Decode base64 data
    let buffer: Buffer
    try {
      buffer = Buffer.from(data, 'base64')
    } catch {
      return NextResponse.json({ error: 'Invalid base64 data' }, { status: 400 })
    }

    // Validate file size (max 10MB for base64 uploads)
    const maxSize = 10 * 1024 * 1024
    if (buffer.length > maxSize) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    // Determine content type from path extension
    const ext = path.split('.').pop()?.toLowerCase() || ''
    let contentType = 'application/octet-stream'
    if (['jpg', 'jpeg'].includes(ext)) contentType = 'image/jpeg'
    else if (ext === 'png') contentType = 'image/png'
    else if (ext === 'gif') contentType = 'image/gif'
    else if (ext === 'webp') contentType = 'image/webp'
    else if (ext === 'pdf') contentType = 'application/pdf'

    // Upload to Supabase storage
    const result = await uploadToSupabase(buffer, path, contentType)

    if (!result.success) {
      console.error('Storage upload failed:', result.error)
      return NextResponse.json({ error: result.error || 'Upload failed' }, { status: 500 })
    }

    return NextResponse.json({
      path: result.storagePath,
      url: null // Could generate signed URL if needed
    }, { status: 201 })
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
