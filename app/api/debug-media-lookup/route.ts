import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const runtime = 'nodejs'

/**
 * Debug endpoint to help troubleshoot media file lookup issues
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const uploadId = searchParams.get('uploadId')

    if (!uploadId) {
      return NextResponse.json(
        { success: false, error: 'uploadId parameter is required' },
        { status: 400 }
      )
    }

    console.log('🔍 Debug media lookup for uploadId:', uploadId)

    // Check all records with this ID
    const { data: allRecords, error: allError } = await supabase
      .from('media_files')
      .select('id, filename, created_at, user_id, file_type, storage_url')
      .eq('id', uploadId)

    if (allError) {
      return NextResponse.json({
        success: false,
        error: 'Database query failed',
        details: allError.message
      })
    }

    // Check for exact match with .single()
    const { data: singleRecord, error: singleError } = await supabase
      .from('media_files')
      .select('id, filename, created_at, user_id, file_type, storage_url')
      .eq('id', uploadId)
      .single()

    // Check recent uploads to see if there are duplicates
    const { data: recentUploads, error: recentError } = await supabase
      .from('media_files')
      .select('id, filename, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      success: true,
      data: {
        uploadId,
        allRecords: allRecords || [],
        recordCount: allRecords?.length || 0,
        singleRecord: singleRecord || null,
        singleError: singleError?.message || null,
        recentUploads: recentUploads || [],
        analysis: {
          hasMultipleRecords: (allRecords?.length || 0) > 1,
          hasNoRecords: (allRecords?.length || 0) === 0,
          singleQueryWorks: !singleError,
          potentialDuplicates: allRecords?.filter((record, index, arr) => 
            arr.findIndex(r => r.id === record.id) !== index
          ) || []
        }
      }
    })

  } catch (error: any) {
    console.error('❌ Debug lookup failed:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Debug lookup failed' },
      { status: 500 }
    )
  }
}


















