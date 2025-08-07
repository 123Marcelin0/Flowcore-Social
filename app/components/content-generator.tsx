"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Settings, ImageIcon, VideoIcon, Home } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import {
  ImageGenerator,
  VideoGenerator,
  InteriorDesigner,
  SettingsSidebar,
  GeneratedContentGrid,
  FileUploadZone,
  type GeneratedContent,
  type UploadedImage,
  type ImageSettings,
  type VideoSettings,
  type InteriorSettings,
  type ContentType
} from './content-generator/index'

export function ContentGenerator() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<ContentType>('image')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      uploadedImages.forEach(image => {
        URL.revokeObjectURL(image.url);
      });
    };
  }, [uploadedImages]);

  // Image generation settings
  const [imageSettings, setImageSettings] = useState<ImageSettings>({
    model: 'dall-e-3',
    size: '1024x1024',
    quality: 'standard',
    style: 'vivid',
    count: 1
  })
  
  // Video generation settings (Google Veo 2/3)
  const [videoSettings, setVideoSettings] = useState<VideoSettings>({
    model: 'veo-2',
    duration: 5,
    fps: 24,
    resolution: '720p',
    style: 'cinematic',
    motionIntensity: 5,
    cameraMovement: 'static'
  })

  // Interior Design settings
  const [interiorSettings, setInteriorSettings] = useState<InteriorSettings>({
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

  const handleContentGenerated = (content: GeneratedContent) => {
    setGeneratedContent(prev => [content, ...prev])
  }

  const handleRemoveContent = (id: string) => {
    setGeneratedContent(prev => prev.filter(content => content.id !== id))
  }

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return

    const newImages: UploadedImage[] = Array.from(files).map(file => ({
      id: `img-${Date.now()}-${Math.random()}`,
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size
    }))

    setUploadedImages(prev => [...prev, ...newImages])
  }

  const handleRemoveUploadedImage = (id: string) => {
    setUploadedImages(prev => {
      const imageToRemove = prev.find(img => img.id === id)
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.url)
      }
      return prev.filter(img => img.id !== id)
    })
  }

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
            
            {/* Tab Content */}
            {activeTab === 'image' && (
              <ImageGenerator
                settings={imageSettings}
                onContentGenerated={handleContentGenerated}
                isGenerating={isGenerating}
                setIsGenerating={setIsGenerating}
              />
            )}

            {activeTab === 'video' && (
              <VideoGenerator
                settings={videoSettings}
                onContentGenerated={handleContentGenerated}
                isGenerating={isGenerating}
                setIsGenerating={setIsGenerating}
              />
            )}

            {activeTab === 'interior' && (
              <InteriorDesigner
                settings={interiorSettings}
                onContentGenerated={handleContentGenerated}
                isGenerating={isGenerating}
                setIsGenerating={setIsGenerating}
              />
            )}

            {/* Generated Content Grid */}
            <GeneratedContentGrid
              content={generatedContent}
              onRemoveContent={handleRemoveContent}
            />
          </div>
        </div>
      </div>

      {/* Settings Sidebar */}
      {showSettings && (
        <SettingsSidebar
          activeTab={activeTab}
          imageSettings={imageSettings}
          videoSettings={videoSettings}
          interiorSettings={interiorSettings}
          onImageSettingsChange={setImageSettings}
          onVideoSettingsChange={setVideoSettings}
          onInteriorSettingsChange={setInteriorSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
} 