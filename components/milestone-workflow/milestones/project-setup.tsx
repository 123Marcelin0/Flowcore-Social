"use client"

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { EnhancedLiquidGlass } from '@/components/ui/enhanced-liquid-glass'
import { 
  Video, 
  Image, 
  FileText, 
  Presentation,
  Instagram,
  Youtube,
  Facebook,
  Twitter,
  Music,
  Linkedin,
  Settings,
  Check,
  AlertCircle
} from 'lucide-react'

export interface ProjectType {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  features: string[]
}

export interface Platform {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  aspectRatio: string
  maxDuration?: string
  recommended: boolean
}

export interface ProjectSettings {
  name: string
  description: string
  tags: string[]
  quality: 'draft' | 'standard' | 'high' | 'premium'
  privacy: 'private' | 'unlisted' | 'public'
}

export interface ProjectSetupData {
  projectType: string | null
  platforms: string[]
  settings: ProjectSettings
}

export interface ProjectSetupProps {
  initialData?: Partial<ProjectSetupData>
  onDataChange: (data: ProjectSetupData) => void
  onValidationChange: (isValid: boolean, errors: string[]) => void
  className?: string
}

const PROJECT_TYPES: ProjectType[] = [
  {
    id: 'video',
    name: 'Video Content',
    description: 'Create engaging video content with advanced editing tools',
    icon: Video,
    features: ['Timeline editing', 'Transitions', 'Audio sync', 'Effects']
  },
  {
    id: 'slideshow',
    name: 'Photo Slideshow',
    description: 'Transform photos into dynamic slideshows',
    icon: Image,
    features: ['Photo transitions', 'Music sync', 'Text overlays', 'Ken Burns effect']
  },
  {
    id: 'story',
    name: 'Story Content',
    description: 'Create vertical stories for social media',
    icon: FileText,
    features: ['Vertical format', 'Quick templates', 'Text animations', 'Stickers']
  },
  {
    id: 'presentation',
    name: 'Presentation',
    description: 'Professional presentations with motion graphics',
    icon: Presentation,
    features: ['Slide transitions', 'Charts & graphs', 'Professional templates', 'Voiceover']
  }
]

const PLATFORMS: Platform[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    icon: Youtube,
    aspectRatio: '16:9',
    maxDuration: '60 min',
    recommended: true
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    aspectRatio: '1:1 / 9:16',
    maxDuration: '60 sec',
    recommended: true
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: Music,
    aspectRatio: '9:16',
    maxDuration: '10 min',
    recommended: true
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: Facebook,
    aspectRatio: '16:9 / 1:1',
    maxDuration: '240 min',
    recommended: false
  },
  {
    id: 'twitter',
    name: 'Twitter',
    icon: Twitter,
    aspectRatio: '16:9',
    maxDuration: '140 sec',
    recommended: false
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: Linkedin,
    aspectRatio: '16:9',
    maxDuration: '10 min',
    recommended: false
  }
]

