"use client"

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Home, 
  ImageIcon, 
  VideoIcon, 
  FileText,
  Wand2,
  Paintbrush,
  Scissors,
  Sparkles,
  ArrowRight,
  Zap,
  Upload,
  Settings,
  ChevronRight,
  Star,
  Clock,
  CheckCircle,
  Plus
} from 'lucide-react'

interface FeatureItem {
  name: string
  description: string
  isNew?: boolean
  isPro?: boolean
}

interface AIToolCard {
  id: string
  title: string
  description: string
  icon: React.ElementType
  color: string
  bgColor: string
  borderColor: string
  features: FeatureItem[]
  popularity?: 'high' | 'medium' | 'low'
  category: 'transform' | 'create' | 'enhance' | 'analyze'
}

const aiStudioCards: AIToolCard[] = [
  {
    id: 'interior-design',
    title: 'Interior Design Studio',
    description: 'Transform any room with AI-powered staging and styling for real estate',
    icon: Home,
    color: 'from-emerald-500 to-teal-500',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    popularity: 'high',
    category: 'transform',
    features: [
      { name: 'Room Transformation', description: 'AI-powered interior design for any space' },
      { name: 'Style Templates', description: '12+ professional design styles' },
      { name: 'Real Estate Staging', description: 'Virtual staging for property photos' },
      { name: 'Before/After Compare', description: 'Interactive comparison slider' },
      { name: 'HD Export', description: 'High-resolution downloads', isPro: true },
      { name: 'Batch Processing', description: 'Multiple rooms at once', isPro: true }
    ]
  },
  {
    id: 'image-tools',
    title: 'Image Enhancement Suite',
    description: 'Professional-grade AI tools for image enhancement and creation',
    icon: ImageIcon,
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    popularity: 'high',
    category: 'enhance',
    features: [
      { name: 'AI Upscaling', description: 'Enhance resolution up to 4x', isNew: true },
      { name: 'Background Removal', description: 'One-click background removal' },
      { name: 'Smart Cropping', description: 'AI-powered composition optimization' },
      { name: 'Image Generation', description: 'Create images from text prompts' },
      { name: 'Batch Enhancement', description: 'Process multiple images', isPro: true },
      { name: 'Professional Filters', description: 'Real estate optimized filters', isPro: true }
    ]
  },
  {
    id: 'video-tools',
    title: 'Video Creation Suite',
    description: 'Cut, enhance, and create videos automatically with AI assistance',
    icon: VideoIcon,
    color: 'from-purple-500 to-violet-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    popularity: 'medium',
    category: 'create',
    features: [
      { name: 'Auto Video Cutting', description: 'Submagic-style smart editing', isNew: true },
      { name: 'Subtitle Generation', description: 'Auto-generated captions in multiple languages' },
      { name: 'Property Tours', description: 'Create virtual property walkthroughs' },
      { name: 'Social Media Clips', description: 'Platform-optimized video formats' },
      { name: 'Music & Sound', description: 'Royalty-free audio library', isPro: true },
      { name: 'Custom Branding', description: 'Add your logo and branding', isPro: true }
    ]
  },
  {
    id: 'content-creation',
    title: 'Content Creation Hub',
    description: 'Generate engaging content with AI assistance and trend analysis',
    icon: FileText,
    color: 'from-amber-500 to-orange-500',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    popularity: 'high',
    category: 'create',
    features: [
      { name: 'Content Ideas', description: 'AI-powered brainstorming and ideation' },
      { name: 'Social Media Posts', description: 'Platform-specific content generation' },
      { name: 'Trend Analysis', description: 'Real-time trending topics integration' },
      { name: 'Multi-Platform', description: 'Optimize for all social platforms' },
      { name: 'Content Calendar', description: 'Schedule and plan content', isPro: true },
      { name: 'Performance Analytics', description: 'Track content performance', isPro: true }
    ]
  }
]

interface AIStudioCardProps {
  card: AIToolCard
  onClick?: (cardId: string) => void
  isSelected?: boolean
  showFullFeatures?: boolean
}

