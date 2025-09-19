import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const uploadId = searchParams.get('uploadId')
  
  const diagnostics = {
    timestamp: new Date().toISOString(),
    uploadId,
    checks: {} as any
  }

  try {
    console.log('🔍 Starting database diagnostics...')

    // Check 1: Supabase client initialization
    diagnostics.checks.clientInitialization = {
      regularClient: !!supabase,
      adminClient: !!supabaseAdmin,
      status: (supabase && supabaseAdmin) ? '✅' : '⚠️'
    }

    // Check 2: Database connection test
    try {
      console.log('🗄️ Testing database connection...')
      
      const { data, error } = await (supabaseAdmin || supabase)
        .from('media_files')
        .select('count(*)')
        .limit(1)

      diagnostics.checks.connection = {
        successful: !error,
        error: error?.message,
        result: !error ? '✅' : '❌'
      }

    } catch (connectionError: any) {
      diagnostics.checks.connection = {
        successful: false,
        error: connectionError.message,
        result: '❌'
      }
    }

    // Check 3: Table structure
    try {
      console.log('📋 Checking media_files table structure...')
      
      const { data: tableInfo, error } = await (supabaseAdmin || supabase)
        .from('media_files')
        .select('id, created_at, storage_url, metadata')
        .limit(1)

      diagnostics.checks.tableStructure = {
        accessible: !error,
        error: error?.message,
        sampleRecord: tableInfo?.[0] || null,
        result: !error ? '✅' : '❌'
      }

    } catch (tableError: any) {
      diagnostics.checks.tableStructure = {
        accessible: false,
        error: tableError.message,
        result: '❌'
      }
    }

    // Check 4: Recent records
    try {
      console.log('📊 Fetching recent media files...')
      
      const { data: recentFiles, error } = await (supabaseAdmin || supabase)
        .from('media_files')
        .select('id, created_at, storage_url')
        .order('created_at', { ascending: false })
        .limit(10)

      diagnostics.checks.recentRecords = {
        successful: !error,
        count: recentFiles?.length || 0,
        records: recentFiles?.map(f => ({
          id: f.id,
          created_at: f.created_at,
          has_storage_url: !!f.storage_url
        })) || [],
        error: error?.message,
        result: !error ? '✅' : '❌'
      }

    } catch (recordsError: any) {
      diagnostics.checks.recentRecords = {
        successful: false,
        error: recordsError.message,
        result: '❌'
      }
    }

    // Check 5: Specific upload ID lookup (if provided)
    if (uploadId) {
      try {
        console.log(`🎯 Looking up specific upload ID: ${uploadId}`)
        
        const { data: specificFile, error } = await (supabaseAdmin || supabase)
          .from('media_files')
          .select('*')
          .eq('id', uploadId)
          .maybeSingle()

        diagnostics.checks.specificLookup = {
          uploadId,
          found: !!specificFile,
          error: error?.message,
          record: specificFile || null,
          result: specificFile ? '✅' : '❌'
        }

        // Additional checks for the specific record
        if (specificFile) {
          diagnostics.checks.recordDetails = {
            hasStorageUrl: !!specificFile.storage_url,
            hasMetadata: !!specificFile.metadata,
            hasASR: !!specificFile.metadata?.asr,
            metadataKeys: Object.keys(specificFile.metadata || {}),
            createdAt: specificFile.created_at,
            result: '✅'
          }
        }

      } catch (lookupError: any) {
        diagnostics.checks.specificLookup = {
          uploadId,
          found: false,
          error: lookupError.message,
          result: '❌'
        }
      }
    }

    // Check 6: RLS (Row Level Security) test
    try {
      console.log('🔒 Testing RLS policies...')
      
      // Test with regular client (should respect RLS)
      const { data: rlsData, error: rlsError } = await supabase
        .from('media_files')
        .select('id')
        .limit(1)

      // Test with admin client (should bypass RLS)  
      const { data: adminData, error: adminError } = await (supabaseAdmin || supabase)
        .from('media_files')
        .select('id')
        .limit(1)

      diagnostics.checks.rlsPolicies = {
        regularClientAccess: !rlsError,
        regularClientCount: rlsData?.length || 0,
        adminClientAccess: !adminError,
        adminClientCount: adminData?.length || 0,
        rlsActive: (rlsData?.length || 0) !== (adminData?.length || 0),
        result: (!rlsError || !adminError) ? '✅' : '❌'
      }

    } catch (rlsError: any) {
      diagnostics.checks.rlsPolicies = {
        error: rlsError.message,
        result: '❌'
      }
    }

    // Overall status
    const allChecks = Object.values(diagnostics.checks)
    const passedChecks = allChecks.filter((check: any) => check.result === '✅').length
    const totalChecks = allChecks.length

    diagnostics.checks.overall = `${passedChecks}/${totalChecks} checks passed`

    // Generate recommendations
    diagnostics.recommendations = generateDatabaseRecommendations(diagnostics.checks)

    console.log('✅ Database diagnostics completed')

    return NextResponse.json(diagnostics, { status: 200 })

  } catch (error: any) {
    console.error('❌ Database diagnostics failed:', error)
    
    diagnostics.checks.overall = '❌ Diagnostics failed'
    diagnostics.checks.error = {
      message: error.message,
      stack: error.stack
    }

    return NextResponse.json(diagnostics, { status: 500 })
  }
}

