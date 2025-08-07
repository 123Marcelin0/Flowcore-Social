"use client"

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Sparkles, 
  Upload, 
  Home, 
  ImageIcon, 
  VideoIcon, 
  FileText,
  Wand2,
  Settings,
  ArrowRight,
  Zap,
  Scissors,
  Paintbrush,
  MessageSquare,
  Clock,
  Folder,
  Plus,
  Loader2,
  CheckCircle,
  X,

} from 'lucide-react'
import { InteriorDesignWorkflow } from './interior-design-workflow'
import { AIStudioVideoGenerator } from './ai-studio-video-generator'
import { AIProjectManager, type AIProject } from './ai-project-manager'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'

interface UploadedFile {
  id: string
  file: File
  url: string
  type: 'image' | 'video'
  name: string
  size: number
}

// Using AIProject type from ai-project-manager

type AIStudioSection = 'home' | 'interior-design' | 'image-tools' | 'video-tools' | 'content-creation'

// Background configurations for each section
const backgroundConfigs = {
  'home': {
    color: 'radial-gradient(circle at 30% 30%, #eaf2fb, #f5f9fc)',
    type: 'light'
  },
  'interior-design': {
    color: 'url(/gray-sofa-white-living-room-interior-with-copy-space-3d-rendering.jpg)',
    type: 'light'
  },
  'image-tools': {
    color: 'radial-gradient(circle at 30% 30%, #eaf2fb, #f5f9fc)',
    type: 'light'
  },
  'video-tools': {
    color: '#080a13',
    type: 'dark'
  },
  'content-creation': {
    color: 'radial-gradient(circle at 30% 30%, #eaf2fb, #f5f9fc)',
    type: 'light'
  }
}

