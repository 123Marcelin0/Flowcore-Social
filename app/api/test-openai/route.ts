import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    
    console.log('🔑 Testing OpenAI API key availability')
    console.log('API Key present:', !!apiKey)
    console.log('API Key starts with sk-:', apiKey?.startsWith('sk-') || false)
    console.log('API Key length:', apiKey?.length || 0)
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'OPENAI_API_KEY environment variable not found',
        debug: {
          nodeEnv: process.env.NODE_ENV,
          hasKey: false,
          keyLength: 0
        }
      }, { status: 500 })
    }
    
    if (!apiKey.startsWith('sk-')) {
      return NextResponse.json({
        success: false,
        error: 'OPENAI_API_KEY does not appear to be valid (should start with sk-)',
        debug: {
          nodeEnv: process.env.NODE_ENV,
          hasKey: true,
          keyLength: apiKey.length,
          keyPrefix: apiKey.substring(0, 10)
        }
      }, { status: 500 })
    }
    
    // Test OpenAI client initialization
    const openai = new OpenAI({ apiKey })
    
    // Simple test call to verify the key works
    const models = await openai.models.list()
    const whisperModel = models.data.find(m => m.id === 'whisper-1')
    
    return NextResponse.json({
      success: true,
      message: 'OpenAI API key is valid and working',
      debug: {
        nodeEnv: process.env.NODE_ENV,
        hasKey: true,
        keyLength: apiKey.length,
        keyPrefix: apiKey.substring(0, 10),
        whisperAvailable: !!whisperModel,
        totalModels: models.data.length
      }
    })
    
  } catch (error: any) {
    console.error('❌ OpenAI API test failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'OpenAI API test failed',
      debug: {
        nodeEnv: process.env.NODE_ENV,
        errorType: error.constructor.name,
        errorCode: error.code,
        errorStatus: error.status
      }
    }, { status: 500 })
  }
}