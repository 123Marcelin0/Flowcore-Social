import { supabase } from './supabase'
import { generateEmbedding } from './openaiService'

export interface EmbeddingGenerationResult {
  success: boolean
  total: number
  processed: number
  succeeded: number
  failed: number
  errors: Array<{ id: string; error: string }>
  results: Array<{ id: string; status: 'success' | 'failed' | 'skipped'; details?: any }>
}

export interface EmbeddingGenerationOptions {
  userId?: string // If provided, only process posts for this user
  batchSize?: number // Number of posts to process at once
  forceRegenerate?: boolean // Regenerate embeddings even if they exist
  onProgress?: (current: number, total: number, currentPost?: string) => void
  delayBetweenBatches?: number // Milliseconds to wait between batches
  delayBetweenPosts?: number // Milliseconds to wait between individual posts
}

/**
 * Generate embeddings for all posts that don't have them
 * @param options Configuration options for the embedding generation
 * @returns Promise<EmbeddingGenerationResult>
 */
export async function generateEmbeddingsForAllPosts(
  options: EmbeddingGenerationOptions = {}
): Promise<EmbeddingGenerationResult> {
  const {
    userId,
    batchSize = 10,
    forceRegenerate = false,
    onProgress,
    delayBetweenBatches = 1000,
    delayBetweenPosts = 100
  } = options

  const result: EmbeddingGenerationResult = {
    success: false,
    total: 0,
    processed: 0,
    succeeded: 0,
    failed: 0,
    errors: [],
    results: []
  }

  try {
    console.log('🚀 Starting embedding generation for posts...')
    
    // Build query to fetch posts
    let query = supabase
      .from('posts')
      .select('id, title, content, user_id, created_at, embedding')

    if (userId) {
      query = query.eq('user_id', userId)
      console.log(`👤 Filtering for user: ${userId}`)
    }

    // Filter based on force regenerate flag
    if (!forceRegenerate) {
      query = query.or('embedding.is.null,embedding.eq.{}')
      console.log('🔍 Only processing posts without embeddings')
    } else {
      console.log('🔄 Force regenerating all embeddings')
    }

    const { data: posts, error: fetchError } = await query.order('created_at', { ascending: false })

    if (fetchError) {
      throw new Error(`Failed to fetch posts: ${fetchError.message}`)
    }

    if (!posts || posts.length === 0) {
      console.log('ℹ️ No posts found that need embedding generation')
      result.success = true
      return result
    }

    // Filter out posts that already have embeddings (unless force regenerate)
    const postsToProcess = forceRegenerate 
      ? posts 
      : posts.filter(post => !post.embedding || post.embedding.length === 0)

    result.total = postsToProcess.length
    console.log(`📋 Found ${postsToProcess.length} posts to process`)

    if (postsToProcess.length === 0) {
      console.log('✅ All posts already have embeddings')
      result.success = true
      return result
    }

    // Process posts in batches
    for (let i = 0; i < postsToProcess.length; i += batchSize) {
      const batch = postsToProcess.slice(i, i + batchSize)
      const batchNumber = Math.floor(i / batchSize) + 1
      const totalBatches = Math.ceil(postsToProcess.length / batchSize)
      
      console.log(`🔄 Processing batch ${batchNumber}/${totalBatches} (${batch.length} posts)`)

      for (const post of batch) {
        const postTitle = post.title || `Post ${post.id.substring(0, 8)}`
        
        // Call progress callback
        onProgress?.(result.processed, result.total, postTitle)
        result.processed++

        try {
          // Prepare text for embedding
          let textToEmbed = ''
          if (post.title) {
            textToEmbed += post.title + '. '
          }
          textToEmbed += post.content || ''
          textToEmbed = textToEmbed.trim()

          if (!textToEmbed) {
            console.warn(`⚠️ Post ${post.id} has no content, skipping`)
            result.results.push({
              id: post.id,
              status: 'skipped',
              details: { reason: 'No content to embed' }
            })
            continue
          }

          console.log(`📝 Generating embedding for "${postTitle}" (${textToEmbed.length} chars)`)

          // Generate embedding
          const embedding = await generateEmbedding(textToEmbed)

          if (!embedding || embedding.length === 0) {
            throw new Error('Failed to generate embedding - empty result')
          }

          // Update post with embedding
          const { error: updateError } = await supabase
            .from('posts')
            .update({ embedding })
            .eq('id', post.id)

          if (updateError) {
            throw new Error(`Database update failed: ${updateError.message}`)
          }

          result.succeeded++
          result.results.push({
            id: post.id,
            status: 'success',
            details: {
              title: postTitle,
              embedding_dimensions: embedding.length,
              content_length: textToEmbed.length
            }
          })

          console.log(`✅ Successfully processed "${postTitle}"`)

        } catch (error) {
          result.failed++
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          
          console.error(`❌ Failed to process post ${post.id}:`, errorMessage)
          
          result.errors.push({
            id: post.id,
            error: errorMessage
          })

          result.results.push({
            id: post.id,
            status: 'failed',
            details: { error: errorMessage }
          })
        }

        // Delay between posts
        if (delayBetweenPosts > 0) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenPosts))
        }
      }

      // Delay between batches
      if (i + batchSize < postsToProcess.length && delayBetweenBatches > 0) {
        console.log(`⏱️ Waiting ${delayBetweenBatches}ms between batches...`)
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches))
      }
    }

    result.success = true
    console.log(`🎉 Embedding generation completed!`)
    console.log(`📊 Results: ${result.succeeded} successful, ${result.failed} failed out of ${result.total} total`)

    return result

  } catch (error) {
    console.error('💥 Error in embedding generation:', error)
    result.success = false
    result.errors.push({
      id: 'SYSTEM_ERROR',
      error: error instanceof Error ? error.message : 'Unknown system error'
    })
    return result
  }
}

