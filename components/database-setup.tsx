"use client"

import React, { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function DatabaseSetup() {
  const [status, setStatus] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])

  const setupDatabase = async () => {
    setLoading(true)
    setStatus('Setting up database...')
    setResults([])
    
    try {
      // First, try to create the table
      console.log('Creating instagramreelsscraper table...')
      
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS instagramreelsscraper (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          reel_url TEXT NOT NULL,
          thumbnail_url TEXT,
          profile_picture TEXT,
          profile_picture_url TEXT,
          creator_username TEXT,
          creator_display_name TEXT,
          title TEXT,
          caption TEXT,
          description TEXT,
          script TEXT,
          engagement_count INTEGER DEFAULT 0,
          likes_count INTEGER DEFAULT 0,
          comments_count INTEGER DEFAULT 0,
          shares_count INTEGER DEFAULT 0,
          views_count INTEGER DEFAULT 0,
          hashtags TEXT[],
          music_info JSONB,
          scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
      
      const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL })
      
      if (createError) {
        console.error('Create table error:', createError)
        setStatus(`Failed to create table: ${createError.message}`)
        return
      }
      
      setStatus('Table created successfully. Inserting sample data...')
      
      // Insert sample data
      const sampleData = [
        {
          reel_url: 'https://instagram.com/reel/example1',
          thumbnail_url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=600&fit=crop',
          profile_picture_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
          creator_username: 'realestate_pro',
          creator_display_name: 'Real Estate Pro',
          title: 'Modern Home Tour',
          description: 'This $2M home has a SECRET room that will blow your mind!',
          script: `🏠 HOOK (0-3s): "This $2M home has a SECRET room..."

📱 MAIN CONTENT (3-15s):
• Quick walkthrough of main living areas
• Highlight unique architectural features
• Show the "secret" home office behind bookshelf
• Mention key selling points (location, size, amenities)

💡 VISUAL TIPS:
• Use smooth camera movements
• Good lighting - shoot during golden hour
• Quick cuts between rooms (2-3 seconds each)
• End with exterior shot

🎯 CTA: "DM me for private showing!"

#realestate #luxuryhomes #hometour #dreamhome #property`,
          engagement_count: 2500000,
          likes_count: 125000
        },
        {
          reel_url: 'https://instagram.com/reel/example2',
          thumbnail_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=600&fit=crop',
          profile_picture_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
          creator_username: 'home_advisor',
          creator_display_name: 'Home Advisor',
          title: 'First-Time Buyer Tips',
          description: 'Avoid these 5 costly mistakes when buying your first home',
          script: `💰 HOOK (0-3s): "Buying your first home? Avoid these 5 mistakes!"

📋 MAIN CONTENT (3-20s):
1. Not getting pre-approved first
2. Skipping the home inspection
3. Forgetting about closing costs
4. Falling in love with the first house
5. Not researching the neighborhood

💡 VISUAL TIPS:
• Use text overlays for each point
• Show examples with B-roll footage
• Keep energy high with upbeat music
• Use hand gestures to emphasize points

🎯 CTA: "Save this post & share with someone buying their first home!"

#firsttimehomebuyer #realestatetips #homebuying #mortgage #property`,
          engagement_count: 1800000,
          likes_count: 90000
        }
      ]
      
      const { data: insertData, error: insertError } = await supabase
        .from('instagramreelsscraper')
        .insert(sampleData)
        .select()
      
      if (insertError) {
        console.error('Insert error:', insertError)
        setStatus(`Failed to insert sample data: ${insertError.message}`)
        return
      }
      
      setStatus('Database setup completed successfully!')
      setResults(insertData || [])
      
      // Verify the data
      const { data: verifyData, count } = await supabase
        .from('instagramreelsscraper')
        .select('*', { count: 'exact' })
        .limit(5)
      
      console.log('Verification:', { count, data: verifyData })
      
    } catch (error) {
      console.error('Setup error:', error)
      setStatus(`Setup failed: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const testQuery = async () => {
    setLoading(true)
    setStatus('Testing query...')
    
    try {
      const { data, error, count } = await supabase
        .from('instagramreelsscraper')
        .select('id, title, description, reel_url, thumbnail_url', { count: 'exact' })
        .limit(10)
      
      if (error) {
        setStatus(`Query failed: ${error.message}`)
        console.error('Query error:', error)
      } else {
        setStatus(`Query successful! Found ${count} total records, showing ${data?.length || 0}`)
        setResults(data || [])
        console.log('Query results:', { count, data })
      }
    } catch (error) {
      setStatus(`Query error: ${error}`)
      console.error('Query error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardContent className="p-6">
        <h2 className="text-xl font-bold mb-4">Database Setup & Test</h2>
        
        <div className="flex gap-4 mb-6">
          <Button onClick={setupDatabase} disabled={loading}>
            {loading ? 'Setting up...' : 'Setup Database'}
          </Button>
          
          <Button onClick={testQuery} disabled={loading} variant="outline">
            {loading ? 'Testing...' : 'Test Query'}
          </Button>
        </div>
        
        {status && (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
            <strong>Status:</strong> {status}
          </div>
        )}
        
        {results.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Results ({results.length} records):</h3>
            <div className="grid gap-4">
              {results.map((item, index) => (
                <div key={index} className="bg-gray-100 p-4 rounded">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><strong>ID:</strong> {item.id}</div>
                    <div><strong>Title:</strong> {item.title || 'No title'}</div>
                    <div><strong>Description:</strong> {item.description || 'No description'}</div>
                    <div><strong>URL:</strong> {item.reel_url || 'No URL'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}