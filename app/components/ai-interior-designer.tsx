"use client"

import React, { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Upload, 
  Wand2,
  Download,
  RefreshCw,
  Loader2,
  ImageIcon,
  Palette,
  Sparkles,
  Crown,
  X,
  Layers
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface UploadedImage {
  id: string
  file: File
  url: string
  name: string
  roomType: string
}

interface ProcessedResult {
  id: string
  originalImage: UploadedImage
  resultUrl: string
  style: string
  roomType: string
}

export function AIInteriorDesigner() {
  const { user } = useAuth()
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [selectedStyle, setSelectedStyle] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<ProcessedResult[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isPremium, setIsPremium] = useState(false)
  const [batchMode, setBatchMode] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const styles = [
    { id: 'modern', name: 'Modern' },
    { id: 'industrial', name: 'Industrial' },
    { id: 'scandinavian', name: 'Scandinavian' },
    { id: 'bohemian', name: 'Bohemian' },
    { id: 'minimalist', name: 'Minimalist' }
  ]

  const roomTypes = [
    { id: 'living_room', name: 'Living Room' },
    { id: 'bedroom', name: 'Bedroom' },
    { id: 'kitchen', name: 'Kitchen' },
    { id: 'bathroom', name: 'Bathroom' },
    { id: 'office', name: 'Office' }
  ]

  const handleFileUpload = async (files: FileList) => {
    const maxFiles = isPremium ? 1 : 10
    const filesToProcess = Array.from(files).slice(0, maxFiles)
    
    if (isPremium && uploadedImages.length >= 1) {
      toast.error('Premium mode allows only one image at a time.')
      return
    }

    for (const file of filesToProcess) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large. Max size: 10MB`)
        continue
      }

      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not a valid image file`)
        continue
      }

      const id = `${Date.now()}-${Math.random()}`
      const imageUrl = await uploadImageToStorage(file, id)
      
      if (imageUrl) {
        const newImage: UploadedImage = {
          id,
          file,
          url: imageUrl,
          name: file.name,
          roomType: 'living_room' // Default room type
        }
        
        if (isPremium) {
          setUploadedImages([newImage])
        } else {
          setUploadedImages(prev => [...prev, newImage])
        }
        toast.success(`${file.name} uploaded successfully`)
      }
    }
  }

  const uploadImageToStorage = async (file: File, imageId: string): Promise<string | null> => {
    try {
      const fileName = `${user?.id}/${imageId}-${Date.now()}.${file.name.split('.').pop()}`
      
      const { data, error } = await supabase.storage
        .from('interior-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) throw error

      const { data: publicUrlData } = supabase.storage
        .from('interior-images')
        .getPublicUrl(data.path)

      return publicUrlData.publicUrl
    } catch (error) {
      console.error('Failed to upload image:', error)
      toast.error('Failed to upload image')
      return null
    }
  }

  const processImages = async () => {
    if (uploadedImages.length === 0) {
      toast.error('Please upload at least one image')
      return
    }

    if (batchMode && !selectedStyle) {
      toast.error('Please select a style for batch processing')
      return
    }

    if (!user) {
      toast.error('Please sign in to process images')
      return
    }

    // Check if all images have room types
    const imagesWithoutRoomType = uploadedImages.filter(img => !img.roomType)
    if (imagesWithoutRoomType.length > 0) {
      toast.error('Please select room type for all images')
      return
    }

    setIsProcessing(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('No valid session found')
      }

      const processedResults: ProcessedResult[] = []

      for (const image of uploadedImages) {
        const styleToUse = batchMode ? selectedStyle : 'modern' // Default style if not in batch mode
        
        const requestBody = {
          imageUrl: image.url,
          action: 'change_style',
          styleId: styleToUse,
          roomType: image.roomType,
          usePremium: isPremium
        }

        const response = await fetch('/api/ai-studio/interior-design', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(requestBody)
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Failed to process ${image.name}`)
        }

        const result = await response.json()

        if (result.imageUrl) {
          processedResults.push({
            id: `result-${Date.now()}-${Math.random()}`,
            originalImage: image,
            resultUrl: result.imageUrl,
            style: styleToUse,
            roomType: image.roomType
          })
        }
      }

      setResults(processedResults)
      toast.success(`Successfully processed ${processedResults.length} image(s)!`)

    } catch (error) {
      console.error('Failed to process images:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to process images')
    } finally {
      setIsProcessing(false)
    }
  }

  const updateImageRoomType = (imageId: string, roomType: string) => {
    setUploadedImages(prev => 
      prev.map(img => 
        img.id === imageId ? { ...img, roomType } : img
      )
    )
  }

  const removeImage = (imageId: string) => {
    setUploadedImages(prev => prev.filter(img => img.id !== imageId))
    setResults(prev => prev.filter(result => result.originalImage.id !== imageId))
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileUpload(files)
    }
  }, [isPremium, uploadedImages.length])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const downloadResult = (result: ProcessedResult) => {
    const link = document.createElement('a')
    link.href = result.resultUrl
    link.download = `ai-design-${result.id}.jpg`
    link.click()
  }

  const startOver = () => {
    setUploadedImages([])
    setResults([])
    setSelectedStyle('')
    setBatchMode(false)
  }

  const addEmptyRoom = () => {
    const emptyRoom: UploadedImage = {
      id: `empty-${Date.now()}`,
      file: new File([], 'empty-room.jpg'),
      url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop',
      name: 'Empty Room Template',
      roomType: 'living_room'
    }
    
    if (isPremium) {
      setUploadedImages([emptyRoom])
    } else {
      setUploadedImages(prev => [...prev, emptyRoom])
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header with Controls */}
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Interior Design</h1>
            <p className="text-lg text-gray-600">Transform your rooms in seconds</p>
          </div>

          {/* Top Right Controls */}
          <div className="flex flex-col gap-3 items-end">
            {/* Premium Toggle */}
            <div className="flex items-center gap-2">
              <Button
                variant={!isPremium ? "default" : "outline"}
                size="sm"
                onClick={() => setIsPremium(false)}
                className="rounded-lg"
              >
                Standard
              </Button>
              <Button
                variant={isPremium ? "default" : "outline"}
                size="sm"
                onClick={() => setIsPremium(true)}
                className={`rounded-lg gap-1 ${isPremium ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0' : ''}`}
              >
                <Crown className="w-3 h-3" />
                Premium
              </Button>
            </div>

            {/* Batch Mode Controls (only when multiple images and not premium) */}
            {uploadedImages.length > 1 && !isPremium && (
              <div className="flex flex-col gap-2 items-end">
                <div className="flex items-center gap-2">
                  <Button
                    variant={batchMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setBatchMode(!batchMode)}
                    className="rounded-lg gap-1"
                  >
                    <Layers className="w-3 h-3" />
                    Batch Mode
                  </Button>
                </div>
                
                {batchMode && (
                  <div className="w-48">
                    <Select value={selectedStyle} onValueChange={setSelectedStyle}>
                      <SelectTrigger className="rounded-lg text-sm h-8">
                        <SelectValue placeholder="Select style for all" />
                      </SelectTrigger>
                      <SelectContent>
                        {styles.map((style) => (
                          <SelectItem key={style.id} value={style.id}>
                            {style.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Upload Section */}
        {uploadedImages.length === 0 && (
          <Card className="p-8">
            <div
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${
                isDragging 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-6">
                <Upload className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                {isDragging ? 'Drop your images here' : 'Upload Room Images'}
              </h3>
              <p className="text-lg text-gray-600 mb-6">
                {isPremium 
                  ? 'Upload one image for premium processing'
                  : 'Drag and drop multiple images or click to select'
                }
              </p>
              <div className="text-sm text-gray-500">
                Supports: JPG, PNG, WebP • Max: 10MB
                {!isPremium && ' • Up to 10 images'}
              </div>
            </div>

            <div className="flex gap-4 justify-center mt-6">
              <Button 
                size="lg"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2 rounded-xl"
              >
                <Upload className="w-5 h-5" />
                Choose Images
              </Button>
              <Button 
                variant="outline"
                size="lg"
                onClick={addEmptyRoom}
                className="gap-2 rounded-xl"
              >
                <ImageIcon className="w-5 h-5" />
                Use Empty Room
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple={!isPremium}
              accept="image/*"
              onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              className="hidden"
            />
          </Card>
        )}

        {/* Images Grid */}
        {uploadedImages.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Uploaded Images ({uploadedImages.length})
              </h2>
              <div className="flex gap-2">
                <Button
                  onClick={processImages}
                  disabled={isProcessing || (batchMode && !selectedStyle)}
                  className="gap-2 rounded-lg"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      Transform {batchMode ? 'All' : 'Images'}
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2 rounded-lg"
                  disabled={isPremium && uploadedImages.length >= 1}
                >
                  <Upload className="w-4 h-4" />
                  Add More
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {uploadedImages.map((image) => (
                <Card key={image.id} className="group hover:shadow-lg transition-all duration-300">
                  <div className="relative">
                    <div className="aspect-square rounded-t-lg overflow-hidden bg-gray-100">
                      <img
                        src={image.url}
                        alt={image.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <button
                      onClick={() => removeImage(image.id)}
                      className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="p-4">
                    <p className="text-sm font-medium text-gray-900 mb-3 truncate">{image.name}</p>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Room Type</label>
                      <Select 
                        value={image.roomType} 
                        onValueChange={(value) => updateImageRoomType(image.id, value)}
                      >
                        <SelectTrigger className="rounded-lg text-sm h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roomTypes.map((roomType) => (
                            <SelectItem key={roomType.id} value={roomType.id}>
                              {roomType.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple={!isPremium}
              accept="image/*"
              onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              className="hidden"
            />
          </Card>
        )}

        {/* Results Section */}
        {results.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-green-600" />
              AI Generated Results ({results.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {results.map((result) => (
                <div key={result.id} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border">
                        <img
                          src={result.originalImage.url}
                          alt="Before"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className="text-sm text-gray-600 mt-2 text-center">Before</p>
                    </div>
                    <div>
                      <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border">
                        <img
                          src={result.resultUrl}
                          alt="After"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className="text-sm text-gray-600 mt-2 text-center">
                        After - {styles.find(s => s.id === result.style)?.name}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => downloadResult(result)}
                      className="flex-1 gap-2 rounded-lg"
                      size="sm"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex gap-3 mt-6 pt-6 border-t">
              <Button
                variant="outline"
                onClick={startOver}
                className="gap-2 rounded-lg"
              >
                <RefreshCw className="w-4 h-4" />
                Start Over
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
} 