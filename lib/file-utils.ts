import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import { v4 as uuidv4 } from 'uuid'

/**
 * Sanitizes a filename by removing or replacing unsafe characters
 * @param filename Original filename
 * @param maxLength Maximum length (default: 200)
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string, maxLength: number = 200): string {
  if (!filename) return 'unnamed_file'
  
  // Remove path separators and other dangerous characters
  let sanitized = filename
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')  // Replace invalid chars with underscore
    .replace(/[%]/g, '_')                     // Replace % characters that can cause URL issues
    .replace(/\s+/g, '_')                     // Replace spaces with underscores
    .replace(/_{2,}/g, '_')                   // Replace multiple underscores with single
    .replace(/^_+|_+$/g, '')                  // Remove leading/trailing underscores
  
  // Ensure we have a valid filename
  if (!sanitized || sanitized === '.') {
    sanitized = 'file'
  }
  
  // Truncate if too long, preserving extension
  if (sanitized.length > maxLength) {
    const ext = path.extname(sanitized)
    const nameWithoutExt = path.basename(sanitized, ext)
    const truncatedName = nameWithoutExt.slice(0, maxLength - ext.length - 1)
    sanitized = truncatedName + ext
  }
  
  return sanitized
}

/**
 * Generates a safe, unique filename for temporary files
 * @param originalFilename Original filename (optional)
 * @param extension File extension (optional)
 * @returns Unique sanitized filename
 */
export function generateSafeFilename(
  originalFilename?: string,
  extension?: string
): string {
  const timestamp = Date.now()
  const randomSuffix = Math.random().toString(36).substr(2, 9)
  
  let baseName = 'temp_file'
  if (originalFilename) {
    const sanitized = sanitizeFilename(path.parse(originalFilename).name)
    if (sanitized) baseName = sanitized
  }
  
  const ext = extension || (originalFilename ? path.extname(originalFilename) : '')
  return `${baseName}_${timestamp}_${randomSuffix}${ext}`
}

/**
 * Creates a temporary directory and ensures cleanup
 * @param prefix Prefix for temp directory name
 * @returns Object with directory path and cleanup function
 */
export async function createTempDirectory(prefix: string = 'video_processing'): Promise<{
  path: string
  cleanup: () => Promise<void>
}> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `${prefix}_`))
  
  const cleanup = async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true })
    } catch (error) {
      console.warn(`Failed to cleanup temp directory ${tempDir}:`, error)
    }
  }
  
  return { path: tempDir, cleanup }
}

/**
 * Creates a temporary file with proper cleanup
 * @param filename Filename (will be sanitized)
 * @param content Optional initial content
 * @returns Object with file path and cleanup function
 */
export async function createTempFile(
  filename: string,
  content?: string | Buffer
): Promise<{
  path: string
  cleanup: () => Promise<void>
}> {
  const tempDir = os.tmpdir()
  const safeFilename = generateSafeFilename(filename)
  const tempPath = path.join(tempDir, safeFilename)
  
  if (content !== undefined) {
    await fs.writeFile(tempPath, content)
  }
  
  const cleanup = async () => {
    try {
      await fs.unlink(tempPath)
    } catch (error) {
      console.warn(`Failed to cleanup temp file ${tempPath}:`, error)
    }
  }
  
  return { path: tempPath, cleanup }
}

/**
 * Wrapper for operations that need temporary directory management
 * @param operation Function that receives temp directory path
 * @param prefix Prefix for temp directory
 * @returns Result of the operation
 */
export async function withTempDirectory<T>(
  operation: (tempDirPath: string) => Promise<T>,
  prefix: string = 'video_processing'
): Promise<T> {
  const { path: tempDir, cleanup } = await createTempDirectory(prefix)
  
  try {
    return await operation(tempDir)
  } finally {
    await cleanup()
  }
}

/**
 * Wrapper for operations that need temporary file management
 * @param filename Filename for temp file
 * @param operation Function that receives temp file path
 * @param content Optional initial file content
 * @returns Result of the operation
 */
