import { NextRequest, NextResponse } from 'next/server'
import { PostsService } from '@/lib/data-service'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Test embedding API called');
    
    // Get current user (you might need to provide a valid user token)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      // For testing, let's create a fake user or use a hardcoded one
      console.log('⚠️ No authenticated user, using test mode');
      
      // Direct database test instead
      const testData: any = {
        user_id: '12345678-1234-1234-1234-123456789012', // Fake UUID for testing
        title: 'Test Post with Embedding',
        content: 'This is a test post to verify that embedding generation is working correctly in the system.',
        media_urls: [],
        media_type: 'text' as const,
        platforms: ['instagram', 'twitter'],
        status: 'draft' as const,
        tags: ['test'],
        likes: 0,
        comments_count: 0,
        shares: 0,
        reach: 0,
        impressions: 0,
        metadata: {}
      };

      console.log('📝 Test data prepared:', testData);
      
      // Test embedding generation directly
      const { generateEmbedding } = await import('@/lib/openaiService');
      console.log('🔄 Testing embedding generation...');
      
      const embedding = await generateEmbedding(testData.content);
      console.log('📊 Embedding result:', embedding ? `${embedding.length} dimensions` : 'null');
      
      if (embedding) {
        testData.embedding = embedding;
      }
      
      return NextResponse.json({
        success: true,
        message: 'Embedding test completed',
        hasEmbedding: !!embedding,
        embeddingLength: embedding?.length || 0,
        testData: {
          ...testData,
          embedding: embedding ? `[${embedding.length} dimensions]` : null
        }
      });
    }
    
    // Test with real user
    const testPost = await PostsService.createPost({
      title: 'Test Post with Embedding',
      content: 'This is a test post to verify that embedding generation is working correctly in the system.',
      media_urls: [],
      media_type: 'text',
      platforms: ['instagram'],
      status: 'draft',
      likes: 0,
      comments: 0,
      shares: 0
    });
    
    return NextResponse.json({
      success: true,
      message: 'Test post created successfully',
      post: {
        id: testPost.id,
        title: testPost.title,
        content: testPost.content,
        hasEmbedding: !!testPost.embedding,
        embeddingLength: testPost.embedding?.length || 0
      }
    });
    
  } catch (error) {
    console.error('❌ Test embedding API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 