import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Test a known Instagram CDN URL
    const testUrls = [
      'https://scontent-fra3-2.cdninstagram.com/v/t51.2885-15/510964729_180863829467370_4329384969826264067_n.jpg',
      'https://instagram.fdad3-1.fna.fbcdn.net/v/t51.2885-15/517401263_1112664730747875_7031893013537838946_n.jpg'
    ];

    const results = [];

    for (const testUrl of testUrls) {
      console.log(`Testing URL: ${testUrl}`);
      
      try {
        // Test direct access (should fail due to CORS)
        const directResponse = await fetch(testUrl, {
          method: 'HEAD',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          }
        });

        results.push({
          url: testUrl.substring(0, 60) + '...',
          direct_access: {
            status: directResponse.status,
            ok: directResponse.ok,
            headers: Object.fromEntries(directResponse.headers.entries())
          },
          proxy_url: `/api/media-proxy?url=${encodeURIComponent(testUrl)}`
        });

      } catch (error) {
        results.push({
          url: testUrl.substring(0, 60) + '...',
          direct_access: {
            error: error instanceof Error ? error.message : 'Unknown error'
          },
          proxy_url: `/api/media-proxy?url=${encodeURIComponent(testUrl)}`
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Media proxy test completed',
      results,
      instructions: {
        note: 'Direct access may fail due to CORS, but proxy should work',
        test_proxy: 'Visit the proxy_url in your browser to test the proxy endpoint'
      }
    });

  } catch (error) {
    console.error('Media proxy test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 