export function AIStudioCard({ card, onClick, isSelected = false, showFullFeatures = false }: AIStudioCardProps) {
  const handleClick = () => {
    onClick?.(card.id)
  }

  const getPopularityBadge = () => {
    switch (card.popularity) {
      case 'high':
        return (
          <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">
            <Star className="w-3 h-3 mr-1" />
            Popular
          </Badge>
        )
      case 'medium':
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
            <Clock className="w-3 h-3 mr-1" />
            Growing
          </Badge>
        )
      default:
        return null
    }
  }

  const getCategoryBadge = () => {
    const categories = {
      transform: { label: 'Transform', color: 'bg-purple-100 text-purple-700 border-purple-200' },
      create: { label: 'Create', color: 'bg-blue-100 text-blue-700 border-blue-200' },
      enhance: { label: 'Enhance', color: 'bg-green-100 text-green-700 border-green-200' },
      analyze: { label: 'Analyze', color: 'bg-orange-100 text-orange-700 border-orange-200' }
    }

    const category = categories[card.category]
    return (
      <Badge variant="outline" className={category.color}>
        {category.label}
      </Badge>
    )
  }

  const featuresToShow = showFullFeatures ? card.features : card.features.slice(0, 4)

  return (
    <Card 
      className={`${card.borderColor} ${card.bgColor} border-2 hover:shadow-lg transition-all duration-300 cursor-pointer group hover:scale-105 ${
        isSelected ? 'ring-2 ring-teal-500 shadow-lg' : ''
      }`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`Select ${card.title} - ${card.description}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
    >      <CardContent className="p-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 bg-gradient-to-r ${card.color} rounded-full flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <card.icon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{card.title}</h3>
                <p className="text-gray-600 text-sm">{card.description}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {getPopularityBadge()}
              {getCategoryBadge()}
            </div>
          </div>

          {/* Features List */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Key Features</h4>
            <div className="grid grid-cols-1 gap-2">
              {featuresToShow.map((feature, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                    <div className="flex-1">
                      <span className="text-sm text-gray-700 font-medium">{feature.name}</span>
                      {showFullFeatures && (
                        <p className="text-xs text-gray-500 mt-1">{feature.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {feature.isNew && (
                      <Badge variant="default" className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                        New
                      </Badge>
                    )}
                    {feature.isPro && (
                      <Badge variant="default" className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                        Pro
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              {!showFullFeatures && card.features.length > 4 && (
                <div className="flex items-center gap-3 text-gray-500">
                  <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                  <span className="text-sm">+{card.features.length - 4} more features</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Button */}
          <Button 
            className={`w-full bg-gradient-to-r ${card.color} hover:opacity-90 text-white group-hover:shadow-lg transition-all`}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Get Started
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Quick Action Cards for top section
interface QuickAction {
  icon: React.ElementType
  label: string
  description: string
  action: string
  color: string
}

const quickActionCards: QuickAction[] = [
  {
    icon: Zap,
    label: 'Enhance',
    description: 'Improve image quality',
    action: 'image-tools',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    icon: Wand2,
    label: 'Create',
    description: 'Generate new content',
    action: 'content-creation',
    color: 'from-amber-500 to-orange-500'
  },
  {
    icon: Scissors,
    label: 'Cut',
    description: 'Edit videos smartly',
    action: 'video-tools',
    color: 'from-purple-500 to-violet-500'
  },
  {
    icon: Paintbrush,
    label: 'Design',
    description: 'Transform interiors',
    action: 'interior-design',
    color: 'from-emerald-500 to-teal-500'
  }
]

interface QuickActionProps {
  action: QuickAction
  onClick?: (action: string) => void
}

export function QuickActionButton({ action, onClick }: QuickActionProps) {
  return (
    <Button
      variant="outline"
      className="h-20 flex flex-col gap-2 hover:bg-teal-50 hover:border-teal-300 group transition-all duration-300 p-4"
      onClick={() => onClick?.(action.action)}
    >
      <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${action.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
        <action.icon className="w-4 h-4 text-white" />
      </div>
      <div className="text-center">
        <span className="text-sm font-medium text-gray-900">{action.label}</span>
        <p className="text-xs text-gray-500">{action.description}</p>
      </div>
    </Button>
  )
}

// Feature Comparison Component
interface FeatureComparisonProps {
  showComparison?: boolean
}

export function FeatureComparison({ showComparison = false }: FeatureComparisonProps) {
  if (!showComparison) return null

  // Dynamically extract all unique features from aiStudioCards
  const allFeatures = new Set<string>()
  aiStudioCards.forEach(card => {
    card.features.forEach(feature => {
      allFeatures.add(feature.name)
    })
  })
  
  // Convert to array and sort for consistent display
  const dynamicFeatures = Array.from(allFeatures).sort()

  return (
    <Card className="border-2 border-gray-200">
      <CardContent className="p-8">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Feature Comparison</h3>
          <p className="text-gray-600">Compare AI Studio features across different tools</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left p-4 font-semibold text-gray-900">Feature</th>
                {aiStudioCards.map((card) => (
                  <th key={card.id} className="text-center p-4 font-semibold text-gray-900">
                    <div className="flex flex-col items-center gap-2">
                      <card.icon className="w-6 h-6 text-gray-600" />
                      <span className="text-sm">{card.title.split(' ')[0]}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dynamicFeatures.map((feature) => (
                <tr key={feature} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4 font-medium text-gray-900">{feature}</td>
                  {aiStudioCards.map((card) => {
                    const hasFeature = card.features.some(f => f.name === feature)
                    return (
                      <td key={`${card.id}-${feature}`} className="text-center p-4">
                        {hasFeature ? (
                          <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                        ) : (
                          <div className="w-5 h-5 mx-auto"></div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

// Export all cards and components
export {
  aiStudioCards,
  quickActionCards,
  type AIToolCard,
  type QuickAction,
  type FeatureItem
} 