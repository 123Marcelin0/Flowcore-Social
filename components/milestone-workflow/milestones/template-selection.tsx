"use client"

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { EnhancedLiquidGlass } from '@/components/ui/enhanced-liquid-glass'
import { 
  Search,
  Filter,
  Grid3X3,
  List,
  Play,
  Heart,
  Star,
  Clock,
  Users,
  Palette,
  Sparkles,
  Crown,
  Check,
  Eye,
  Download,
  Wand2,
  AlertCircle,
  X
} from 'lucide-react'

export interface Template {
  id: string
  name: string
  description: string
  category: string
  platform: string[]
  thumbnailUrl: string
  previewUrl?: string
  duration: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  isPremium: boolean
  isPopular: boolean
  rating: number
  usageCount: number
  tags: string[]
  colors: string[]
  style: 'modern' | 'classic' | 'minimal' | 'bold' | 'elegant' | 'playful'
  customizable: {
    colors: boolean
    fonts: boolean
    music: boolean
    transitions: boolean
  }
}

export interface TemplateSelectionData {
  selectedTemplate: Template | null
  customizations: {
    primaryColor?: string
    secondaryColor?: string
    fontFamily?: string
    musicTrack?: string
    transitionStyle?: string
  }
}

export interface TemplateSelectionProps {
  initialData?: Partial<TemplateSelectionData>
  onDataChange: (data: TemplateSelectionData) => void
  onValidationChange: (isValid: boolean, errors: string[]) => void
  projectType?: string
  selectedPlatforms?: string[]
  className?: string
}

const TEMPLATE_CATEGORIES = [
  { id: 'all', name: 'All Templates', icon: Grid3X3 },
  { id: 'business', name: 'Business', icon: Users },
  { id: 'social', name: 'Social Media', icon: Heart },
  { id: 'education', name: 'Education', icon: Star },
  { id: 'entertainment', name: 'Entertainment', icon: Play },
  { id: 'marketing', name: 'Marketing', icon: Sparkles },
  { id: 'personal', name: 'Personal', icon: Palette }
]

const SORT_OPTIONS = [
  { id: 'popular', name: 'Most Popular' },
  { id: 'recent', name: 'Recently Added' },
  { id: 'rating', name: 'Highest Rated' },
  { id: 'duration', name: 'Duration' },
  { id: 'name', name: 'Name A-Z' }
]

const MOCK_TEMPLATES: Template[] = [
  {
    id: 'modern-intro',
    name: 'Modern Business Intro',
    description: 'Clean and professional introduction template perfect for corporate presentations',
    category: 'business',
    platform: ['youtube', 'linkedin', 'facebook'],
    thumbnailUrl: '/placeholder.jpg',
    previewUrl: '/placeholder-video.mp4',
    duration: 15,
    difficulty: 'beginner',
    isPremium: false,
    isPopular: true,
    rating: 4.8,
    usageCount: 12500,
    tags: ['corporate', 'clean', 'professional', 'intro'],
    colors: ['#2563eb', '#1e40af', '#ffffff'],
    style: 'modern',
    customizable: {
      colors: true,
      fonts: true,
      music: true,
      transitions: false
    }
  },
  {
    id: 'social-story',
    name: 'Instagram Story Pack',
    description: 'Trendy vertical templates designed specifically for Instagram stories',
    category: 'social',
    platform: ['instagram', 'tiktok'],
    thumbnailUrl: '/placeholder.jpg',
    previewUrl: '/placeholder-video.mp4',
    duration: 10,
    difficulty: 'beginner',
    isPremium: true,
    isPopular: true,
    rating: 4.9,
    usageCount: 8900,
    tags: ['vertical', 'trendy', 'social', 'story'],
    colors: ['#ec4899', '#f97316', '#eab308'],
    style: 'playful',
    customizable: {
      colors: true,
      fonts: true,
      music: true,
      transitions: true
    }
  },
  {
    id: 'minimal-slideshow',
    name: 'Minimal Photo Slideshow',
    description: 'Elegant and clean slideshow template with smooth transitions',
    category: 'personal',
    platform: ['youtube', 'facebook', 'instagram'],
    thumbnailUrl: '/placeholder.jpg',
    duration: 30,
    difficulty: 'intermediate',
    isPremium: false,
    isPopular: false,
    rating: 4.6,
    usageCount: 5600,
    tags: ['minimal', 'clean', 'photos', 'slideshow'],
    colors: ['#64748b', '#f8fafc', '#1e293b'],
    style: 'minimal',
    customizable: {
      colors: true,
      fonts: false,
      music: true,
      transitions: true
    }
  },
  {
    id: 'educational-explainer',
    name: 'Educational Explainer',
    description: 'Perfect for tutorials and educational content with clear visual hierarchy',
    category: 'education',
    platform: ['youtube', 'linkedin'],
    thumbnailUrl: '/placeholder.jpg',
    duration: 45,
    difficulty: 'advanced',
    isPremium: true,
    isPopular: false,
    rating: 4.7,
    usageCount: 3200,
    tags: ['education', 'tutorial', 'explainer', 'professional'],
    colors: ['#059669', '#10b981', '#ffffff'],
    style: 'classic',
    customizable: {
      colors: true,
      fonts: true,
      music: false,
      transitions: true
    }
  }
]

