import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { supabaseStorage, generateFileName } from '@/lib/supabase-storage'

export const dynamic = 'force-dynamic'

const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || 'construction-files'
const MAX_LOGO_SIZE = 2 * 1024 * 1024 // 2MB
const MAX_FAVICON_SIZE = 500 * 1024 // 500KB

const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml']
const ALLOWED_FAVICON_TYPES = ['image/png', 'image/x-icon', 'image/vnd.microsoft.icon']

// POST /api/storage/branding - Upload branding images (logo or favicon)
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Only admins can upload branding
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only administrators can upload branding' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const type = formData.get('type') as string | null

    if (!file || !type) {
      return NextResponse.json({ error: 'File and type are required' }, { status: 400 })
    }

    if (type !== 'logo' && type !== 'favicon') {
      return NextResponse.json({ error: 'Type must be "logo" or "favicon"' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = type === 'logo' ? ALLOWED_LOGO_TYPES : ALLOWED_FAVICON_TYPES
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}`
      }, { status: 400 })
    }

    // Validate file size
    const maxSize = type === 'logo' ? MAX_LOGO_SIZE : MAX_FAVICON_SIZE
    if (file.size > maxSize) {
      return NextResponse.json({
        error: `File too large. Maximum size: ${maxSize / 1024}KB`
      }, { status: 400 })
    }

    // Generate unique filename
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
    const filename = `${type}-${Date.now()}.${ext}`
    const storagePath = `branding/${filename}`

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase
    const { data, error } = await supabaseStorage.storage
      .from(BUCKET_NAME)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true, // Allow overwriting for branding
      })

    if (error) {
      console.error('Branding upload error:', error)
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }

    // Get public URL for the uploaded file
    const { data: urlData } = supabaseStorage.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath)

    return NextResponse.json({
      path: data.path,
      url: urlData.publicUrl,
    }, { status: 201 })
  } catch (error) {
    console.error('Branding upload exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
