import { supabaseAdmin } from './supabase'
import { sanitizeFilename, createStoragePath, isMediaFile } from './file-utils'

export interface CreateUploadSessionOptions {
  userId: string
  filename: string
  fileSize: number
  mimeType?: string
  maxFileSize?: number // in bytes
}

export interface UploadSession {
  sessionId: string
  uploadUrl: string
  storageKey: string
  expiresAt: string
  metadata: {
    originalFilename: string
    sanitizedFilename: string
    fileSize: number
    mimeType?: string
    userId: string
  }
}

export interface DirectUploadResult {
  success: boolean
  uploadSession?: UploadSession
  error?: string
}

/**
 * Creates a direct upload session with signed URL for client-side upload
 * @param options Upload session options
 * @returns Upload session with signed URL
 */
export async function createDirectUploadSession(
  options: CreateUploadSessionOptions
): Promise<DirectUploadResult> {
  try {
    const {
      userId,
      filename,
      fileSize,
      mimeType,
      maxFileSize = 2 * 1024 * 1024 * 1024 // 2GB default
    } = options

    // Validate inputs
    if (!userId || !filename) {
      return {
        success: false,
        error: 'userId and filename are required'
      }
    }

    if (fileSize <= 0) {
      return {
        success: false,
        error: 'Invalid file size'
      }
    }

    if (fileSize > maxFileSize) {
      return {
        success: false,
        error: `File size exceeds maximum allowed size of ${Math.round(maxFileSize / 1024 / 1024)}MB`
      }
    }

    // Check if file type is supported
    if (!isMediaFile(filename)) {
      return {
        success: false,
        error: 'Unsupported file type. Please upload a video or audio file.'
      }
    }

    // Sanitize filename and create storage path
    const sanitizedFilename = sanitizeFilename(filename)
    const storageKey = createStoragePath(userId, sanitizedFilename, 'media')

    console.log('📤 Creating direct upload session:', {
      userId,
      originalFilename: filename,
      sanitizedFilename,
      storageKey,
      fileSize: `${Math.round(fileSize / 1024 / 1024 * 100) / 100}MB`
    })

    // Create signed URL for upload (expires in 1 hour)
    const expiresIn = 3600 // 1 hour
    const { data: uploadData, error: signError } = await supabaseAdmin.storage
      .from('media')
      .createSignedUploadUrl(storageKey, {
        expiresIn,
        upsert: true
      })

    if (signError || !uploadData) {
      console.error('❌ Failed to create signed upload URL:', signError)
      return {
        success: false,
        error: 'Failed to create upload URL'
      }
    }

    // Generate session ID and expiry
    const sessionId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

    // Store session metadata in database
    const sessionMetadata = {
      originalFilename: filename,
      sanitizedFilename,
      fileSize,
      mimeType,
      userId,
      storageKey,
      uploadUrl: uploadData.signedUrl,
      status: 'pending',
      expiresAt
    }

    const { error: dbError } = await supabaseAdmin
      .from('upload_sessions')
      .insert({
        id: sessionId,
        user_id: userId,
        storage_key: storageKey,
        metadata: sessionMetadata,
        expires_at: expiresAt,
        status: 'pending'
      })

    if (dbError) {
      console.error('❌ Failed to store upload session:', dbError)
      return {
        success: false,
        error: 'Failed to create upload session'
      }
    }

    const uploadSession: UploadSession = {
      sessionId,
      uploadUrl: uploadData.signedUrl,
      storageKey,
      expiresAt,
      metadata: {
        originalFilename: filename,
        sanitizedFilename,
        fileSize,
        mimeType,
        userId
      }
    }

    console.log('✅ Direct upload session created:', sessionId)

    return {
      success: true,
      uploadSession
    }

  } catch (error: any) {
    console.error('❌ Error creating direct upload session:', error)
    return {
      success: false,
      error: error.message || 'Failed to create upload session'
    }
  }
}

/**
 * Confirms that an upload session was completed and creates media file record
 * @param sessionId Upload session ID
 * @returns Upload confirmation result
 */
