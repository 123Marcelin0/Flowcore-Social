"use client"

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Upload, 
  Paintbrush, 
  Wand2, 
  Download, 
  ArrowLeft, 
  ArrowRight, 
  Loader2,
  CheckCircle,
  AlertCircle,
  Home,
  X,
  Layers,
  ImageIcon,
  Check,
  RefreshCw
} from 'lucide-react'

// Types for interior design options
interface InteriorDesignOptions {
  style: string
  roomType: string
  lighting: string
  flooring: string
  furniture: string
  customInstructions: string
}

interface InteriorDesignResult {
  success: boolean
  imageUrl?: string
  blob?: Blob
  error?: string
  processingTime?: number
}

interface DesignOption {
  name: string
  description: string
}

interface InteriorStyle {
  name: string
  preview: string
  description: string
}

interface InteriorStyles {
  [key: string]: InteriorStyle
}

interface DesignOptions {
  [key: string]: DesignOption
}

// Available options
export const roomTypes: DesignOptions = {
  livingRoom: { name: 'Living Room', description: 'Main living space' },
  bedroom: { name: 'Bedroom', description: 'Sleeping quarters' },
  kitchen: { name: 'Kitchen', description: 'Cooking and dining area' },
  bathroom: { name: 'Bathroom', description: 'Bathroom and vanity' },
  diningRoom: { name: 'Dining Room', description: 'Formal dining space' },
  office: { name: 'Office', description: 'Work and study space' }
}

export const lightingOptions: DesignOptions = {
  softDaylight: { name: 'Soft Daylight', description: 'Natural, diffused lighting' },
  brightNatural: { name: 'Bright Natural', description: 'Abundant natural light' },
  warmEvening: { name: 'Warm Evening', description: 'Cozy ambient lighting' },
  coolWhite: { name: 'Cool White', description: 'Modern LED lighting' },
  ambientLighting: { name: 'Ambient', description: 'Soft, indirect lighting' }
}

export const flooringOptions: DesignOptions = {
  hardwood: { name: 'Hardwood', description: 'Classic wood flooring' },
  tile: { name: 'Tile', description: 'Ceramic or porcelain tiles' },
  carpet: { name: 'Carpet', description: 'Soft, plush carpeting' },
  concrete: { name: 'Concrete', description: 'Modern polished concrete' },
  marble: { name: 'Marble', description: 'Luxurious stone flooring' }
}

export const furnitureOptions: DesignOptions = {
  modern: { name: 'Modern', description: 'Clean lines and minimalist' },
  traditional: { name: 'Traditional', description: 'Classic and elegant' },
  minimalist: { name: 'Minimalist', description: 'Simple and functional' },
  eclectic: { name: 'Eclectic', description: 'Mixed styles and unique' },
  industrial: { name: 'Industrial', description: 'Raw and urban feel' }
}

// Interior styles for selection
const interiorStyles: InteriorStyles = {
  modern: { name: 'Modern', preview: '/placeholder.jpg', description: 'Clean lines and minimalist design' },
  scandinavian: { name: 'Scandinavian', preview: '/placeholder.jpg', description: 'Light wood and cozy textures' },
  industrial: { name: 'Industrial', preview: '/placeholder.jpg', description: 'Exposed brick and metal fixtures' },
  bohemian: { name: 'Bohemian', preview: '/placeholder.jpg', description: 'Colorful textiles and eclectic furniture' },
  minimalist: { name: 'Minimalist', preview: '/placeholder.jpg', description: 'Simple forms and few decorations' },
  traditional: { name: 'Traditional', preview: '/placeholder.jpg', description: 'Classic furniture and rich fabrics' }
}

  // Helper function to download transformed image
const downloadTransformedImage = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Professional real estate staging info component
const RealEstateDesignInfo = () => (
  <Alert className="mb-6 border-emerald-200 bg-emerald-50">
    <Home className="h-4 w-4 text-emerald-600" />
    <AlertDescription className="text-emerald-800">
      <strong>Professional Real Estate Staging:</strong> This tool adds high-end furniture and decor for property presentation. 
      It preserves all architectural elements (windows, walls, doors) and creates realistic staging as if photographed by a professional real estate photographer.
    </AlertDescription>
  </Alert>
)

