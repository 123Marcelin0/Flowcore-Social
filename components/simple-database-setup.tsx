"use client"

import React, { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

export function SimpleDatabaseSetup() {
  const [status, setStatus] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const setupDatabase = async () => {
    setLoading(true)
    setStatus('Setting up database...')
    
    try {
      // First, check if table exists and has data
      const { count, error: countError } = await supabase
        .from('instagramreelsscraper')
        .select('*', { count: 'exact', head: true })
      
      if (countError) {
        setStatus(`❌ Table access error: ${countError.message}`)
        return
      }
      
      setStatus(`✅ Table exists with ${count} records`)
      
      if (count === 0) {
        // Insert sample data
        setStatus(prev => prev + '\n📝 Inserting sample data...')
        
        const sampleData = [
          {
            reel_url: 'https://instagram.com/reel/sample1',
            thumbnail_url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&h=800&fit=crop',
            profile_picture_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
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

#realestate #luxuryhomes #hometour #dreamhome #property`
          },
          {
            reel_url: 'https://instagram.com/reel/sample2',
            thumbnail_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=800&fit=crop',
            profile_picture_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
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

#firsttimehomebuyer #realestatetips #homebuying #mortgage #property`
          },
          {
            reel_url: 'https://instagram.com/reel/sample3',
            thumbnail_url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&h=800&fit=crop',
            profile_picture_url: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face',
            title: 'Market Update 2024',
            description: 'The housing market just shifted - here\'s what it means for you',
            script: `📊 HOOK (0-3s): "The housing market just shifted - here's what it means for you"

📈 MAIN CONTENT (3-18s):
• Interest rates dropped 0.5% this month
• Inventory increased 15% in major cities
• Best time to buy in 2 years
• Sellers are more negotiable now
• Show local market statistics

💡 VISUAL TIPS:
• Use charts and graphs as overlays
• Split screen with before/after data
• Professional background (office/city view)
• Confident, authoritative delivery

🎯 CTA: "Ready to make your move? Link in bio!"

#marketupdate #realestate #interestrates #homebuying #investment`
          }
        ]
        
        const { data: insertedData, error: insertError } = await supabase
          .from('instagramreelsscraper')
          .insert(sampleData)
          .select()
        
        if (insertError) {
          setStatus(prev => prev + `\n❌ Insert error: ${insertError.message}`)
          return
        }
        
        setStatus(prev => prev + `\n✅ Successfully inserted ${insertedData?.length} sample records`)
      }
      
      // Test fetching data
      setStatus(prev => prev + '\n🔍 Testing data fetch...')
      
      const { data: fetchedData, error: fetchError } = await supabase
        .from('instagramreelsscraper')
        .select(`
          id,
          thumbnail_url,
          profile_picture_url,
          reel_url,
          script,
          title,
          description
        `)
        .limit(3)
      
      if (fetchError) {
        setStatus(prev => prev + `\n❌ Fetch error: ${fetchError.message}`)
        return
      }
      
      setStatus(prev => prev + `\n✅ Successfully fetched ${fetchedData?.length} records`)
      setStatus(prev => prev + `\n📊 Sample record: ${JSON.stringify(fetchedData?.[0], null, 2)}`)
      
    } catch (err) {
      setStatus(prev => prev + `\n❌ Unexpected error: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Database Setup & Test</h2>
      
      <Button onClick={setupDatabase} disabled={loading} className="mb-4">
        {loading ? 'Setting up...' : 'Setup Database & Test'}
      </Button>
      
      <pre className="bg-gray-100 p-4 rounded text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">
        {status || 'Click "Setup Database & Test" to initialize and test the database'}
      </pre>
    </div>
  )
}