export async function withTempFile<T>(
  filename: string,
  operation: (tempFilePath: string) => Promise<T>,
  content?: string | Buffer
): Promise<T> {
  const { path: tempPath, cleanup } = await createTempFile(filename, content)
  
  try {
    return await operation(tempPath)
  } finally {
    await cleanup()
  }
}

/**
 * Cross-platform path joining utility
 * @param paths Path segments to join
 * @returns Properly joined path
 */
export function safePath(...paths: string[]): string {
  return path.join(...paths)
}

/**
 * Gets a safe temporary directory path for the current OS
 * @returns Temporary directory path
 */
export function getTempDir(): string {
  return os.tmpdir()
}

/**
 * Creates a unique storage path for uploads
 * @param userId User ID
 * @param originalFilename Original filename
 * @param customPrefix Custom prefix (optional)
 * @returns Safe storage path
 */
export function createStoragePath(
  userId: string,
  originalFilename: string,
  customPrefix?: string
): string {
  const timestamp = Date.now()
  const sanitizedUserId = sanitizeFilename(userId, 20)
  const sanitizedFilename = sanitizeFilename(originalFilename)
  const uuid = uuidv4().split('-')[0] // Short UUID
  
  const prefix = customPrefix || 'upload'
  return `${prefix}/${sanitizedUserId}/${timestamp}_${uuid}_${sanitizedFilename}`
}

/**
 * Validates if a file path is safe (prevents path traversal)
 * @param filePath Path to validate
 * @param basePath Base path that file should be within
 * @returns True if path is safe
 */
export function isPathSafe(filePath: string, basePath?: string): boolean {
  const resolved = path.resolve(filePath)
  
  if (basePath) {
    const resolvedBase = path.resolve(basePath)
    return resolved.startsWith(resolvedBase)
  }
  
  // Check for obvious path traversal attempts
  return !filePath.includes('..') && !filePath.includes('~')
}

/**
 * Gets file extension from filename or URL
 * @param filename Filename or URL
 * @returns File extension (including dot)
 */
export function getFileExtension(filename: string): string {
  // Handle URLs by extracting the pathname first
  try {
    const url = new URL(filename)
    filename = url.pathname
  } catch {
    // Not a URL, use as-is
  }
  
  return path.extname(filename).toLowerCase()
}

/**
 * Checks if a filename has a valid video/audio extension
 * @param filename Filename to check
 * @returns True if valid media file
 */
export function isMediaFile(filename: string): boolean {
  const ext = getFileExtension(filename)
  const validExtensions = [
    // Video
    '.mp4', '.webm', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.m4v',
    // Audio
    '.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.wma'
  ]
  
  return validExtensions.includes(ext)
}

/**
 * Estimates safe processing timeout based on file size
 * @param fileSizeBytes File size in bytes
 * @param baseTimeoutMs Base timeout in milliseconds
 * @returns Recommended timeout in milliseconds
 */
export function calculateProcessingTimeout(
  fileSizeBytes: number,
  baseTimeoutMs: number = 120000 // 2 minutes
): number {
  // Add extra time based on file size (1 minute per 50MB)
  const sizeMB = fileSizeBytes / (1024 * 1024)
  const additionalTime = Math.ceil(sizeMB / 50) * 60000 // 1 minute per 50MB
  
  const totalTimeout = baseTimeoutMs + additionalTime
  
  // Cap at 30 minutes for safety
  return Math.min(totalTimeout, 30 * 60 * 1000)
}

/**
 * Safely deletes a file or directory with error handling
 * @param filePath Path to delete
 * @returns Promise that resolves whether deletion succeeded
 */
export async function safeDelete(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath)
    if (stats.isDirectory()) {
      await fs.rm(filePath, { recursive: true, force: true })
    } else {
      await fs.unlink(filePath)
    }
    return true
  } catch (error) {
    console.warn(`Failed to delete ${filePath}:`, error)
    return false
  }
}