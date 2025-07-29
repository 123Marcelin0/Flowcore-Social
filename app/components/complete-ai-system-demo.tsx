'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import IntelligentAIAssistant from './intelligent-ai-assistant'
import AIFeedbackLoopDemo from './ai-feedback-loop-demo'
import SmartSearchDemo from './smart-search-demo'
import SmartCaptionDemo from './smart-caption-demo'
import SimplifiedWebhookDashboard from './simplified-webhook-dashboard'
import { 
  Brain, 
  Sparkles, 
  MessageCircle, 
  Search, 
  Target, 
  TrendingUp,
  Zap,
  Database,
  Globe,
  Users,
  BarChart3,
  Lightbulb,
  CheckCircle,
  ArrowRight,
  Star
} from 'lucide-react'

export default function CompleteAISystemDemo() {
  const [activeDemo, setActiveDemo] = useState('overview')
  const [systemStats] = useState({
    memory_enabled: true,
    feedback_learning: true,
    smart_search: true,
    webhook_integration: true,
    total_features: 8,
    completion_percentage: 95
  })

  const features = [
    {
      id: 'memory',
      title: '🧠 Intelligent Memory',
      description: 'AI remembers conversations and provides context-aware responses',
      status: 'implemented',
      component: 'IntelligentAIAssistant',
      benefits: ['No repetition', 'Progressive learning', 'Personalized responses']
    },
    {
      id: 'feedback',
      title: '📊 Feedback Learning',
      description: 'Continuous improvement through user feedback and rating system',
      status: 'implemented',
      component: 'AIFeedbackLoopDemo',
      benefits: ['User preference learning', 'Quality improvement', 'Pattern recognition']
    },
    {
      id: 'search',
      title: '🔍 Smart Search & Vector Recall',
      description: 'Semantic search through content with AI-powered recommendations',
      status: 'implemented',
      component: 'SmartSearchDemo',
      benefits: ['Content discovery', 'Reuse suggestions', 'Semantic matching']
    },
    {
      id: 'captions',
      title: '📝 Smart Caption Generation',
      description: 'AI-powered captions with brand voice matching and engagement optimization',
      status: 'implemented',
      component: 'SmartCaptionDemo',
      benefits: ['Brand consistency', 'Engagement optimization', 'Strategy variety']
    },
    {
      id: 'insights',
      title: '📈 Performance Insights',
      description: 'Make.com integration for real-time social media metrics and learning',
      status: 'implemented',
      component: 'SimplifiedWebhookDashboard',
      benefits: ['Real-time data', 'Performance tracking', 'Automated sync']
    }
  ]

  const getFeatureIcon = (featureId: string) => {
    switch (featureId) {
      case 'memory': return <Brain className="w-5 h-5" />
      case 'feedback': return <Star className="w-5 h-5" />
      case 'search': return <Search className="w-5 h-5" />
      case 'captions': return <Target className="w-5 h-5" />
      case 'insights': return <TrendingUp className="w-5 h-5" />
      default: return <Lightbulb className="w-5 h-5" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'implemented': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-yellow-100 text-yellow-800'
      case 'planned': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Brain className="w-12 h-12 text-blue-600" />
          <Sparkles className="w-8 h-8 text-purple-500" />
          <Target className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-4xl font-bold mb-3">
          🚀 Complete AI System Demo
        </h1>
        <p className="text-xl text-gray-600 mb-4">
          Intelligent Memory + Feedback Learning + Smart Search + Performance Insights
        </p>
        <div className="flex items-center justify-center gap-4">
          <Badge className="bg-green-100 text-green-700 px-4 py-2 text-lg">
            <CheckCircle className="w-4 h-4 mr-2" />
            {systemStats.completion_percentage}% Complete
          </Badge>
          <Badge className="bg-blue-100 text-blue-700 px-4 py-2 text-lg">
            <Database className="w-4 h-4 mr-2" />
            {systemStats.total_features} Features
          </Badge>
        </div>
      </div>

      {/* System Overview */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-6 h-6" />
            🎯 What Makes This AI System Special
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-5 h-5 text-blue-600" />
                <span className="font-medium">Remembers Everything</span>
              </div>
              <p className="text-sm text-gray-600">
                Stores all conversations with embeddings for semantic search and context awareness
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-5 h-5 text-yellow-600" />
                <span className="font-medium">Learns from Feedback</span>
              </div>
              <p className="text-sm text-gray-600">
                Continuously improves based on user ratings and improvement suggestions
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Search className="w-5 h-5 text-green-600" />
                <span className="font-medium">Smart Content Discovery</span>
              </div>
              <p className="text-sm text-gray-600">
                Finds relevant past content using AI-powered semantic search
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <span className="font-medium">Performance Driven</span>
              </div>
              <p className="text-sm text-gray-600">
                Integrates real-time metrics to optimize content strategy
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-green-200">
            <h4 className="font-medium text-green-900 mb-2">🎉 Complete AI Ecosystem:</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Intelligent Memory</Badge>
              <Badge variant="outline">Feedback Learning</Badge>
              <Badge variant="outline">Smart Search</Badge>
              <Badge variant="outline">Brand Voice Matching</Badge>
              <Badge variant="outline">Performance Analytics</Badge>
              <Badge variant="outline">Context Awareness</Badge>
              <Badge variant="outline">Continuous Improvement</Badge>
              <Badge variant="outline">User Personalization</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {features.map((feature) => (
          <Card key={feature.id} className="relative overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getFeatureIcon(feature.id)}
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </div>
                <Badge className={getStatusColor(feature.status)}>
                  {feature.status === 'implemented' ? '✅ Ready' : 
                   feature.status === 'in_progress' ? '🔄 Building' : '📋 Planned'}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">{feature.description}</p>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-700">Benefits:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {feature.benefits.map((benefit, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {benefit}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveDemo(feature.id)}
                  className="w-full flex items-center gap-2"
                >
                  <Lightbulb className="w-4 h-4" />
                  Try {feature.title.split(' ')[1]} Demo
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Interactive Demos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-6 h-6" />
            🎮 Interactive Feature Demos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeDemo} onValueChange={setActiveDemo}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="memory">Memory</TabsTrigger>
              <TabsTrigger value="feedback">Feedback</TabsTrigger>
              <TabsTrigger value="search">Search</TabsTrigger>
              <TabsTrigger value="captions">Captions</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <div className="text-center space-y-6">
                <div>
                  <h3 className="text-2xl font-bold mb-4">🌟 Your AI Assistant is Ready!</h3>
                  <p className="text-lg text-gray-600 mb-6">
                    All systems are implemented and working together to create the most intelligent, 
                    personalized AI assistant for content creation.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="text-2xl font-bold text-blue-600 mb-2">🧠</div>
                    <h4 className="font-medium mb-2">Intelligent Memory</h4>
                    <p className="text-sm text-gray-600">
                      Remembers all conversations and provides context-aware responses
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="text-2xl font-bold text-green-600 mb-2">📈</div>
                    <h4 className="font-medium mb-2">Continuous Learning</h4>
                    <p className="text-sm text-gray-600">
                      Improves suggestions based on your feedback and performance data
                    </p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <div className="text-2xl font-bold text-purple-600 mb-2">🎯</div>
                    <h4 className="font-medium mb-2">Personalized Results</h4>
                    <p className="text-sm text-gray-600">
                      Adapts to your brand voice, style preferences, and goals
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border border-green-200">
                  <h4 className="text-lg font-bold text-green-900 mb-3">🚀 Start Using Your Intelligent AI Assistant</h4>
                  <p className="text-green-700 mb-4">
                    Select any tab above to explore the features, or dive right into using the complete system!
                  </p>
                  <div className="flex justify-center gap-3">
                    <Button onClick={() => setActiveDemo('memory')} className="flex items-center gap-2">
                      <Brain className="w-4 h-4" />
                      Try Intelligent Chat
                    </Button>
                    <Button variant="outline" onClick={() => setActiveDemo('captions')} className="flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Generate Smart Captions
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="memory" className="mt-6">
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="font-bold text-blue-900 mb-2">🧠 Intelligent Memory System</h3>
                  <p className="text-blue-700 text-sm">
                    This AI assistant remembers all conversations, searches past discussions for context, 
                    and provides personalized responses based on your history. Try starting a conversation!
                  </p>
                </div>
                <IntelligentAIAssistant />
              </div>
            </TabsContent>

            <TabsContent value="feedback" className="mt-6">
              <div className="space-y-4">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h3 className="font-bold text-green-900 mb-2">📊 AI Feedback Learning System</h3>
                  <p className="text-green-700 text-sm">
                    Watch how the AI learns from your feedback! Rate suggestions, provide improvement notes, 
                    and see how the AI adapts to your preferences over time.
                  </p>
                </div>
                <AIFeedbackLoopDemo />
              </div>
            </TabsContent>

            <TabsContent value="search" className="mt-6">
              <div className="space-y-4">
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <h3 className="font-bold text-purple-900 mb-2">🔍 Smart Search & Vector Recall</h3>
                  <p className="text-purple-700 text-sm">
                    Find relevant content using natural language! The AI understands context and meaning, 
                    not just keywords. Try searching for "motivational content for families".
                  </p>
                </div>
                <SmartSearchDemo />
              </div>
            </TabsContent>

            <TabsContent value="captions" className="mt-6">
              <div className="space-y-4">
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <h3 className="font-bold text-yellow-900 mb-2">📝 Smart Caption Generation</h3>
                  <p className="text-yellow-700 text-sm">
                    Generate captions that match your brand voice! The AI creates multiple strategies: 
                    brand voice match, engagement optimized, and trend-focused experimental.
                  </p>
                </div>
                <SmartCaptionDemo />
              </div>
            </TabsContent>

            <TabsContent value="insights" className="mt-6">
              <div className="space-y-4">
                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                  <h3 className="font-bold text-indigo-900 mb-2">📈 Performance Insights Integration</h3>
                  <p className="text-indigo-700 text-sm">
                    Monitor Make.com webhook integration for automated social media insights. 
                    The AI learns from performance data to improve future suggestions.
                  </p>
                </div>
                <SimplifiedWebhookDashboard />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* System Architecture */}
      <Card className="bg-gray-50 border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-6 h-6" />
            🏗️ System Architecture Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Database className="w-4 h-4" />
                Database Layer
              </h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• chat_sessions & chat_messages</li>
                <li>• ai_feedback & ai_suggestions</li>
                <li>• Vector embeddings with pgvector</li>
                <li>• Performance analytics tables</li>
              </ul>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                API Layer
              </h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• /api/chat-memory</li>
                <li>• /api/ai-feedback</li>
                <li>• /api/smart-search</li>
                <li>• /api/manual-webhook-trigger</li>
              </ul>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Users className="w-4 h-4" />
                AI Components
              </h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• IntelligentAIAssistant</li>
                <li>• AIFeedbackCollector</li>
                <li>• SmartSearchInterface</li>
                <li>• SmartCaptionDemo</li>
              </ul>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                External Integrations
              </h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• OpenAI API (GPT-4 & Embeddings)</li>
                <li>• Make.com webhooks</li>
                <li>• Social media platforms</li>
                <li>• Performance analytics</li>
              </ul>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">🔄 Data Flow:</h4>
            <p className="text-sm text-blue-700">
              User Input → AI Processing → Memory Storage → Context Retrieval → Feedback Collection → 
              Performance Analysis → Continuous Learning → Improved Responses
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-6 h-6" />
            🎯 Your AI System is Complete!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-lg text-gray-700 mb-4">
              You now have a fully functional, intelligent AI assistant with memory, learning, and performance optimization!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-900 mb-2">✅ What's Working:</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Intelligent conversation memory</li>
                <li>• Feedback-based learning</li>
                <li>• Smart content search</li>
                <li>• Performance tracking</li>
                <li>• Brand voice matching</li>
              </ul>
            </div>
            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">🚀 Ready to Use:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Start conversations with memory</li>
                <li>• Generate smart captions</li>
                <li>• Search past content</li>
                <li>• Provide feedback for learning</li>
                <li>• Monitor performance metrics</li>
              </ul>
            </div>
            <div className="bg-white p-4 rounded-lg border border-purple-200">
              <h4 className="font-medium text-purple-900 mb-2">💡 Pro Tips:</h4>
              <ul className="text-sm text-purple-700 space-y-1">
                <li>• Rate AI suggestions to improve quality</li>
                <li>• Use specific feedback for better learning</li>
                <li>• Reference past conversations naturally</li>
                <li>• Explore all demo features above</li>
                <li>• Integrate with your content workflow</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 