const COLOR_PRESETS = [
  { name: 'Ocean Blue', colors: ['#0ea5e9', '#0284c7', '#0369a1'] },
  { name: 'Sunset Orange', colors: ['#f97316', '#ea580c', '#dc2626'] },
  { name: 'Forest Green', colors: ['#059669', '#047857', '#065f46'] },
  { name: 'Royal Purple', colors: ['#7c3aed', '#6d28d9', '#5b21b6'] },
  { name: 'Rose Pink', colors: ['#ec4899', '#db2777', '#be185d'] },
  { name: 'Monochrome', colors: ['#374151', '#6b7280', '#9ca3af'] }
]

const FONT_OPTIONS = [
  { id: 'inter', name: 'Inter', preview: 'Modern & Clean' },
  { id: 'poppins', name: 'Poppins', preview: 'Friendly & Round' },
  { id: 'playfair', name: 'Playfair Display', preview: 'Elegant & Serif' },
  { id: 'roboto', name: 'Roboto', preview: 'Professional' },
  { id: 'montserrat', name: 'Montserrat', preview: 'Bold & Strong' }
]

export function TemplateSelection({
  initialData,
  onDataChange,
  onValidationChange,
  projectType,
  selectedPlatforms = [],
  className
}: TemplateSelectionProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    initialData?.selectedTemplate || null
  )
  const [customizations, setCustomizations] = useState(
    initialData?.customizations || {}
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState('popular')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showPreview, setShowPreview] = useState<Template | null>(null)
  const [showCustomization, setShowCustomization] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  // Filter and sort templates
  const filteredTemplates = useMemo(() => {
    let filtered = MOCK_TEMPLATES

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category === selectedCategory)
    }

    // Filter by platform compatibility
    if (selectedPlatforms.length > 0) {
      filtered = filtered.filter(template =>
        template.platform.some(platform => selectedPlatforms.includes(platform))
      )
    }

    // Sort templates
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return b.usageCount - a.usageCount
        case 'recent':
          return b.id.localeCompare(a.id) // Mock recent sorting
        case 'rating':
          return b.rating - a.rating
        case 'duration':
          return a.duration - b.duration
        case 'name':
          return a.name.localeCompare(b.name)
        default:
          return 0
      }
    })

    return filtered
  }, [searchQuery, selectedCategory, selectedPlatforms, sortBy])

  // Validation logic
  React.useEffect(() => {
    const newErrors: string[] = []
    
    if (!selectedTemplate) {
      newErrors.push('Please select a template')
    }

    setErrors(newErrors)
    onValidationChange(newErrors.length === 0, newErrors)
  }, [selectedTemplate, onValidationChange])

  // Data change handler
  React.useEffect(() => {
    onDataChange({
      selectedTemplate,
      customizations
    })
  }, [selectedTemplate, customizations, onDataChange])

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template)
    setShowCustomization(true)
  }

  const handleCustomizationChange = (key: string, value: string) => {
    setCustomizations(prev => ({ ...prev, [key]: value }))
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  const getDifficultyColor = (difficulty: Template['difficulty']) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-300'
      case 'intermediate': return 'text-yellow-300'
      case 'advanced': return 'text-red-300'
    }
  }

  const TemplateCard = ({ template }: { template: Template }) => {
    const isSelected = selectedTemplate?.id === template.id

    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="relative"
      >
        <EnhancedLiquidGlass
          variant="editor"
          intensity={isSelected ? "premium" : "medium"}
          animation="hover"
          gradient={isSelected}
          borderGlow={isSelected}
          className={cn(
            'cursor-pointer transition-all duration-300 group',
            isSelected && 'ring-2 ring-blue-400/30'
          )}
          onClick={() => handleTemplateSelect(template)}
        >
          <div className="p-4">
            {/* Template Preview */}
            <div className="relative mb-4">
              <div className="aspect-video bg-white/5 rounded-lg overflow-hidden">
                <img
                  src={template.thumbnailUrl}
                  alt={template.name}
                  className="w-full h-full object-cover"
                />
                
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className="flex gap-2">
                    <motion.button
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowPreview(template)
                      }}
                      className="w-10 h-10 bg-white/20 border border-white/30 rounded-full flex items-center justify-center text-white hover:bg-white/30"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Play className="w-4 h-4" />
                    </motion.button>
                    
                    <motion.button
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowPreview(template)
                      }}
                      className="w-10 h-10 bg-white/20 border border-white/30 rounded-full flex items-center justify-center text-white hover:bg-white/30"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Eye className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Badges */}
              <div className="absolute top-2 left-2 flex gap-1">
                {template.isPremium && (
                  <span className="px-2 py-1 text-xs font-medium bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-400/30 text-yellow-300 rounded-full flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    Premium
                  </span>
                )}
                {template.isPopular && (
                  <span className="px-2 py-1 text-xs font-medium bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-400/30 text-pink-300 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Popular
                  </span>
                )}
              </div>

              {/* Selection Indicator */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 w-6 h-6 bg-green-500/20 border border-green-400/60 rounded-full flex items-center justify-center"
                >
                  <Check className="w-4 h-4 text-green-300" />
                </motion.div>
              )}
            </div>

            {/* Template Info */}
            <div>
              <div className="flex items-start justify-between mb-2">
                <h4 className={cn(
                  'font-semibold text-sm transition-colors duration-300',
                  isSelected ? 'text-white/95' : 'text-white/80'
                )}>
                  {template.name}
                </h4>
                
                <div className="flex items-center gap-1 text-xs text-yellow-300">
                  <Star className="w-3 h-3 fill-current" />
                  {template.rating}
                </div>
              </div>

              <p className={cn(
                'text-xs mb-3 line-clamp-2 transition-colors duration-300',
                isSelected ? 'text-white/70' : 'text-white/50'
              )}>
                {template.description}
              </p>

              {/* Metadata */}
              <div className="flex items-center justify-between text-xs text-white/60">
                <div className="flex items-center gap-2">
                  <span className={getDifficultyColor(template.difficulty)}>
                    {template.difficulty}
                  </span>
                  <span>•</span>
                  <span>{formatDuration(template.duration)}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <Download className="w-3 h-3" />
                  {template.usageCount.toLocaleString()}
                </div>
              </div>

              {/* Color Palette */}
              <div className="flex items-center gap-1 mt-2">
                {template.colors.slice(0, 3).map((color, index) => (
                  <div
                    key={index}
                    className="w-4 h-4 rounded-full border border-white/20"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
        </EnhancedLiquidGlass>
      </motion.div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header and Search */}
      <section>
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-white/90 mb-2">
            Choose a Template
          </h3>
          <p className="text-sm text-white/60">
            Select a template that matches your project style and customize it to your needs
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white/90 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400/50 transition-all duration-300"
            />
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white/90 focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400/50 transition-all duration-300"
          >
            {SORT_OPTIONS.map(option => (
              <option key={option.id} value={option.id} className="bg-gray-800">
                {option.name}
              </option>
            ))}
          </select>

          {/* View Mode */}
          <div className="flex bg-white/10 border border-white/20 rounded-xl p-1">
            <motion.button
              onClick={() => setViewMode('grid')}
              className={cn(
                'px-3 py-2 rounded-lg transition-all duration-300',
                viewMode === 'grid' 
                  ? 'bg-white/20 text-white/90' 
                  : 'text-white/60 hover:text-white/80'
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Grid3X3 className="w-4 h-4" />
            </motion.button>
            <motion.button
              onClick={() => setViewMode('list')}
              className={cn(
                'px-3 py-2 rounded-lg transition-all duration-300',
                viewMode === 'list' 
                  ? 'bg-white/20 text-white/90' 
                  : 'text-white/60 hover:text-white/80'
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <List className="w-4 h-4" />
            </motion.button>
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2 mb-6">
          {TEMPLATE_CATEGORIES.map(category => {
            const Icon = category.icon
            const isActive = selectedCategory === category.id
            
            return (
              <motion.button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-300',
                  isActive
                    ? 'bg-blue-500/20 border-blue-400/50 text-blue-300'
                    : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon className="w-4 h-4" />
                {category.name}
              </motion.button>
            )
          })}
        </div>
      </section>

      {/* Templates Grid */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-lg font-semibold text-white/90">
            Templates ({filteredTemplates.length})
          </h4>
          {selectedTemplate && (
            <motion.button
              onClick={() => setShowCustomization(!showCustomization)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-400/50 text-purple-300 rounded-xl hover:bg-purple-500/30 transition-all duration-300"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Wand2 className="w-4 h-4" />
              Customize
            </motion.button>
          )}
        </div>

        {filteredTemplates.length === 0 ? (
          <EnhancedLiquidGlass
            variant="timeline"
            intensity="medium"
            className="p-12 text-center"
          >
            <div className="text-white/60">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h4 className="text-lg font-medium mb-2">No templates found</h4>
              <p className="text-sm">
                Try adjusting your search criteria or browse different categories
              </p>
            </div>
          </EnhancedLiquidGlass>
        ) : (
          <div className={cn(
            viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-4'
          )}>
            <AnimatePresence>
              {filteredTemplates.map((template) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <TemplateCard template={template} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* Customization Panel */}
      <AnimatePresence>
        {showCustomization && selectedTemplate && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <EnhancedLiquidGlass
              variant="editor"
              intensity="medium"
              className="p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-lg font-semibold text-white/90 flex items-center gap-2">
                  <Wand2 className="w-5 h-5" />
                  Customize Template
                </h4>
                <motion.button
                  onClick={() => setShowCustomization(false)}
                  className="w-8 h-8 bg-white/10 border border-white/20 rounded-full flex items-center justify-center text-white/60 hover:bg-white/20"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Color Customization */}
                {selectedTemplate.customizable.colors && (
                  <div>
                    <h5 className="text-sm font-medium text-white/80 mb-3">
                      Color Scheme
                    </h5>
                    <div className="grid grid-cols-2 gap-3">
                      {COLOR_PRESETS.map((preset) => (
                        <motion.button
                          key={preset.name}
                          onClick={() => handleCustomizationChange('primaryColor', preset.colors[0])}
                          className={cn(
                            'p-3 rounded-lg border text-left transition-all duration-300',
                            customizations.primaryColor === preset.colors[0]
                              ? 'bg-blue-500/20 border-blue-400/50'
                              : 'bg-white/5 border-white/20 hover:bg-white/10'
                          )}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            {preset.colors.map((color, index) => (
                              <div
                                key={index}
                                className="w-4 h-4 rounded-full border border-white/20"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                          <div className="text-xs text-white/70">{preset.name}</div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Font Customization */}
                {selectedTemplate.customizable.fonts && (
                  <div>
                    <h5 className="text-sm font-medium text-white/80 mb-3">
                      Typography
                    </h5>
                    <div className="space-y-2">
                      {FONT_OPTIONS.map((font) => (
                        <motion.button
                          key={font.id}
                          onClick={() => handleCustomizationChange('fontFamily', font.id)}
                          className={cn(
                            'w-full p-3 rounded-lg border text-left transition-all duration-300',
                            customizations.fontFamily === font.id
                              ? 'bg-purple-500/20 border-purple-400/50'
                              : 'bg-white/5 border-white/20 hover:bg-white/10'
                          )}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                        >
                          <div className="font-medium text-sm text-white/90">{font.name}</div>
                          <div className="text-xs text-white/60">{font.preview}</div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </EnhancedLiquidGlass>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Validation Errors */}
      <AnimatePresence>
        {errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <EnhancedLiquidGlass
              variant="timeline"
              intensity="medium"
              className="p-4 border-red-400/30"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-red-300 mb-2">
                    Please fix the following issues:
                  </h4>
                  <ul className="space-y-1">
                    {errors.map((error, index) => (
                      <li key={index} className="text-sm text-red-200/80">
                        • {error}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </EnhancedLiquidGlass>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Template Preview Modal */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowPreview(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="max-w-4xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <EnhancedLiquidGlass
                variant="modal"
                intensity="premium"
                className="p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white/90">
                      {showPreview.name}
                    </h3>
                    <p className="text-sm text-white/60">
                      {showPreview.description}
                    </p>
                  </div>
                  <motion.button
                    onClick={() => setShowPreview(null)}
                    className="w-8 h-8 bg-white/10 border border-white/20 rounded-full flex items-center justify-center text-white/80 hover:bg-white/20"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                </div>
                
                <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
                  <img
                    src={showPreview.thumbnailUrl}
                    alt={showPreview.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-white/60">
                    <span>Duration: {formatDuration(showPreview.duration)}</span>
                    <span>•</span>
                    <span className={getDifficultyColor(showPreview.difficulty)}>
                      {showPreview.difficulty}
                    </span>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current text-yellow-300" />
                      {showPreview.rating}
                    </div>
                  </div>

                  <motion.button
                    onClick={() => {
                      handleTemplateSelect(showPreview)
                      setShowPreview(null)
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-xl text-white/90 font-medium hover:from-blue-500/30 hover:to-purple-500/30 hover:border-blue-400/50 transition-all duration-300"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Use This Template
                  </motion.button>
                </div>
              </EnhancedLiquidGlass>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}