export async function confirmUploadSession(sessionId: string): Promise<{
  success: boolean
  mediaFileId?: string
  error?: string
}> {
  try {
    // Get upload session from database
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('upload_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return {
        success: false,
        error: 'Upload session not found'
      }
    }

    if (session.status !== 'pending') {
      return {
        success: false,
        error: `Upload session already ${session.status}`
      }
    }

    // Check if session has expired
    if (new Date(session.expires_at) < new Date()) {
      await supabaseAdmin
        .from('upload_sessions')
        .update({ status: 'expired' })
        .eq('id', sessionId)

      return {
        success: false,
        error: 'Upload session has expired'
      }
    }

    // Verify that the file exists in storage
    const { data: fileList, error: listError } = await supabaseAdmin.storage
      .from('media')
      .list(session.storage_key.split('/').slice(0, -1).join('/'), {
        limit: 100,
        search: session.storage_key.split('/').pop()
      })

    if (listError || !fileList?.find(f => session.storage_key.endsWith(f.name))) {
      return {
        success: false,
        error: 'File not found in storage. Upload may have failed.'
      }
    }

    // Get public URL for the uploaded file
    const { data: urlData } = supabaseAdmin.storage
      .from('media')
      .getPublicUrl(session.storage_key)

    // Create media file record
    const mediaFileId = `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const { error: mediaError } = await supabaseAdmin
      .from('media_files')
      .insert({
        id: mediaFileId,
        user_id: session.user_id,
        filename: session.metadata.sanitizedFilename,
        original_filename: session.metadata.originalFilename,
        storage_url: urlData.publicUrl,
        storage_key: session.storage_key,
        file_size: session.metadata.fileSize,
        mime_type: session.metadata.mimeType,
        metadata: {
          uploadSession: sessionId,
          processing_status: 'uploaded',
          created_via: 'direct_upload'
        }
      })

    if (mediaError) {
      console.error('❌ Failed to create media file record:', mediaError)
      return {
        success: false,
        error: 'Failed to create media file record'
      }
    }

    // Update upload session status
    await supabaseAdmin
      .from('upload_sessions')
      .update({ 
        status: 'completed',
        media_file_id: mediaFileId
      })
      .eq('id', sessionId)

    console.log('✅ Upload session confirmed:', {
      sessionId,
      mediaFileId,
      storageKey: session.storage_key
    })

    return {
      success: true,
      mediaFileId
    }

  } catch (error: any) {
    console.error('❌ Error confirming upload session:', error)
    return {
      success: false,
      error: error.message || 'Failed to confirm upload'
    }
  }
}

/**
 * Gets the status of an upload session
 * @param sessionId Upload session ID
 * @returns Session status
 */
export async function getUploadSessionStatus(sessionId: string): Promise<{
  success: boolean
  session?: any
  error?: string
}> {
  try {
    const { data: session, error } = await supabaseAdmin
      .from('upload_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (error) {
      return {
        success: false,
        error: 'Upload session not found'
      }
    }

    return {
      success: true,
      session
    }

  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to get session status'
    }
  }
}

/**
 * Cleans up expired upload sessions and orphaned files
 */
export async function cleanupExpiredSessions(): Promise<void> {
  try {
    // Find expired sessions
    const { data: expiredSessions, error } = await supabaseAdmin
      .from('upload_sessions')
      .select('*')
      .lt('expires_at', new Date().toISOString())
      .eq('status', 'pending')

    if (error) {
      console.error('❌ Failed to fetch expired sessions:', error)
      return
    }

    if (!expiredSessions || expiredSessions.length === 0) {
      console.log('🧹 No expired upload sessions to clean up')
      return
    }

    console.log(`🧹 Cleaning up ${expiredSessions.length} expired upload sessions`)

    // Delete orphaned files from storage and update session status
    for (const session of expiredSessions) {
      try {
        // Try to delete the file from storage
        await supabaseAdmin.storage
          .from('media')
          .remove([session.storage_key])

        // Update session status
        await supabaseAdmin
          .from('upload_sessions')
          .update({ status: 'expired' })
          .eq('id', session.id)

        console.log(`🗑️ Cleaned up expired session: ${session.id}`)
      } catch (cleanupError) {
        console.warn(`⚠️ Failed to cleanup session ${session.id}:`, cleanupError)
      }
    }

  } catch (error) {
    console.error('❌ Failed to cleanup expired sessions:', error)
  }
}