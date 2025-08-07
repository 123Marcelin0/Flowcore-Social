export interface GeneratedContent {
  id: string
  type: 'image' | 'video' | 'interior'
  url: string
  prompt: string
  settings: Record<string, any>
  createdAt: Date
  isProcessing?: boolean
  processingProgress?: number
  originalImageId?: string
}

export interface UploadedImage {
  id: string
  file: File
  url: string
  name: string
  size: number
  isProcessing?: boolean
  processingProgress?: number
}

export interface ImageSettings {
  model: string
  size: string
  quality: string
  style: string
  count: number
}

export interface VideoSettings {
  model: string
  duration: number
  fps: number
  resolution: string
  style: string
  motionIntensity: number
  cameraMovement: string
}

export interface InteriorSettings {
  apiProvider: string
  service: string
  roomType: string
  designStyle: string
  colorScheme: string
  specialityDecor: string
  numImages: number
  scaleFactor: number
  matchStyling: boolean
  seed: number | null
  guidanceScale: number
  designCreativity: number
  wallColorHex: string
}

export type ContentType = 'image' | 'video' | 'interior'