/**
 * Get statistics about posts and their embeddings
 * @param userId Optional user ID to filter by
 * @returns Promise with embedding statistics
 */
export async function getEmbeddingStatistics(userId?: string) {
  try {
    let query = supabase
      .from('posts')
      .select('id, embedding, created_at, user_id')

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data: posts, error } = await query

    if (error) {
      throw new Error(`Failed to fetch posts: ${error.message}`)
    }

    if (!posts) {
      return {
        total: 0,
        with_embeddings: 0,
        without_embeddings: 0,
        completion_percentage: 0
      }
    }

    const withEmbeddings = posts.filter(post => post.embedding && post.embedding.length > 0)
    const withoutEmbeddings = posts.filter(post => !post.embedding || post.embedding.length === 0)
    
    return {
      total: posts.length,
      with_embeddings: withEmbeddings.length,
      without_embeddings: withoutEmbeddings.length,
      completion_percentage: posts.length > 0 ? Math.round((withEmbeddings.length / posts.length) * 100) : 0,
      oldest_post_without_embedding: withoutEmbeddings.length > 0 
        ? withoutEmbeddings.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0]
        : null,
      newest_post_without_embedding: withoutEmbeddings.length > 0
        ? withoutEmbeddings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
        : null
    }
  } catch (error) {
    console.error('Error getting embedding statistics:', error)
    throw error
  }
}

/**
 * Clear all embeddings (useful for testing)
 * @param userId Optional user ID to filter by
 * @param confirm Must be true to actually perform the deletion
 * @returns Promise with the number of cleared embeddings
 */
export async function clearAllEmbeddings(userId?: string, confirm: boolean = false): Promise<number> {
  if (!confirm) {
    throw new Error('Must confirm deletion by setting confirm=true')
  }

  try {
    let query = supabase
      .from('posts')
      .update({ embedding: null })

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query.select('id')

    if (error) {
      throw new Error(`Failed to clear embeddings: ${error.message}`)
    }

    const clearedCount = data?.length || 0
    console.log(`🗑️ Cleared embeddings for ${clearedCount} posts`)
    
    return clearedCount
  } catch (error) {
    console.error('Error clearing embeddings:', error)
    throw error
  }
}

/**
 * Test embedding generation with a single post
 * @param postId The ID of the post to test with
 * @returns Promise with test results
 */
export async function testEmbeddingGeneration(postId: string) {
  try {
    console.log(`🧪 Testing embedding generation for post ${postId}`)

    // Fetch the post
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('id, title, content, embedding')
      .eq('id', postId)
      .single()

    if (fetchError || !post) {
      throw new Error(`Failed to fetch post: ${fetchError?.message || 'Post not found'}`)
    }

    // Prepare text for embedding
    let textToEmbed = ''
    if (post.title) {
      textToEmbed += post.title + '. '
    }
    textToEmbed += post.content || ''
    textToEmbed = textToEmbed.trim()

    if (!textToEmbed) {
      throw new Error('Post has no content to embed')
    }

    console.log(`📝 Text to embed (${textToEmbed.length} chars): ${textToEmbed.substring(0, 100)}...`)

    // Generate embedding
    const embedding = await generateEmbedding(textToEmbed)

    if (!embedding || embedding.length === 0) {
      throw new Error('Failed to generate embedding')
    }

    console.log(`✅ Successfully generated embedding with ${embedding.length} dimensions`)

    return {
      success: true,
      post_id: postId,
      text_length: textToEmbed.length,
      embedding_dimensions: embedding.length,
      had_existing_embedding: !!(post.embedding && post.embedding.length > 0),
      embedding_preview: embedding.slice(0, 5) // First 5 dimensions for preview
    }

  } catch (error) {
    console.error('❌ Embedding test failed:', error)
    return {
      success: false,
      post_id: postId,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
} 