"use client"

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Loader2, Wand2, Upload, X, Home, Palette, RotateCcw, Sun, Trees, Zap } from 'lucide-react'
import { toast } from 'sonner'

import { InteriorSettings, UploadedImage, GeneratedContent } from './types'

interface InteriorDesignerProps {
  settings: InteriorSettings
  onContentGenerated: (content: GeneratedContent) => void
  isGenerating: boolean
  setIsGenerating: (generating: boolean) => void
}

export function InteriorDesigner({ 
  settings, 
  onContentGenerated, 
  isGenerating, 
  setIsGenerating 
}: InteriorDesignerProps) {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Cleanup object URLs on unmount
  const cleanupObjectUrls = () => {
    uploadedImages.forEach(image => {
      URL.revokeObjectURL(image.url);
    });
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

  const removeUploadedImage = (id: string) => {
    setUploadedImages(prev => {
      const imageToRemove = prev.find(img => img.id === id)
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.url)
      }
      return prev.filter(img => img.id !== id)
    })
  }

  const processInteriorDesign = async () => {
    if (uploadedImages.length === 0) {
      toast.error('Please upload at least one image')
      return
    }

    setIsGenerating(true)

    try {
      // Process each uploaded image
      for (const image of uploadedImages) {
        const formData = new FormData()
        formData.append('image', image.file)
        formData.append('settings', JSON.stringify(settings))

        const response = await fetch('/api/interior-design', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`Failed to process ${image.name}`)
        }

        const result = await response.json()

        const newContent: GeneratedContent = {
          id: `interior-${Date.now()}-${Math.random()}`,
          type: 'interior',
          url: result.imageUrl,
          prompt: `Interior design for ${image.name}`,
          settings,
          createdAt: new Date(),
          originalImageId: image.id
        }

        onContentGenerated(newContent)
      }

      toast.success('Interior design processing completed!')
      
    } catch (error) {
      console.error('Interior design error:', error)
      toast.error('Failed to process interior design')
    } finally {
      setIsGenerating(false)
    }
  }

  const getServiceOptions = () => {
    if (settings.apiProvider === 'decor8ai') {
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
        { value: 'day-to-dusk', label: 'AI Day to Dusk', icon: Sun },
        { value: 'item-removal', label: 'AI Item Removal', icon: RotateCcw }
      ]
    }
  }

  return (
    <div className="space-y-6">
      {/* Multi-Image Upload */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Upload Images</Label>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="match-styling"
                  checked={settings.matchStyling}
                  onCheckedChange={(checked) => {
                    // This would need to be handled by the parent component
                    // For now, we'll just show the current state
                  }}
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
                    variant={settings.service === service.value ? 'default' : 'outline'}
                    onClick={() => {
                      // This would need to be handled by the parent component
                      // For now, we'll just show the current state
                    }}
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

      {/* Generate Button */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs">
                {settings.apiProvider.toUpperCase()}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {settings.service}
              </Badge>
            </div>
            <Button
              onClick={processInteriorDesign}
              disabled={uploadedImages.length === 0 || isGenerating}
              className="bg-black text-white hover:bg-gray-800 gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Process {uploadedImages.length} Image(s)
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
