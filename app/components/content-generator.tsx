"use client"

import React, { useState, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { 
  ImageIcon, 
  VideoIcon, 
  Wand2,
  Download,
  Play,
  Pause,
  Settings,
  Copy,
  RefreshCw,
  Loader2,
  X,
  Sparkles,
  Clock,
  Zap,
  Eye,
  Share2,
  Home,
  Palette,
  Upload,
  Plus,
  Link,
  Trash2,
  RotateCcw,
  Sun,
  Moon,
  Trees
} from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface GeneratedContent {
  id: string
  type: 'image' | 'video' | 'interior'
  url: string
  prompt: string
  settings: Record<string, any>
  createdAt: Date
  isProcessing?: boolean
  processingProgress?: number
  originalImageId?: string
}

interface UploadedImage {
  id: string
  file: File
  url: string
  name: string
  size: number
  isProcessing?: boolean
  processingProgress?: number
}

type ContentType = 'image' | 'video' | 'interior'

export function ContentGenerator() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<ContentType>('image')
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Image generation settings
  const [imageSettings, setImageSettings] = useState({
    model: 'dall-e-3',
    size: '1024x1024',
    quality: 'standard',
    style: 'vivid',
    count: 1
  })
  
  // Video generation settings (Google Veo 2/3)
  const [videoSettings, setVideoSettings] = useState({
    model: 'veo-2',
    duration: 5,
    fps: 24,
    resolution: '720p',
    style: 'cinematic',
    motionIntensity: 5,
    cameraMovement: 'static'
  })

  // Interior Design settings
  const [interiorSettings, setInteriorSettings] = useState({
    apiProvider: 'decor8ai', // 'decor8ai' or 'aihomedesign'
    service: 'virtual-staging', // virtual-staging, interior-design, item-removal, etc.
    roomType: 'livingroom',
    designStyle: 'modern',
    colorScheme: 'COLOR_SCHEME_0',
    specialityDecor: 'SPECIALITY_DECOR_0',
    numImages: 1,
    scaleFactor: 2,
    matchStyling: false, // For multi-image consistency
    seed: null, // For consistency across images
    guidanceScale: 15,
    designCreativity: 0.39,
    wallColorHex: '#FFFFFF'
  })

  // Generate Image using DALL-E
  const generateImage = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt')
      return
    }

    setIsGenerating(true)
    
    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          ...imageSettings
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate image')
      }

      const result = await response.json()
      
      const newContent: GeneratedContent = {
        id: `img-${Date.now()}`,
        type: 'image',
        url: result.imageUrl,
        prompt,
        settings: imageSettings,
        createdAt: new Date()
      }

      setGeneratedContent(prev => [newContent, ...prev])
      toast.success('Image generated successfully!')
      
    } catch (error) {
      console.error('Image generation error:', error)
      toast.error('Failed to generate image')
    } finally {
      setIsGenerating(false)
    }
  }

  // Generate Video using Google Veo 2/3
  const generateVideo = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt')
      return
    }

    setIsGenerating(true)
    
    // Create processing placeholder
    const processingContent: GeneratedContent = {
      id: `vid-${Date.now()}`,
      type: 'video',
      url: '',
      prompt,
      settings: videoSettings,
      createdAt: new Date(),
      isProcessing: true,
      processingProgress: 0
    }
    
    setGeneratedContent(prev => [processingContent, ...prev])
    
    try {
      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          ...videoSettings
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate video')
      }

      const result = await response.json()
      
      // Update with final result
      setGeneratedContent(prev => 
        prev.map(item => 
          item.id === processingContent.id 
            ? { ...item, url: result.videoUrl, isProcessing: false, processingProgress: 100 }
            : item
        )
      )
      
      toast.success('Video generated successfully!')
      
    } catch (error) {
      console.error('Video generation error:', error)
      
      // Remove failed item
      setGeneratedContent(prev => prev.filter(item => item.id !== processingContent.id))
      toast.error('Failed to generate video')
    } finally {
      setIsGenerating(false)
    }
  }

  // Process Interior Design
  const processInteriorDesign = async () => {
    if (uploadedImages.length === 0) {
      toast.error('Please upload at least one image')
      return
    }

    setIsGenerating(true)
    
    try {
      // Process each uploaded image
      const promises = uploadedImages.map(async (image, index) => {
        const processingContent: GeneratedContent = {
          id: `int-${Date.now()}-${index}`,
          type: 'interior',
          url: '',
          prompt: prompt || `${interiorSettings.service} for ${interiorSettings.roomType}`,
          settings: interiorSettings,
          createdAt: new Date(),
          isProcessing: true,
          processingProgress: 0,
          originalImageId: image.id
        }
        
        setGeneratedContent(prev => [processingContent, ...prev])

        const formData = new FormData()
        formData.append('image', image.file)
        formData.append('settings', JSON.stringify({
          ...interiorSettings,
          // Use same seed for consistency if matchStyling is enabled
          seed: interiorSettings.matchStyling && index > 0 ? interiorSettings.seed || Date.now() : undefined
        }))

        const response = await fetch('/api/generate-interior', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`Failed to process image ${image.name}`)
        }

        const result = await response.json()
        
        // Update with final result
        setGeneratedContent(prev => 
          prev.map(item => 
            item.id === processingContent.id 
              ? { 
                  ...item, 
                  url: result.imageUrl, 
                  isProcessing: false, 
                  processingProgress: 100,
                  settings: { ...item.settings, seed: result.seed } // Store seed for consistency
                }
              : item
          )
        )

        return result
      })

      await Promise.all(promises)
      toast.success(`Successfully processed ${uploadedImages.length} image(s)!`)
      
    } catch (error) {
      console.error('Interior design processing error:', error)
      toast.error('Failed to process interior design')
    } finally {
      setIsGenerating(false)
    }
  }

  // Handle file upload
  const handleFileUpload = (files: FileList | null) => {
    if (!files) return

    const newImages: UploadedImage[] = []
    
    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const newImage: UploadedImage = {
          id: `upload-${Date.now()}-${Math.random()}`,
          file,
          url: URL.createObjectURL(file),
          name: file.name,
          size: file.size
        }
        newImages.push(newImage)
      }
    })

    setUploadedImages(prev => [...prev, ...newImages])
    toast.success(`Added ${newImages.length} image(s)`)
  }

  // Remove uploaded image
  const removeUploadedImage = (id: string) => {
    setUploadedImages(prev => {
      const image = prev.find(img => img.id === id)
      if (image) {
        URL.revokeObjectURL(image.url)
      }
      return prev.filter(img => img.id !== id)
    })
  }

  // Handle generation based on active tab
  const handleGenerate = () => {
    if (activeTab === 'image') {
      generateImage()
    } else if (activeTab === 'video') {
      generateVideo()
    } else {
      processInteriorDesign()
    }
  }

  // Copy prompt to clipboard
  const copyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt)
    toast.success('Prompt copied to clipboard')
  }

  // Download content
  const downloadContent = async (content: GeneratedContent) => {
    try {
      const response = await fetch(content.url)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = url
      const extension = content.type === 'video' ? 'mp4' : 'png'
      a.download = `generated-${content.type}-${content.id}.${extension}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success('Download started')
    } catch (error) {
      toast.error('Failed to download')
    }
  }

  // Remove content
  const removeContent = (id: string) => {
    setGeneratedContent(prev => prev.filter(item => item.id !== id))
  }

  // API Provider options
  const apiProviders = [
    { value: 'decor8ai', label: 'Decor8 AI', description: 'Most comprehensive features' },
    { value: 'aihomedesign', label: 'AI HomeDesign', description: 'Reliable and fast' }
  ]

  // Service options based on API provider
  const getServiceOptions = () => {
    if (interiorSettings.apiProvider === 'decor8ai') {
      return [
        { value: 'virtual-staging', label: 'Virtual Staging', icon: Home },
        { value: 'interior-design', label: 'Interior Design', icon: Palette },
        { value: 'remove-objects', label: 'Remove Objects', icon: RotateCcw },
        { value: 'change-wall-color', label: 'Change Wall Color', icon: Palette },
        { value: 'replace-sky', label: 'Replace Sky', icon: Sun },
        { value: 'landscaping', label: 'Landscaping', icon: Trees },
        { value: 'prime-walls', label: 'Prime Walls', icon: Wand2 },
        { value: 'upscale', label: 'Upscale Image', icon: Zap }
      ]
    } else {
      return [
        { value: 'virtual-staging', label: 'AI Virtual Staging', icon: Home },
        { value: 'interior-design', label: 'AI Interior Design', icon: Palette },
        { value: 'image-enhancement', label: 'AI Image Enhancement', icon: Zap },
        { value: 'day-to-dusk', label: 'AI Day to Dusk', icon: Moon },
        { value: 'item-removal', label: 'AI Item Removal', icon: RotateCcw }
      ]
    }
  }

  // Room types
  const roomTypes = [
    'livingroom', 'kitchen', 'diningroom', 'bedroom', 'bathroom', 'kidsroom',
    'familyroom', 'readingnook', 'sunroom', 'walkincloset', 'mudroom', 'toyroom',
    'office', 'foyer', 'powderroom', 'laundryroom', 'gym', 'basement', 'garage',
    'balcony', 'cafe', 'homebar', 'study_room', 'front_porch', 'back_porch',
    'back_patio', 'openplan', 'boardroom', 'meetingroom', 'openworkspace', 'privateoffice'
  ]

  // Design styles
  const designStyles = [
    'minimalist', 'scandinavian', 'industrial', 'boho', 'traditional', 'artdeco',
    'midcenturymodern', 'coastal', 'tropical', 'eclectic', 'contemporary', 'frenchcountry',
    'rustic', 'shabbychic', 'vintage', 'country', 'modern', 'asian_zen', 'hollywoodregency',
    'bauhaus', 'mediterranean', 'farmhouse', 'victorian', 'gothic', 'moroccan',
    'southwestern', 'transitional', 'maximalist', 'arabic', 'japandi', 'retrofuturism',
    'artnouveau', 'urbanmodern', 'wabi_sabi', 'grandmillennial', 'coastalgrandmother',
    'newtraditional', 'cottagecore', 'luxemodern', 'high_tech', 'organicmodern',
    'tuscan', 'cabin', 'desertmodern', 'global', 'industrialchic', 'modernfarmhouse',
    'europeanclassic', 'neotraditional', 'warmminimalist'
  ]

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Content Generator</h1>
              <p className="text-gray-600 mt-1">Create images, videos, and interior designs with AI</p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowSettings(!showSettings)}
              className="gap-2"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Button>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ContentType)} className="mt-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="image" className="gap-2">
                <ImageIcon className="w-4 h-4" />
                Image Generation
              </TabsTrigger>
              <TabsTrigger value="video" className="gap-2">
                <VideoIcon className="w-4 h-4" />
                Video Generation
              </TabsTrigger>
              <TabsTrigger value="interior" className="gap-2">
                <Home className="w-4 h-4" />
                Interior Design
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Generation Interface */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Interior Design Tab Content */}
            {activeTab === 'interior' && (
              <>
                {/* Multi-Image Upload */}
                <Card>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-lg font-semibold">Upload Images</Label>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="match-styling"
                            checked={interiorSettings.matchStyling}
                            onCheckedChange={(checked) => 
                              setInteriorSettings(prev => ({ ...prev, matchStyling: !!checked }))
                            }
                          />
                          <Label htmlFor="match-styling" className="text-sm">
                            Match styling across images (same house)
                          </Label>
                        </div>
                      </div>
                      
                      {/* Upload Zone */}
                      <div
                        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                        onDrop={(e) => {
                          e.preventDefault()
                          handleFileUpload(e.dataTransfer.files)
                        }}
                        onDragOver={(e) => e.preventDefault()}
                      >
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-lg font-medium text-gray-600 mb-2">
                          Drop images here or click to upload
                        </p>
                        <p className="text-sm text-gray-500">
                          Support for PNG, JPG, HEIC. Max 4MB per image.
                        </p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e.target.files)}
                        />
                      </div>

                      {/* Uploaded Images Grid */}
                      {uploadedImages.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                          {uploadedImages.map((image) => (
                            <div key={image.id} className="relative group">
                              <div className="aspect-square rounded-lg overflow-hidden border">
                                <img
                                  src={image.url}
                                  alt={image.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeUploadedImage(image.id)}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                              <p className="text-xs text-gray-600 mt-1 truncate">{image.name}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Service Selection */}
                <Card>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <Label className="text-lg font-semibold">AI Service</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {getServiceOptions().map((service) => {
                          const Icon = service.icon
                          return (
                            <Button
                              key={service.value}
                              variant={interiorSettings.service === service.value ? 'default' : 'outline'}
                              onClick={() => setInteriorSettings(prev => ({ ...prev, service: service.value }))}
                              className="h-auto p-4 flex flex-col gap-2"
                            >
                              <Icon className="w-6 h-6" />
                              <span className="text-xs font-medium">{service.label}</span>
                            </Button>
                          )
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Prompt Input (for image and video) */}
            {activeTab !== 'interior' && (
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <Label className="text-lg font-semibold">
                      {activeTab === 'image' ? 'Image' : 'Video'} Prompt
                    </Label>
                    <Textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={
                        activeTab === 'image' 
                          ? 'Describe the image you want to generate...'
                          : 'Describe the video you want to generate...'
                      }
                      className="min-h-32 resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs">
                          {activeTab === 'image' ? imageSettings.model.toUpperCase() : videoSettings.model.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {activeTab === 'image' ? imageSettings.size : `${videoSettings.duration}s ${videoSettings.resolution}`}
                        </Badge>
                      </div>
                      <Button
                        onClick={handleGenerate}
                        disabled={
                          (activeTab !== 'interior' && !prompt.trim()) || 
                          (activeTab === 'interior' && uploadedImages.length === 0) ||
                          isGenerating
                        }
                        className="bg-black text-white hover:bg-gray-800 gap-2"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {activeTab === 'interior' ? 'Processing...' : 'Generating...'}
                          </>
                        ) : (
                          <>
                            <Wand2 className="w-4 h-4" />
                            {activeTab === 'interior' 
                              ? `Process ${uploadedImages.length} Image(s)` 
                              : `Generate ${activeTab === 'image' ? 'Image' : 'Video'}`
                            }
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Prompts */}
            {activeTab !== 'interior' && (
              <Card>
                <CardContent className="p-6">
                  <Label className="text-base font-semibold mb-4 block">Quick Prompts</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(activeTab === 'image' ? [
                      "A luxurious modern living room with floor-to-ceiling windows",
                      "Cozy Scandinavian bedroom with natural lighting",
                      "Minimalist kitchen with marble countertops",
                      "Professional real estate photo of a beautiful property"
                    ] : [
                      "A cinematic drone shot of a modern house at sunset",
                      "Time-lapse of a cozy living room throughout the day",
                      "Smooth camera movement through a luxury apartment",
                      "Professional property walkthrough video"
                    ]).map((quickPrompt, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        onClick={() => setPrompt(quickPrompt)}
                        className="text-left h-auto p-3 justify-start"
                      >
                        <Sparkles className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="text-sm">{quickPrompt}</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Generated Content Grid */}
            {generatedContent.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <Label className="text-base font-semibold mb-4 block">
                    Generated Content ({generatedContent.length})
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {generatedContent.map((content) => (
                      <div key={content.id} className="relative group">
                        <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border">
                          {content.isProcessing ? (
                            <div className="w-full h-full flex flex-col items-center justify-center">
                              <Loader2 className="w-8 h-8 text-gray-400 animate-spin mb-2" />
                              <span className="text-sm text-gray-600">Processing...</span>
                              {content.processingProgress !== undefined && (
                                <div className="w-16 bg-gray-200 rounded-full h-1 mt-2">
                                  <div 
                                    className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                                    style={{ width: `${content.processingProgress}%` }}
                                  ></div>
                                </div>
                              )}
                            </div>
                          ) : content.type === 'video' ? (
                            <div className="w-full h-full flex items-center justify-center relative">
                              <video
                                src={content.url}
                                className="w-full h-full object-cover"
                                muted
                                playsInline
                              />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center">
                                  <Play className="w-6 h-6 text-white ml-1" />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <img
                              src={content.url}
                              alt={content.prompt}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>

                        {/* Action Buttons */}
                        {!content.isProcessing && (
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => copyPrompt(content.prompt)}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => downloadContent(content)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                            >
                              <Share2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => removeContent(content.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        )}

                        {/* Content Info */}
                        <div className="mt-2">
                          <p className="text-xs text-gray-600 truncate">{content.prompt}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {content.type}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {content.createdAt.toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Settings Sidebar */}
      {showSettings && (
        <div className="w-80 bg-white border-l border-gray-200 p-6 overflow-y-auto">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {activeTab === 'image' ? 'Image' : activeTab === 'video' ? 'Video' : 'Interior Design'} Settings
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {activeTab === 'interior' ? (
              // Interior Design Settings
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">API Provider</Label>
                  <Select
                    value={interiorSettings.apiProvider}
                    onValueChange={(value) => setInteriorSettings(prev => ({ ...prev, apiProvider: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {apiProviders.map((provider) => (
                        <SelectItem key={provider.value} value={provider.value}>
                          <div>
                            <div className="font-medium">{provider.label}</div>
                            <div className="text-xs text-gray-500">{provider.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Room Type</Label>
                  <Select
                    value={interiorSettings.roomType}
                    onValueChange={(value) => setInteriorSettings(prev => ({ ...prev, roomType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roomTypes.map((room) => (
                        <SelectItem key={room} value={room}>
                          {room.charAt(0).toUpperCase() + room.slice(1).replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Design Style</Label>
                  <Select
                    value={interiorSettings.designStyle}
                    onValueChange={(value) => setInteriorSettings(prev => ({ ...prev, designStyle: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {designStyles.map((style) => (
                        <SelectItem key={style} value={style}>
                          {style.charAt(0).toUpperCase() + style.slice(1).replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Images per Input: {interiorSettings.numImages}
                  </Label>
                  <Slider
                    value={[interiorSettings.numImages]}
                    onValueChange={(value) => setInteriorSettings(prev => ({ ...prev, numImages: value[0] }))}
                    max={4}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Design Creativity: {interiorSettings.designCreativity}
                  </Label>
                  <Slider
                    value={[interiorSettings.designCreativity]}
                    onValueChange={(value) => setInteriorSettings(prev => ({ ...prev, designCreativity: value[0] }))}
                    max={1}
                    min={0}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                {interiorSettings.service === 'change-wall-color' && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Wall Color</Label>
                    <Input
                      type="color"
                      value={interiorSettings.wallColorHex}
                      onChange={(e) => setInteriorSettings(prev => ({ ...prev, wallColorHex: e.target.value }))}
                      className="w-full h-10"
                    />
                  </div>
                )}
              </div>
            ) : activeTab === 'image' ? (
              // Image Settings (existing)
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Model</Label>
                  <Select
                    value={imageSettings.model}
                    onValueChange={(value) => setImageSettings(prev => ({ ...prev, model: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dall-e-3">
                        <div>
                          <div className="font-medium">DALL-E 3</div>
                          <div className="text-xs text-gray-500">Latest, highest quality</div>
                        </div>
                      </SelectItem>
                      <SelectItem value="dall-e-2">
                        <div>
                          <div className="font-medium">DALL-E 2</div>
                          <div className="text-xs text-gray-500">Fast and reliable</div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Size</Label>
                  <Select
                    value={imageSettings.size}
                    onValueChange={(value) => setImageSettings(prev => ({ ...prev, size: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1024x1024">Square (1024x1024)</SelectItem>
                      <SelectItem value="1024x1792">Portrait (1024x1792)</SelectItem>
                      <SelectItem value="1792x1024">Landscape (1792x1024)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Quality</Label>
                  <Select
                    value={imageSettings.quality}
                    onValueChange={(value) => setImageSettings(prev => ({ ...prev, quality: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="hd">HD Quality</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Style</Label>
                  <Select
                    value={imageSettings.style}
                    onValueChange={(value) => setImageSettings(prev => ({ ...prev, style: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vivid">Vivid</SelectItem>
                      <SelectItem value="natural">Natural</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              // Video Settings (existing)
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Model</Label>
                  <Select
                    value={videoSettings.model}
                    onValueChange={(value) => setVideoSettings(prev => ({ ...prev, model: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="veo-2">
                        <div>
                          <div className="font-medium">Veo 2</div>
                          <div className="text-xs text-gray-500">Latest Google model</div>
                        </div>
                      </SelectItem>
                      <SelectItem value="veo-3">
                        <div>
                          <div className="font-medium">Veo 3</div>
                          <div className="text-xs text-gray-500">Experimental features</div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Duration: {videoSettings.duration}s
                  </Label>
                  <Slider
                    value={[videoSettings.duration]}
                    onValueChange={(value) => setVideoSettings(prev => ({ ...prev, duration: value[0] }))}
                    max={30}
                    min={3}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Resolution</Label>
                  <Select
                    value={videoSettings.resolution}
                    onValueChange={(value) => setVideoSettings(prev => ({ ...prev, resolution: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="480p">480p (SD)</SelectItem>
                      <SelectItem value="720p">720p (HD)</SelectItem>
                      <SelectItem value="1080p">1080p (FHD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Motion Intensity: {videoSettings.motionIntensity}
                  </Label>
                  <Slider
                    value={[videoSettings.motionIntensity]}
                    onValueChange={(value) => setVideoSettings(prev => ({ ...prev, motionIntensity: value[0] }))}
                    max={10}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Camera Movement</Label>
                  <Select
                    value={videoSettings.cameraMovement}
                    onValueChange={(value) => setVideoSettings(prev => ({ ...prev, cameraMovement: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="static">Static</SelectItem>
                      <SelectItem value="slow-zoom">Slow Zoom</SelectItem>
                      <SelectItem value="pan-left">Pan Left</SelectItem>
                      <SelectItem value="pan-right">Pan Right</SelectItem>
                      <SelectItem value="crane-up">Crane Up</SelectItem>
                      <SelectItem value="crane-down">Crane Down</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Style</Label>
                  <Select
                    value={videoSettings.style}
                    onValueChange={(value) => setVideoSettings(prev => ({ ...prev, style: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cinematic">Cinematic</SelectItem>
                      <SelectItem value="documentary">Documentary</SelectItem>
                      <SelectItem value="artistic">Artistic</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Reset Settings */}
            <Button
              variant="outline"
              onClick={() => {
                if (activeTab === 'image') {
                  setImageSettings({
                    model: 'dall-e-3',
                    size: '1024x1024',
                    quality: 'standard',
                    style: 'vivid',
                    count: 1
                  })
                } else if (activeTab === 'video') {
                  setVideoSettings({
                    model: 'veo-2',
                    duration: 5,
                    fps: 24,
                    resolution: '720p',
                    style: 'cinematic',
                    motionIntensity: 5,
                    cameraMovement: 'static'
                  })
                } else {
                  setInteriorSettings({
                    apiProvider: 'decor8ai',
                    service: 'virtual-staging',
                    roomType: 'livingroom',
                    designStyle: 'modern',
                    colorScheme: 'COLOR_SCHEME_0',
                    specialityDecor: 'SPECIALITY_DECOR_0',
                    numImages: 1,
                    scaleFactor: 2,
                    matchStyling: false,
                    seed: null,
                    guidanceScale: 15,
                    designCreativity: 0.39,
                    wallColorHex: '#FFFFFF'
                  })
                }
              }}
              className="w-full gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Reset to Defaults
            </Button>
          </div>
        </div>
      )}
    </div>
  )
} 