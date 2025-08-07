import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Environment variable validation
const requiredEnvVars = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  APPLYDESIGN_API_KEY: process.env.APPLYDESIGN_API_KEY,
  REIMAGINEHOME_API_KEY: process.env.REIMAGINEHOME_API_KEY || null, // Make optional
} as const;

// Check for missing required environment variables (excluding optional ones)
const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value && key !== 'REIMAGINEHOME_API_KEY') // Exclude optional keys
  .map(([key, _]) => key);

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(', ')}. ` +
    'Please ensure all required environment variables are properly configured.'
  );
}

// Type-safe environment variables after validation
const env = {
  NEXT_PUBLIC_SUPABASE_URL: requiredEnvVars.NEXT_PUBLIC_SUPABASE_URL!,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: requiredEnvVars.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  SUPABASE_SERVICE_ROLE_KEY: requiredEnvVars.SUPABASE_SERVICE_ROLE_KEY!,
  APPLYDESIGN_API_KEY: requiredEnvVars.APPLYDESIGN_API_KEY!,
  REIMAGINEHOME_API_KEY: requiredEnvVars.REIMAGINEHOME_API_KEY,
};

// Initialize Supabase clients
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Initialize Supabase anon client for authentication (created once at module level)
const supabaseAnon = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Initialize OpenAI client (for potential future features)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, 
});

// Environment variables for external APIs
const APPLYDESIGN_API_KEY = env.APPLYDESIGN_API_KEY;
const REIMAGINEHOME_API_KEY = env.REIMAGINEHOME_API_KEY;

// TypeScript interfaces
interface InteriorDesignRequest {
  imageUrl: string; // Publicly accessible URL of the uploaded image
  action: "change_style" | "remove_interior" | "add_interior";
  styleId?: string; // Optional, for change_style/add_interior
  roomType?: string; // Optional, for change_style/add_interior
  usePremium: boolean; // true for applydesign.io, false for reimaginehome.ai
  batchId?: string; // Optional, for grouping results in batch processing
}

interface AIJob {
  id: string;
  user_id: string;
  image_url: string;
  action: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  external_api_name: 'applydesign' | 'reimaginehome';
  external_job_id: string;
  result_image_url?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

interface StylesResponse {
  styles: Array<{ id: string; name: string; preview_url?: string }>;
  roomTypes: Array<{ id: string; name: string }>;
}

// Default styles and room types constants to avoid duplication
const DEFAULT_STYLES = [
  { id: 'modern', name: 'Modern', preview_url: null },
  { id: 'scandinavian', name: 'Scandinavian', preview_url: null },
  { id: 'minimalist', name: 'Minimalist', preview_url: null },
  { id: 'industrial', name: 'Industrial', preview_url: null },
  { id: 'bohemian', name: 'Bohemian', preview_url: null },
  { id: 'traditional', name: 'Traditional', preview_url: null }
];

const DEFAULT_ROOM_TYPES = [
  { id: 'living_room', name: 'Living Room' },
  { id: 'bedroom', name: 'Bedroom' },
  { id: 'kitchen', name: 'Kitchen' },
  { id: 'bathroom', name: 'Bathroom' },
  { id: 'dining_room', name: 'Dining Room' },
  { id: 'office', name: 'Home Office' }
];

// Helper function to verify authentication
async function verifyAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authenticated: false, user: null, error: 'Missing or invalid authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');
  
  try {
    const { data: { user }, error } = await supabaseAnon.auth.getUser(token);
    
    if (error || !user) {
      console.error('Auth verification error:', error?.message);
      return { authenticated: false, user: null, error: 'Invalid or expired token' };
    }

    return { authenticated: true, user, error: null };
  } catch (error) {
    console.error('Auth error:', error);
    return { authenticated: false, user: null, error: 'Authentication failed' };
  }
}

// Helper function to validate URL
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Rate limiting cache (simple in-memory store)
const rateLimitCache = new Map<string, { count: number; resetTime: number }>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [userId, limit] of rateLimitCache.entries()) {
    if (now > limit.resetTime) {
      rateLimitCache.delete(userId);
    }
  }
}, 5 * 60 * 1000);

function checkRateLimit(userId: string, limit: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now();
  const userLimit = rateLimitCache.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitCache.set(userId, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (userLimit.count >= limit) {
    return false;
  }
  
  userLimit.count++;
  return true;
}
// ApplyDesign.io API integration
async function callApplyDesignAPI(request: InteriorDesignRequest): Promise<{ jobId?: string; imageUrl?: string; error?: string }> {
  if (!APPLYDESIGN_API_KEY) {
    return { error: 'ApplyDesign API key not configured' };
  }

  try {
    let endpoint = '';
    let requestBody: any = {};

    // Determine endpoint and request body based on action
    switch (request.action) {
      case 'remove_interior':
        // Furniture removal endpoint
        endpoint = 'https://api.applydesign.io/v1/staging/furniture_removal';
        requestBody = {
          image_url: request.imageUrl,
          remove_furniture: true
        };
        break;
      
      case 'change_style':
      case 'add_interior':
        // Virtual staging/design endpoint
        endpoint = 'https://api.applydesign.io/v1/staging/design';
        requestBody = {
          image_url: request.imageUrl,
          style: request.styleId || 'modern',
          room_type: request.roomType || 'living_room',
          auto_staging: true
        };
        break;
    }

    // Create AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'X-API-Key': APPLYDESIGN_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      // Clear timeout since fetch completed successfully
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ApplyDesign API error:', response.status, errorText);
        return { error: `ApplyDesign API error: ${response.status}` };
      }

      const result = await response.json();
      
      // Check if we get immediate result or job ID
      if (result.result_image_url || result.output_image_url) {
        return { imageUrl: result.result_image_url || result.output_image_url };
      } else if (result.job_id || result.task_id) {
        return { jobId: result.job_id || result.task_id };
      } else {
        return { error: 'Unexpected response format from ApplyDesign API' };
      }
    } catch (error) {
      // Clear timeout in case of error
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('ApplyDesign API call timed out');
        return { error: 'ApplyDesign API call timed out' };
      }
      
      console.error('ApplyDesign API call failed:', error);
      return { error: 'Failed to call ApplyDesign API' };
    }
  } catch (error) {
    console.error('ApplyDesign API call failed:', error);
    return { error: 'Failed to call ApplyDesign API' };
  }
}

// ReimaginehHome.ai API integration
async function callReimaginehomeAPI(request: InteriorDesignRequest): Promise<{ jobId?: string; imageUrl?: string; error?: string }> {
  if (!REIMAGINEHOME_API_KEY) {
    return { error: 'ReimaginehHome API key not configured' };
  }

  try {
    let endpoint = '';
    let requestBody: any = {
      image_url: request.imageUrl,
    };

    switch (request.action) {
      case 'remove_interior':
        endpoint = 'https://api.reimaginehome.ai/v1/remove_item';
        // For removal, we might need to specify what to remove
        requestBody.item_type = 'furniture';
        break;
      case 'change_style':
      case 'add_interior':
        endpoint = 'https://api.reimaginehome.ai/v1/create_image';
        requestBody.style_id = request.styleId || 'modern';
        requestBody.room_type_id = request.roomType || 'living_room';
        break;
    }

    // Create AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'x-api-key': REIMAGINEHOME_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      // Clear timeout since fetch completed successfully
      clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ReimaginehHome API error:', response.status, errorText);
      return { error: `ReimaginehHome API error: ${response.status}` };
    }

    const result = await response.json();
    
    // Check if we get immediate result or job ID
    if (result.renovated_image_url) {
      return { imageUrl: result.renovated_image_url };
    } else if (result.job_id) {
      return { jobId: result.job_id };
    } else {
      return { error: 'Unexpected response format from ReimaginehHome API' };
    }
    } catch (error) {
      // Clear timeout in case of error
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('ReimaginehHome API call timed out');
        return { error: 'ReimaginehHome API call timed out' };
      }
      
      console.error('ReimaginehHome API call failed:', error);
      return { error: 'Failed to call ReimaginehHome API' };
    }
  } catch (error) {
    console.error('ReimaginehHome API call failed:', error);
    return { error: 'Failed to call ReimaginehHome API' };
  }
}

// Store AI job in database
async function storeAIJob(
  userId: string, 
  request: InteriorDesignRequest, 
  externalJobId: string, 
  apiName: 'applydesign' | 'reimaginehome'
): Promise<string> {
  const jobId = `ai_job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const { error } = await supabase
    .from('ai_jobs')
    .insert({
      id: jobId,
      user_id: userId,
      image_url: request.imageUrl,
      action: request.action,
      status: 'pending',
      external_api_name: apiName,
      external_job_id: externalJobId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error('Failed to store AI job:', error);
    throw new Error('Failed to store job information');
  }

  return jobId;
}

