import { NextRequest, NextResponse } from 'next/server';

// Environment variable for ApplyDesign.io API
const APPLYDESIGN_API_KEY = process.env.APPLYDESIGN_API_KEY;

// Simple helper function to verify authentication (minimal version for testing)
async function verifyAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authenticated: false, error: 'Missing or invalid authorization header' };
  }
  return { authenticated: true, error: null };
}

// Test ApplyDesign.io API connection
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    // Check if API key is configured
    if (!APPLYDESIGN_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'ApplyDesign API key not configured',
        configured: false
      });
    }

    try {
      // Test API connection with coin_count endpoint
      const response = await fetch('https://api.applydesign.io/v1/account/coin_count', {
        method: 'GET',
        headers: {
          'X-API-Key': APPLYDESIGN_API_KEY
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ApplyDesign API test failed:', response.status, errorText);
        return NextResponse.json({
          success: false,
          error: `API test failed: ${response.status}`,
          configured: true,
          details: errorText
        });
      }

      const result = await response.json();
      
      return NextResponse.json({
        success: true,
        configured: true,
        coinCount: result,
        message: 'ApplyDesign.io API connection successful'
      });

    } catch (apiError) {
      console.error('ApplyDesign API connection error:', apiError);
      return NextResponse.json({
        success: false,
        error: 'Failed to connect to ApplyDesign API',
        configured: true,
        details: apiError instanceof Error ? apiError.message : 'Unknown error'
      });
    }

  } catch (error) {
    console.error('Test endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 