import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'No auth header' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Test authentication
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token', details: error },
        { status: 401 }
      );
    }

    // Check if user profile exists
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Test if we can insert a simple post
    const testPost = {
      user_id: user.id,
      content: 'Test post for authentication',
      media_urls: [],
      media_type: 'text',
      platforms: ['instagram'],
      status: 'draft',
      tags: ['test'],
      likes: 0,
      comments: 0,
      shares: 0,
      reach: 0,
      impressions: 0,
      metadata: { test: true }
    };

    const { data: insertData, error: insertError } = await supabase
      .from('posts')
      .insert([testPost])
      .select();

    if (insertError) {
      return NextResponse.json({
        success: false,
        user: {
          id: user.id,
          email: user.email
        },
        profile: profile || 'No profile found',
        profileError: profileError?.message,
        insertError: {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code
        }
      });
    }

    // Clean up test post
    if (insertData && insertData.length > 0) {
      await supabase
        .from('posts')
        .delete()
        .eq('id', insertData[0].id);
    }

    return NextResponse.json({
      success: true,
      message: 'Authentication and database access working',
      user: {
        id: user.id,
        email: user.email
      },
      profile: profile || 'No profile found',
      testInsert: 'Success'
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 