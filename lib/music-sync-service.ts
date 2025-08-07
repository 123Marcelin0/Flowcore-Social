/**
 * Music Synchronization Service
 * Automatically analyzes music and adjusts video pacing with variable speeds and animations
 */

export interface MusicAnalysis {
  bpm: number
  key: string
  energy: number
  valence: number
  danceability: number
  tempo: number
  loudness: number
  sections: MusicSection[]
  segments: MusicSegment[]
  beats: number[]
}

export interface MusicSection {
  start: number
  duration: number
  loudness: number
  tempo: number
  key: number
  mode: number
  timeSignature: number
  energy: number
}

export interface MusicSegment {
  start: number
  duration: number
  loudness: number
  pitches: number[]
  timbre: number[]
}

export interface PacingConfig {
  slowMotionThreshold: number // Energy level below which to use slow motion
  fastPaceThreshold: number // Energy level above which to use fast pacing
  normalPaceRange: [number, number] // Range for normal pacing
  transitionSmoothness: number // How smooth transitions between paces should be
  beatSync: boolean // Whether to sync cuts to beats
  dynamicSpeed: boolean // Whether to use variable speeds within clips
}

export interface ClipPacing {
  start: number
  duration: number
  speed: number // 0.25 = 4x slow motion, 1.0 = normal, 2.0 = 2x fast
  animation: string
  transition: string
  intensity: number // 0-1 scale of how intense this section should be
}

export class MusicSyncService {
  private config: PacingConfig

  constructor(config: Partial<PacingConfig> = {}) {
    this.config = {
      slowMotionThreshold: 0.3,
      fastPaceThreshold: 0.7,
      normalPaceRange: [0.3, 0.7],
      transitionSmoothness: 0.5,
      beatSync: true,
      dynamicSpeed: true,
      ...config
    }
  }

  /**
   * Analyze music from URL or audio data
   */
  async analyzeMusic(audioUrl: string): Promise<MusicAnalysis> {
    try {
      // For now, we'll use a simplified analysis
      // In production, you'd integrate with Spotify API, EchoNest, or similar services
      const analysis = await this.simulateMusicAnalysis(audioUrl)
      return analysis
    } catch (error) {
      console.error('Music analysis failed:', error)
      // Return default analysis
      return this.getDefaultAnalysis()
    }
  }

  /**
   * Generate pacing configuration based on music analysis
   */
  generatePacing(analysis: MusicAnalysis, totalDuration: number): ClipPacing[] {
    const pacing: ClipPacing[] = []
    const { sections, beats, tempo } = analysis

    // Calculate base clip duration based on BPM
    const baseClipDuration = this.calculateBaseClipDuration(tempo)
    
    // Generate pacing for each section
    sections.forEach((section, index) => {
      const sectionPacing = this.generateSectionPacing(section, baseClipDuration)
      pacing.push(...sectionPacing)
    })

    // Adjust pacing to match total duration
    return this.adjustPacingToDuration(pacing, totalDuration)
  }

  /**
   * Create dynamic edit configuration with music-synchronized pacing
   */
  createMusicSyncEdit(
    mediaFiles: Array<{ url: string; type: 'video' | 'image'; duration?: number }>,
    musicUrl: string,
    options: {
      title?: string
      subtitle?: string
      outputFormat?: string
      resolution?: string
      aspectRatio?: string
    } = {}
  ) {
    return this.generateMusicSyncTimeline(mediaFiles, musicUrl, options)
  }

  /**
   * Calculate optimal clip duration based on BPM
   */
  private calculateBaseClipDuration(bpm: number): number {
    // Higher BPM = shorter clips for faster pacing
    // Lower BPM = longer clips for slower pacing
    const baseDuration = 60 / bpm // One beat duration
    
    if (bpm < 80) {
      return baseDuration * 2 // Slower music, longer clips
    } else if (bpm > 140) {
      return baseDuration * 0.5 // Faster music, shorter clips
    } else {
      return baseDuration // Normal music, normal clips
    }
  }

  /**
   * Generate pacing for a specific music section
   */
  private generateSectionPacing(section: MusicSection, baseDuration: number): ClipPacing[] {
    const pacing: ClipPacing[] = []
    const { energy, loudness, tempo } = section

    // Determine speed based on energy and loudness
    let speed = 1.0
    let animation = 'fade'
    let transition = 'fade'

    if (energy < this.config.slowMotionThreshold) {
      // Slow motion for low energy sections
      speed = 0.25 + (energy * 0.5) // 0.25 to 0.75x speed
      animation = 'zoom'
      transition = 'fade'
    } else if (energy > this.config.fastPaceThreshold) {
      // Fast pacing for high energy sections
      speed = 1.5 + (energy * 1.0) // 1.5 to 2.5x speed
      animation = 'slideUp'
      transition = 'wipeLeft'
    } else {
      // Normal pacing for medium energy
      speed = 0.8 + (energy * 0.4) // 0.8 to 1.2x speed
      animation = 'carouselLeft'
      transition = 'slideRight'
    }

    // Adjust based on loudness
    if (loudness > -10) {
      speed *= 1.2 // Increase speed for loud sections
      animation = 'zoom'
    } else if (loudness < -20) {
      speed *= 0.8 // Decrease speed for quiet sections
      animation = 'fade'
    }

    // Create pacing entry
    pacing.push({
      start: section.start,
      duration: baseDuration * (1 / speed), // Adjust duration for speed
      speed,
      animation,
      transition,
      intensity: energy
    })

    return pacing
  }

