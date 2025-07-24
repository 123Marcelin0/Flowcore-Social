import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

// Helper function to verify authentication
async function verifyAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authenticated: false, user: null, error: 'Missing or invalid authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return { authenticated: false, user: null, error: 'Invalid or expired token' };
    }

    return { authenticated: true, user, error: null };
  } catch (error) {
    return { authenticated: false, user: null, error: 'Authentication verification failed' };
  }
}

// Transform incoming post data to match database schema
function transformPostData(rawPost: any, userId: string) {
  // Extract common social media post fields
  const {
    caption = '',
    content = '',
    description = '',
    text = '',
    media_url = '',
    media_urls = [],
    image_url = '',
    video_url = '',
    image = '',
    video = '',
    likes = 0,
    likes_count = 0,
    comments = 0,
    comments_count = 0,
    shares = 0,
    shares_count = 0,
    views = 0,
    views_count = 0,
    reach = 0,
    impressions = 0,
    platform = 'instagram',
    platforms = [],
    created_at = new Date().toISOString(),
    published_at = null,
    hashtags = [],
    tags = [],
    title = '',
    status = 'published' // Default to published since these are old posts
  } = rawPost;

  // Determine content text (try multiple field names)
  const contentText = caption || content || description || text || 'Imported post';

  // Determine media URLs array
  let mediaUrlsArray: string[] = [];
  if (Array.isArray(media_urls) && media_urls.length > 0) {
    mediaUrlsArray = media_urls;
  } else if (media_url) {
    mediaUrlsArray = [media_url];
  } else if (image_url || image) {
    mediaUrlsArray = [image_url || image];
  } else if (video_url || video) {
    mediaUrlsArray = [video_url || video];
  }

  // Determine media type
  let mediaType = 'text';
  if (mediaUrlsArray.length > 0) {
    const firstUrl = mediaUrlsArray[0].toLowerCase();
    if (firstUrl.includes('.mp4') || firstUrl.includes('.mov') || firstUrl.includes('video') || video_url || video) {
      mediaType = 'video';
    } else if (firstUrl.includes('.jpg') || firstUrl.includes('.png') || firstUrl.includes('.jpeg') || firstUrl.includes('image') || image_url || image) {
      mediaType = 'image';
    } else if (mediaUrlsArray.length > 1) {
      mediaType = 'carousel';
    }
  }

  // Determine platforms array
  let platformsArray: string[] = [];
  if (Array.isArray(platforms) && platforms.length > 0) {
    platformsArray = platforms;
  } else if (platform) {
    platformsArray = [platform];
  } else {
    platformsArray = ['instagram']; // Default platform
  }

  // Combine hashtags and tags
  let tagsArray: string[] = [];
  if (Array.isArray(hashtags)) tagsArray = [...tagsArray, ...hashtags];
  if (Array.isArray(tags)) tagsArray = [...tagsArray, ...tags];

  // Ensure valid engagement numbers
  const likesCount = Math.max(0, parseInt(likes) || parseInt(likes_count) || 0);
  const commentsCount = Math.max(0, parseInt(comments) || parseInt(comments_count) || 0);
  const sharesCount = Math.max(0, parseInt(shares) || parseInt(shares_count) || 0);
  const reachCount = Math.max(0, parseInt(reach) || 0);
  const impressionsCount = Math.max(0, parseInt(impressions) || parseInt(views) || parseInt(views_count) || 0);

  return {
    user_id: userId,
    title: title || null,
    content: contentText,
    media_urls: mediaUrlsArray,
    media_type: mediaType,
    platforms: platformsArray,
    status: status,
    published_at: published_at || created_at,
    tags: tagsArray,
    likes: likesCount,
    comments: commentsCount,
    shares: sharesCount,
    reach: reachCount,
    impressions: impressionsCount,
    metadata: {
      imported: true,
      import_date: new Date().toISOString(),
      original_data: rawPost // Store original data for reference
    }
  };
}

// POST /api/bulk-upload-posts - Upload posts from JSON
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = authResult.user!

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { posts } = body;

    if (!Array.isArray(posts)) {
      return NextResponse.json(
        { success: false, error: 'Posts must be an array' },
        { status: 400 }
      );
    }

    if (posts.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No posts provided' },
        { status: 400 }
      );
    }

    if (posts.length > 200) {
      return NextResponse.json(
        { success: false, error: 'Maximum 200 posts allowed per upload' },
        { status: 400 }
      );
    }

    // Transform all posts
    const transformedPosts = posts.map(post => transformPostData(post, user.id));

    // Validate that all transformed posts have required fields
    for (let i = 0; i < transformedPosts.length; i++) {
      const post = transformedPosts[i];
      if (!post.content || post.content.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: `Post at index ${i} is missing content` },
          { status: 400 }
        );
      }
    }

    // Create properly authenticated Supabase client
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const authenticatedSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    // Set the session explicitly
    await authenticatedSupabase.auth.setSession({
      access_token: token!,
      refresh_token: '' // Not needed for this operation
    });

    // Insert posts in batches of 50 to avoid timeout
    const batchSize = 50;
    const results = [];
    let totalInserted = 0;

    for (let i = 0; i < transformedPosts.length; i += batchSize) {
      const batch = transformedPosts.slice(i, i + batchSize);
      
      // Use the authenticated client for the insert
      const { data, error } = await authenticatedSupabase
        .from('posts')
        .insert(batch)
        .select();

      if (error) {
        console.error(`Error inserting batch starting at index ${i}:`, error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        // If it's an RLS error, try with different approach
        if (error.message.includes('row-level security')) {
          console.log('RLS error detected, attempting alternative approach...');
          
                     // Alternative: Insert posts one by one with explicit auth context
           const singleResults = [];
           for (const post of batch) {
             const { data: singleData, error: singleError } = await authenticatedSupabase
               .from('posts')
               .insert([post])
               .select();
              
            if (singleError) {
              console.error('Single insert error:', singleError);
              return NextResponse.json(
                { 
                  success: false, 
                  error: `RLS Policy Error: Please ensure you have the necessary permissions. Details: ${singleError.message}`,
                  totalInserted 
                },
                { status: 403 }
              );
            }
            
            if (singleData) {
              singleResults.push(...singleData);
            }
          }
          
          results.push(...singleResults);
          totalInserted += singleResults.length;
          continue;
        }
        
        return NextResponse.json(
          { 
            success: false, 
            error: `Failed to insert posts at batch starting index ${i}: ${error.message}`,
            totalInserted 
          },
          { status: 500 }
        );
      }

      if (data) {
        results.push(...data);
        totalInserted += data.length;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${totalInserted} posts`,
      totalInserted,
      posts: results
    }, { status: 201 });

  } catch (error) {
    console.error('POST /api/bulk-upload-posts error:', error);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

// OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
} 