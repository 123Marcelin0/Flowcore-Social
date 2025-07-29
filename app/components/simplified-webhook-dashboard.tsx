'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DetailedFetchButton } from './manual-fetch-button'
import { 
  Webhook, 
  Clock, 
  Zap, 
  BarChart3, 
  Calendar,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Play,
  Settings,
  Timer
} from 'lucide-react'

interface WebhookStats {
  total_manual_triggers_24h: number
  successful_triggers: number
  failed_triggers: number
  last_manual_trigger: string | null
}

interface WebhookLog {
  id: string
  user_id: string
  source_id: string
  context_summary: string
  metadata: {
    trigger_type: string
    platform: string
    webhook_status: number
    post_title: string
  }
  created_at: string
}

interface SamplePost {
  id: string
  title: string
  content: string
  platforms: string[]
  published_at: string
  status: string
  likes: number
  comments: number
  shares: number
}

export default function SimplifiedWebhookDashboard() {
  const [webhookStats, setWebhookStats] = useState<WebhookStats | null>(null)
  const [recentLogs, setRecentLogs] = useState<WebhookLog[]>([])
  const [loading, setLoading] = useState(false)
  const [testTriggerLoading, setTestTriggerLoading] = useState(false)

  // Sample posts for demonstration
  const samplePosts: SamplePost[] = [
    {
      id: 'post-1',
      title: 'Beautiful Family Home',
      content: '🏡 Just listed! Beautiful 3BR family home in Maplewood. Modern kitchen, spacious backyard, walk to schools! Who\'s ready for a tour? 📍 #DreamHome #FamilyFirst #LocalExpert',
      platforms: ['instagram', 'facebook'],
      published_at: '2024-01-15T10:30:00Z',
      status: 'published',
      likes: 89,
      comments: 23,
      shares: 12
    },
    {
      id: 'post-2',
      title: 'Market Update',
      content: 'Market Update: Home values in our area increased 8% this quarter. Great news for sellers! Contact me for a free consultation.',
      platforms: ['facebook'],
      published_at: '2024-01-18T15:20:00Z',
      status: 'published',
      likes: 34,
      comments: 6,
      shares: 4
    },
    {
      id: 'post-3',
      title: 'Kitchen Renovation Success',
      content: '✨ Before & After transformation! This kitchen renovation added $25k in value. Smart investment for this growing family! 👨‍👩‍👧‍👦 #HomeImprovement #Investment #RealEstateValue',
      platforms: ['instagram'],
      published_at: '2024-01-21T19:15:00Z',
      status: 'published',
      likes: 156,
      comments: 31,
      shares: 18
    }
  ]

  const loadWebhookStats = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/manual-webhook-trigger')
      const data = await response.json()
      
      if (data.success) {
        setWebhookStats(data.data.statistics)
        setRecentLogs(data.data.recent_logs || [])
      }
    } catch (error) {
      console.error('Error loading webhook stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const triggerTestWebhook = async () => {
    setTestTriggerLoading(true)
    try {
      const response = await fetch('/api/manual-webhook-trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          postId: 'post-1',
          platform: 'instagram'
        })
      })

      const data = await response.json()
      
      if (data.success) {
        // Refresh stats after successful trigger
        setTimeout(() => {
          loadWebhookStats()
        }, 2000)
      }
    } catch (error) {
      console.error('Error triggering test webhook:', error)
    } finally {
      setTestTriggerLoading(false)
    }
  }

  useEffect(() => {
    loadWebhookStats()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadWebhookStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
  }

  const getStatusColor = (status: number) => {
    if (status === 200) return 'text-green-600 bg-green-100'
    if (status >= 400) return 'text-red-600 bg-red-100'
    return 'text-yellow-600 bg-yellow-100'
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">🔗 Make.com Manual Webhook Triggers</h1>
        <p className="text-gray-600">Manual insights fetching via Make.com automation</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <Badge variant="outline" className="bg-blue-50">
            <ExternalLink className="w-3 h-3 mr-1" />
            https://hook.eu2.make.com/2k9wydyrif8tdoa0jxj57tgcof49qi5e
          </Badge>
        </div>
      </div>

      {/* Manual Trigger Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium">Manual Triggers (24h)</span>
            </div>
            <div className="text-2xl font-bold">
              {loading ? '-' : webhookStats?.total_manual_triggers_24h || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium">Success Rate</span>
            </div>
            <div className="text-2xl font-bold">
              {loading ? '-' : webhookStats ? 
                Math.round((webhookStats.successful_triggers / Math.max(webhookStats.total_manual_triggers_24h, 1)) * 100) + '%'
                : '0%'
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium">Last Manual Trigger</span>
            </div>
            <div className="text-sm font-medium">
              {loading ? '-' : webhookStats?.last_manual_trigger ? 
                getTimeAgo(webhookStats.last_manual_trigger) : 'Never'
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Manual Webhook Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={triggerTestWebhook}
              disabled={testTriggerLoading}
              className="flex items-center gap-2"
            >
              {testTriggerLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Triggering...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Test Manual Trigger
                </>
              )}
            </Button>

            <Button
              onClick={loadWebhookStats}
              variant="outline"
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh Stats
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Timer className="w-4 h-4" />
                🔄 Automated (Make.com)
              </h4>
              <p className="text-sm text-gray-600">
                Your Make.com scenario is set to automatically fetch insights every 6 hours. 
                No additional setup needed!
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                👆 Manual Triggers
              </h4>
              <p className="text-sm text-gray-600">
                Use the fetch buttons on individual post cards to manually sync specific posts when needed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sample Posts with Manual Fetch Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Your Posts - Manual Sync Available
          </CardTitle>
          <p className="text-sm text-gray-600">
            Click "Fetch Insights" to manually trigger Make.com webhook for real-time insights
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {samplePosts.map((post) => (
              <div key={post.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-medium mb-1">{post.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">{post.content}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(post.published_at)}
                      </span>
                      <span>Platforms: {post.platforms.join(', ')}</span>
                      <Badge variant="secondary" className="text-xs">
                        {post.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right text-sm">
                      <div>❤️ {post.likes} 💬 {post.comments} 🔄 {post.shares}</div>
                    </div>
                    
                    {/* Manual Fetch Buttons */}
                    <div className="flex items-center gap-2">
                      {post.platforms.map(platform => (
                        <DetailedFetchButton
                          key={`${post.id}-${platform}`}
                          postId={post.id}
                          platform={platform}
                          onSuccess={(data) => {
                            console.log(`✅ Successfully triggered ${platform} fetch for post ${post.id}`, data)
                            // Refresh stats after successful manual trigger
                            setTimeout(() => {
                              loadWebhookStats()
                            }, 1000)
                          }}
                          onError={(error) => {
                            console.error(`❌ Failed to trigger ${platform} fetch for post ${post.id}`, error)
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Manual Webhook Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="w-5 h-5" />
            Recent Manual Webhook Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-gray-500">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Loading webhook logs...</span>
            </div>
          ) : recentLogs.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <Webhook className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No manual webhook activity yet</p>
              <p className="text-sm">Click "Fetch Insights" on any post to see logs here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentLogs.slice(0, 10).map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{log.context_summary}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Post: {log.metadata?.post_title} • Platform: {log.metadata?.platform} • {getTimeAgo(log.created_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${getStatusColor(log.metadata?.webhook_status)}`}>
                      {log.metadata?.webhook_status === 200 ? 'Success' : `Error ${log.metadata?.webhook_status}`}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Manual
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Status */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-green-900 mb-1">✅ Make.com Integration Ready</h3>
              <p className="text-sm text-green-700 mb-3">
                Your setup is complete! Make.com handles the 6-hour automation internally, 
                and manual triggers are available for instant insights.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-green-600">
                <div>
                  <div className="font-medium mb-1">✅ Working Now:</div>
                  <ul className="space-y-1">
                    <li>• Manual webhook triggers</li>
                    <li>• Activity logging</li>
                    <li>• Post-level fetch buttons</li>
                    <li>• Make.com scenario connected</li>
                  </ul>
                </div>
                <div>
                  <div className="font-medium mb-1">🔄 Automated by Make.com:</div>
                  <ul className="space-y-1">
                    <li>• 6-hour scheduled fetching</li>
                    <li>• Instagram/Facebook connections</li>
                    <li>• Rate limit handling</li>
                    <li>• Error management</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 