  /**
   * Adjust pacing to match total video duration
   */
  private adjustPacingToDuration(pacing: ClipPacing[], totalDuration: number): ClipPacing[] {
    const totalPacingDuration = pacing.reduce((sum, p) => sum + p.duration, 0)
    const scaleFactor = totalDuration / totalPacingDuration

    return pacing.map(p => ({
      ...p,
      duration: p.duration * scaleFactor
    }))
  }

  /**
   * Generate music-synchronized timeline
   */
  private async generateMusicSyncTimeline(
    mediaFiles: Array<{ url: string; type: 'video' | 'image'; duration?: number }>,
    musicUrl: string,
    options: any
  ) {
    // Analyze music
    const analysis = await this.analyzeMusic(musicUrl)
    
    // Calculate total duration
    const totalDuration = mediaFiles.reduce((sum, file) => sum + (file.duration || 3), 0)
    
    // Generate pacing
    const pacing = this.generatePacing(analysis, totalDuration)

    // Create clips with music-synchronized pacing
    const clips = this.createMusicSyncClips(mediaFiles, pacing, options)

    return {
      timeline: {
        tracks: [{ clips }],
        background: options.backgroundColor || '#000000',
        soundtrack: {
          src: musicUrl,
          effect: 'fadeInFadeOut',
          volume: 0.3
        }
      },
      output: {
        format: options.outputFormat || 'mp4',
        resolution: options.resolution || 'hd',
        aspectRatio: options.aspectRatio || '16:9'
      }
    }
  }

  /**
   * Create clips with music-synchronized pacing
   */
  private createMusicSyncClips(
    mediaFiles: Array<{ url: string; type: 'video' | 'image'; duration?: number }>,
    pacing: ClipPacing[],
    options: any
  ) {
    const clips: any[] = []
    let currentStart = 0
    let mediaIndex = 0

    pacing.forEach((pace, index) => {
      if (mediaIndex >= mediaFiles.length) return

      const mediaFile = mediaFiles[mediaIndex]
      const clip = {
        asset: {
          type: mediaFile.type,
          src: mediaFile.url
        },
        start: currentStart,
        length: pace.duration,
        fit: 'cover',
        scale: pace.speed,
        transition: {
          in: pace.transition,
          out: pace.animation
        }
      }

      clips.push(clip)
      currentStart += pace.duration
      mediaIndex = (mediaIndex + 1) % mediaFiles.length
    })

    return clips
  }

  /**
   * Simulate music analysis (replace with real API in production)
   */
  private async simulateMusicAnalysis(audioUrl: string): Promise<MusicAnalysis> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100))

    // Generate realistic music analysis
    const bpm = 120 + Math.random() * 40 // 120-160 BPM
    const energy = 0.3 + Math.random() * 0.7 // 0.3-1.0
    const tempo = bpm

    const sections: MusicSection[] = []
    const segments: MusicSegment[] = []
    const beats: number[] = []

    // Generate sections (every 8-16 seconds)
    let currentTime = 0
    while (currentTime < 60) { // Assume 60 second song
      const sectionDuration = 8 + Math.random() * 8
      sections.push({
        start: currentTime,
        duration: sectionDuration,
        loudness: -20 + Math.random() * 20,
        tempo: bpm + (Math.random() - 0.5) * 20,
        key: Math.floor(Math.random() * 12),
        mode: Math.floor(Math.random() * 2),
        timeSignature: 4,
        energy: energy + (Math.random() - 0.5) * 0.3
      })
      currentTime += sectionDuration
    }

    // Generate beats
    const beatInterval = 60 / bpm
    for (let time = 0; time < 60; time += beatInterval) {
      beats.push(time)
    }

    return {
      bpm,
      key: 'C',
      energy,
      valence: 0.5 + Math.random() * 0.5,
      danceability: 0.4 + Math.random() * 0.6,
      tempo,
      loudness: -15 + Math.random() * 15,
      sections,
      segments,
      beats
    }
  }

  /**
   * Get default analysis for fallback
   */
  private getDefaultAnalysis(): MusicAnalysis {
    return {
      bpm: 120,
      key: 'C',
      energy: 0.5,
      valence: 0.5,
      danceability: 0.5,
      tempo: 120,
      loudness: -10,
      sections: [{
        start: 0,
        duration: 60,
        loudness: -10,
        tempo: 120,
        key: 0,
        mode: 0,
        timeSignature: 4,
        energy: 0.5
      }],
      segments: [],
      beats: Array.from({ length: 60 }, (_, i) => i * 0.5)
    }
  }

  /**
   * Get available animations for different energy levels
   */
  getAnimationsForEnergy(energy: number): string[] {
    if (energy < 0.3) {
      return ['fade', 'zoom', 'carouselLeft', 'carouselRight']
    } else if (energy < 0.7) {
      return ['slideLeft', 'slideRight', 'wipeLeft', 'wipeRight', 'reveal']
    } else {
      return ['slideUp', 'slideDown', 'shuffleTopRight', 'shuffleBottomLeft', 'zoom']
    }
  }

  /**
   * Get speed range for different energy levels
   */
  getSpeedRangeForEnergy(energy: number): [number, number] {
    if (energy < 0.3) {
      return [0.25, 0.75] // Slow motion range
    } else if (energy < 0.7) {
      return [0.8, 1.2] // Normal speed range
    } else {
      return [1.5, 2.5] // Fast speed range
    }
  }
} 