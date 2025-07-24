"use client"

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

export function DatabaseTest() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testConnection = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('Testing connection to instagramreelscraper table...')
      
      const { data: result, error: queryError } = await supabase
        .from('instagramreelscraper')
        .select('*')
        .limit(5)
      
      if (queryError) {
        console.error('Query error:', queryError)
        setError(`Query error: ${queryError.message}`)
        return
      }
      
      console.log('Query successful, data:', result)
      setData(result || [])
      
    } catch (err) {
      console.error('Connection error:', err)
      setError(`Connection error: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    testConnection()
  }, [])

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4">Database Connection Test</h2>
      
      <Button onClick={testConnection} disabled={loading} className="mb-4">
        {loading ? 'Testing...' : 'Test Connection'}
      </Button>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      <div className="mb-4">
        <strong>Records found:</strong> {data.length}
      </div>
      
      {data.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold">Sample Data:</h3>
          {data.map((item, index) => (
            <div key={index} className="bg-gray-100 p-3 rounded text-sm">
              <div><strong>ID:</strong> {item.id}</div>
              <div><strong>Title:</strong> {item.title || 'No title'}</div>
              <div><strong>Description:</strong> {item.description || 'No description'}</div>
              <div><strong>Reel URL:</strong> {item.reel_url || 'No URL'}</div>
              <div><strong>Thumbnail:</strong> {item.thumbnail_url ? 'Yes' : 'No'}</div>
              <div><strong>Script:</strong> {item.script ? 'Yes' : 'No'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}