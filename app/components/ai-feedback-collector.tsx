'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { 
  ThumbsUp, 
  ThumbsDown, 
  Star, 
  MessageCircle, 
  X,
  Brain,
  Sparkles,
  CheckCircle
} from 'lucide-react'

interface FeedbackCollectorProps {
  actionType: 'caption' | 'idea' | 'sentence' | 'insight' | 'search_result'
  actionId: string
  suggestionData: any
  context?: string
  onFeedbackSubmitted?: (feedback: any) => void
  onClose?: () => void
  autoShow?: boolean
  compact?: boolean
}

export default function AIFeedbackCollector({
  actionType,
  actionId,
  suggestionData,
  context,
  onFeedbackSubmitted,
  onClose,
  autoShow = true,
  compact = false
}: FeedbackCollectorProps) {
  const [showFeedback, setShowFeedback] = useState(autoShow)
  const [feedbackStep, setFeedbackStep] = useState<'initial' | 'detailed' | 'submitted'>('initial')
  const [rating, setRating] = useState<number | null>(null)
  const [helpful, setHelpful] = useState<boolean | null>(null)
  const [improvementNotes, setImprovementNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Auto-show feedback after a delay for better UX
  useEffect(() => {
    if (autoShow) {
      const timer = setTimeout(() => {
        setShowFeedback(true)
      }, 2000) // Show after 2 seconds
      
      return () => clearTimeout(timer)
    }
  }, [autoShow])

  const submitFeedback = async (feedbackType: 'thumbs_up' | 'thumbs_down' | 'rating' | 'detailed') => {
    setSubmitting(true)
    
    try {
      const feedbackData = {
        action_type: actionType,
        action_id: actionId,
        feedback_type: feedbackType,
        rating: rating,
        helpful: helpful,
        improvement_notes: improvementNotes.trim() || null,
        context: context,
        suggestion_data: suggestionData
      }

      const response = await fetch('/api/ai-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(feedbackData)
      })

      const result = await response.json()

      if (result.success) {
        setFeedbackStep('submitted')
        onFeedbackSubmitted?.(result.data)
        
        // Auto-close after showing success
        setTimeout(() => {
          setShowFeedback(false)
          onClose?.()
        }, 3000)
      } else {
        console.error('Failed to submit feedback:', result.error)
      }
    } catch (error) {
      console.error('Error submitting feedback:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleThumbsUp = () => {
    setHelpful(true)
    submitFeedback('thumbs_up')
  }

  const handleThumbsDown = () => {
    setHelpful(false)
    setFeedbackStep('detailed')
  }

  const handleStarRating = (starRating: number) => {
    setRating(starRating)
    setHelpful(starRating >= 3)
    
    if (starRating < 3) {
      setFeedbackStep('detailed')
    } else {
      submitFeedback('rating')
    }
  }

  const handleDetailedSubmit = () => {
    submitFeedback('detailed')
  }

  const getActionTypeLabel = () => {
    switch (actionType) {
      case 'caption': return 'caption suggestion'
      case 'idea': return 'content idea'
      case 'sentence': return 'sentence suggestion'
      case 'insight': return 'insight'
      case 'search_result': return 'search result'
      default: return 'suggestion'
    }
  }

  if (!showFeedback) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFeedback(true)}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          <MessageCircle className="w-3 h-3 mr-1" />
          Feedback
        </Button>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
        <span className="text-xs text-blue-700">Was this helpful?</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleThumbsUp}
          disabled={submitting}
          className="h-7 w-7 p-0 hover:bg-green-100"
        >
          <ThumbsUp className="w-3 h-3 text-green-600" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleThumbsDown}
          disabled={submitting}
          className="h-7 w-7 p-0 hover:bg-red-100"
        >
          <ThumbsDown className="w-3 h-3 text-red-600" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFeedback(false)}
          className="h-7 w-7 p-0 ml-2"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
    )
  }

  return (
    <Card className="mt-4 border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
      <CardContent className="pt-4">
        {feedbackStep === 'initial' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  Was this {getActionTypeLabel()} helpful? 👍👎
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFeedback(false)}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-3">
              {/* Quick Thumbs Up/Down */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={handleThumbsUp}
                  disabled={submitting}
                  className="flex items-center gap-2 hover:bg-green-100 hover:border-green-300"
                >
                  <ThumbsUp className="w-4 h-4 text-green-600" />
                  Yes, helpful!
                </Button>
                <Button
                  variant="outline"
                  onClick={handleThumbsDown}
                  disabled={submitting}
                  className="flex items-center gap-2 hover:bg-red-100 hover:border-red-300"
                >
                  <ThumbsDown className="w-4 h-4 text-red-600" />
                  Could be better
                </Button>
              </div>

              {/* Star Rating */}
              <div className="text-center">
                <p className="text-xs text-gray-600 mb-2">Or rate it:</p>
                <div className="flex justify-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Button
                      key={star}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStarRating(star)}
                      disabled={submitting}
                      className="h-8 w-8 p-0 hover:bg-yellow-100"
                    >
                      <Star 
                        className={`w-4 h-4 ${rating && rating >= star ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} 
                      />
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {feedbackStep === 'detailed' && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                Want to improve anything about it?
              </span>
            </div>

            <Textarea
              value={improvementNotes}
              onChange={(e) => setImprovementNotes(e.target.value)}
              placeholder="Tell me what could be better... (e.g., 'too long', 'more personal', 'different tone')"
              className="mb-3 text-sm"
              rows={3}
            />

            <div className="flex gap-2">
              <Button
                onClick={handleDetailedSubmit}
                disabled={submitting}
                size="sm"
                className="flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <Sparkles className="w-3 h-3 animate-spin" />
                    Learning...
                  </>
                ) : (
                  <>
                    <Brain className="w-3 h-3" />
                    Help me learn
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setFeedbackStep('initial')}
                disabled={submitting}
                size="sm"
              >
                Back
              </Button>
            </div>
          </div>
        )}

        {feedbackStep === 'submitted' && (
          <div className="text-center">
            <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-green-900 mb-1">
              Thank you for your feedback!
            </p>
            <p className="text-xs text-green-700">
              This helps me learn your preferences and improve future suggestions.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Compact version for inline use
export function CompactFeedbackCollector({
  actionType,
  actionId,
  suggestionData,
  context,
  onFeedbackSubmitted
}: Omit<FeedbackCollectorProps, 'compact'>) {
  return (
    <AIFeedbackCollector
      actionType={actionType}
      actionId={actionId}
      suggestionData={suggestionData}
      context={context}
      onFeedbackSubmitted={onFeedbackSubmitted}
      compact={true}
      autoShow={true}
    />
  )
}

// Hook for easy integration with AI actions
export function useAIFeedback() {
  const [feedbackData, setFeedbackData] = useState<any>(null)

  const collectFeedback = (
    actionType: string,
    actionId: string,
    suggestionData: any,
    context?: string
  ) => {
    return new Promise((resolve) => {
      setFeedbackData({
        actionType,
        actionId,
        suggestionData,
        context,
        onSubmit: (feedback: any) => {
          setFeedbackData(null)
          resolve(feedback)
        }
      })
    })
  }

  const FeedbackComponent = feedbackData ? (
    <AIFeedbackCollector
      actionType={feedbackData.actionType}
      actionId={feedbackData.actionId}
      suggestionData={feedbackData.suggestionData}
      context={feedbackData.context}
      onFeedbackSubmitted={feedbackData.onSubmit}
      onClose={() => setFeedbackData(null)}
    />
  ) : null

  return {
    collectFeedback,
    FeedbackComponent,
    isCollecting: !!feedbackData
  }
} 