export function ProjectSetup({
  initialData,
  onDataChange,
  onValidationChange,
  className
}: ProjectSetupProps) {
  const [projectType, setProjectType] = useState<string | null>(
    initialData?.projectType || null
  )
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(
    initialData?.platforms || []
  )
  const [settings, setSettings] = useState<ProjectSettings>(
    initialData?.settings || {
      name: '',
      description: '',
      tags: [],
      quality: 'standard',
      privacy: 'private'
    }
  )
  const [errors, setErrors] = useState<string[]>([])

  // Validation logic
  React.useEffect(() => {
    const newErrors: string[] = []
    
    if (!projectType) {
      newErrors.push('Please select a project type')
    }
    
    if (selectedPlatforms.length === 0) {
      newErrors.push('Please select at least one platform')
    }
    
    if (!settings.name.trim()) {
      newErrors.push('Project name is required')
    }
    
    if (settings.name.length > 100) {
      newErrors.push('Project name must be less than 100 characters')
    }

    setErrors(newErrors)
    onValidationChange(newErrors.length === 0, newErrors)
  }, [projectType, selectedPlatforms, settings, onValidationChange])

  // Data change handler
  React.useEffect(() => {
    onDataChange({
      projectType,
      platforms: selectedPlatforms,
      settings
    })
  }, [projectType, selectedPlatforms, settings, onDataChange])

  const handleProjectTypeSelect = (typeId: string) => {
    setProjectType(typeId)
  }

  const handlePlatformToggle = (platformId: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId)
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    )
  }

  const handleSettingsChange = (key: keyof ProjectSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleTagAdd = (tag: string) => {
    if (tag.trim() && !settings.tags.includes(tag.trim())) {
      handleSettingsChange('tags', [...settings.tags, tag.trim()])
    }
  }

  const handleTagRemove = (tagToRemove: string) => {
    handleSettingsChange('tags', settings.tags.filter(tag => tag !== tagToRemove))
  }

  return (
    <div className={cn('space-y-8', className)}>
      {/* Project Type Selection */}
      <section>
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-white/90 mb-2">
            Choose Project Type
          </h3>
          <p className="text-sm text-white/60">
            Select the type of content you want to create
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PROJECT_TYPES.map((type) => {
            const isSelected = projectType === type.id
            const Icon = type.icon

            return (
              <motion.div
                key={type.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <EnhancedLiquidGlass
                  variant="editor"
                  intensity={isSelected ? "premium" : "medium"}
                  animation="hover"
                  gradient={isSelected}
                  borderGlow={isSelected}
                  className={cn(
                    'cursor-pointer transition-all duration-300',
                    isSelected && 'ring-2 ring-blue-400/30'
                  )}
                  onClick={() => handleProjectTypeSelect(type.id)}
                >
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        'flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-300',
                        isSelected 
                          ? 'bg-blue-500/20 text-blue-300' 
                          : 'bg-white/10 text-white/60'
                      )}>
                        <Icon className="w-6 h-6" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className={cn(
                            'font-semibold transition-colors duration-300',
                            isSelected ? 'text-white/95' : 'text-white/80'
                          )}>
                            {type.name}
                          </h4>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="text-green-400"
                            >
                              <Check className="w-4 h-4" />
                            </motion.div>
                          )}
                        </div>
                        
                        <p className={cn(
                          'text-sm mb-3 transition-colors duration-300',
                          isSelected ? 'text-white/70' : 'text-white/50'
                        )}>
                          {type.description}
                        </p>
                        
                        <div className="flex flex-wrap gap-2">
                          {type.features.map((feature) => (
                            <span
                              key={feature}
                              className={cn(
                                'px-2 py-1 text-xs rounded-full border transition-all duration-300',
                                isSelected
                                  ? 'bg-blue-500/10 border-blue-400/30 text-blue-300'
                                  : 'bg-white/5 border-white/20 text-white/50'
                              )}
                            >
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </EnhancedLiquidGlass>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* Platform Selection */}
      <section>
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-white/90 mb-2">
            Select Platforms
          </h3>
          <p className="text-sm text-white/60">
            Choose where you'll publish your content (you can select multiple)
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {PLATFORMS.map((platform) => {
            const isSelected = selectedPlatforms.includes(platform.id)
            const Icon = platform.icon

            return (
              <motion.div
                key={platform.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <EnhancedLiquidGlass
                  variant="timeline"
                  intensity={isSelected ? "strong" : "medium"}
                  animation="hover"
                  className={cn(
                    'cursor-pointer transition-all duration-300 relative',
                    isSelected && 'ring-2 ring-purple-400/30'
                  )}
                  onClick={() => handlePlatformToggle(platform.id)}
                >
                  <div className="p-4">
                    {/* Recommended Badge */}
                    {platform.recommended && (
                      <div className="absolute -top-2 -right-2">
                        <span className="px-2 py-1 text-xs font-medium bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-400/30 text-yellow-300 rounded-full">
                          Popular
                        </span>
                      </div>
                    )}

                    <div className="flex flex-col items-center text-center gap-3">
                      <div className={cn(
                        'flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-300',
                        isSelected 
                          ? 'bg-purple-500/20 text-purple-300' 
                          : 'bg-white/10 text-white/60'
                      )}>
                        <Icon className="w-5 h-5" />
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={cn(
                            'font-medium text-sm transition-colors duration-300',
                            isSelected ? 'text-white/95' : 'text-white/80'
                          )}>
                            {platform.name}
                          </h4>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="text-green-400"
                            >
                              <Check className="w-3 h-3" />
                            </motion.div>
                          )}
                        </div>
                        
                        <div className="text-xs text-white/50 space-y-1">
                          <div>{platform.aspectRatio}</div>
                          {platform.maxDuration && (
                            <div>Max: {platform.maxDuration}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </EnhancedLiquidGlass>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* Project Settings */}
      <section>
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-white/90 mb-2 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Project Settings
          </h3>
          <p className="text-sm text-white/60">
            Configure your project details and preferences
          </p>
        </div>

        <EnhancedLiquidGlass
          variant="editor"
          intensity="medium"
          className="p-6"
        >
          <div className="space-y-6">
            {/* Project Name */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Project Name *
              </label>
              <input
                type="text"
                value={settings.name}
                onChange={(e) => handleSettingsChange('name', e.target.value)}
                placeholder="Enter your project name..."
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white/90 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400/50 transition-all duration-300"
                maxLength={100}
              />
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-white/40">
                  This will be the name of your project
                </span>
                <span className="text-xs text-white/40">
                  {settings.name.length}/100
                </span>
              </div>
            </div>

            {/* Project Description */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Description
              </label>
              <textarea
                value={settings.description}
                onChange={(e) => handleSettingsChange('description', e.target.value)}
                placeholder="Describe your project (optional)..."
                rows={3}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white/90 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400/50 transition-all duration-300 resize-none"
                maxLength={500}
              />
              <span className="text-xs text-white/40 mt-1 block">
                {settings.description.length}/500
              </span>
            </div>

            {/* Quality Setting */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-3">
                Output Quality
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { id: 'draft', name: 'Draft', desc: 'Fast preview' },
                  { id: 'standard', name: 'Standard', desc: '720p quality' },
                  { id: 'high', name: 'High', desc: '1080p quality' },
                  { id: 'premium', name: 'Premium', desc: '4K quality' }
                ].map((quality) => (
                  <motion.button
                    key={quality.id}
                    onClick={() => handleSettingsChange('quality', quality.id)}
                    className={cn(
                      'p-3 rounded-lg border text-left transition-all duration-300',
                      settings.quality === quality.id
                        ? 'bg-blue-500/20 border-blue-400/50 text-blue-300'
                        : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'
                    )}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="font-medium text-sm">{quality.name}</div>
                    <div className="text-xs opacity-70">{quality.desc}</div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Privacy Setting */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-3">
                Privacy
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { id: 'private', name: 'Private', desc: 'Only you can see' },
                  { id: 'unlisted', name: 'Unlisted', desc: 'Link sharing only' },
                  { id: 'public', name: 'Public', desc: 'Everyone can see' }
                ].map((privacy) => (
                  <motion.button
                    key={privacy.id}
                    onClick={() => handleSettingsChange('privacy', privacy.id)}
                    className={cn(
                      'p-3 rounded-lg border text-left transition-all duration-300',
                      settings.privacy === privacy.id
                        ? 'bg-purple-500/20 border-purple-400/50 text-purple-300'
                        : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'
                    )}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="font-medium text-sm">{privacy.name}</div>
                    <div className="text-xs opacity-70">{privacy.desc}</div>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </EnhancedLiquidGlass>
      </section>

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
    </div>
  )
}