import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { MusicSyncService } from '@/lib/music-sync-service'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Authentication helper
async function verifyAuth(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return { authenticated: false, user: null, error: 'Missing or invalid authorization header' }
    }

    const token = authHeader.substring(7)
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return { authenticated: false, user: null, error: 'Invalid token or user not found' }
    }

    return { authenticated: true, user, error: null }
  } catch (error) {
    return { authenticated: false, user: null, error: 'Authentication verification failed' }
  }
}

// POST /api/music-sync - Analyze music and create synchronized edit
export async function POST(request: NextRequest) {
  try {
    console.log('🎵 Music sync request received')
    
    // Verify authentication
    const authResult = await verifyAuth(request)
    if (!authResult.authenticated) {
      console.error('❌ Authentication failed:', authResult.error)
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = authResult.user!
    console.log(`✅ User authenticated: ${user.id}`)

    // Parse request body
    const body = await request.json()
    const { 
      mediaFiles, 
      musicUrl, 
      options = {},
      pacingConfig = {}
    } = body

    if (!mediaFiles || !Array.isArray(mediaFiles) || mediaFiles.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Media files are required' },
        { status: 400 }
      )
    }

    if (!musicUrl) {
      return NextResponse.json(
        { success: false, error: 'Music URL is required' },
        { status: 400 }
      )
    }

    console.log('🎵 Music sync details:', {
      mediaFilesCount: mediaFiles.length,
      musicUrl,
      options,
      pacingConfig
    })

    // Initialize music sync service
    const musicSyncService = new MusicSyncService(pacingConfig)

    // Analyze music
    console.log('🎵 Analyzing music...')
    const analysis = await musicSyncService.analyzeMusic(musicUrl)
    
    console.log('🎵 Music analysis results:', {
      bpm: analysis.bpm,
      energy: analysis.energy,
      tempo: analysis.tempo,
      sections: analysis.sections.length,
      beats: analysis.beats.length
    })

    // Calculate total duration
    const totalDuration = mediaFiles.reduce((sum, file) => sum + (file.duration || 3), 0)
    
    // Generate pacing configuration
    console.log('🎵 Generating pacing configuration...')
    const pacing = musicSyncService.generatePacing(analysis, totalDuration)
    
    console.log('🎵 Pacing configuration:', {
      totalPacingEntries: pacing.length,
      averageSpeed: pacing.reduce((sum, p) => sum + p.speed, 0) / pacing.length,
      speedRange: {
        min: Math.min(...pacing.map(p => p.speed)),
        max: Math.max(...pacing.map(p => p.speed))
      }
    })

    // Create music-synchronized edit configuration
    console.log('🎵 Creating music-synchronized edit...')
    const editConfig = await musicSyncService.createMusicSyncEdit(mediaFiles, musicUrl, options)

    console.log('✅ Music-synchronized edit created successfully')

    return NextResponse.json({
      success: true,
      data: {
        editConfig,
        musicAnalysis: analysis,
        pacing,
        summary: {
          totalDuration,
          mediaFilesCount: mediaFiles.length,
          averageBPM: analysis.bpm,
          energyLevel: analysis.energy,
          pacingEntries: pacing.length,
          speedVariations: pacing.map(p => p.speed)
        }
      },
      message: 'Music-synchronized edit created successfully'
    })

  } catch (error) {
    console.error('💥 Music sync failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Music synchronization failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET /api/music-sync - Get music analysis only
export async function GET(request: NextRequest) {
  try {
    console.log('🎵 Music analysis request received')
    
    // Verify authentication
    const authResult = await verifyAuth(request)
    if (!authResult.authenticated) {
      console.error('❌ Authentication failed:', authResult.error)
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = authResult.user!
    console.log(`✅ User authenticated: ${user.id}`)

    // Get music URL from query parameters
    const { searchParams } = new URL(request.url)
    const musicUrl = searchParams.get('musicUrl')

    if (!musicUrl) {
      return NextResponse.json(
        { success: false, error: 'Music URL is required' },
        { status: 400 }
      )
    }

    console.log('🎵 Analyzing music:', musicUrl)

    // Initialize music sync service
    const musicSyncService = new MusicSyncService()

    // Analyze music
    const analysis = await musicSyncService.analyzeMusic(musicUrl)
    
    console.log('✅ Music analysis completed')

    return NextResponse.json({
      success: true,
      data: {
        analysis,
        recommendations: {
          suggestedPacing: analysis.energy > 0.7 ? 'fast' : analysis.energy < 0.3 ? 'slow' : 'normal',
          suggestedAnimations: musicSyncService.getAnimationsForEnergy(analysis.energy),
          speedRange: musicSyncService.getSpeedRangeForEnergy(analysis.energy),
          clipDuration: 60 / analysis.bpm // Suggested base clip duration
        }
      },
      message: 'Music analysis completed successfully'
    })

  } catch (error) {
    console.error('💥 Music analysis failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Music analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 