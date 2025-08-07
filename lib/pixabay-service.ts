/**
 * Pixabay API Service
 * Provides access to free stock photos, videos, and music from Pixabay
 */

export interface PixabayConfig {
  apiKey: string
  baseUrl?: string
  language?: string
  imageType?: 'all' | 'photo' | 'illustration' | 'vector'
  videoType?: 'all' | 'film' | 'animation'
  order?: 'popular' | 'latest'
  perPage?: number
  safeSearch?: boolean
}

export interface PixabayImage {
  id: number
  pageURL: string
  type: string
  tags: string
  previewURL: string
  previewWidth: number
  previewHeight: number
  webformatURL: string
  webformatWidth: number
  webformatHeight: number
  largeImageURL: string
  fullHDURL: string
  imageURL: string
  imageWidth: number
  imageHeight: number
  imageSize: number
  views: number
  downloads: number
  likes: number
  comments: number
  user_id: number
  user: string
  userImageURL: string
}

export interface PixabayVideo {
  id: number
  pageURL: string
  type: string
  tags: string
  duration: number
  picture_id: string
  videos: {
    large: {
      url: string
      width: number
      height: number
      size: number
    }
    medium: {
      url: string
      width: number
      height: number
      size: number
    }
    small: {
      url: string
      width: number
      height: number
      size: number
    }
    tiny: {
      url: string
      width: number
      height: number
      size: number
    }
  }
  views: number
  downloads: number
  likes: number
  comments: number
  user_id: number
  user: string
  userImageURL: string
}

export interface PixabayAudio {
  id: number
  pageURL: string
  type: string
  tags: string
  duration: number
  previewURL: string
  audioURL: string
  audioLength: number
  audioFormat: string
  views: number
  downloads: number
  likes: number
  comments: number
  user_id: number
  user: string
  userImageURL: string
}

export interface PixabaySearchResponse {
  total: number
  totalHits: number
  hits: (PixabayImage | PixabayVideo | PixabayAudio)[]
}

export class PixabayService {
  private config: PixabayConfig
  private baseUrl: string

  constructor(config: PixabayConfig) {
    this.config = {
      baseUrl: 'https://pixabay.com/api/',
      language: 'en',
      imageType: 'all',
      videoType: 'all',
      order: 'popular',
      perPage: 20,
      safeSearch: true,
      ...config
    }
    this.baseUrl = this.config.baseUrl!
  }

