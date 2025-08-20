import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { chatContextAnalyzer } from '@/lib/chat-context-analyzer';
import { enhancedContentGenerator } from '@/lib/enhanced-content-generator';
import { contentPackageBuilder } from '@/lib/content-package-builder';

function getSupabaseService() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

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
    const anonUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!anonUrl || !anonKey) return { authenticated: false, user: null, error: 'Supabase not configured' }
    const anonClient = createClient(anonUrl, anonKey);
    const { data: { user }, error } = await anonClient.auth.getUser(token);
    if (error || !user) {
      return { authenticated: false, user: null, error: 'Invalid or expired token' };
    }
    return { authenticated: true, user, error: null };
  } catch (error) {
    return { authenticated: false, user: null, error: 'Authentication verification failed' };
  }
}

// Rate limiting function
function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const userLimits = rateLimitStore.get(userId);

  if (!userLimits || now > userLimits.resetTime) {
    const resetTime = now + RATE_LIMIT_WINDOW;
    rateLimitStore.set(userId, { count: 1, resetTime });
    return { allowed: true, remaining: RATE_LIMIT_REQUESTS - 1, resetTime };
  }

  if (userLimits.count >= RATE_LIMIT_REQUESTS) {
    return { allowed: false, remaining: 0, resetTime: userLimits.resetTime };
  }

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
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseService()
    if (!supabase) return NextResponse.json({ success: false, error: 'Supabase not configured' }, { status: 500 })

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

      return await enhancedContentGenerator.generate(
        topic,
        userContext,
        {
          platform: platform as any,
          contentType: contentType as any,
          tone: tone as any,
          length: length as any
        }
      );
    });

    if (!contentPackage) {
      return NextResponse.json(
        { success: false, error: 'Content generation failed' },
        { status: 500 }
      );
    }

    // 6. Save content package
    const { data: savedPackage, error: saveError } = await supabase
      .from('content_packages')
      .insert({
        user_id: user.id,
        topic,
        platform,
        content_type: contentType,
        tone,
        length,
        content: contentPackage,
        regenerate_of: regenerate ? previousPackageId : null
      })
      .select()
      .single();

    if (saveError) {
      console.error('Failed to save content package:', saveError);
      return NextResponse.json(
        { success: false, error: 'Failed to save content package' },
        { status: 500 }
      );
    }

    // 7. Build comprehensive response
    const response = contentPackageBuilder.buildResponse(contentPackage, savedPackage?.id);

    return NextResponse.json({ success: true, data: response }, { status: 200 });

  } catch (error) {
    console.error('Content Package API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseService()
    if (!supabase) return NextResponse.json({ success: false, error: 'Supabase not configured' }, { status: 500 })

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const platform = searchParams.get('platform');

    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = authResult.user!;

    let query = supabase
      .from('content_packages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (platform) {
      query = query.eq('platform', platform);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data: packages, error } = await query.range(from, to);

    if (error) {
      console.error('Failed to fetch content packages:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch content packages' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: packages }, { status: 200 });

  } catch (error) {
    console.error('Content Package API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
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