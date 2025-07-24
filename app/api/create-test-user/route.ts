import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Creating test user for development...');
    
    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Admin client not configured. Please set SUPABASE_SERVICE_ROLE_KEY environment variable.'
      }, { status: 500 });
    }
    
    const testEmail = 'test@example.com';
    const testPassword = 'testpassword123';
    
    // First check if user already exists
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(user => user.email === testEmail);
    
    let userId: string;
    
    if (existingUser) {
      console.log('✅ Test user already exists:', existingUser.id);
      userId = existingUser.id;
    } else {
      // Create auth user using admin client
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true, // Skip email confirmation for test user
      });
      
      if (authError || !authData.user) {
        console.error('❌ Auth user creation failed:', authError);
        return NextResponse.json({
          success: false,
          error: 'Failed to create test user',
          details: authError
        }, { status: 500 });
      }
      
      console.log('✅ Auth user created:', authData.user.id);
      userId = authData.user.id;
    }
    
    // Create or update user profile using admin client
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        id: userId,
        email: testEmail,
        full_name: 'Test User',
        subscription_tier: 'free',
        onboarding_completed: true,
      }, {
        onConflict: 'id'
      });
    
    if (profileError) {
      console.warn('⚠️ Profile upsert failed:', profileError);
    } else {
      console.log('✅ User profile created/updated');
    }
    
    return NextResponse.json({
      success: true,
      message: 'Test user created/updated successfully',
      user: {
        id: userId,
        email: testEmail
      },
      credentials: {
        email: testEmail,
        password: testPassword
      },
      instructions: {
        next_steps: [
          '1. Go to the login page in your browser',
          '2. Use the credentials provided above',
          '3. Create posts - they will now have embeddings!'
        ]
      }
    });
    
  } catch (error) {
    console.error('❌ Test user creation error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 