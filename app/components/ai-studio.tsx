"use client"

import React, { useState, useRef, useCallback } from 'react'
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
  X
} from 'lucide-react'
import { InteriorDesignWorkflow } from './interior-design-workflow'
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

export function AIStudio() {
  const { user } = useAuth()
  const [activeSection, setActiveSection] = useState<AIStudioSection>('home')
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [recentProjects, setRecentProjects] = useState<AIProject[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle project creation
  const handleCreateProject = (type: AIProject['type']) => {
    // Set the active section based on project type
    switch (type) {
      case 'interior-design':
        setActiveSection('interior-design')
        break
      case 'image-enhance':
        setActiveSection('image-tools')
        break
      case 'video-edit':
        setActiveSection('video-tools')
        break
      case 'content-creation':
        setActiveSection('content-creation')
        break
    }
    toast.success(`Starting new ${type} project`)
  }

  // Handle project click
  const handleProjectClick = (project: AIProject) => {
    // Navigate to the appropriate section based on project type
    switch (project.type) {
      case 'interior-design':
        setActiveSection('interior-design')
        break
      case 'image-enhance':
        setActiveSection('image-tools')
        break
      case 'video-edit':
        setActiveSection('video-tools')
        break
      case 'content-creation':
        setActiveSection('content-creation')
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
    { icon: Zap, label: 'Enhance', action: () => setActiveSection('image-tools') },
    { icon: Wand2, label: 'Create', action: () => setActiveSection('content-creation') },
    { icon: Scissors, label: 'Cut', action: () => setActiveSection('video-tools') },
    { icon: Paintbrush, label: 'Design', action: () => setActiveSection('interior-design') }
  ]

  // Render home section
  const renderHomeSection = () => (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-6">
        <div className="w-24 h-24 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto">
          <Sparkles className="w-12 h-12 text-white" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">AI Studio</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Your Creative AI Powerhouse. Upload, enhance, and create stunning content with cutting-edge AI tools.
          </p>
        </div>
      </div>

      {/* Upload Center */}
      <Card className="border-2 border-dashed border-gray-300 hover:border-teal-400 transition-colors duration-300">
        <CardContent className="p-8">
          <div
            className="text-center space-y-6 cursor-pointer"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? (
              <div className="space-y-4">
                <Loader2 className="w-12 h-12 text-teal-500 animate-spin mx-auto" />
                <p className="text-lg font-medium text-gray-900">Uploading files...</p>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto">
                  <Upload className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Upload Center</h3>
                  <p className="text-gray-600 text-lg">
                    Drop your images or videos here, or click to browse
                  </p>
                </div>
                <div className="flex flex-wrap gap-4 justify-center text-sm text-gray-500">
                  <span>• Max size: 100MB</span>
                  <span>• Formats: JPG, PNG, WebP, MP4, MOV</span>
                  <span>• Batch upload supported</span>
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
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Uploaded Files ({uploadedFiles.length})</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {uploadedFiles.map((file) => (
                <div key={file.id} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                    {file.type === 'image' ? (
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <VideoIcon className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removeFile(file.id)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4 text-white" />
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
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-teal-500" />
              Quick Tools
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="h-16 flex flex-col gap-2 hover:bg-teal-50 hover:border-teal-300"
                  onClick={action.action}
                >
                  <action.icon className="w-5 h-5 text-teal-600" />
                  <span className="text-sm font-medium">{action.label}</span>
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
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">AI-Powered Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {featureCategories.map((category) => (
            <Card 
              key={category.id}
              className={`${category.borderColor} ${category.bgColor} border-2 hover:shadow-lg transition-all duration-300 cursor-pointer group hover:scale-105`}
              onClick={() => setActiveSection(category.id as AIStudioSection)}
            >
              <CardContent className="p-8">
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 bg-gradient-to-r ${category.color} rounded-full flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <category.icon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{category.title}</h3>
                      <p className="text-gray-600">{category.description}</p>
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="grid grid-cols-2 gap-2">
                    {category.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                        <span className="text-sm text-gray-700 font-medium">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action Button */}
                  <Button 
                    className={`w-full bg-gradient-to-r ${category.color} hover:opacity-90 text-white group-hover:shadow-lg transition-all`}
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Interior Design Studio</h2>
          <p className="text-gray-600 mt-2">Transform any room with AI-powered design</p>
        </div>
        <Button variant="outline" onClick={() => setActiveSection('home')}>
          ← Back to Studio
        </Button>
      </div>
      
      <InteriorDesignWorkflow
        onImageTransformed={(imageUrl, originalFile, transformedBlob) => {
          toast.success('Interior design transformation completed!')
        }}
        onBack={() => setActiveSection('home')}
        onNext={() => toast.success('Design ready for use!')}
        initialImage={uploadedFiles[0]?.file}
      />
    </div>
  )

  const renderPlaceholderSection = (title: string, description: string) => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
          <p className="text-gray-600 mt-2">{description}</p>
        </div>
        <Button variant="outline" onClick={() => setActiveSection('home')}>
          ← Back to Studio
        </Button>
      </div>
      
      <Card className="border-2 border-dashed border-gray-300">
        <CardContent className="p-16 text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wand2 className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Coming Soon</h3>
          <p className="text-gray-600">This feature is being developed and will be available soon.</p>
        </CardContent>
      </Card>
    </div>
  )

  // Main render
  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      {activeSection === 'home' && renderHomeSection()}
      {activeSection === 'interior-design' && renderInteriorDesignSection()}
      {activeSection === 'image-tools' && renderPlaceholderSection('Image Enhancement Tools', 'Enhance, create, and optimize images with AI')}
      {activeSection === 'video-tools' && renderPlaceholderSection('Video Creation Suite', 'Cut, enhance, and create videos automatically')}
      {activeSection === 'content-creation' && renderPlaceholderSection('Content Creation Hub', 'Generate engaging content with AI assistance')}
    </div>
  )
} 