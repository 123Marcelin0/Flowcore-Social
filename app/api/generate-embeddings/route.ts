import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateEmbedding } from '@/lib/openaiService'

// Initialize Supabase client for API routes (backend)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

interface EmbeddingProgress {
  total: number
  processed: number
  succeeded: number
  failed: number
  current_post?: string
  status: 'running' | 'completed' | 'error'
  error?: string
}

// Helper function to verify authentication
async function verifyAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authenticated: false, user: null, error: 'Missing or invalid authorization header' }
  }

  const token = authHeader.replace('Bearer ', '')
  
  try {
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    const { data: { user }, error } = await anonClient.auth.getUser(token)
    
    if (error || !user) {
      return { authenticated: false, user: null, error: 'Invalid or expired token' }
    }

    return { authenticated: true, user, error: null }
  } catch (error) {
    return { authenticated: false, user: null, error: 'Authentication verification failed' }
  }
}

// GET /api/generate-embeddings - Check status of posts without embeddings
export async function GET(request: NextRequest) {
  try {
    // Authenticate the user
    const authResult = await verifyAuth(request)
    if (!authResult.authenticated) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = authResult.user!
    const url = new URL(request.url)
    const userOnly = url.searchParams.get('user_only') === 'true'

    console.log(`📊 Checking embedding status for ${userOnly ? 'user posts' : 'all posts'}`)

    // Query posts without embeddings
    let query = supabase
      .from('posts')
      .select('id, title, content, user_id, created_at, embedding')

    if (userOnly) {
      query = query.eq('user_id', user.id)
    }

    const { data: allPosts, error: allError } = await query

    if (allError) {
      console.error('Error fetching posts:', allError)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch posts'
      }, { status: 500 })
    }

    // Count posts with and without embeddings
    const postsWithoutEmbeddings = allPosts?.filter(post => !post.embedding || post.embedding.length === 0) || []
    const postsWithEmbeddings = allPosts?.filter(post => post.embedding && post.embedding.length > 0) || []

    return NextResponse.json({
      success: true,
      total_posts: allPosts?.length || 0,
      posts_with_embeddings: postsWithEmbeddings.length,
      posts_without_embeddings: postsWithoutEmbeddings.length,
      posts_ready_for_processing: postsWithoutEmbeddings.map(post => ({
        id: post.id,
        title: post.title || 'Untitled',
        content_preview: post.content ? post.content.substring(0, 100) + '...' : 'No content',
        created_at: post.created_at
      }))
    })

  } catch (error) {
    console.error('Error in GET /api/generate-embeddings:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// POST /api/generate-embeddings - Generate embeddings for posts without them
export async function POST(request: NextRequest) {
  try {
    // Authenticate the user
    const authResult = await verifyAuth(request)
    if (!authResult.authenticated) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = authResult.user!
    
    // Parse request body
    let body
    try {
      body = await request.json()
    } catch (error) {
      body = {}
    }

    const { 
      user_only = true, 
      batch_size = 10,
      force_regenerate = false 
    } = body

    console.log(`🚀 Starting embedding generation for ${user_only ? 'user posts' : 'all posts'}`)
    console.log(`📦 Batch size: ${batch_size}, Force regenerate: ${force_regenerate}`)

    // Query posts that need embeddings
    let query = supabase
      .from('posts')
      .select('id, title, content, user_id, created_at, embedding')

    if (user_only) {
      query = query.eq('user_id', user.id)
    }

    // Filter based on force_regenerate flag
    if (!force_regenerate) {
      query = query.or('embedding.is.null,embedding.eq.{}')
    }

    const { data: posts, error: fetchError } = await query.order('created_at', { ascending: false })

    if (fetchError) {
      console.error('Error fetching posts:', fetchError)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch posts for processing'
      }, { status: 500 })
    }

    if (!posts || posts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No posts found that need embedding generation',
        total: 0,
        processed: 0,
        succeeded: 0,
        failed: 0
      })
    }

    // Filter out posts that already have embeddings (unless force_regenerate is true)
    const postsToProcess = force_regenerate 
      ? posts 
      : posts.filter(post => !post.embedding || post.embedding.length === 0)

    console.log(`📋 Found ${postsToProcess.length} posts to process`)

    const progress: EmbeddingProgress = {
      total: postsToProcess.length,
      processed: 0,
      succeeded: 0,
      failed: 0,
      status: 'running'
    }

    const results = []
    
    // Process posts in batches
    for (let i = 0; i < postsToProcess.length; i += batch_size) {
      const batch = postsToProcess.slice(i, i + batch_size)
      console.log(`🔄 Processing batch ${Math.floor(i / batch_size) + 1}/${Math.ceil(postsToProcess.length / batch_size)}`)

      for (const post of batch) {
        progress.current_post = post.title || `Post ${post.id.substring(0, 8)}`
        progress.processed++

        try {
          // Prepare text for embedding
          let textToEmbed = ''
          if (post.title) {
            textToEmbed += post.title + '. '
          }
          textToEmbed += post.content || ''
          textToEmbed = textToEmbed.trim()

          if (!textToEmbed) {
            console.warn(`⚠️ Post ${post.id} has no content to embed, skipping`)
            results.push({
              id: post.id,
              status: 'skipped',
              reason: 'No content to embed'
            })
            continue
          }

          console.log(`📝 Generating embedding for post ${post.id} (${textToEmbed.length} chars)`)

          // Generate embedding
          const embedding = await generateEmbedding(textToEmbed)

          if (!embedding || embedding.length === 0) {
            throw new Error('Failed to generate embedding')
          }

          // Update post with embedding
          const { error: updateError } = await supabase
            .from('posts')
            .update({ embedding })
            .eq('id', post.id)

          if (updateError) {
            throw new Error(`Database update failed: ${updateError.message}`)
          }

          progress.succeeded++
          results.push({
            id: post.id,
            status: 'success',
            embedding_dimensions: embedding.length,
            content_length: textToEmbed.length
          })

          console.log(`✅ Successfully processed post ${post.id}`)

        } catch (error) {
          progress.failed++
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          
          console.error(`❌ Failed to process post ${post.id}:`, errorMessage)
          
          results.push({
            id: post.id,
            status: 'failed',
            error: errorMessage
          })
        }

        // Small delay to avoid overwhelming the API
        if (batch.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      // Delay between batches to respect rate limits
      if (i + batch_size < postsToProcess.length) {
        console.log('⏱️ Waiting between batches...')
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    progress.status = 'completed'
    delete progress.current_post

    console.log(`🎉 Embedding generation completed: ${progress.succeeded}/${progress.total} successful`)

    return NextResponse.json({
      success: true,
      message: 'Embedding generation completed',
      progress,
      results,
      summary: {
        total_posts: progress.total,
        successful: progress.succeeded,
        failed: progress.failed,
        success_rate: Math.round((progress.succeeded / progress.total) * 100)
      }
    })

  } catch (error) {
    console.error('Error in POST /api/generate-embeddings:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}

// DELETE /api/generate-embeddings - Clear all embeddings (for testing)
export async function DELETE(request: NextRequest) {
  try {
    // Authenticate the user
    const authResult = await verifyAuth(request)
    if (!authResult.authenticated) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = authResult.user!
    
    // Parse request body
    let body
    try {
      body = await request.json()
    } catch (error) {
      body = {}
    }

    const { user_only = true, confirm = false } = body

    if (!confirm) {
      return NextResponse.json({
        success: false,
        error: 'Please confirm deletion by setting confirm: true'
      }, { status: 400 })
    }

    console.log(`🗑️ Clearing embeddings for ${user_only ? 'user posts' : 'all posts'}`)

    // Clear embeddings
    let query = supabase
      .from('posts')
      .update({ embedding: null })

    if (user_only) {
      query = query.eq('user_id', user.id)
    }

    const { data, error } = await query.select('id')

    if (error) {
      console.error('Error clearing embeddings:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to clear embeddings'
      }, { status: 500 })
    }

    console.log(`✅ Cleared embeddings for ${data?.length || 0} posts`)

    return NextResponse.json({
      success: true,
      message: `Cleared embeddings for ${data?.length || 0} posts`,
      cleared_count: data?.length || 0
    })

  } catch (error) {
    console.error('Error in DELETE /api/generate-embeddings:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
} 