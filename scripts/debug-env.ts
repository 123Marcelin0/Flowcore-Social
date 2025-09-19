#!/usr/bin/env tsx
import { config } from 'dotenv'
import path from 'path'

// Load environment variables from the project root
config({ path: path.resolve(process.cwd(), '.env') })
config({ path: path.resolve(process.cwd(), '.env.local') })

console.log('🔍 Environment Variable Debug')
console.log('📁 Working directory:', process.cwd())
console.log('')

console.log('🔑 Raw Environment Variables:')
console.log('  NEXT_PUBLIC_SUPABASE_URL:', JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_URL))
console.log('  SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? `${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...` : 'undefined')
console.log('  OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? `${process.env.OPENAI_API_KEY.substring(0, 20)}...` : 'undefined')
console.log('')

// Check for placeholder patterns
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🧪 Placeholder Detection:')
console.log('  URL contains "your-project":', url?.includes('your-project') || false)
console.log('  URL contains "placeholder":', /dummy|placeholder/i.test(url || ''))
console.log('  Service key contains "your-supabase":', serviceKey?.includes('your-supabase') || false)
console.log('  Anon key contains "your-supabase":', anonKey?.includes('your-supabase') || false)
console.log('  Anon key placeholder test:', /dummy|placeholder/i.test(anonKey || ''))

console.log('')
console.log('✅ If you see placeholder values above, update your .env and .env.local files with real Supabase credentials')
console.log('📋 Get them from: https://app.supabase.com → Your Project → Settings → API')