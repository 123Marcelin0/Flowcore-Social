import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function GET(request: NextRequest) {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    checks: {} as any
  }

  try {
    console.log('🔍 Starting OpenAI diagnostics...')

    // Check 1: Environment variable
    const hasApiKey = !!process.env.OPENAI_API_KEY
    const keyLength = process.env.OPENAI_API_KEY?.length || 0
    
    diagnostics.checks.environmentVariable = {
      present: hasApiKey,
      keyLength: keyLength,
      startsWithSk: process.env.OPENAI_API_KEY?.startsWith('sk-') || false,
      status: hasApiKey ? '✅' : '❌'
    }

    if (!hasApiKey) {
      diagnostics.checks.overall = '❌ No API key found'
      return NextResponse.json(diagnostics)
    }

    // Check 2: Network connectivity test
    try {
      console.log('🌐 Testing network connectivity...')
      
      // Simple fetch test to OpenAI
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'User-Agent': 'NextJS-Diagnostics'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })

      diagnostics.checks.networkConnectivity = {
        reachable: true,
        status: response.status,
        statusText: response.statusText,
        responseTime: Date.now(),
        result: response.ok ? '✅' : '⚠️'
      }

    } catch (networkError: any) {
      console.error('❌ Network connectivity failed:', networkError.message)
      
      diagnostics.checks.networkConnectivity = {
        reachable: false,
        error: networkError.message,
        errorCode: networkError.code,
        result: '❌'
      }
    }

    // Check 3: OpenAI client initialization
    try {
      console.log('🤖 Testing OpenAI client initialization...')
      
      const client = new OpenAI({ 
        apiKey: process.env.OPENAI_API_KEY,
        timeout: 10000
      })

      diagnostics.checks.clientInitialization = {
        successful: true,
        result: '✅'
      }

      // Check 4: Simple API call test
      try {
        console.log('📡 Testing simple API call...')
        
        const testResponse = await client.chat.completions.create({
          model: 'gpt-4o-mini', // Use cheaper model for testing
          messages: [
            { role: 'user', content: 'Say "test successful" and nothing else.' }
          ],
          max_tokens: 10,
          temperature: 0
        })

        const responseText = testResponse.choices[0]?.message?.content || 'No response'
        
        diagnostics.checks.apiCall = {
          successful: true,
          model: testResponse.model,
          responseText: responseText,
          tokensUsed: testResponse.usage?.total_tokens || 0,
          result: '✅'
        }

      } catch (apiError: any) {
        console.error('❌ API call failed:', apiError.message)
        
        diagnostics.checks.apiCall = {
          successful: false,
          error: apiError.message,
          errorType: apiError.constructor.name,
          status: apiError.status,
          result: '❌'
        }
      }

    } catch (clientError: any) {
      console.error('❌ Client initialization failed:', clientError.message)
      
      diagnostics.checks.clientInitialization = {
        successful: false,
        error: clientError.message,
        result: '❌'
      }
    }

    // Overall status
    const allChecks = Object.values(diagnostics.checks)
    const passedChecks = allChecks.filter((check: any) => check.result === '✅').length
    const totalChecks = allChecks.length

    diagnostics.checks.overall = `${passedChecks}/${totalChecks} checks passed`

    // Recommendations
    diagnostics.recommendations = generateRecommendations(diagnostics.checks)

    console.log('✅ OpenAI diagnostics completed')

    return NextResponse.json(diagnostics, { status: 200 })

  } catch (error: any) {
    console.error('❌ Diagnostics failed:', error)
    
    diagnostics.checks.overall = '❌ Diagnostics failed'
    diagnostics.checks.error = {
      message: error.message,
      stack: error.stack
    }

    return NextResponse.json(diagnostics, { status: 500 })
  }
}

function generateRecommendations(checks: any): string[] {
  const recommendations = []

  if (!checks.environmentVariable?.present) {
    recommendations.push('❌ Add OPENAI_API_KEY to your environment variables (.env.local)')
  }

  if (!checks.environmentVariable?.startsWithSk) {
    recommendations.push('⚠️ OpenAI API key should start with "sk-"')
  }

  if (!checks.networkConnectivity?.reachable) {
    recommendations.push('🌐 Check network connectivity and firewall settings')
    recommendations.push('🔍 Test: curl https://api.openai.com/v1/models')
  }

  if (checks.networkConnectivity?.status === 401) {
    recommendations.push('🔑 API key appears invalid - check OpenAI dashboard')
  }

  if (checks.networkConnectivity?.status === 429) {
    recommendations.push('⏰ Rate limit exceeded - wait or check billing')
  }

  if (!checks.clientInitialization?.successful) {
    recommendations.push('📦 OpenAI client initialization failed - check package installation')
  }

  if (!checks.apiCall?.successful) {
    if (checks.apiCall?.error?.includes('model')) {
      recommendations.push('🤖 Model not available - try gpt-4o-mini or gpt-3.5-turbo')
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ All checks passed - OpenAI integration is working correctly')
  }

  return recommendations
}

// Test specific models
export async function POST(request: NextRequest) {
  const { model } = await request.json()
  
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'No API key' }, { status: 400 })
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    
    const response = await client.chat.completions.create({
      model: model || 'gpt-4o',
      messages: [{ role: 'user', content: 'Test message' }],
      max_tokens: 5
    })

    return NextResponse.json({
      success: true,
      model: response.model,
      response: response.choices[0]?.message?.content
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      status: error.status
    }, { status: error.status || 500 })
  }
}