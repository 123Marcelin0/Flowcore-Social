/**
 * Utility functions for generating thumbnails from media files
 */

export interface ThumbnailOptions {
  width?: number
  height?: number
  quality?: number
  format?: 'image/jpeg' | 'image/png' | 'image/webp'
}

/**
 * Generate a thumbnail from a video element
 */
export async function generateVideoThumbnail(
  video: HTMLVideoElement,
  options: ThumbnailOptions = {}
): Promise<string> {
  const {
    width = 320,
    height = 180,
    quality = 0.8,
    format = 'image/jpeg'
  } = options

  return new Promise((resolve, reject) => {
    try {
      // Create canvas
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }

      // Set canvas dimensions
      canvas.width = width
      canvas.height = height

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, width, height)

      // Convert to data URL
      const thumbnailUrl = canvas.toDataURL(format, quality)
      resolve(thumbnailUrl)
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Generate a thumbnail from an image URL
 */
export async function generateImageThumbnail(
  imageUrl: string,
  options: ThumbnailOptions = {}
): Promise<string> {
  const {
    width = 320,
    height = 180,
    quality = 0.8,
    format = 'image/jpeg'
  } = options

  return new Promise((resolve, reject) => {
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          
          if (!ctx) {
            reject(new Error('Could not get canvas context'))
            return
          }

          // Set canvas dimensions
          canvas.width = width
          canvas.height = height

          // Calculate aspect ratio to maintain proportions
          const imgAspect = img.width / img.height
          const canvasAspect = width / height
          
          let drawWidth = width
          let drawHeight = height
          let offsetX = 0
          let offsetY = 0

          if (imgAspect > canvasAspect) {
            // Image is wider than canvas
            drawHeight = width / imgAspect
            offsetY = (height - drawHeight) / 2
          } else {
            // Image is taller than canvas
            drawWidth = height * imgAspect
            offsetX = (width - drawWidth) / 2
          }

          // Draw image to canvas
          ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight)

          // Convert to data URL
          const thumbnailUrl = canvas.toDataURL(format, quality)
          resolve(thumbnailUrl)
        } catch (error) {
          reject(error)
        }
      }

      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }

      img.src = imageUrl
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Save thumbnail to server
 */
export async function saveThumbnailToServer(
  mediaId: string,
  mediaUrl: string,
  fileType: 'video' | 'image' | 'audio',
  accessToken: string
): Promise<{ success: boolean; thumbnail_url?: string; error?: string }> {
  try {
    const response = await fetch('/api/generate-thumbnail', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        mediaId,
        mediaUrl,
        fileType
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      return {
        success: false,
        error: errorData.error || 'Failed to save thumbnail'
      }
    }

    const result = await response.json()
    return {
      success: true,
      thumbnail_url: result.data?.thumbnail_url
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Create a placeholder thumbnail for audio files
 */
export function createAudioPlaceholder(
  options: ThumbnailOptions = {}
): string {
  const {
    width = 320,
    height = 180,
    quality = 0.8,
    format = 'image/jpeg'
  } = options

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  
  if (!ctx) {
    throw new Error('Could not get canvas context')
  }

  // Set canvas dimensions
  canvas.width = width
  canvas.height = height

  // Create gradient background
  const gradient = ctx.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, '#667eea')
  gradient.addColorStop(1, '#764ba2')
  
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  // Add audio icon
  ctx.fillStyle = 'white'
  ctx.font = `${Math.min(width, height) / 4}px Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('♪', width / 2, height / 2)

  return canvas.toDataURL(format, quality)
} 