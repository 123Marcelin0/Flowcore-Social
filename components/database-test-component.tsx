"use client"

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

export function DatabaseTestComponent() {
  const [tables, setTables] = useState<string[]>([])
  const [columns, setColumns] = useState<any[]>([])
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTables = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // List all tables in the public schema
      const { data, error } = await supabase
        .from('pg_tables')
        .select('tablename')
        .eq('schemaname', 'public')
      
      if (error) throw error
      
      setTables(data?.map(t => t.tablename) || [])
      console.log('Available tables:', data)
    } catch (err: any) {
      console.error('Error fetching tables:', err)
      setError(`Error fetching tables: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const fetchColumns = async (tableName: string) => {
    setLoading(true)
    setError(null)
    
    try {
      // Get column information for the specified table
      const { data, error } = await supabase
        .rpc('get_table_columns', { table_name: tableName })
      
      if (error) throw error
      
      setColumns(data || [])
      console.log(`Columns for ${tableName}:`, data)
    } catch (err: any) {
      console.error(`Error fetching columns for ${tableName}:`, err)
      setError(`Error fetching columns: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const fetchSampleData = async (tableName: string) => {
    setLoading(true)
    setError(null)
    
    try {
      // Get sample data from the table
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(5)
      
      if (error) throw error
      
      setData(data || [])
      console.log(`Sample data from ${tableName}:`, data)
    } catch (err: any) {
      console.error(`Error fetching data from ${tableName}:`, err)
      setError(`Error fetching data: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4">Database Structure Test</h2>
      
      <div className="space-y-4">
        <Button onClick={fetchTables} disabled={loading}>
          {loading ? 'Loading...' : 'List Tables'}
        </Button>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        
        {tables.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2">Available Tables:</h3>
            <div className="space-y-2">
              {tables.map(table => (
                <div key={table} className="flex items-center gap-2">
                  <span className="bg-gray-100 px-2 py-1 rounded">{table}</span>
                  <Button size="sm" onClick={() => fetchColumns(table)}>
                    View Columns
                  </Button>
                  <Button size="sm" onClick={() => fetchSampleData(table)}>
                    Sample Data
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {columns.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2">Columns:</h3>
            <div className="bg-gray-100 p-3 rounded overflow-auto max-h-60">
              <pre>{JSON.stringify(columns, null, 2)}</pre>
            </div>
          </div>
        )}
        
        {data.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2">Sample Data:</h3>
            <div className="bg-gray-100 p-3 rounded overflow-auto max-h-60">
              <pre>{JSON.stringify(data, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}