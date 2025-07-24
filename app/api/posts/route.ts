import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; // Adjust path if necessary
import { PostsService } from '@/lib/data-service'; // Adjust path if necessary, assuming PostsService is exported

// Helper function to verify authentication (kept local for self-containment)
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

// GET /api/posts - Retrieve all posts for authenticated user
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = authResult.user!;

    // Query posts for authenticated user
    // Using PostsService to maintain consistency
    const posts = await PostsService.getPosts();

    return NextResponse.json({
      success: true,
      posts: posts || [],
      message: 'Posts retrieved successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('GET /api/posts error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/posts - Create a new post
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

    const user = authResult.user!;

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

    // Validate required fields and map to correct DB names
    const { 
      platform, 
      content, 
      description, // Alternative field name for content
      media_urls, 
      media_type, 
      scheduled_publish_time,
      likes, comments, shares, reach, impressions, // Incoming fields
      title // Incoming title field, will be used for embedding in data-service
    } = body;

    // Use content or description field - map to content_text
    const postContent = content || description;

    if (!platform || !media_type || !postContent) {
      return NextResponse.json(
        { success: false, error: 'Platform, media_type, and content/description are required fields' },
        { status: 400 }
      );
    }

    // Validate platform value
    const validPlatforms = ['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'youtube', 'pinterest'];
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json(
        { success: false, error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate media_type value
    const validMediaTypes = ['image', 'video', 'text', 'carousel'];
    if (!validMediaTypes.includes(media_type)) {
      return NextResponse.json(
        { success: false, error: `Invalid media_type. Must be one of: ${validMediaTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Prepare post data for PostsService (includes 'title' for embedding purposes)
    const postDataForService: any = {
      user_id: user.id, // User ID is added by data-service, but good to include for clarity
      content_text: postContent, 
      platforms: [platform],
      media_urls: media_urls || [],
      media_type,
      scheduled_at: scheduled_publish_time || null,
      status: 'draft', // Default status
      // Map incoming 'comments' to 'comments_count'
      comments_count: typeof comments === 'number' ? comments : 0, 
      likes: typeof likes === 'number' ? likes : 0, 
      shares: typeof shares === 'number' ? shares : 0, 
      reach: typeof reach === 'number' ? reach : 0, 
      impressions: typeof impressions === 'number' ? impressions : 0,
      // Include title temporarily for embedding in data-service, it will be filtered out before DB insert
      title: typeof title === 'string' ? title : null, 
    };

    // Populate image_url and video_url based on media_type
    if (media_type === 'image' && media_urls && media_urls.length > 0) {
      postDataForService.image_url = media_urls[0];
    } else {
      postDataForService.image_url = null;
    }
    if (media_type === 'video' && media_urls && media_urls.length > 0) {
      postDataForService.video_url = media_urls[0];
    } else {
      postDataForService.video_url = null;
    }

    // Debug: Log the data being sent to data-service
    console.log('POST /api/posts - Data being sent to PostsService:', JSON.stringify(postDataForService, null, 2));

    // Call PostsService to create the new post
    const newPost = await PostsService.createPost(postDataForService);

    return NextResponse.json({
      success: true,
      post: newPost,
      message: 'Post created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('POST /api/posts error:', error);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

// PUT /api/posts - Update an existing post
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = authResult.user!;

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

    // Validate required fields and map to correct DB names
    const { 
      id, 
      platform, 
      content,
      description, // Alternative field name for content
      media_urls, 
      media_type, 
      scheduled_publish_time,
      likes, comments, shares, reach, impressions, // Incoming fields
      title // Incoming title field, will be used for embedding in data-service
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Post ID is required for updates' },
        { status: 400 }
      );
    }

    // Verify post exists and belongs to user (via PostsService.getPost to reuse auth logic)
    const existingPost = await PostsService.getPost(id); // Assumes getPost handles user.id check internally
    if (!existingPost || existingPost.user_id !== user.id) { // Additional check if getPost is generic
      return NextResponse.json(
        { success: false, error: 'Post not found or access denied' },
        { status: 404 }
      );
    }

    // Validate platform if provided
    if (platform) {
      const validPlatforms = ['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'youtube', 'pinterest'];
      if (!validPlatforms.includes(platform)) {
        return NextResponse.json(
          { success: false, error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Validate media_type if provided
    if (media_type) {
      const validMediaTypes = ['image', 'video', 'text', 'carousel'];
      if (!validMediaTypes.includes(media_type)) {
        return NextResponse.json(
          { success: false, error: `Invalid media_type. Must be one of: ${validMediaTypes.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Prepare update data for PostsService (includes 'title' for embedding purposes)
    const updateDataForService: any = { id }; // Pass ID for update
    
    if (platform !== undefined) updateDataForService.platforms = [platform];
    
    // Determine content for update and map to content_text
    const updateContent = content !== undefined ? content : description;
    if (content !== undefined || description !== undefined) {
      updateDataForService.content_text = updateContent;
    }
    
    if (media_urls !== undefined) updateDataForService.media_urls = media_urls;
    
    if (media_type !== undefined) {
      updateDataForService.media_type = media_type;
      if (media_type === 'image' && media_urls && media_urls.length > 0) {
        updateDataForService.image_url = media_urls[0];
        updateDataForService.video_url = null; 
      } else if (media_type === 'video' && media_urls && media_urls.length > 0) {
        updateDataForService.video_url = media_urls[0];
        updateDataForService.image_url = null; 
      } else {
        updateDataForService.image_url = null; 
        updateDataForService.video_url = null;
      }
    }
    
    if (scheduled_publish_time !== undefined) updateDataForService.scheduled_at = scheduled_publish_time;
    // Map incoming 'comments' to 'comments_count'
    if (comments !== undefined) updateDataForService.comments_count = comments; 
    if (likes !== undefined) updateDataForService.likes = likes;
    if (shares !== undefined) updateDataForService.shares = shares;
    if (reach !== undefined) updateDataForService.reach = reach;
    if (impressions !== undefined) updateDataForService.impressions = impressions;
    
    // Include title temporarily for embedding in data-service
    if (title !== undefined) updateDataForService.title = typeof title === 'string' ? title : null;

    // Debug: Log the data being sent to data-service
    console.log('PUT /api/posts - Data being sent to PostsService:', JSON.stringify(updateDataForService, null, 2));

    // Call PostsService to update the post
    const updatedPost = await PostsService.updatePost(id, updateDataForService);

    return NextResponse.json({
      success: true,
      post: updatedPost,
      message: 'Post updated successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('PUT /api/posts error:', error);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

// PATCH /api/posts - Clear embedding for a specific post
export async function PATCH(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = authResult.user!;

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

    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Post ID is required to clear embedding' },
        { status: 400 }
      );
    }

    // Verify post exists and belongs to user
    const { data: existingPost, error: fetchError } = await supabase
      .from('posts')
      .select('id') // Only select ID, no need for full post data
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingPost) {
      return NextResponse.json(
        { success: false, error: 'Post not found or access denied' },
        { status: 404 }
      );
    }

    // Update the post to set embedding to NULL
    const { data: updatedPost, error } = await supabase
      .from('posts')
      .update({ embedding: null }) // Set embedding to NULL
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error clearing post embedding:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to clear post embedding' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      post: updatedPost,
      message: 'Post embedding cleared successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('PATCH /api/posts (clear embedding) error:', error);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

// DELETE /api/posts - (Existing method, no changes needed)
export async function DELETE(request: NextRequest) {
  // Existing DELETE logic (if any) or return Method Not Allowed
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  );
}

// OPTIONS /api/posts - (Standard for CORS, no changes needed)
export async function OPTIONS(request: NextRequest) {
  // Standard OPTIONS logic for CORS preflight requests
  const response = new NextResponse(null, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', '*'); // Adjust as needed
  response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours
  return response;
} 