  /**
   * Search for images
   */
  async searchImages(query: string, options: {
    page?: number
    perPage?: number
    order?: 'popular' | 'latest'
    imageType?: 'all' | 'photo' | 'illustration' | 'vector'
    category?: string
    minWidth?: number
    minHeight?: number
    colors?: string
    editorsChoice?: boolean
    safeSearch?: boolean
  } = {}): Promise<PixabaySearchResponse> {
    const params = new URLSearchParams({
      key: this.config.apiKey,
      q: query,
      image_type: options.imageType || this.config.imageType!,
      order: options.order || this.config.order!,
      per_page: (options.perPage || this.config.perPage!).toString(),
      page: (options.page || 1).toString(),
      lang: this.config.language!,
      safesearch: (options.safeSearch !== undefined ? options.safeSearch : this.config.safeSearch!).toString()
    })

    if (options.category) params.append('category', options.category)
    if (options.minWidth) params.append('min_width', options.minWidth.toString())
    if (options.minHeight) params.append('min_height', options.minHeight.toString())
    if (options.colors) params.append('colors', options.colors)
    if (options.editorsChoice) params.append('editors_choice', 'true')

    const response = await fetch(`${this.baseUrl}?${params.toString()}`)
    
    if (!response.ok) {
      throw new Error(`Pixabay API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  }

  /**
   * Search for videos
   */
  async searchVideos(query: string, options: {
    page?: number
    perPage?: number
    order?: 'popular' | 'latest'
    videoType?: 'all' | 'film' | 'animation'
    category?: string
    minWidth?: number
    minHeight?: number
    editorsChoice?: boolean
    safeSearch?: boolean
  } = {}): Promise<PixabaySearchResponse> {
    const params = new URLSearchParams({
      key: this.config.apiKey,
      q: query,
      video_type: options.videoType || this.config.videoType!,
      order: options.order || this.config.order!,
      per_page: (options.perPage || this.config.perPage!).toString(),
      page: (options.page || 1).toString(),
      lang: this.config.language!,
      safesearch: (options.safeSearch !== undefined ? options.safeSearch : this.config.safeSearch!).toString()
    })

    if (options.category) params.append('category', options.category)
    if (options.minWidth) params.append('min_width', options.minWidth.toString())
    if (options.minHeight) params.append('min_height', options.minHeight.toString())
    if (options.editorsChoice) params.append('editors_choice', 'true')

    const response = await fetch(`${this.baseUrl}videos/?${params.toString()}`)
    
    if (!response.ok) {
      throw new Error(`Pixabay API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  }

  /**
   * Search for audio/music
   */
  async searchAudio(query: string, options: {
    page?: number
    perPage?: number
    order?: 'popular' | 'latest'
    category?: string
    editorsChoice?: boolean
    safeSearch?: boolean
  } = {}): Promise<PixabaySearchResponse> {
    const params = new URLSearchParams({
      key: this.config.apiKey,
      q: query,
      audio_type: 'all',
      order: options.order || this.config.order!,
      per_page: (options.perPage || this.config.perPage!).toString(),
      page: (options.page || 1).toString(),
      lang: this.config.language!,
      safesearch: (options.safeSearch !== undefined ? options.safeSearch : this.config.safeSearch!).toString()
    })

    if (options.category) params.append('category', options.category)
    if (options.editorsChoice) params.append('editors_choice', 'true')

    const response = await fetch(`${this.baseUrl}audio/?${params.toString()}`)
    
    if (!response.ok) {
      throw new Error(`Pixabay API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  }

  /**
   * Get popular images
   */
  async getPopularImages(options: {
    page?: number
    perPage?: number
    imageType?: 'all' | 'photo' | 'illustration' | 'vector'
  } = {}): Promise<PixabaySearchResponse> {
    return this.searchImages('', {
      ...options,
      order: 'popular'
    })
  }

  /**
   * Get latest images
   */
  async getLatestImages(options: {
    page?: number
    perPage?: number
    imageType?: 'all' | 'photo' | 'illustration' | 'vector'
  } = {}): Promise<PixabaySearchResponse> {
    return this.searchImages('', {
      ...options,
      order: 'latest'
    })
  }

  /**
   * Get popular videos
   */
  async getPopularVideos(options: {
    page?: number
    perPage?: number
    videoType?: 'all' | 'film' | 'animation'
  } = {}): Promise<PixabaySearchResponse> {
    return this.searchVideos('', {
      ...options,
      order: 'popular'
    })
  }

  /**
   * Get latest videos
   */
  async getLatestVideos(options: {
    page?: number
    perPage?: number
    videoType?: 'all' | 'film' | 'animation'
  } = {}): Promise<PixabaySearchResponse> {
    return this.searchVideos('', {
      ...options,
      order: 'latest'
    })
  }

  /**
   * Get popular audio
   */
  async getPopularAudio(options: {
    page?: number
    perPage?: number
  } = {}): Promise<PixabaySearchResponse> {
    return this.searchAudio('', {
      ...options,
      order: 'popular'
    })
  }

  /**
   * Get latest audio
   */
  async getLatestAudio(options: {
    page?: number
    perPage?: number
  } = {}): Promise<PixabaySearchResponse> {
    return this.searchAudio('', {
      ...options,
      order: 'latest'
    })
  }

  /**
   * Search for images, videos, and audio
   */
  async searchMedia(query: string, options: {
    includeImages?: boolean
    includeVideos?: boolean
    includeAudio?: boolean
    page?: number
    perPage?: number
    order?: 'popular' | 'latest'
  } = {}): Promise<{
    images: PixabaySearchResponse
    videos: PixabaySearchResponse
    audio: PixabaySearchResponse
  }> {
    const { includeImages = true, includeVideos = true, includeAudio = true, ...searchOptions } = options

    const results = {
      images: { total: 0, totalHits: 0, hits: [] } as PixabaySearchResponse,
      videos: { total: 0, totalHits: 0, hits: [] } as PixabaySearchResponse,
      audio: { total: 0, totalHits: 0, hits: [] } as PixabaySearchResponse
    }

    if (includeImages) {
      try {
        results.images = await this.searchImages(query, searchOptions)
      } catch (error) {
        console.error('Failed to search images:', error)
      }
    }

    if (includeVideos) {
      try {
        results.videos = await this.searchVideos(query, searchOptions)
      } catch (error) {
        console.error('Failed to search videos:', error)
      }
    }

    if (includeAudio) {
      try {
        results.audio = await this.searchAudio(query, searchOptions)
      } catch (error) {
        console.error('Failed to search audio:', error)
      }
    }

    return results
  }

  /**
   * Get image by ID
   */
  async getImageById(id: number): Promise<PixabayImage | null> {
    try {
      const response = await this.searchImages(`id:${id}`)
      return response.hits.length > 0 ? response.hits[0] as PixabayImage : null
    } catch (error) {
      console.error('Failed to get image by ID:', error)
      return null
    }
  }

  /**
   * Get video by ID
   */
  async getVideoById(id: number): Promise<PixabayVideo | null> {
    try {
      const response = await this.searchVideos(`id:${id}`)
      return response.hits.length > 0 ? response.hits[0] as PixabayVideo : null
    } catch (error) {
      console.error('Failed to get video by ID:', error)
      return null
    }
  }

  /**
   * Get audio by ID
   */
  async getAudioById(id: number): Promise<PixabayAudio | null> {
    try {
      const response = await this.searchAudio(`id:${id}`)
      return response.hits.length > 0 ? response.hits[0] as PixabayAudio : null
    } catch (error) {
      console.error('Failed to get audio by ID:', error)
      return null
    }
  }

  /**
   * Get download URL for image
   */
  getImageDownloadUrl(image: PixabayImage, size: 'preview' | 'webformat' | 'large' | 'fullHD' | 'original' = 'large'): string {
    switch (size) {
      case 'preview':
        return image.previewURL
      case 'webformat':
        return image.webformatURL
      case 'large':
        return image.largeImageURL
      case 'fullHD':
        return image.fullHDURL
      case 'original':
        return image.imageURL
      default:
        return image.largeImageURL
    }
  }

  /**
   * Get download URL for video
   */
  getVideoDownloadUrl(video: PixabayVideo, size: 'tiny' | 'small' | 'medium' | 'large' = 'medium'): string {
    return video.videos[size].url
  }

  /**
   * Get download URL for audio
   */
  getAudioDownloadUrl(audio: PixabayAudio): string {
    return audio.audioURL
  }

  /**
   * Get video duration in seconds
   */
  getVideoDuration(video: PixabayVideo): number {
    return video.duration
  }

  /**
   * Get audio duration in seconds
   */
  getAudioDuration(audio: PixabayAudio): number {
    return audio.duration
  }

  /**
   * Get video dimensions
   */
  getVideoDimensions(video: PixabayVideo, size: 'tiny' | 'small' | 'medium' | 'large' = 'medium'): { width: number; height: number } {
    const videoData = video.videos[size]
    return {
      width: videoData.width,
      height: videoData.height
    }
  }
} 