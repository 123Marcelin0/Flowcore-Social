#!/usr/bin/env node

/**
 * Generate Embeddings Script
 * 
 * This script generates OpenAI embeddings for all posts in the database
 * that don't already have embeddings.
 * 
 * Usage:
 *   node scripts/generate-embeddings.js [options]
 * 
 * Options:
 *   --user-id <id>     Only process posts for specific user
 *   --batch-size <n>   Number of posts to process at once (default: 10)
 *   --force           Regenerate embeddings even if they exist
 *   --dry-run         Show what would be processed without making changes
 *   --help            Show this help message
 * 
 * Examples:
 *   node scripts/generate-embeddings.js
 *   node scripts/generate-embeddings.js --user-id 12345678-1234-1234-1234-123456789012
 *   node scripts/generate-embeddings.js --batch-size 5 --force
 *   node scripts/generate-embeddings.js --dry-run
 */

const { createClient } = require('@supabase/supabase-js')
const OpenAI = require('openai')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

// Configuration
const config = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  openaiKey: process.env.OPENAI_API_KEY,
  embeddingModel: 'text-embedding-3-small'
}

// Validate configuration
function validateConfig() {
  const missing = []
  
  if (!config.supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!config.supabaseKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')
  if (!config.openaiKey) missing.push('OPENAI_API_KEY')
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:')
    missing.forEach(key => console.error(`   - ${key}`))
    console.error('\nPlease check your .env.local file')
    process.exit(1)
  }
}

