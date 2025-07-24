"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  RefreshCw, 
  Play, 
  Pause, 
  CheckCircle, 
  AlertTriangle, 
  Trash2,
  Database,
  Sparkles,
  BarChart3,
  Info
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

interface EmbeddingStats {
  total: number
  with_embeddings: number
  without_embeddings: number
  success_rate: number
}

interface EmbeddingProgress {
  isRunning: boolean
  current: number
  total: number
  succeeded: number
  failed: number
  currentPost?: string
}

export function EmbeddingManager() {
  const { user } = useAuth()
  const [stats, setStats] = useState<EmbeddingStats | null>(null)
  const [progress, setProgress] = useState<EmbeddingProgress>({
    isRunning: false,
    current: 0,
    total: 0,
    succeeded: 0,
    failed: 0
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch embedding statistics
  const fetchStats = async () => {
    if (!user) return

    try {
      setError(null)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('No authentication token available')
      }

      const response = await fetch('/api/generate-embeddings?user_only=true', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success) {
        setStats({
          total: data.total_posts,
          with_embeddings: data.posts_with_embeddings,
          without_embeddings: data.posts_without_embeddings,
          success_rate: data.total_posts > 0 ? Math.round((data.posts_with_embeddings / data.total_posts) * 100) : 0
        })
      } else {
        throw new Error(data.error || 'Failed to fetch statistics')
      }
    } catch (error) {
      console.error('Error fetching embedding stats:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch statistics')
    }
  }

  // Generate embeddings for all posts
  const generateEmbeddings = async (forceRegenerate = false) => {
    if (!user || progress.isRunning) return

    try {
      setError(null)
      setProgress(prev => ({ ...prev, isRunning: true, current: 0, succeeded: 0, failed: 0 }))
      
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('No authentication token available')
      }

      const response = await fetch('/api/generate-embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          user_only: true,
          batch_size: 5,
          force_regenerate: forceRegenerate
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success) {
        setProgress({
          isRunning: false,
          current: data.progress.total,
          total: data.progress.total,
          succeeded: data.progress.succeeded,
          failed: data.progress.failed
        })
        
        toast.success(`Embeddings generated successfully! ${data.progress.succeeded} successful, ${data.progress.failed} failed`)
        
        // Refresh stats
        fetchStats()
      } else {
        throw new Error(data.error || 'Failed to generate embeddings')
      }
    } catch (error) {
      console.error('Error generating embeddings:', error)
      setError(error instanceof Error ? error.message : 'Failed to generate embeddings')
      setProgress(prev => ({ ...prev, isRunning: false }))
      toast.error('Failed to generate embeddings')
    }
  }

  // Clear all embeddings
  const clearEmbeddings = async () => {
    if (!user || progress.isRunning) return

    if (!confirm('Are you sure you want to clear all embeddings? This cannot be undone.')) {
      return
    }

    try {
      setError(null)
      setIsLoading(true)
      
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('No authentication token available')
      }

      const response = await fetch('/api/generate-embeddings', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          user_only: true,
          confirm: true
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success) {
        toast.success(`Cleared embeddings for ${data.cleared_count} posts`)
        fetchStats()
      } else {
        throw new Error(data.error || 'Failed to clear embeddings')
      }
    } catch (error) {
      console.error('Error clearing embeddings:', error)
      setError(error instanceof Error ? error.message : 'Failed to clear embeddings')
      toast.error('Failed to clear embeddings')
    } finally {
      setIsLoading(false)
    }
  }

  // Load stats on mount
  useEffect(() => {
    if (user) {
      fetchStats()
    }
  }, [user])

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-600">Please sign in to manage embeddings</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Embedding Manager</h2>
          <p className="text-gray-600">Generate AI embeddings for your posts to enable semantic search</p>
        </div>
        <Button
          variant="outline"
          onClick={fetchStats}
          disabled={isLoading || progress.isRunning}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Statistics Card */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Embedding Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-gray-600">Total Posts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.with_embeddings}</div>
                <div className="text-sm text-gray-600">With Embeddings</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.without_embeddings}</div>
                <div className="text-sm text-gray-600">Without Embeddings</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.success_rate}%</div>
                <div className="text-sm text-gray-600">Completion Rate</div>
              </div>
            </div>
            
            {stats.total > 0 && (
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-2">
                  <span>Progress</span>
                  <span>{stats.with_embeddings} / {stats.total}</span>
                </div>
                <Progress value={stats.success_rate} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Generation Progress */}
      {progress.isRunning && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 animate-pulse" />
              Generating Embeddings...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{progress.current} / {progress.total}</span>
              </div>
              <Progress value={(progress.current / progress.total) * 100} className="h-3" />
              
              {progress.currentPost && (
                <p className="text-sm text-gray-600">
                  Processing: {progress.currentPost}
                </p>
              )}
              
              <div className="flex gap-4 text-sm">
                <span className="text-green-600">✓ {progress.succeeded} successful</span>
                <span className="text-red-600">✗ {progress.failed} failed</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Play className="w-5 h-5" />
              Generate Missing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Generate embeddings only for posts that don't have them yet.
            </p>
            <Button
              onClick={() => generateEmbeddings(false)}
              disabled={isLoading || progress.isRunning || (stats?.without_embeddings === 0)}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {progress.isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Missing
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <RefreshCw className="w-5 h-5" />
              Regenerate All
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Regenerate embeddings for all posts, including those that already have them.
            </p>
            <Button
              onClick={() => generateEmbeddings(true)}
              disabled={isLoading || progress.isRunning || stats?.total === 0}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate All
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trash2 className="w-5 h-5" />
              Clear All
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Remove all embeddings. Useful for testing or starting fresh.
            </p>
            <Button
              onClick={clearEmbeddings}
              disabled={isLoading || progress.isRunning || stats?.with_embeddings === 0}
              variant="destructive"
              className="w-full"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            About Embeddings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600">
            <p>
              <strong>What are embeddings?</strong> Embeddings are numerical representations of your post content 
              that enable AI-powered semantic search and content recommendations.
            </p>
            <p>
              <strong>When do I need them?</strong> Embeddings are automatically generated for new posts. 
              Use this tool to generate embeddings for existing posts created before the embedding system was added.
            </p>
            <p>
              <strong>How long does it take?</strong> Generation typically takes 1-2 seconds per post. 
              The system processes posts in batches to respect API rate limits.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 