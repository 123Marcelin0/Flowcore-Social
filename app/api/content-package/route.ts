import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { chatContextAnalyzer } from '@/lib/chat-context-analyzer';
import { enhancedContentGenerator } from '@/lib/enhanced-content-generator';
import { contentPackageBuilder } from '@/lib/content-package-builder';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Rate limiting in-memory store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_REQUESTS = 10; // 10 requests per window
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

// Helper function to verify authentication
async function verifyAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authenticated: false, user: null, error: 'Missing or invalid authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');
  
  try {
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const { data: { user }, error } = await anonClient.auth.getUser(token);
    
    if (error || !user) {
      console.error('Auth verification error:', error?.message);
      return { authenticated: false, user: null, error: 'Invalid or expired token' };
    }

    return { authenticated: true, user, error: null };
  } catch (error) {
    console.error('Auth verification exception:', error);
    return { authenticated: false, user: null, error: 'Authentication verification failed' };
  }
}

// Rate limiting function
function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const userLimits = rateLimitStore.get(userId);

  if (!userLimits || now > userLimits.resetTime) {
    // Reset or initialize rate limit
    const resetTime = now + RATE_LIMIT_WINDOW;
    rateLimitStore.set(userId, { count: 1, resetTime });
    return { allowed: true, remaining: RATE_LIMIT_REQUESTS - 1, resetTime };
  }

  if (userLimits.count >= RATE_LIMIT_REQUESTS) {
    return { allowed: false, remaining: 0, resetTime: userLimits.resetTime };
  }

  // Increment count
  userLimits.count++;
  rateLimitStore.set(userId, userLimits);
  
  return { allowed: true, remaining: RATE_LIMIT_REQUESTS - userLimits.count, resetTime: userLimits.resetTime };
}

// Retry mechanism with exponential backoff
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, lastError.message);
    }
  }
  
  throw lastError!;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate the user
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = authResult.user!;

    // 2. Check rate limits
    const rateLimitResult = checkRateLimit(user.id);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Rate limit exceeded',
          resetTime: rateLimitResult.resetTime
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': RATE_LIMIT_REQUESTS.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
          }
        }
      );
    }

    // 3. Parse request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { 
      topic, 
      platform = 'instagram', 
      contentType = 'video',
      tone,
      length = 'medium',
      regenerate = false,
      previousPackageId
    } = body;

    if (!topic || typeof topic !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Topic is required' },
        { status: 400 }
      );
    }

    console.log(`Content Package Generation: "${topic}" for user: ${user.id}`);

    // 4. Analyze user context with retry mechanism
    const userContext = await retryWithBackoff(async () => {
      return await chatContextAnalyzer.analyzeUserContext(user.id);
    });

    if (!userContext) {
      return NextResponse.json(
        { success: false, error: 'Failed to analyze user context' },
        { status: 500 }
      );
    }

    // 5. Generate content package with retry mechanism
    const contentPackage = await retryWithBackoff(async () => {
      if (regenerate && previousPackageId) {
        // Get previous package for regeneration
        const { data: previousPackage } = await supabase
          .from('content_packages')
          .select('*')
          .eq('id', previousPackageId)
          .eq('user_id', user.id)
          .single();

        if (previousPackage) {
          return await enhancedContentGenerator.regenerateContent(
            previousPackage,
            userContext,
            {
              platform: platform as any,
              contentType: contentType as any,
              tone: tone as any,
              length: length as any
            }
          );
        }
      }

      // Generate new content package
      if (platform === 'content-package') {
        // Use content package builder for comprehensive packages
        return contentPackageBuilder.buildContentPackage(
          userContext,
          topic,
          {
            platform: 'instagram', // Default for package builder
            contentType: contentType as any,
            tone: tone as any,
            length: length as any
          }
        );
      } else {
        // Use enhanced content generator for platform-specific content
        return await enhancedContentGenerator.generateContentPackage(
          userContext,
          {
            prompt: topic,
            platform: platform as any,
            contentType: contentType as any,
            tone: tone as any,
            length: length as any
          }
        );
      }
    });

    // 6. Store the generated content package
    const packageId = (contentPackage as any).id || `pkg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const packageMetadata = (contentPackage as any).metadata || {
      generatedAt: new Date(),
      contextSummary: userContext.contextSummary,
      userStyle: userContext.userStyle.tone,
      topics: userContext.topics.slice(0, 10),
      confidence: 0.8,
      regenerationCount: regenerate ? 1 : 0
    };

    const packageToStore = {
      id: packageId,
      user_id: user.id,
      topic,
      platform,
      content_type: contentType,
      script: contentPackage.script,
      hashtags: contentPackage.hashtags,
      captions: contentPackage.captions,
      implementation_guide: contentPackage.implementationGuide,
      visual_guidance: contentPackage.visualGuidance,
      metadata: packageMetadata,
      created_at: new Date().toISOString()
    };

    // Store asynchronously, don't block response
    (async () => {
      try {
        const { error: storeError } = await supabase
          .from('content_packages')
          .insert([packageToStore]);
        
        if (storeError) {
          console.error('Failed to store content package:', storeError);
        } else {
          console.log('Content package stored successfully:', packageToStore.id);
        }
      } catch (error) {
        console.error('Error storing content package:', error);
      }
    })();

    // 7. Return successful response with rate limit headers
    return NextResponse.json(
      {
        success: true,
        contentPackage,
                 userContext: {
           topics: userContext.topics.slice(0, 5),
           userStyle: userContext.userStyle,
           messageCount: userContext.messageCount,
           confidence: packageMetadata.confidence || 0.8
         },
        packageId: packageToStore.id
      },
      {
        headers: {
          'X-RateLimit-Limit': RATE_LIMIT_REQUESTS.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
        }
      }
    );

  } catch (error) {
    console.error('Content package generation error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate content package',
        details: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : String(error))
          : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve user's content packages
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate the user
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = authResult.user!;

    // 2. Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');
    const platform = searchParams.get('platform');
    const contentType = searchParams.get('contentType');

    // 3. Build query
    let query = supabase
      .from('content_packages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (platform) {
      query = query.eq('platform', platform);
    }

    if (contentType) {
      query = query.eq('content_type', contentType);
    }

    // 4. Execute query
    const { data: packages, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      packages: packages || [],
      pagination: {
        limit,
        offset,
        hasMore: (packages?.length || 0) === limit
      }
    });

  } catch (error) {
    console.error('Error retrieving content packages:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve content packages',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
} 