// POST Method - Image Transformation
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    // Check rate limiting
    if (!checkRateLimit(authResult.user.id)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse request body
    const body: InteriorDesignRequest = await request.json();

    // Validate required fields
    if (!body.imageUrl || !body.action || typeof body.usePremium !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields: imageUrl, action, usePremium' },
        { status: 400 }
      );
    }

    // Validate imageUrl
    if (!isValidUrl(body.imageUrl)) {
      return NextResponse.json(
        { error: 'Invalid image URL provided' },
        { status: 400 }
      );
    }

    // Validate action
    const validActions = ['change_style', 'remove_interior', 'add_interior'];
    if (!validActions.includes(body.action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be one of: ' + validActions.join(', ') },
        { status: 400 }
      );
    }

    // Call appropriate API based on usePremium flag
    let apiResult: { jobId?: string; imageUrl?: string; error?: string };
    
    if (body.usePremium) {
      apiResult = await callApplyDesignAPI(body);
    } else {
      apiResult = await callReimaginehomeAPI(body);
    }

    if (apiResult.error) {
      return NextResponse.json(
        { error: apiResult.error },
        { status: 500 }
      );
    }

    // If we got an immediate image URL, return it
    if (apiResult.imageUrl) {
      return NextResponse.json({
        success: true,
        imageUrl: apiResult.imageUrl,
        status: 'completed'
      });
    }

    // If we got a job ID, store it and return tracking info
    if (apiResult.jobId) {
      try {
        const jobId = await storeAIJob(
          authResult.user.id,
          body,
          apiResult.jobId,
          body.usePremium ? 'applydesign' : 'reimaginehome'
        );

        return NextResponse.json({
          success: true,
          jobId: jobId,
          status: 'pending',
          message: 'Image processing started. Use the status endpoint to check progress.'
        });
      } catch (error) {
        console.error('Failed to store job:', error);
        return NextResponse.json(
          { error: 'Failed to track job progress' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Unexpected response from external API' },
      { status: 500 }
    );

  } catch (error) {
    console.error('Interior design API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET Method - Handle both /styles and /status endpoints
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    const jobId = searchParams.get('jobId');

    // Handle status check
    if (endpoint === 'status' && jobId) {
      return await handleStatusCheck(jobId, authResult.user.id);
    }

    // Handle styles fetch (default behavior)
    if (endpoint === 'styles' || !endpoint) {
      return await handleStylesFetch();
    }

    return NextResponse.json(
      { error: 'Invalid endpoint parameter' },
      { status: 400 }
    );

  } catch (error) {
    console.error('GET request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle status checking
async function handleStatusCheck(jobId: string, userId: string) {
  try {
    // Get job from database
    const { data: job, error } = await supabase
      .from('ai_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', userId)
      .single();

    if (error || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // If job is already completed or failed, return stored result
    if (job.status === 'completed' || job.status === 'failed') {
      return NextResponse.json({
        status: job.status,
        imageUrl: job.result_image_url,
        error: job.error_message
      });
    }

    // Check status with external API
    let externalStatus;
    try {
      if (job.external_api_name === 'applydesign') {
        // Create AbortController for timeout handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for status checks

        try {
          const response = await fetch(`https://api.applydesign.io/v1/staging/status?job_id=${job.external_job_id}`, {
            headers: {
              'X-API-Key': APPLYDESIGN_API_KEY!
            },
            signal: controller.signal
          });
          
          // Clear timeout since fetch completed successfully
          clearTimeout(timeoutId);
          externalStatus = await response.json();
        } catch (error) {
          // Clear timeout in case of error
          clearTimeout(timeoutId);
          
          if (error instanceof Error && error.name === 'AbortError') {
            console.error('ApplyDesign status check timed out');
            throw new Error('Status check timed out');
          }
          throw error;
        }
      } else {
        // Create AbortController for timeout handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for status checks

        try {
          const response = await fetch(`https://api.reimaginehome.ai/v1/get_job_status?job_id=${job.external_job_id}`, {
            headers: {
              'x-api-key': REIMAGINEHOME_API_KEY!
            },
            signal: controller.signal
          });
          
          // Clear timeout since fetch completed successfully
          clearTimeout(timeoutId);
          externalStatus = await response.json();
        } catch (error) {
          // Clear timeout in case of error
          clearTimeout(timeoutId);
          
          if (error instanceof Error && error.name === 'AbortError') {
            console.error('ReimaginehHome status check timed out');
            throw new Error('Status check timed out');
          }
          throw error;
        }
      }

      // Update job status in database
      let newStatus = job.status;
      let resultImageUrl = job.result_image_url;
      let errorMessage = job.error_message;

      if (externalStatus.status === 'completed' && externalStatus.result_image_url) {
        newStatus = 'completed';
        resultImageUrl = externalStatus.result_image_url;
      } else if (externalStatus.status === 'failed') {
        newStatus = 'failed';
        errorMessage = externalStatus.error || 'External API processing failed';
      } else if (externalStatus.status === 'in_progress') {
        newStatus = 'in_progress';
      }

      // Update database if status changed
      if (newStatus !== job.status) {
        await supabase
          .from('ai_jobs')
          .update({
            status: newStatus,
            result_image_url: resultImageUrl,
            error_message: errorMessage,
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);
      }

      return NextResponse.json({
        status: newStatus,
        imageUrl: resultImageUrl,
        error: errorMessage
      });

    } catch (error) {
      console.error('Failed to check external API status:', error);
      return NextResponse.json({
        status: job.status,
        error: 'Failed to check job status'
      });
    }

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check job status' },
      { status: 500 }
    );
  }
}

// Handle styles fetching
async function handleStylesFetch(): Promise<NextResponse> {
  try {
    // Try to fetch from ReimaginehHome API first (as it's more likely to have this endpoint)
    if (!REIMAGINEHOME_API_KEY) {
      // Return hardcoded styles if API key not available
      return NextResponse.json({
        styles: DEFAULT_STYLES,
        roomTypes: DEFAULT_ROOM_TYPES
      });
    }

    // Fetch styles from ReimaginehHome API with timeout handling
    const controller1 = new AbortController();
    const controller2 = new AbortController();
    const timeoutId1 = setTimeout(() => controller1.abort(), 10000); // 10 second timeout for styles
    const timeoutId2 = setTimeout(() => controller2.abort(), 10000); // 10 second timeout for room types

    try {
      const [stylesResponse, roomTypesResponse] = await Promise.all([
        fetch('https://api.reimaginehome.ai/v1/get_styles', {
          headers: {
            'x-api-key': REIMAGINEHOME_API_KEY
          },
          signal: controller1.signal
        }),
        fetch('https://api.reimaginehome.ai/v1/get_room_types', {
          headers: {
            'x-api-key': REIMAGINEHOME_API_KEY
          },
          signal: controller2.signal
        })
      ]);

      // Clear timeouts since fetches completed successfully
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);

    let styles = [];
    let roomTypes = [];

    if (stylesResponse.ok) {
      const stylesData = await stylesResponse.json();
      styles = stylesData.styles || [];
    }

    if (roomTypesResponse.ok) {
      const roomTypesData = await roomTypesResponse.json();
      roomTypes = roomTypesData.room_types || [];
    }

    // Fallback to hardcoded values if API calls failed
    if (styles.length === 0) {
      styles = DEFAULT_STYLES;
    }

    if (roomTypes.length === 0) {
      roomTypes = DEFAULT_ROOM_TYPES;
    }

    return NextResponse.json({
      styles,
      roomTypes
    });
    } catch (error) {
      // Clear timeouts in case of error
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
      
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Styles fetching timed out');
        // Continue with fallback data
      } else {
        console.error('Failed to fetch styles:', error);
      }
    }

    // Fallback to hardcoded values if API calls failed or timed out
    let styles = DEFAULT_STYLES;
    let roomTypes = DEFAULT_ROOM_TYPES;

    return NextResponse.json({
      styles,
      roomTypes
    });

  } catch (error) {
    console.error('Failed to fetch styles:', error);
    
    // Return fallback data
    return NextResponse.json({
      styles: DEFAULT_STYLES,
      roomTypes: DEFAULT_ROOM_TYPES
    });
  }
} 