export function AIStudio() {
  const { user } = useAuth()
  const [activeSection, setActiveSection] = useState<AIStudioSection>('home')
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [recentProjects, setRecentProjects] = useState<AIProject[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Background transition state
  const [currentBackground, setCurrentBackground] = useState(backgroundConfigs.home.color)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Handle section change with smooth background transition
  const handleSectionChange = (newSection: AIStudioSection) => {
    if (newSection === activeSection) return
    
    setIsTransitioning(true)
    
    // Smoothly transition the background
    setTimeout(() => {
      setCurrentBackground(backgroundConfigs[newSection].color)
      setActiveSection(newSection)
      
      // End transition after background has changed
      setTimeout(() => {
        setIsTransitioning(false)
      }, 300)
    }, 150)
  }

  // Handle project creation
  const handleCreateProject = (type: AIProject['type']) => {
    // Set the active section based on project type
    switch (type) {
      case 'interior-design':
        handleSectionChange('interior-design')
        break
      case 'image-enhance':
        handleSectionChange('image-tools')
        break
      case 'video-edit':
        handleSectionChange('video-tools')
        break
      case 'content-creation':
        handleSectionChange('content-creation')
        break
    }
    toast.success(`Starting new ${type} project`)
  }

  // Handle project click
  const handleProjectClick = (project: AIProject) => {
    // Navigate to the appropriate section based on project type
    switch (project.type) {
      case 'interior-design':
        handleSectionChange('interior-design')
        break
      case 'image-enhance':
        handleSectionChange('image-tools')
        break
      case 'video-edit':
        handleSectionChange('video-tools')
        break
      case 'content-creation':
        handleSectionChange('content-creation')
        break
    }
    toast.success(`Opening ${project.name}`)
  }

  // Handle file upload
  const handleFileUpload = useCallback(async (files: FileList | File[]) => {
    setIsUploading(true)
    
    try {
      const fileArray = Array.from(files)
      const newFiles: UploadedFile[] = []

      for (const file of fileArray) {
        // Validate file size (100MB limit)
        if (file.size > 100 * 1024 * 1024) {
          toast.error(`File ${file.name} is too large. Maximum size is 100MB.`)
          continue
        }

        // Validate file type
        const isImage = file.type.startsWith('image/')
        const isVideo = file.type.startsWith('video/')
        
        if (!isImage && !isVideo) {
          toast.error(`File ${file.name} is not supported. Only images and videos are allowed.`)
          continue
        }

        // Create file URL for preview
        const url = URL.createObjectURL(file)
        
        const uploadedFile: UploadedFile = {
          id: `${Date.now()}-${Math.random()}`,
          file,
          url,
          type: isImage ? 'image' : 'video',
          name: file.name,
          size: file.size
        }

        newFiles.push(uploadedFile)
      }

      setUploadedFiles(prev => [...prev, ...newFiles])
      toast.success(`${newFiles.length} file(s) uploaded successfully!`)
      
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload files')
    } finally {
      setIsUploading(false)
    }
  }, [])

  // Handle drag and drop
  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const files = event.dataTransfer.files
    if (files.length > 0) {
      handleFileUpload(files)
    }
  }, [handleFileUpload])

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }, [])

  // Remove uploaded file
  const removeFile = useCallback((fileId: string) => {
    setUploadedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId)
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.url)
      }
      return prev.filter(f => f.id !== fileId)
    })
  }, [])

  // Feature categories data
  const featureCategories = [
    {
      id: 'interior-design',
      title: 'Interior Design',
      description: 'Transform rooms with AI-powered staging and styling',
      icon: Home,
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      features: ['Room Transformation', 'Style Templates', 'Real Estate Staging', 'Before/After Compare']
    },
    {
      id: 'image-tools',
      title: 'Image Enhancement',
      description: 'Enhance, create, and optimize images with AI',
      icon: ImageIcon,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      features: ['AI Upscaling', 'Background Removal', 'Smart Cropping', 'Image Generation']
    },
    {
      id: 'video-tools',
      title: 'Video Creation',
      description: 'Cut, enhance, and create videos automatically',
      icon: VideoIcon,
      color: 'from-purple-500 to-violet-500',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      features: ['Auto Video Cutting', 'Subtitle Generation', 'Property Tours', 'Social Clips']
    },
    {
      id: 'content-creation',
      title: 'Content Creation',
      description: 'Generate engaging content with AI assistance',
      icon: FileText,
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      features: ['Content Ideas', 'Social Media Posts', 'Trend Analysis', 'Multi-Platform']
    }
  ]

  // Quick action tools
  const quickActions = [
    { icon: Zap, label: 'Enhance', action: () => handleSectionChange('image-tools') },
    { icon: Wand2, label: 'Create', action: () => handleSectionChange('content-creation') },
    { icon: Scissors, label: 'Cut', action: () => handleSectionChange('video-tools') },
    { icon: Paintbrush, label: 'Design', action: () => handleSectionChange('interior-design') }
  ]

  // Render home section
  const renderHomeSection = () => (
    <div className="space-y-8">
      {/* Hero Section - Glassmorphic Design Matching Raumbilder hochladen */}
      <div className="text-center space-y-6 p-8 relative transition-all duration-1000 ease-out hover:scale-[1.005] hover:shadow-2xl group"
        style={{
          background: `
            linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, transparent 20%),
            linear-gradient(225deg, rgba(255, 255, 255, 0.2) 0%, transparent 15%)
          `,
          backdropFilter: 'blur(40px) saturate(200%) brightness(1.05)',
          WebkitBackdropFilter: 'blur(40px) saturate(200%) brightness(1.05)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '28px',
          boxShadow: `
            0 20px 60px rgba(0, 0, 0, 0.06),
            0 8px 25px rgba(0, 0, 0, 0.04),
            inset 0 1px 0 rgba(255, 255, 255, 0.2)
          `,
          mask: 'linear-gradient(to bottom right, white 0%, transparent 40%)'
        }}>
        <div className="w-24 h-24 bg-white/20 backdrop-blur-[25px] border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.1),inset_0_1px_2px_rgba(255,255,255,0.2)] rounded-[24px] flex items-center justify-center mx-auto transition-all duration-300 hover:bg-white/30 hover:scale-105 hover:shadow-[0_12px_40px_rgba(0,0,0,0.15),inset_0_1px_3px_rgba(255,255,255,0.3)]">
          <Sparkles className="w-10 h-10 text-gray-700" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">AI Studio</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Your Creative AI Powerhouse. Upload, enhance, and create stunning content with cutting-edge AI tools.
          </p>
        </div>
      </div>

      {/* Upload Center - Glassmorphic Design Matching Raumbilder hochladen */}
      <Card className="transition-all duration-1000 ease-out hover:scale-[1.005] hover:shadow-2xl group"
        style={{
          background: `
            linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, transparent 20%),
            linear-gradient(225deg, rgba(255, 255, 255, 0.2) 0%, transparent 15%)
          `,
          backdropFilter: 'blur(40px) saturate(200%) brightness(1.05)',
          WebkitBackdropFilter: 'blur(40px) saturate(200%) brightness(1.05)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '28px',
          boxShadow: `
            0 20px 60px rgba(0, 0, 0, 0.06),
            0 8px 25px rgba(0, 0, 0, 0.04),
            inset 0 1px 0 rgba(255, 255, 255, 0.2)
          `,
          mask: 'linear-gradient(to bottom right, white 0%, transparent 40%)'
        }}>
        <CardContent className="p-8">
          <div
            className="text-center space-y-6 cursor-pointer"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? (
              <div className="space-y-4">
                <Loader2 className="w-10 h-10 text-slate-600 animate-spin mx-auto" />
                <p className="text-lg font-medium text-slate-800">Uploading files...</p>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-white/20 backdrop-blur-[25px] border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.1),inset_0_1px_2px_rgba(255,255,255,0.2)] rounded-[20px] flex items-center justify-center mx-auto transition-all duration-300 hover:bg-white/30 hover:scale-105">
                  <Upload className="w-6 h-6 text-gray-700" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Upload Center</h3>
                  <p className="text-gray-600">
                    Drop your images or videos here, or click to browse
                  </p>
                </div>
                <div className="flex flex-wrap gap-4 justify-center text-sm text-gray-500">
                  <span className="bg-white/15 backdrop-blur-[20px] px-3 py-1 rounded-[16px] border border-white/20">• Max size: 100MB</span>
                  <span className="bg-white/15 backdrop-blur-[20px] px-3 py-1 rounded-[16px] border border-white/20">• Formats: JPG, PNG, WebP, MP4, MOV</span>
                  <span className="bg-white/15 backdrop-blur-[20px] px-3 py-1 rounded-[16px] border border-white/20">• Batch upload supported</span>
                </div>
              </>
            )}
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <Card className="transition-all duration-1000 ease-out hover:scale-[1.005] hover:shadow-2xl group"
          style={{
            background: `
              linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, transparent 20%),
              linear-gradient(225deg, rgba(255, 255, 255, 0.2) 0%, transparent 15%)
            `,
            backdropFilter: 'blur(40px) saturate(200%) brightness(1.05)',
            WebkitBackdropFilter: 'blur(40px) saturate(200%) brightness(1.05)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '28px',
            boxShadow: `
              0 20px 60px rgba(0, 0, 0, 0.06),
              0 8px 25px rgba(0, 0, 0, 0.04),
              inset 0 1px 0 rgba(255, 255, 255, 0.2)
            `,
            mask: 'linear-gradient(to bottom right, white 0%, transparent 40%)'
          }}>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Uploaded Files ({uploadedFiles.length})</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {uploadedFiles.map((file) => (
                <div key={file.id} className="relative group">
                  <div className="aspect-square rounded-[20px] overflow-hidden bg-white/20 backdrop-blur-[25px] border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.1),inset_0_1px_2px_rgba(255,255,255,0.2)] transition-all duration-300 hover:bg-white/30 hover:scale-105">
                    {file.type === 'image' ? (
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <VideoIcon className="w-6 h-6 text-gray-500" />
                      </div>
                    )}
                  </div>
                                      <button
                      onClick={() => removeFile(file.id)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-white/20 backdrop-blur-[20px] border border-white/20 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white/30 active:scale-95 shadow-[0_4px_16px_rgba(0,0,0,0.1),inset_0_1px_2px_rgba(255,255,255,0.2)]"
                    >
                      <X className="w-3 h-3 text-red-500" />
                    </button>
                    <p className="text-xs text-gray-600 mt-2 truncate">{file.name}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions & Recent Projects Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="bg-white/10 backdrop-blur-[30px] saturate-[180%] border border-white/15 shadow-[0_0_20px_rgba(255,255,255,0.1),0_4px_30px_rgba(0,0,0,0.1),inset_0_0_6px_rgba(255,255,255,0.2)] rounded-[32px] transition-all duration-300 hover:bg-white/15">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-slate-600" />
              Quick Tools
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="h-16 flex flex-col gap-2 bg-white/12 backdrop-blur-[24px] saturate-[180%] border border-white/15 hover:bg-white/18 transition-all duration-300 active:scale-95 rounded-[20px] shadow-[0_0_10px_rgba(255,255,255,0.1),inset_0_0_3px_rgba(255,255,255,0.2)] hover:shadow-[0_0_15px_rgba(255,255,255,0.15),inset_0_0_5px_rgba(255,255,255,0.25)]"
                  onClick={action.action}
                >
                  <action.icon className="w-4 h-4 text-slate-700" />
                  <span className="text-sm font-medium text-slate-700">{action.label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Projects */}
        <AIProjectManager 
          className="lg:col-span-2"
          maxRecentProjects={5}
          onProjectClick={handleProjectClick}
          onCreateProject={handleCreateProject}
        />
      </div>

      {/* Feature Categories Grid */}
      <div>
        <h2 className="text-xl font-semibold text-slate-800 mb-6 text-center">AI-Powered Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {featureCategories.map((category) => (
            <Card 
              key={category.id}
              className="bg-white/10 backdrop-blur-[30px] saturate-[180%] border border-white/15 shadow-[0_0_20px_rgba(255,255,255,0.1),0_4px_30px_rgba(0,0,0,0.1),inset_0_0_6px_rgba(255,255,255,0.2)] rounded-[32px] hover:bg-white/15 hover:shadow-[0_0_30px_rgba(255,255,255,0.15),0_8px_40px_rgba(0,0,0,0.15),inset_0_0_8px_rgba(255,255,255,0.25)] transition-all duration-300 cursor-pointer group active:scale-95 hover:scale-[1.01]"
              onClick={() => handleSectionChange(category.id as AIStudioSection)}
            >
              <CardContent className="p-8">
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 bg-gradient-to-r ${category.color} rounded-[24px] flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(255,255,255,0.1),inset_0_0_4px_rgba(255,255,255,0.2)]`}>
                      <category.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800">{category.title}</h3>
                      <p className="text-slate-600 text-sm">{category.description}</p>
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="grid grid-cols-2 gap-2">
                    {category.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-white/20 backdrop-blur-[10px] border border-white/10 rounded-full shadow-[inset_0_0_2px_rgba(255,255,255,0.3)]"></div>
                        <span className="text-sm text-slate-700 font-medium">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action Button */}
                  <Button 
                    className={`w-full bg-gradient-to-r ${category.color} hover:opacity-90 text-white group-hover:shadow-[0_0_20px_rgba(255,255,255,0.1),0_4px_30px_rgba(0,0,0,0.1)] transition-all duration-300 active:scale-95 h-12 rounded-[20px] backdrop-blur-[20px] border border-white/10`}
                  >
                    Get Started
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )

  // Render specific sections (placeholders for now)
  const renderInteriorDesignSection = () => (
    <div className="space-y-8">
      {/* Clean Header - Glassmorphic Design Matching Raumbilder hochladen */}
      <div className="text-center space-y-4 p-8 relative transition-all duration-1000 ease-out hover:scale-[1.005] hover:shadow-2xl group"
        style={{
          background: `
            linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, transparent 20%),
            linear-gradient(225deg, rgba(255, 255, 255, 0.2) 0%, transparent 15%)
          `,
          backdropFilter: 'blur(40px) saturate(200%) brightness(1.05)',
          WebkitBackdropFilter: 'blur(40px) saturate(200%) brightness(1.05)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '28px',
          boxShadow: `
            0 20px 60px rgba(0, 0, 0, 0.06),
            0 8px 25px rgba(0, 0, 0, 0.04),
            inset 0 1px 0 rgba(255, 255, 255, 0.2)
          `,
          mask: 'linear-gradient(to bottom right, white 0%, transparent 40%)'
        }}>
        <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-[25px] border border-white/30 rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.1),inset_0_1px_2px_rgba(255,255,255,0.2)] mb-4">
          <Home className="w-8 h-8 text-gray-700" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Interior Design Studio</h1>
          <p className="text-gray-600 text-lg">Transform any room with AI-powered design</p>
        </div>
      </div>
      
      {/* Main Content Card - Glassmorphic Design Matching Raumbilder hochladen */}
      <Card className="overflow-hidden transition-all duration-1000 ease-out hover:scale-[1.005] hover:shadow-2xl group"
        style={{
          background: `
            linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, transparent 20%),
            linear-gradient(225deg, rgba(255, 255, 255, 0.2) 0%, transparent 15%)
          `,
          backdropFilter: 'blur(40px) saturate(200%) brightness(1.05)',
          WebkitBackdropFilter: 'blur(40px) saturate(200%) brightness(1.05)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '28px',
          boxShadow: `
            0 20px 60px rgba(0, 0, 0, 0.06),
            0 8px 25px rgba(0, 0, 0, 0.04),
            inset 0 1px 0 rgba(255, 255, 255, 0.2)
          `,
          mask: 'linear-gradient(to bottom right, white 0%, transparent 40%)'
        }}>
        <CardContent className="p-8">
          <InteriorDesignWorkflow
            onImageTransformed={(imageUrl, originalFile, transformedBlob) => {
              toast.success('Interior design transformation completed!')
            }}
            onBack={() => handleSectionChange('home')}
            onNext={() => toast.success('Design ready for use!')}
            initialImage={uploadedFiles[0]?.file}
          />
        </CardContent>
      </Card>
    </div>
  )

  const renderPlaceholderSection = (title: string, description: string) => (
    <div className="space-y-8">
      {/* Clean Header - Glassmorphic Design Matching Raumbilder hochladen */}
      <div className="text-center space-y-4 p-8 relative transition-all duration-1000 ease-out hover:scale-[1.005] hover:shadow-2xl group"
        style={{
          background: `
            linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, transparent 20%),
            linear-gradient(225deg, rgba(255, 255, 255, 0.2) 0%, transparent 15%)
          `,
          backdropFilter: 'blur(40px) saturate(200%) brightness(1.05)',
          WebkitBackdropFilter: 'blur(40px) saturate(200%) brightness(1.05)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '28px',
          boxShadow: `
            0 20px 60px rgba(0, 0, 0, 0.06),
            0 8px 25px rgba(0, 0, 0, 0.04),
            inset 0 1px 0 rgba(255, 255, 255, 0.2)
          `,
          mask: 'linear-gradient(to bottom right, white 0%, transparent 40%)'
        }}>
        <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-[25px] border border-white/30 rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.1),inset_0_1px_2px_rgba(255,255,255,0.2)] mb-4">
          <Wand2 className="w-8 h-8 text-gray-700" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">{title}</h1>
          <p className="text-gray-600 text-lg">{description}</p>
        </div>
      </div>
      
      {/* Main Content Card - Glassmorphic Design Matching Raumbilder hochladen */}
      <Card className="overflow-hidden transition-all duration-1000 ease-out hover:scale-[1.005] hover:shadow-2xl group"
        style={{
          background: `
            linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, transparent 20%),
            linear-gradient(225deg, rgba(255, 255, 255, 0.2) 0%, transparent 15%)
          `,
          backdropFilter: 'blur(40px) saturate(200%) brightness(1.05)',
          WebkitBackdropFilter: 'blur(40px) saturate(200%) brightness(1.05)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '28px',
          boxShadow: `
            0 20px 60px rgba(0, 0, 0, 0.06),
            0 8px 25px rgba(0, 0, 0, 0.04),
            inset 0 1px 0 rgba(255, 255, 255, 0.2)
          `,
          mask: 'linear-gradient(to bottom right, white 0%, transparent 40%)'
        }}>
        <CardContent className="p-16 text-center">
          <div className="w-20 h-20 bg-white/15 backdrop-blur-[25px] border border-white/30 rounded-[28px] shadow-[0_8px_32px_rgba(0,0,0,0.1),inset_0_1px_2px_rgba(255,255,255,0.2)] flex items-center justify-center mx-auto mb-6 transition-all duration-300 hover:bg-white/20 hover:scale-105">
            <Wand2 className="w-10 h-10 text-gray-700" />
          </div>
          <h3 className="text-2xl font-semibold text-gray-800 mb-3">Coming Soon</h3>
          <p className="text-gray-600 text-lg">This feature is being developed and will be available soon.</p>
        </CardContent>
      </Card>
    </div>
  )

  // Main render
  return (
    <div 
      className="min-h-screen transition-all duration-500 ease-in-out"
      style={{ 
        background: currentBackground,
        backgroundSize: activeSection === 'interior-design' ? 'cover' : 'auto',
        backgroundPosition: activeSection === 'interior-design' ? 'center' : 'initial',
        backgroundRepeat: activeSection === 'interior-design' ? 'no-repeat' : 'initial',
        opacity: isTransitioning ? 0.8 : 1
      }}
    >
      {/* Background overlay for smooth transitions */}
      <div 
        className="absolute inset-0 transition-opacity duration-500 ease-in-out"
        style={{
          background: currentBackground,
          backgroundSize: activeSection === 'interior-design' ? 'cover' : 'auto',
          backgroundPosition: activeSection === 'interior-design' ? 'center' : 'initial',
          backgroundRepeat: activeSection === 'interior-design' ? 'no-repeat' : 'initial',
          opacity: isTransitioning ? 0.3 : 0
        }}
      />
      
      <div className="relative z-10 w-full max-w-7xl mx-auto p-6">
        {activeSection === 'home' && renderHomeSection()}
        {activeSection === 'interior-design' && renderInteriorDesignSection()}
        {activeSection === 'image-tools' && renderPlaceholderSection('Image Enhancement Tools', 'Enhance, create, and optimize images with AI')}
        {activeSection === 'video-tools' && <AIStudioVideoGenerator />}
        {activeSection === 'content-creation' && renderPlaceholderSection('Content Creation Hub', 'Generate engaging content with AI assistance')}
      </div>
    </div>
  )
} 