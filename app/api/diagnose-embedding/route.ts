import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const diagnostics = {
    openai_api_key: false,
    embedding_generation: false,
    database_connection: false,
    posts_table_structure: false,
    embedding_column: false,
    user_authentication: false
  };
  
  const results: any = {};
  
  try {
    // 1. Check OpenAI API Key
    console.log('🔍 Checking OpenAI API key...');
    diagnostics.openai_api_key = !!process.env.OPENAI_API_KEY;
    results.openai_api_key = {
      present: diagnostics.openai_api_key,
      length: process.env.OPENAI_API_KEY?.length || 0
    };
    
    // 2. Test embedding generation
    console.log('🔍 Testing embedding generation...');
    try {
      const { generateEmbedding } = await import('@/lib/openaiService');
      const testEmbedding = await generateEmbedding('test content for diagnostics');
      diagnostics.embedding_generation = !!testEmbedding;
      results.embedding_generation = {
        success: diagnostics.embedding_generation,
        dimensions: testEmbedding?.length || 0
      };
    } catch (error) {
      results.embedding_generation = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    // 3. Test database connection
    console.log('🔍 Testing database connection...');
    try {
      const { data, error } = await supabase.from('posts').select('count').limit(1);
      diagnostics.database_connection = !error;
      results.database_connection = {
        success: diagnostics.database_connection,
        error: error?.message || null
      };
    } catch (error) {
      results.database_connection = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    // 4. Check posts table structure
    console.log('🔍 Checking posts table structure...');
    try {
      // Try to get table info by attempting a query with all expected columns
      const { data, error } = await supabase
        .from('posts')
        .select('id, title, content, embedding')
        .limit(1);
      
      diagnostics.posts_table_structure = !error;
      results.posts_table_structure = {
        success: diagnostics.posts_table_structure,
        error: error?.message || null
      };
    } catch (error) {
      results.posts_table_structure = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    // 5. Test embedding column specifically
    console.log('🔍 Testing embedding column...');
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('embedding')
        .limit(1);
      
      diagnostics.embedding_column = !error;
      results.embedding_column = {
        success: diagnostics.embedding_column,
        error: error?.message || null,
        sample_embedding_present: data && data.length > 0 ? !!data[0].embedding : 'no_data'
      };
    } catch (error) {
      results.embedding_column = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    // 6. Test user authentication
    console.log('🔍 Testing user authentication...');
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      diagnostics.user_authentication = !!user && !error;
      results.user_authentication = {
        success: diagnostics.user_authentication,
        has_user: !!user,
        user_id: user?.id || null,
        error: error?.message || null
      };
    } catch (error) {
      results.user_authentication = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    // Summary
    const allPassed = Object.values(diagnostics).every(check => check === true);
    const failedChecks = Object.entries(diagnostics)
      .filter(([key, value]) => value === false)
      .map(([key]) => key);
    
    console.log('🏁 Diagnostic results:', {
      all_passed: allPassed,
      failed_checks: failedChecks,
      results
    });
    
    return NextResponse.json({
      success: allPassed,
      summary: {
        all_passed: allPassed,
        failed_checks: failedChecks,
        total_checks: Object.keys(diagnostics).length,
        passed_checks: Object.values(diagnostics).filter(v => v === true).length
      },
      detailed_results: results
    });
    
  } catch (error) {
    console.error('❌ Diagnostic error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown diagnostic error',
      results
    }, { status: 500 });
  }
} 