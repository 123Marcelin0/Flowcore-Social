import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  let url: string | null = null;
  
  try {
    url = request.nextUrl.searchParams.get('url');
    
    if (!url) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    // Properly decode URL if it's double-encoded
    try {
      // Check if URL is encoded by testing for %
      if (url.includes('%')) {
        const decodedOnce = decodeURIComponent(url);
        // If it still contains encoded characters, decode again
        if (decodedOnce.includes('%')) {
          url = decodeURIComponent(decodedOnce);
        } else {
          url = decodedOnce;
        }
      }
    } catch (error) {
      console.error('URL decoding error:', error);
      return NextResponse.json({ error: 'Invalid URL encoding' }, { status: 400 });
    }

    console.log('Processing media proxy request for URL:', url);

    // Validate that it's a valid Instagram URL
    const instagramDomains = [
      'scontent-',
      'instagram.fcpv',
      'instagram.com',
      'cdninstagram.com',
      'fbcdn.net'
    ];
    
    const isValidInstagramUrl = instagramDomains.some(domain => url!.includes(domain));
    
    if (!isValidInstagramUrl) {
      console.error('Invalid Instagram URL:', url);
      return NextResponse.json({ error: 'Invalid media URL' }, { status: 400 });
    }

    // Fetch the image with proper headers to bypass Instagram blocking
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.instagram.com/',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'cross-site',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"'
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      console.error(`Failed to fetch media: ${response.status} ${response.statusText} for URL: ${url}`);
      
      // Provide more specific error messages
      if (response.status === 403) {
        return NextResponse.json({ 
          error: 'Instagram blocked access to this image. This is usually due to Instagram CDN restrictions.' 
        }, { status: 403 });
      } else if (response.status === 404) {
        return NextResponse.json({ 
          error: 'Image not found. The Instagram post might have been deleted.' 
        }, { status: 404 });
      } else {
        return NextResponse.json({ 
          error: `Failed to fetch media: ${response.status} ${response.statusText}` 
        }, { status: response.status });
      }
    }

    // Get the image data
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    console.log(`Successfully proxied media: ${contentType}, ${imageBuffer.byteLength} bytes`);

    // Return the image with proper headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'X-Proxy-Source': 'instagram-media-proxy'
      },
    });

  } catch (error) {
    console.error('Media proxy error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      url: url
    });
    return NextResponse.json({ 
      error: 'Internal server error while proxying media',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 