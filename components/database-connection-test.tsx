"use client"

import React, { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

export function DatabaseConnectionTest() {
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const testConnection = async () => {
    setLoading(true)
    setResult('Testing connection...')
    
    try {
      // Test 1: Basic connection
      const { data: connectionTest, error: connectionError } = await supabase
        .from('instagramreelsscraper')
        .select('count', { count: 'exact', head: true })
      
      if (connectionError) {
        setResult(`Connection Error: ${connectionError.message}`)
        return
      }
      
      setResult(`✅ Connection successful! Table has ${connectionTest} records`)
      
      // Test 2: Try to fetch actual data
      const { data, error } = await supabase
        .from('instagramreelsscraper')
        .select('*')
        .limit(3)
      
      if (error) {
        setResult(prev => prev + `\n❌ Data fetch error: ${error.message}`)
        return
      }
      
      setResult(prev => prev + `\n📊 Sample data: ${JSON.stringify(data, null, 2)}`)
      
    } catch (err) {
      setResult(`❌ Unexpected error: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const insertSampleData = async () => {
    setLoading(true)
    setResult('Inserting sample data...')
    
    try {
      const { data, error } = await supabase
        .from('instagramreelsscraper')
        .insert([
          {
            reel_url: 'https://instagram.com/reel/test1',
            thumbnail_url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&h=800&fit=crop',
            profile_picture_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
            title: 'Test Real Estate Reel',
            description: 'This is a test reel for the swipe interface',
            script: 'Test script content for the reel'
          }
        ])
        .select()
      
      if (error) {
        setResult(`❌ Insert error: ${error.message}`)
        return
      }
      
      setResult(`✅ Sample data inserted successfully: ${JSON.stringify(data, null, 2)}`)
      
    } catch (err) {
      setResult(`❌ Unexpected error: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Database Connection Test</h2>
      
      <div className="flex gap-4 mb-4">
        <Button onClick={testConnection} disabled={loading}>
          Test Connection
        </Button>
        <Button onClick={insertSampleData} disabled={loading} variant="outline">
          Insert Sample Data
        </Button>
      </div>
      
      <pre className="bg-gray-100 p-4 rounded text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">
        {result || 'Click "Test Connection" to check database connectivity'}
      </pre>
    </div>
  )
}