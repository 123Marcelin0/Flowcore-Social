'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import AIFeedbackCollector, { CompactFeedbackCollector } from './ai-feedback-collector'
import { 
  Brain, 
  Sparkles, 
  MessageCircle, 
  TrendingUp, 
  Target,
  Lightbulb,
  Zap,
  BarChart3,
  Star,
  CheckCircle,
  ArrowRight
} from 'lucide-react'

interface AIAction {
  id: string
  type: 'caption' | 'idea' | 'sentence' | 'insight'
  content: string
  context: string
  timestamp: Date
  feedbackReceived?: boolean
  rating?: number
  improvements?: string[]
}

export default function AIFeedbackLoopDemo() {
  const [currentStep, setCurrentStep] = useState<'input' | 'ai_action' | 'feedback' | 'learning'>('input')
  const [userInput, setUserInput] = useState('')
  const [aiActions, setAiActions] = useState<AIAction[]>([])
  const [feedbackStats, setFeedbackStats] = useState({
    total: 0,
    helpful: 0,
    averageRating: 0,
    commonImprovements: [] as string[]
  })
  const [learningInsights, setLearningInsights] = useState<string[]>([])

  // Simulated AI responses based on input
  const generateAIResponse = (input: string, type: 'caption' | 'idea' | 'sentence' | 'insight') => {
    const responses = {
      caption: [
        '🏡✨ Just listed! This stunning 3-bedroom home in Maplewood is perfect for families looking to settle down. Modern kitchen, spacious backyard, and walking distance to top schools! Ready to make your move? 📞 #DreamHome #Maplewood #FamilyFirst',
        '🌟 New listing alert! Beautiful family home with everything on your wish list. Updated throughout, move-in ready, and priced to sell. Don\'t let this one slip away! Contact me today. #NewListing #HomeForSale #RealEstate',
        '💫 From house hunting to home sweet home! This gorgeous property just hit the market and it\'s everything you\'ve been looking for. Schedule your private tour today! #HomeSweetHome #RealEstate #DreamHome'
      ],
      idea: [
        'Create a "First-Time Buyer Workshop" series covering mortgage basics, inspection tips, and neighborhood guides',
        'Start a "Market Monday" weekly update showing local price trends, new listings, and sold properties',
        'Develop a "Home Staging on a Budget" guide with before/after photos and DIY tips'
      ],
      sentence: [
        'Transform your house hunting journey into your dream home discovery.',
        'Your perfect home is waiting - let\'s find it together.',
        'Making homeownership dreams come true, one family at a time.'
      ],
      insight: [
        'Posts with neighborhood-specific hashtags get 34% more engagement than generic real estate tags',
        'Video walkthroughs receive 2.5x more shares than static photo carousels',
        'First-time buyer content performs best on weekday evenings (6-8 PM)'
      ]
    }

    const responseList = responses[type]
    return responseList[Math.floor(Math.random() * responseList.length)]
  }

  const simulateAIAction = (type: 'caption' | 'idea' | 'sentence' | 'insight') => {
    const content = generateAIResponse(userInput, type)
    const newAction: AIAction = {
      id: `action-${Date.now()}`,
      type,
      content,
      context: `Generated from: "${userInput}"`,
      timestamp: new Date()
    }

    setAiActions(prev => [newAction, ...prev])
    setCurrentStep('ai_action')

    // Simulate showing the action before feedback
    setTimeout(() => {
      setCurrentStep('feedback')
    }, 2000)
  }

  const handleFeedbackSubmitted = (actionId: string, feedback: any) => {
    // Update the action with feedback
    setAiActions(prev => prev.map(action => 
      action.id === actionId 
        ? { 
            ...action, 
            feedbackReceived: true, 
            rating: feedback.rating,
            improvements: feedback.next_suggestion_improvements 
          }
        : action
    ))

    // Update feedback statistics
    setFeedbackStats(prev => {
      const newTotal = prev.total + 1
      const newHelpful = prev.helpful + (feedback.helpful ? 1 : 0)
      const newAverage = feedback.rating ? 
        ((prev.averageRating * prev.total) + feedback.rating) / newTotal :
        prev.averageRating

      return {
        total: newTotal,
        helpful: newHelpful,
        averageRating: newAverage,
        commonImprovements: [...prev.commonImprovements, ...(feedback.next_suggestion_improvements || [])]
      }
    })

    // Generate learning insights
    const insights = [
      `Learned: User prefers ${feedback.rating >= 4 ? 'this style of' : 'different approach to'} content`,
      `Feedback pattern: ${feedback.feedback_type} for ${actionId.split('-')[0]} suggestions`,
      `Improvement noted: ${feedback.improvement_notes || 'General preference adjustment'}`
    ]
    
    setLearningInsights(prev => [...insights, ...prev].slice(0, 5))
    setCurrentStep('learning')

    // Reset after showing learning
    setTimeout(() => {
      setCurrentStep('input')
    }, 4000)
  }

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'caption': return '📝'
      case 'idea': return '💡'
      case 'sentence': return '✨'
      case 'insight': return '📊'
      default: return '🤖'
    }
  }

  const getStepStatus = (step: string) => {
    const steps = ['input', 'ai_action', 'feedback', 'learning']
    const currentIndex = steps.indexOf(currentStep)
    const stepIndex = steps.indexOf(step)
    
    if (stepIndex < currentIndex) return 'completed'
    if (stepIndex === currentIndex) return 'current'
    return 'upcoming'
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
          <Brain className="w-8 h-8" />
          🧠 AI Feedback Loop Demo
        </h1>
        <p className="text-gray-600">See how AI learns from your feedback to improve suggestions</p>
        <Badge className="mt-2 bg-blue-100 text-blue-700">
          <Sparkles className="w-3 h-3 mr-1" />
          Interactive Learning System
        </Badge>
      </div>

      {/* Process Flow */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-blue-900">Learning Process Flow</h3>
            <Badge variant="outline">Live Demo</Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { step: 'input', label: '1. Your Request', icon: MessageCircle },
              { step: 'ai_action', label: '2. AI Suggests', icon: Sparkles },
              { step: 'feedback', label: '3. You Rate', icon: Star },
              { step: 'learning', label: '4. AI Learns', icon: Brain }
            ].map(({ step, label, icon: Icon }) => {
              const status = getStepStatus(step)
              return (
                <div 
                  key={step}
                  className={`p-3 rounded-lg border transition-all ${
                    status === 'completed' ? 'bg-green-100 border-green-300 text-green-800' :
                    status === 'current' ? 'bg-blue-100 border-blue-300 text-blue-800' :
                    'bg-gray-50 border-gray-200 text-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                  <div className="text-xs">
                    {status === 'completed' && '✅ Complete'}
                    {status === 'current' && '🔄 Active'}
                    {status === 'upcoming' && '⏳ Waiting'}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Input Section */}
      {currentStep === 'input' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Step 1: Request AI Help
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="What do you need help with? (e.g., 'Write a caption for a new home listing')"
              className="text-sm"
            />
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Button
                onClick={() => simulateAIAction('caption')}
                disabled={!userInput.trim()}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                📝 Caption
              </Button>
              <Button
                onClick={() => simulateAIAction('idea')}
                disabled={!userInput.trim()}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                💡 Idea
              </Button>
              <Button
                onClick={() => simulateAIAction('sentence')}
                disabled={!userInput.trim()}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                ✨ Sentence
              </Button>
              <Button
                onClick={() => simulateAIAction('insight')}
                disabled={!userInput.trim()}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                📊 Insight
              </Button>
            </div>

            <div className="text-xs text-gray-500">
              💡 Try: "Help me write a caption for a new listing" or "Give me content ideas for first-time buyers"
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Action Display */}
      {currentStep === 'ai_action' && aiActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 animate-pulse" />
              Step 2: AI Generated Suggestion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{getActionIcon(aiActions[0].type)}</span>
                <Badge variant="secondary">{aiActions[0].type}</Badge>
                <span className="text-xs text-gray-500">Generated just now</span>
              </div>
              <p className="text-gray-800 mb-2">{aiActions[0].content}</p>
              <p className="text-xs text-gray-500">Context: {aiActions[0].context}</p>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-blue-600">
              <Brain className="w-4 h-4 animate-pulse" />
              Waiting for your feedback...
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feedback Collection */}
      {currentStep === 'feedback' && aiActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5" />
              Step 3: Your Feedback
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg border mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{getActionIcon(aiActions[0].type)}</span>
                <span className="font-medium">{aiActions[0].content}</span>
              </div>
            </div>

            <AIFeedbackCollector
              actionType={aiActions[0].type}
              actionId={aiActions[0].id}
              suggestionData={aiActions[0]}
              context={aiActions[0].context}
              onFeedbackSubmitted={(feedback) => handleFeedbackSubmitted(aiActions[0].id, feedback)}
              autoShow={true}
              compact={false}
            />
          </CardContent>
        </Card>
      )}

      {/* Learning Display */}
      {currentStep === 'learning' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Step 4: AI Learning in Action
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-900">Feedback Processed!</span>
              </div>
              
              <div className="space-y-2 text-sm">
                {learningInsights.slice(0, 3).map((insight, index) => (
                  <div key={index} className="flex items-center gap-2 text-green-800">
                    <ArrowRight className="w-3 h-3" />
                    {insight}
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center">
              <Button
                onClick={() => setCurrentStep('input')}
                className="flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Try Another AI Action
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feedback Statistics */}
      {feedbackStats.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              AI Learning Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{feedbackStats.total}</div>
                <div className="text-sm text-gray-600">Total Feedback</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {Math.round((feedbackStats.helpful / feedbackStats.total) * 100)}%
                </div>
                <div className="text-sm text-gray-600">Helpful Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {feedbackStats.averageRating.toFixed(1)}★
                </div>
                <div className="text-sm text-gray-600">Average Rating</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Actions */}
      {aiActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Recent AI Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {aiActions.slice(0, 3).map((action) => (
                <div key={action.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{getActionIcon(action.type)}</span>
                      <Badge variant="secondary" className="text-xs">{action.type}</Badge>
                      <span className="text-xs text-gray-500">
                        {action.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{action.content.slice(0, 100)}...</p>
                    {action.improvements && action.improvements.length > 0 && (
                      <div className="text-xs text-blue-600">
                        💡 Next improvements: {action.improvements.join(', ')}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {action.feedbackReceived ? (
                      <div className="flex items-center gap-1">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        {action.rating && (
                          <span className="text-sm text-green-600">{action.rating}★</span>
                        )}
                      </div>
                    ) : (
                      <CompactFeedbackCollector
                        actionType={action.type}
                        actionId={action.id}
                        suggestionData={action}
                        context={action.context}
                        onFeedbackSubmitted={(feedback) => handleFeedbackSubmitted(action.id, feedback)}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* How It Works */}
      <Card className="bg-gray-50 border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            🔧 How the Feedback Loop Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <div className="font-medium mb-1">🎯 Pattern Recognition:</div>
            <p className="text-gray-600">AI analyzes your feedback patterns to understand preferences (tone, length, style, emojis)</p>
          </div>
          <div>
            <div className="font-medium mb-1">📊 Continuous Learning:</div>
            <p className="text-gray-600">Each thumbs up/down and rating helps fine-tune future suggestions specifically for you</p>
          </div>
          <div>
            <div className="font-medium mb-1">🔄 Real-time Adaptation:</div>
            <p className="text-gray-600">The AI adjusts its approach based on your improvement notes and preferences</p>
          </div>
          <div>
            <div className="font-medium mb-1">💾 Memory System:</div>
            <p className="text-gray-600">All feedback is stored and analyzed to build a personalized AI assistant that knows your style</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 