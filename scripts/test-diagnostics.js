#!/usr/bin/env node

/**
 * Test script to diagnose OpenAI and database connectivity issues
 * Run with: node scripts/test-diagnostics.js
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

async function testDiagnostics() {
  console.log('🔍 Running diagnostic tests...\n')

  // Test 1: OpenAI Diagnostics
  console.log('=' .repeat(60))
  console.log('🤖 Testing OpenAI Integration')
  console.log('=' .repeat(60))
  
  try {
    const openaiResponse = await fetch(`${BASE_URL}/api/diagnostics/openai`)
    const openaiData = await openaiResponse.json()
    
    console.log(`Status: ${openaiResponse.status}`)
    console.log(`Overall: ${openaiData.checks?.overall || 'Unknown'}`)
    
    if (openaiData.recommendations) {
      console.log('\n📋 Recommendations:')
      openaiData.recommendations.forEach(rec => console.log(`  ${rec}`))
    }
    
    console.log('\n🔍 Detailed checks:')
    Object.entries(openaiData.checks || {}).forEach(([key, value]) => {
      if (key !== 'overall' && typeof value === 'object') {
        console.log(`  ${key}: ${value.result || value.status || 'Unknown'}`)
      }
    })
    
  } catch (error) {
    console.error('❌ OpenAI diagnostics failed:', error.message)
  }

  // Test 2: Database Diagnostics  
  console.log('\n' + '=' .repeat(60))
  console.log('🗄️ Testing Database Connection')
  console.log('=' .repeat(60))
  
  try {
    const dbResponse = await fetch(`${BASE_URL}/api/diagnostics/database`)
    const dbData = await dbResponse.json()
    
    console.log(`Status: ${dbResponse.status}`)
    console.log(`Overall: ${dbData.checks?.overall || 'Unknown'}`)
    
    if (dbData.recommendations) {
      console.log('\n📋 Recommendations:')
      dbData.recommendations.forEach(rec => console.log(`  ${rec}`))
    }
    
    console.log('\n🔍 Detailed checks:')
    Object.entries(dbData.checks || {}).forEach(([key, value]) => {
      if (key !== 'overall' && typeof value === 'object') {
        console.log(`  ${key}: ${value.result || value.status || 'Unknown'}`)
        if (key === 'recentRecords' && value.records) {
          console.log(`    Recent files: ${value.records.length}`)
          if (value.records.length > 0) {
            console.log(`    Latest: ${value.records[0].id} (${value.records[0].created_at})`)
          }
        }
      }
    })
    
  } catch (error) {
    console.error('❌ Database diagnostics failed:', error.message)
  }

  // Test 3: Test specific upload ID (if provided)
  const testUploadId = process.argv[2]
  if (testUploadId) {
    console.log('\n' + '=' .repeat(60))
    console.log(`🎯 Testing Specific Upload ID: ${testUploadId}`)
    console.log('=' .repeat(60))
    
    try {
      const specificResponse = await fetch(`${BASE_URL}/api/diagnostics/database?uploadId=${testUploadId}`)
      const specificData = await specificResponse.json()
      
      const lookup = specificData.checks?.specificLookup
      if (lookup) {
        console.log(`Found: ${lookup.found ? '✅ Yes' : '❌ No'}`)
        if (lookup.found && specificData.checks?.recordDetails) {
          const details = specificData.checks.recordDetails
          console.log(`Has Storage URL: ${details.hasStorageUrl ? '✅' : '❌'}`)
          console.log(`Has Metadata: ${details.hasMetadata ? '✅' : '❌'}`)
          console.log(`Has ASR Data: ${details.hasASR ? '✅' : '❌'}`)
          console.log(`Created: ${details.createdAt}`)
        }
      }
      
    } catch (error) {
      console.error('❌ Upload ID test failed:', error.message)
    }
  }

  console.log('\n' + '=' .repeat(60))
  console.log('🏁 Diagnostics Complete')
  console.log('=' .repeat(60))
  console.log('💡 To test a specific upload ID: node scripts/test-diagnostics.js YOUR_UPLOAD_ID')
}

// Run the diagnostics
testDiagnostics().catch(console.error)