// Initialize clients
function initializeClients() {
  const supabase = createClient(config.supabaseUrl, config.supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  const openai = new OpenAI({
    apiKey: config.openaiKey
  })

  return { supabase, openai }
}

// Generate embedding using OpenAI
async function generateEmbedding(openai, text) {
  try {
    if (!text || text.trim().length === 0) {
      return null
    }

    const response = await openai.embeddings.create({
      model: config.embeddingModel,
      input: text
    })

    const embedding = response.data[0]?.embedding
    return Array.isArray(embedding) ? embedding : null
  } catch (error) {
    console.error('Error generating embedding:', error.message)
    return null
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    userId: null,
    batchSize: 10,
    force: false,
    dryRun: false,
    help: false
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    
    switch (arg) {
      case '--user-id':
        options.userId = args[++i]
        break
      case '--batch-size':
        options.batchSize = parseInt(args[++i]) || 10
        break
      case '--force':
        options.force = true
        break
      case '--dry-run':
        options.dryRun = true
        break
      case '--help':
        options.help = true
        break
      default:
        if (arg.startsWith('--')) {
          console.error(`❌ Unknown option: ${arg}`)
          process.exit(1)
        }
    }
  }

  return options
}

// Show help message
function showHelp() {
  console.log(`
🚀 Generate Embeddings Script

This script generates OpenAI embeddings for posts in your dashboard.

Usage:
  node scripts/generate-embeddings.js [options]

Options:
  --user-id <id>     Only process posts for specific user
  --batch-size <n>   Number of posts to process at once (default: 10)
  --force           Regenerate embeddings even if they exist
  --dry-run         Show what would be processed without making changes
  --help            Show this help message

Examples:
  node scripts/generate-embeddings.js
  node scripts/generate-embeddings.js --user-id 12345678-1234-1234-1234-123456789012
  node scripts/generate-embeddings.js --batch-size 5 --force
  node scripts/generate-embeddings.js --dry-run

Environment Variables Required:
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  OPENAI_API_KEY
`)
}

// Get posts that need embeddings
async function getPostsToProcess(supabase, options) {
  console.log('📋 Fetching posts from database...')
  
  let query = supabase
    .from('posts')
    .select('id, title, content, user_id, created_at, embedding')

  if (options.userId) {
    query = query.eq('user_id', options.userId)
    console.log(`👤 Filtering for user: ${options.userId}`)
  }

  if (!options.force) {
    query = query.or('embedding.is.null,embedding.eq.{}')
    console.log('🔍 Only fetching posts without embeddings')
  } else {
    console.log('🔄 Fetching all posts (force regenerate)')
  }

  const { data: posts, error } = await query.order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch posts: ${error.message}`)
  }

  if (!posts || posts.length === 0) {
    console.log('ℹ️ No posts found')
    return []
  }

  // Filter out posts that already have embeddings (unless force)
  const postsToProcess = options.force 
    ? posts 
    : posts.filter(post => !post.embedding || post.embedding.length === 0)

  console.log(`📊 Found ${posts.length} total posts, ${postsToProcess.length} need processing`)
  
  return postsToProcess
}

// Process a single post
async function processPost(openai, supabase, post, options) {
  const postTitle = post.title || `Post ${post.id.substring(0, 8)}`
  
  try {
    // Prepare text for embedding
    let textToEmbed = ''
    if (post.title) {
      textToEmbed += post.title + '. '
    }
    textToEmbed += post.content || ''
    textToEmbed = textToEmbed.trim()

    if (!textToEmbed) {
      console.log(`⚠️  "${postTitle}": No content to embed, skipping`)
      return { status: 'skipped', reason: 'No content' }
    }

    if (options.dryRun) {
      console.log(`🧪 "${postTitle}": Would generate embedding (${textToEmbed.length} chars)`)
      return { status: 'dry-run', textLength: textToEmbed.length }
    }

    console.log(`📝 "${postTitle}": Generating embedding (${textToEmbed.length} chars)`)

    // Generate embedding
    const embedding = await generateEmbedding(openai, textToEmbed)

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

    console.log(`✅ "${postTitle}": Successfully processed (${embedding.length} dimensions)`)
    
    return { 
      status: 'success', 
      embeddingDimensions: embedding.length,
      textLength: textToEmbed.length
    }

  } catch (error) {
    console.error(`❌ "${postTitle}": ${error.message}`)
    return { status: 'failed', error: error.message }
  }
}

// Main function
async function main() {
  const options = parseArgs()

  if (options.help) {
    showHelp()
    return
  }

  console.log('🚀 Starting embedding generation script...\n')

  // Validate configuration
  validateConfig()

  // Initialize clients
  const { supabase, openai } = initializeClients()

  try {
    // Get posts to process
    const posts = await getPostsToProcess(supabase, options)

    if (posts.length === 0) {
      console.log('✅ No posts need processing. All done!')
      return
    }

    // Show summary
    console.log('\n📋 Processing Summary:')
    console.log(`   Posts to process: ${posts.length}`)
    console.log(`   Batch size: ${options.batchSize}`)
    console.log(`   User filter: ${options.userId || 'All users'}`)
    console.log(`   Force regenerate: ${options.force ? 'Yes' : 'No'}`)
    console.log(`   Dry run: ${options.dryRun ? 'Yes' : 'No'}`)

    if (options.dryRun) {
      console.log('\n🧪 DRY RUN MODE - No changes will be made\n')
    } else {
      console.log('\n🔄 Starting processing...\n')
    }

    // Initialize counters
    const results = {
      total: posts.length,
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0
    }

    // Process posts in batches
    for (let i = 0; i < posts.length; i += options.batchSize) {
      const batch = posts.slice(i, i + options.batchSize)
      const batchNumber = Math.floor(i / options.batchSize) + 1
      const totalBatches = Math.ceil(posts.length / options.batchSize)
      
      console.log(`\n🔄 Processing batch ${batchNumber}/${totalBatches} (${batch.length} posts)`)

      for (const post of batch) {
        const result = await processPost(openai, supabase, post, options)
        results.processed++

        switch (result.status) {
          case 'success':
            results.succeeded++
            break
          case 'failed':
            results.failed++
            break
          case 'skipped':
          case 'dry-run':
            results.skipped++
            break
        }

        // Small delay between posts to be nice to the API
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // Delay between batches
      if (i + options.batchSize < posts.length) {
        console.log('⏱️  Waiting between batches...')
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    // Show final results
    console.log('\n🎉 Processing completed!')
    console.log('\n📊 Final Results:')
    console.log(`   Total processed: ${results.processed}`)
    console.log(`   Successful: ${results.succeeded}`)
    console.log(`   Failed: ${results.failed}`)
    console.log(`   Skipped: ${results.skipped}`)
    
    if (results.total > 0) {
      const successRate = Math.round((results.succeeded / results.total) * 100)
      console.log(`   Success rate: ${successRate}%`)
    }

    if (!options.dryRun && results.succeeded > 0) {
      console.log('\n✅ Embeddings have been generated and saved to the database.')
      console.log('   Your posts are now ready for AI-powered semantic search!')
    }

  } catch (error) {
    console.error('\n💥 Script failed:', error.message)
    process.exit(1)
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Unhandled error:', error)
    process.exit(1)
  })
}

module.exports = {
  main,
  generateEmbedding,
  parseArgs,
  validateConfig
} 