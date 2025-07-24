import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generateEmbedding } from '@/lib/openaiService'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Full flow test started...');
    
    // Step 1: Test embedding generation
    console.log('📝 Step 1: Testing embedding generation');
    const testContent = 'This is a comprehensive test of the full post creation flow including database insertion.';
    
    const embedding = await generateEmbedding(testContent);
    console.log('Embedding result:', embedding ? `${embedding.length} dimensions` : 'null');
    
    if (!embedding) {
      return NextResponse.json({
        success: false,
        step: 1,
        error: 'Embedding generation failed'
      }, { status: 500 });
    }
    
    // Step 2: Test direct database insertion
    console.log('💾 Step 2: Testing direct database insertion');
    
    const testData = {
      user_id: '12345678-1234-1234-1234-123456789012', // Test UUID
      title: 'Full Flow Test Post',
      content: testContent,
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
      metadata: {},
      embedding: embedding
    };
    
    console.log('Database insertion data prepared:', {
      ...testData,
      embedding: `[${testData.embedding.length} dimensions]`
    });
    
    // Try direct database insertion
    const { data: insertedPost, error: insertError } = await supabase
      .from('posts')
      .insert(testData)
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Database insertion error:', insertError);
      return NextResponse.json({
        success: false,
        step: 2,
        error: 'Database insertion failed',
        details: insertError
      }, { status: 500 });
    }
    
    console.log('✅ Database insertion successful');
    console.log('Inserted post:', {
      id: insertedPost.id,
      title: insertedPost.title,
      content: insertedPost.content,
      hasEmbedding: !!insertedPost.embedding,
      embeddingLength: insertedPost.embedding?.length || 0
    });
    
    // Step 3: Verify by reading back from database
    console.log('🔍 Step 3: Verifying by reading back from database');
    
    const { data: readPost, error: readError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', insertedPost.id)
      .single();
    
    if (readError) {
      console.error('❌ Database read error:', readError);
      return NextResponse.json({
        success: false,
        step: 3,
        error: 'Database read failed',
        details: readError
      }, { status: 500 });
    }
    
    const verificationResult = {
      id: readPost.id,
      title: readPost.title,
      content: readPost.content,
      hasEmbedding: !!readPost.embedding,
      embeddingLength: readPost.embedding?.length || 0,
      embeddingType: typeof readPost.embedding,
      isArray: Array.isArray(readPost.embedding),
      firstFewValues: readPost.embedding ? readPost.embedding.slice(0, 3) : null
    };
    
    console.log('✅ Database read verification:', verificationResult);
    
    // Clean up - delete the test post
    await supabase.from('posts').delete().eq('id', insertedPost.id);
    console.log('🧹 Test post cleaned up');
    
    return NextResponse.json({
      success: true,
      message: 'Full flow test completed successfully',
      steps: {
        step1_embedding: {
          success: true,
          dimensions: embedding.length
        },
        step2_insertion: {
          success: true,
          postId: insertedPost.id
        },
        step3_verification: verificationResult
      }
    });
    
  } catch (error) {
    console.error('❌ Full flow test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 