function generateDatabaseRecommendations(checks: any): string[] {
  const recommendations = []

  if (!checks.clientInitialization?.regularClient) {
    recommendations.push('❌ Regular Supabase client not initialized - check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  if (!checks.clientInitialization?.adminClient) {
    recommendations.push('⚠️ Admin Supabase client not initialized - check SUPABASE_SERVICE_ROLE_KEY')
  }

  if (!checks.connection?.successful) {
    recommendations.push('🗄️ Database connection failed - check Supabase credentials and network')
  }

  if (!checks.tableStructure?.accessible) {
    recommendations.push('📋 media_files table not accessible - check table exists and permissions')
  }

  if (checks.recentRecords?.count === 0) {
    recommendations.push('📊 No media files found - table might be empty or RLS is blocking access')
  }

  if (checks.specificLookup && !checks.specificLookup.found) {
    recommendations.push(`🎯 Upload ID "${checks.specificLookup.uploadId}" not found in database`)
    recommendations.push('💡 Check if the upload process completed successfully')
  }

  if (checks.rlsPolicies?.rlsActive && checks.rlsPolicies?.regularClientCount === 0) {
    recommendations.push('🔒 RLS policies may be blocking access - use service role key for API routes')
  }

  if (checks.recordDetails && !checks.recordDetails.hasStorageUrl) {
    recommendations.push('📁 Record found but missing storage_url - upload may have failed')
  }

  if (checks.recordDetails && !checks.recordDetails.hasASR) {
    recommendations.push('🎤 Record found but missing ASR data - transcription may have failed')
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ All database checks passed')
  }

  return recommendations
}

// POST endpoint to test specific queries
export async function POST(request: NextRequest) {
  const { query, uploadId } = await request.json()

  try {
    let result
    const db = supabaseAdmin || supabase

    switch (query) {
      case 'count':
        result = await db.from('media_files').select('count(*)', { count: 'exact' })
        break
        
      case 'recent':
        result = await db
          .from('media_files')
          .select('id, created_at, storage_url')
          .order('created_at', { ascending: false })
          .limit(5)
        break
        
      case 'lookup':
        if (!uploadId) throw new Error('uploadId required for lookup')
        result = await db
          .from('media_files')
          .select('*')
          .eq('id', uploadId)
          .maybeSingle()
        break
        
      default:
        throw new Error('Invalid query type')
    }

    return NextResponse.json({
      success: true,
      query,
      uploadId,
      data: result.data,
      error: result.error
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}