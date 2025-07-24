"use client"

import React, { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

export function DatabaseSchemaTest() {
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testTableExists = async () => {
    setLoading(true)
    setError(null)
    setResults([])
    
    try {
      console.log('Testing if instagramreelsscraper table exists...')
      
      // First, try to get table info
      const { data: tableInfo, error: tableError } = await supabase
        .rpc('get_table_info', { table_name: 'instagramreelsscraper' })
        .single()
      
      if (tableError) {
        console.log('RPC failed, trying direct query...')
        
        // Try a simple select to see if table exists
        const { data, error: selectError } = await supabase
          .from('instagramreelsscraper')
          .select('*')
          .limit(1)
        
        if (selectError) {
          console.error('Table query error:', selectError)
          setError(`Table query failed: ${selectError.message}`)
          
          // Try to check if table exists in information_schema
          const { data: schemaData, error: schemaError } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_name', 'instagramreelsscraper')
          
          if (schemaError) {
            setError(`Schema check failed: ${schemaError.message}`)
          } else {
            setResults([{ message: 'Schema check result', data: schemaData }])
          }
        } else {
          setResults([{ message: 'Table exists and accessible', data: data }])
        }
      } else {
        setResults([{ message: 'Table info retrieved', data: tableInfo }])
      }
      
    } catch (err) {
      console.error('Test error:', err)
      setError(`Test error: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const testDirectQuery = async () => {
    setLoading(true)
    setError(null)
    setResults([])
    
    try {
      console.log('Testing direct query to instagramreelsscraper...')
      
      const { data, error, count } = await supabase
        .from('instagramreelsscraper')
        .select('id, title, description, reel_url, thumbnail_url', { count: 'exact' })
        .limit(5)
      
      if (error) {
        console.error('Direct query error:', error)
        setError(`Direct query failed: ${error.message}`)
      } else {
        console.log('Direct query success:', { data, count })
        setResults([
          { message: 'Query successful', data: data },
          { message: 'Total count', data: count }
        ])
      }
      
    } catch (err) {
      console.error('Direct query error:', err)
      setError(`Direct query error: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-4xl">
      <h2 className="text-xl font-bold mb-4">Database Schema Test</h2>
      
      <div className="flex gap-4 mb-6">
        <Button onClick={testTableExists} disabled={loading}>
          {loading ? 'Testing...' : 'Test Table Exists'}
        </Button>
        
        <Button onClick={testDirectQuery} disabled={loading}>
          {loading ? 'Testing...' : 'Test Direct Query'}
        </Button>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold">Results:</h3>
          {results.map((result, index) => (
            <div key={index} className="bg-gray-100 p-4 rounded">
              <h4 className="font-medium mb-2">{result.message}</h4>
              <pre className="text-sm overflow-auto bg-gray-200 p-2 rounded">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}