interface InteriorDesignWorkflowProps {
  onImageTransformed: (imageUrl: string, originalFile: File, transformedBlob: Blob) => void
  onBack: () => void
  onNext: () => void
  initialImage?: File
}

export function InteriorDesignWorkflow({ 
  onImageTransformed, 
  onBack, 
  onNext, 
  initialImage 
}: InteriorDesignWorkflowProps) {
  // State management
  const [currentStep, setCurrentStep] = useState<'upload' | 'customize' | 'processing' | 'result'>('upload')
  const [selectedImage, setSelectedImage] = useState<File | null>(initialImage || null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isModelAvailable, setIsModelAvailable] = useState<boolean | null>(null)
  const [showComparison, setShowComparison] = useState(false)
  const [sliderPosition, setSliderPosition] = useState(50)
  const sliderRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  
  // Design options state
  const [designOptions, setDesignOptions] = useState<InteriorDesignOptions>({
    style: 'modern',
    roomType: 'livingRoom',
    lighting: 'softDaylight',
    flooring: 'hardwood',
    furniture: 'modern',
    customInstructions: ''
  })
  
  // Processing state
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [processingStage, setProcessingStage] = useState('')
  const [transformResult, setTransformResult] = useState<InteriorDesignResult | null>(null)
  
  // Error handling
  const [error, setError] = useState<string | null>(null)

  // Handle drag and drop
  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (file) {
      handleFileSelection(file)
    }
  }, [])

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }, [])

  // Handle file selection (from input or drag & drop)
  const handleFileSelection = useCallback((file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }
    
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file')
      return
    }
    
    setSelectedImage(file)
    setError(null)
    
    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }, [])

  // Handle image upload from input
  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileSelection(file)
    }
  }, [handleFileSelection])

  // Start the transformation process
  const handleStartTransformation = async () => {
    if (!selectedImage) return
    
    setCurrentStep('processing')
    setIsProcessing(true)
    setProcessingProgress(0)
    setProcessingStage('Preparing image...')
    setError(null)
    
    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProcessingProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + Math.random() * 10
        })
      }, 500)
      
      setProcessingStage('Analyzing interior space...')
      
      // Create form data for the API request
      const formData = new FormData()
      formData.append('image_file', selectedImage)
      
      // Add design options to form data
      Object.entries(designOptions).forEach(([key, value]) => {
        formData.append(key, value)
      })
      
      // Call the Reimagine Home API
      const response = await fetch('https://api.reimaginehome.ai/api/v1/interior-design', {
        method: 'POST',
        headers: {
          'x-api-key': '686d8281f0bdbfed5cb8f049'
        },
        body: formData
      })
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`)
      }
      
      const blob = await response.blob()
      const imageUrl = URL.createObjectURL(blob)
      
      clearInterval(progressInterval)
      setProcessingProgress(100)
      
      const result: InteriorDesignResult = {
        success: true,
        imageUrl,
        blob
      }
      
        setTransformResult(result)
        setCurrentStep('result')
      onImageTransformed(imageUrl, selectedImage, blob)
      
    } catch (error) {
      console.error('Transformation error:', error)
      setError(error instanceof Error ? error.message : 'An unexpected error occurred')
      setCurrentStep('customize')
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle download of transformed image
  const handleDownload = () => {
    if (transformResult?.blob) {
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `interior-design-${designOptions.style}-${timestamp}.jpg`
      downloadTransformedImage(transformResult.blob, filename)
    }
  }

  // Handle retry
  const handleRetry = () => {
    setCurrentStep('customize')
    setTransformResult(null)
    setError(null)
  }

  // Handle redo with original image and stronger prompt
  const handleRedo = async () => {
    if (!selectedImage) return
    
    setCurrentStep('processing')
    setIsProcessing(true)
    setProcessingProgress(0)
    setProcessingStage('Redoing with stronger constraints...')
    setError(null)
    
    const startTime = Date.now()
    
    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProcessingProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + Math.random() * 10
        })
      }, 500)
      
      setProcessingStage('Analyzing room structure more carefully...')
      
      // Create form data for the API request
      const formData = new FormData()
      formData.append('image_file', selectedImage)
      
      // Add design options to form data with stronger constraints
      Object.entries(designOptions).forEach(([key, value]) => {
        formData.append(key, value)
      })
      formData.append('redo', 'true') // Add redo flag
      
      // Call the Reimagine Home API
      const response = await fetch('https://api.reimaginehome.ai/api/v1/interior-design', {
        method: 'POST',
        headers: {
          'x-api-key': '686d8281f0bdbfed5cb8f049'
        },
        body: formData
      })
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`)
      }
      
      const blob = await response.blob()
      const imageUrl = URL.createObjectURL(blob)
      
      clearInterval(progressInterval)
      setProcessingProgress(100)
      
      const transformResult: InteriorDesignResult = {
        success: true,
        imageUrl,
        blob,
        processingTime: Date.now() - startTime
      }
      
      setTransformResult(transformResult)
        setCurrentStep('result')
      onImageTransformed(imageUrl, selectedImage, blob)
      
    } catch (error) {
      console.error('Redo transformation error:', error)
      setError(error instanceof Error ? error.message : 'An unexpected error occurred during redo')
      setCurrentStep('result') // Stay on result page to show error
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle starting over
  const handleStartOver = () => {
    setCurrentStep('upload')
    setSelectedImage(null)
    setImagePreview(null)
    setTransformResult(null)
    setError(null)
    setShowComparison(false)
    setDesignOptions({
      style: 'modern',
      roomType: 'livingRoom',
      lighting: 'softDaylight',
      flooring: 'hardwood',
      furniture: 'modern',
      customInstructions: ''
    })
  }

  // Handle slider drag
  const handleSliderDrag = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDraggingRef.current || !sliderRef.current) return

    const sliderRect = sliderRef.current.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX
    const position = ((x - sliderRect.left) / sliderRect.width) * 100

    // Clamp position between 0 and 100
    setSliderPosition(Math.max(0, Math.min(100, position)))
  }, [])

  // Handle slider drag end
  const handleSliderDragEnd = useCallback(() => {
    isDraggingRef.current = false
  }, [])

  // Add and remove event listeners for slider drag
  useEffect(() => {
    if (showComparison) {
      const handleMouseMove = (e: MouseEvent) => handleSliderDrag(e)
      const handleTouchMove = (e: TouchEvent) => handleSliderDrag(e)
      const handleMouseUp = () => handleSliderDragEnd()
      const handleTouchEnd = () => handleSliderDragEnd()

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('touchmove', handleTouchMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchend', handleTouchEnd)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [showComparison, handleSliderDrag, handleSliderDragEnd])

  // Render upload step
  const renderUploadStep = () => (
    <div className="text-center space-y-8">
      {/* Clean Header */}
      <div>
        <div className="w-20 h-20 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Home className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Raumfoto hochladen</h2>
        <p className="text-gray-600 text-lg">Wählen Sie ein Foto für die KI-Gestaltung aus</p>
      </div>

      {/* Simple Upload Area */}
      <div className="max-w-md mx-auto">
        <div
          className={`border-2 border-dashed rounded-2xl p-12 transition-all duration-300 cursor-pointer hover:scale-105 ${
            imagePreview 
              ? 'border-teal-500 bg-teal-50' 
              : 'border-gray-300 bg-gray-50 hover:border-teal-400 hover:bg-teal-50'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => document.getElementById('image-upload')?.click()}
        >
          {imagePreview ? (
            <div className="space-y-4">
              <img 
                src={imagePreview} 
                alt="Selected" 
                className="w-full h-48 object-cover rounded-xl"
              />
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedImage(null)
                    setImagePreview(null)
                  }}
                  className="text-gray-600"
                >
                  <X className="w-4 h-4 mr-2" />
                  Entfernen
                </Button>
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    setCurrentStep('customize')
                  }}
                  className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
                >
                  Weiter
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="w-16 h-16 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto">
                <Upload className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Foto auswählen</h3>
                <p className="text-gray-600">Klicken oder ziehen Sie Ihr Raumfoto hierher</p>
              </div>
              <div className="text-sm text-gray-500 space-y-1">
                <p>• Maximale Größe: 10MB</p>
                <p>• Format: JPG, PNG, WebP</p>
              </div>
            </div>
          )}
        </div>
        
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
          id="image-upload"
        />
      </div>

      {error && (
        <Alert className="max-w-md mx-auto bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )

  // Add internal sub-step state for the customize step
  const [subStep, setSubStep] = useState<'style' | 'room'>('style')

  // Update the customize step rendering
  const renderCustomizeStep = () => {
    if (subStep === 'style') {
      return renderStyleSelectionStep()
    } else {
      return renderRoomConfigStep()
    }
  }

  // Update navigation in style selection
  const renderStyleSelectionStep = () => (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="w-20 h-20 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Paintbrush className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Stil auswählen</h2>
        <p className="text-gray-600 text-lg">Wählen Sie Ihren gewünschten Interior-Stil</p>
      </div>

      {/* Style Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {interiorStyles && Object.entries(interiorStyles).map(([key, style]) => (
          <div
            key={key}
            onClick={() => setDesignOptions(prev => ({ ...prev, style: key }))}
            className={`p-8 rounded-2xl border-2 cursor-pointer transition-all duration-300 hover:scale-105 ${
              designOptions.style === key
                ? 'border-teal-500 bg-teal-50 shadow-lg'
                : 'border-gray-200 bg-white hover:border-teal-300 hover:bg-teal-50'
            }`}
          >
            <div className="text-center space-y-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
                designOptions.style === key ? 'bg-teal-500' : 'bg-gray-400'
              }`}>
                <Layers className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{style.name}</h3>
                <p className="text-gray-600 mt-2">{style.description}</p>
              </div>
              {designOptions.style === key && (
                <div className="flex justify-center">
                  <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex justify-between max-w-4xl mx-auto">
        <Button
          variant="outline"
          onClick={() => setCurrentStep('upload')}
          className="text-gray-600"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück
        </Button>
        <Button
          onClick={() => setSubStep('room')}
          disabled={!designOptions.style}
          className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white disabled:opacity-50"
        >
          Weiter
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )

  // Update navigation in room config
  const renderRoomConfigStep = () => (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="w-20 h-20 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Home className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Raum konfigurieren</h2>
        <p className="text-gray-600 text-lg">Definieren Sie Raumtyp und Details</p>
      </div>

      {/* Room Type Selection */}
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">Raumtyp</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {roomTypes && Object.entries(roomTypes).map(([key, room]) => (
              <button
                key={key}
                onClick={() => setDesignOptions(prev => ({ ...prev, roomType: key }))}
                className={`p-6 rounded-xl border-2 transition-all duration-300 hover:scale-105 ${
                  designOptions.roomType === key
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-gray-200 bg-white hover:border-teal-300 hover:bg-teal-50'
                }`}
              >
                <div className="text-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                    designOptions.roomType === key ? 'bg-teal-500' : 'bg-gray-400'
                  }`}>
                    <Home className="w-6 h-6 text-white" />
                  </div>
                  <div className="font-semibold text-gray-900">{room.name}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Additional Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <Label className="text-base font-semibold text-gray-900 mb-3 block">Beleuchtung</Label>
            <Select
              value={designOptions.lighting}
              onValueChange={(value) => setDesignOptions(prev => ({ ...prev, lighting: value }))}
            >
              <SelectTrigger className="h-12 border-2 rounded-xl">
                <SelectValue placeholder="Wählen..." />
              </SelectTrigger>
              <SelectContent>
                {lightingOptions && Object.entries(lightingOptions).map(([key, lighting]) => (
                  <SelectItem key={key} value={key}>{lighting.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-base font-semibold text-gray-900 mb-3 block">Bodenbelag</Label>
            <Select
              value={designOptions.flooring}
              onValueChange={(value) => setDesignOptions(prev => ({ ...prev, flooring: value }))}
            >
              <SelectTrigger className="h-12 border-2 rounded-xl">
                <SelectValue placeholder="Wählen..." />
              </SelectTrigger>
              <SelectContent>
                {flooringOptions && Object.entries(flooringOptions).map(([key, flooring]) => (
                  <SelectItem key={key} value={key}>{flooring.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-base font-semibold text-gray-900 mb-3 block">Möbelstil</Label>
            <Select
              value={designOptions.furniture}
              onValueChange={(value) => setDesignOptions(prev => ({ ...prev, furniture: value }))}
            >
              <SelectTrigger className="h-12 border-2 rounded-xl">
                <SelectValue placeholder="Wählen..." />
              </SelectTrigger>
              <SelectContent>
                {furnitureOptions && Object.entries(furnitureOptions).map(([key, furniture]) => (
                  <SelectItem key={key} value={key}>{furniture.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Custom Instructions */}
        <div>
          <Label className="text-base font-semibold text-gray-900 mb-3 block">Besondere Wünsche (Optional)</Label>
          <textarea
            placeholder="Beschreiben Sie spezielle Gestaltungswünsche..."
            value={designOptions.customInstructions}
            onChange={(e) => setDesignOptions(prev => ({ 
              ...prev, 
              customInstructions: e.target.value 
            }))}
            className="w-full h-24 px-4 py-3 border-2 border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            rows={3}
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between max-w-4xl mx-auto">
        <Button
          variant="outline"
          onClick={() => setSubStep('style')}
          className="text-gray-600"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück
        </Button>
        <Button
          onClick={handleStartTransformation}
          disabled={!designOptions.roomType}
          className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white disabled:opacity-50"
        >
          <Wand2 className="w-4 h-4 mr-2" />
          Design erstellen
        </Button>
      </div>
    </div>
  )

  // Render processing step
  const renderProcessingStep = () => (
    <div className="text-center space-y-8 py-16">
      <div className="w-24 h-24 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto">
        <Loader2 className="w-12 h-12 text-white animate-spin" />
      </div>
      
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">KI Design wird erstellt</h2>
        <p className="text-gray-600 text-lg max-w-md mx-auto">
          Unser KI-System analysiert Ihr Foto und erstellt das neue Design.
        </p>
      </div>

      <div className="max-w-sm mx-auto space-y-4">
        <Progress value={processingProgress} className="h-3" />
        <p className="text-gray-600 font-medium">{processingStage}</p>
      </div>
    </div>
  )

  // Render result step
  const renderResultStep = () => (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Design fertig!</h2>
        <p className="text-gray-600 text-lg">Ihr neues Interior Design ist bereit</p>
      </div>

      {/* Before/After Toggle */}
      <div className="flex justify-center">
        <div className="bg-gray-100 rounded-full p-1 flex">
          <Button
            variant={!showComparison ? "default" : "ghost"}
            size="sm"
            onClick={() => setShowComparison(false)}
            className={`rounded-full px-6 ${!showComparison ? 'bg-white shadow-sm' : ''}`}
          >
            Ergebnis
          </Button>
          <Button
            variant={showComparison ? "default" : "ghost"}
            size="sm"
            onClick={() => setShowComparison(true)}
            className={`rounded-full px-6 ${showComparison ? 'bg-white shadow-sm' : ''}`}
          >
            Vergleich
          </Button>
        </div>
      </div>

      {/* Image Display */}
      {transformResult?.imageUrl && (
        <div className="max-w-2xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white">
            {showComparison ? (
              // Before/After Comparison
              <div 
                ref={sliderRef}
                className="relative aspect-video cursor-ew-resize"
                onMouseDown={(e) => {
                  isDraggingRef.current = true
                  handleSliderDrag(e.nativeEvent)
                }}
                onTouchStart={(e) => {
                  isDraggingRef.current = true
                  handleSliderDrag(e.nativeEvent)
                }}
              >
                <img
                  src={imagePreview || ''}
                  alt="Original"
                  className="w-full h-full object-cover"
                />
                <div 
                  className="absolute inset-0 overflow-hidden"
                  style={{ 
                    clipPath: `polygon(${sliderPosition}% 0%, 100% 0%, 100% 100%, ${sliderPosition}% 100%)` 
                  }}
                >
                  <img
                    src={transformResult.imageUrl}
                    alt="Designed"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div 
                  className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
                  style={{ left: `${sliderPosition}%` }}
                >
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-gray-300">
                    <div className="w-6 h-6 rounded-full bg-teal-500"></div>
                  </div>
                </div>
                <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium">
                  VORHER
                </div>
                <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium">
                  NACHHER
                </div>
              </div>
            ) : (
              <img
                src={transformResult.imageUrl}
                alt="Designed interior"
                className="w-full aspect-video object-cover"
              />
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 justify-center">
        <Button
          onClick={handleDownload}
          className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
          disabled={!transformResult?.blob}
        >
          <Download className="w-4 h-4 mr-2" />
          Design herunterladen
        </Button>
        
        <Button
          variant="outline"
          onClick={handleStartOver}
          className="text-gray-600"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Neues Design
        </Button>

        <Button
          onClick={onNext}
          className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
        >
          Design verwenden
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {error && (
        <Alert className="max-w-md mx-auto bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )

  // Update the main step management
  useEffect(() => {
    if (currentStep === 'customize') {
      setSubStep('style')
    }
  }, [currentStep])

  // Update main render
  return (
    <div className="w-full max-w-6xl mx-auto p-8">
      {/* Clean Progress Bar */}
      <div className="mb-12">
        <div className="flex items-center justify-center space-x-8">
          {[
            { key: 'upload', label: 'Upload', number: 1 },
            { key: 'customize-style', label: 'Stil', number: 2 },
            { key: 'customize-room', label: 'Raum', number: 3 },
            { key: 'processing', label: 'Design', number: 4 },
            { key: 'result', label: 'Fertig', number: 5 }
          ].map((step, index) => {
            let isActive = false
            let isCurrent = false
            
            if (currentStep === 'upload' && step.key === 'upload') {
              isActive = true
              isCurrent = true
            } else if (currentStep === 'customize') {
              if (step.key === 'upload') {
                isActive = true
              } else if (step.key === 'customize-style') {
                isActive = true
                isCurrent = subStep === 'style'
              } else if (step.key === 'customize-room') {
                isActive = subStep === 'room'
                isCurrent = subStep === 'room'
              }
            } else if (currentStep === 'processing') {
              if (['upload', 'customize-style', 'customize-room', 'processing'].includes(step.key)) {
                isActive = true
                isCurrent = step.key === 'processing'
              }
            } else if (currentStep === 'result') {
              isActive = true
              isCurrent = step.key === 'result'
            }
            
            return (
              <div key={step.key} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    isCurrent
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white scale-110 shadow-lg'
                      : isActive 
                        ? 'bg-teal-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step.number}
                  </div>
                  <span className={`text-sm font-medium mt-2 ${
                    isCurrent ? 'text-teal-600' : 'text-gray-500'
                  }`}>
                    {step.label}
                  </span>
                </div>
                {index < 4 && (
                  <div className={`w-16 h-1 mx-4 rounded-full transition-all ${
                    isActive ? 'bg-teal-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 min-h-[600px]">
        {currentStep === 'upload' && renderUploadStep()}
        {currentStep === 'customize' && renderCustomizeStep()}
        {currentStep === 'processing' && renderProcessingStep()}
        {currentStep === 'result' && renderResultStep()}
      </div>
    </div>
  )
} 