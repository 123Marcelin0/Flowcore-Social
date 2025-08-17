"use client"

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { 
  Upload, 
  X, 
  ImageIcon, 
  VideoIcon, 
  FileIcon, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Trash2, 
  Download, 
  Eye, 
  Wand2,
  Sparkles,
  Crown,
  Layers, 
  Star, 
  Zap, 
  Gem, 
  Plus, 
  ArrowLeft, 
  Home, 
  MessageSquare, 
  Lightbulb, 
  Settings, 
  Bell, 
  ChevronDown, 
  User, 
  CreditCard, 
  LogOut, 
  Mail, 
  Shield, 
  Calendar, 
  FileText, 
  Play, 
  Send, 
  Paperclip, 
  RefreshCw 
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
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
  const [results, setResults] = useState<ProcessedResult[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedStyle, setSelectedStyle] = useState('modern')
  const [isPremium, setIsPremium] = useState(false)
  const [batchMode, setBatchMode] = useState(false)
  const [isPageLoaded, setIsPageLoaded] = useState(false)
  const [isFlipped, setIsFlipped] = useState(false)

  const [selectedImage, setSelectedImage] = useState<ProcessedResult | null>(null)
  const [showImagePopup, setShowImagePopup] = useState(false)
  const [sliderPosition, setSliderPosition] = useState(50)
  const [isSliderActive, setIsSliderActive] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [processingImages, setProcessingImages] = useState<Set<string>>(new Set())
  const [transformedImages, setTransformedImages] = useState<Set<string>>(new Set())
  const [enhancingImages, setEnhancingImages] = useState<Set<string>>(new Set())
  const [enhancedImages, setEnhancedImages] = useState<Map<string, string>>(new Map()) // imageId -> enhancedUrl
  const fileInputRef = useRef<HTMLInputElement>(null)

  const styles = [
    { id: 'modern', name: 'Modern' },
    { id: 'industrial', name: 'Industrial' },
    { id: 'scandinavian', name: 'Scandinavian' },
    { id: 'bohemian', name: 'Bohemian' },
    { id: 'minimalist', name: 'Minimalist' }
  ]

  // Demo function to get result URLs for testing
  const getDemoResultUrl = (style: string, roomType: string = 'living-room'): string => {
    const demoImages: Record<string, Record<string, string>> = {
      'modern': {
        'living-room': 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop',
        'bedroom': 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
        'kitchen': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop',
        'bathroom': 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800&h=600&fit=crop',
        'office': 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop'
      },
      'industrial': {
        'living-room': 'https://images.unsplash.com/photo-1560448204-6033e33cec41?w=800&h=600&fit=crop',
        'bedroom': 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
        'kitchen': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop',
        'bathroom': 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800&h=600&fit=crop',
        'office': 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop'
      },
      'scandinavian': {
        'living-room': 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop',
        'bedroom': 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
        'kitchen': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop',
        'bathroom': 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800&h=600&fit=crop',
        'office': 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop'
      },
      'bohemian': {
        'living-room': 'https://images.unsplash.com/photo-1560448204-6033e33cec41?w=800&h=600&fit=crop',
        'bedroom': 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
        'kitchen': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop',
        'bathroom': 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800&h=600&fit=crop',
        'office': 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop'
      },
      'minimalist': {
        'living-room': 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop',
        'bedroom': 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
        'kitchen': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop',
        'bathroom': 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800&h=600&fit=crop',
        'office': 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop'
      }
    }
    
    // Return a different image than the original to show transformation
    const fallbackUrl = 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop'
    return demoImages[style]?.[roomType] || fallbackUrl
  }

  useEffect(() => {
    setIsPageLoaded(true)
  }, [])

  const handleFileUpload = async (files: FileList) => {
    const maxFiles = isPremium ? 1 : 10
    const filesToProcess = Array.from(files).slice(0, maxFiles)
    
    if (isPremium && (uploadedImages.length >= 1 || filesToProcess.length > 1)) {
      toast.error('Premium mode allows only one image at a time.')
      return
    }

    // Trigger flip animation when images are uploaded
    if (uploadedImages.length === 0 && filesToProcess.length > 0) {
      setTimeout(() => setIsFlipped(true), 1200)
    }

    for (const file of filesToProcess) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file.`)
        continue
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Maximum size is 10MB.`)
        continue
      }

      const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const imageUrl = URL.createObjectURL(file)
      
      const newImage: UploadedImage = {
        id: imageId,
        file,
        url: imageUrl,
        name: file.name,
        roomType: 'living-room'
      }
      
        setUploadedImages(prev => [...prev, newImage])
    }
  }

  // Handler for generating videos from interior images
  const handleGenerateVideoFromImage = async (imageUrl: string, roomType: string) => {
    try {
      // Generate camera movement prompt based on room type
      const cameraPrompts = {
        'living-room': 'Smooth pan from left to right showcasing the elegant living room design with gentle zoom into the seating area',
        'bedroom': 'Slow circular motion around the bedroom highlighting the cozy atmosphere and lighting',
        'kitchen': 'Steady dolly movement from entrance to kitchen island, emphasizing the modern design and functionality',
        'bathroom': 'Gentle zoom in focusing on the luxurious bathroom fixtures and ambient lighting',
        'dining-room': 'Smooth arc movement around the dining table showcasing the elegant dining space',
        'office': 'Professional pan across the office space highlighting the productive and modern work environment',
        'kids-room': 'Playful gentle movement showcasing the colorful and creative kids room design',
        'guest-room': 'Welcoming pan across the guest room emphasizing comfort and hospitality'
      }

      const prompt = cameraPrompts[roomType as keyof typeof cameraPrompts] || cameraPrompts['living-room']

      // Start video generation job
      const response = await fetch('/api/ai-studio/runwayml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_video_from_image',
          imageUrl,
          cameraMovementPrompt: prompt,
          videoLength: 5,
          aspectRatio: '9:16' // For Instagram Reels
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Video generation failed')
      }

      const { jobId } = await response.json()
      toast.success('Reel-Generierung gestartet! Status wird in Kürze angezeigt...')

      // You could add polling here to check job status
      // For now, we'll just show a success message
      
    } catch (error) {
      console.error('Video generation error:', error)
      toast.error(error instanceof Error ? error.message : 'Fehler bei der Reel-Generierung')
    }
  }

  const uploadImageToStorage = async (file: File, imageId: string): Promise<string | null> => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('imageId', imageId)

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to upload image')
      }

      const data = await response.json()
      return data.url
    } catch (error) {
      console.error('Error uploading image:', error)
      return null
    }
  }

  const processImages = async () => {
    if (uploadedImages.length === 0) {
      toast.error('Please upload at least one image.')
      return
    }

    setIsProcessing(true)
    const processingImages = new Set<string>()
    setProcessingImages(processingImages)

    try {
      const newResults: ProcessedResult[] = []

      for (const image of uploadedImages) {
        // Mark image as processing
        processingImages.add(image.id)
        setProcessingImages(new Set(processingImages))

        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 3000))

        // Use demo result for testing (skip actual upload for demo)
        const demoResultUrl = getDemoResultUrl(selectedStyle, image.roomType)

        newResults.push({
          id: `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          originalImage: image,
          resultUrl: demoResultUrl,
          style: selectedStyle,
          roomType: image.roomType
        })

        // Mark image as transformed
        processingImages.delete(image.id)
        setProcessingImages(new Set(processingImages))
        
        setTransformedImages(prev => new Set([...prev, image.id]))
      }

      setResults(newResults)
      toast.success(`Successfully processed ${newResults.length} image(s)!`)
    } catch (error) {
      console.error('Error processing images:', error)
      toast.error('Failed to process images. Please try again.')
    } finally {
      setIsProcessing(false)
      setProcessingImages(new Set())
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
    setUploadedImages(prev => {
      const image = prev.find(img => img.id === imageId)
      if (image) {
        URL.revokeObjectURL(image.url)
      }
      return prev.filter(img => img.id !== imageId)
    })
  }
  const downloadResult = async (result: ProcessedResult) => {
    try {
      const response = await fetch(result.resultUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `ai-design-${result.id}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      toast.error('Failed to download image')
      console.error('Download failed:', error)
    }
  }

  const startOver = () => {
    setUploadedImages([])
    setResults([])
    setIsFlipped(false)
    setSelectedStyle('modern')
    setBatchMode(false)
    setProcessingImages(new Set())
    setTransformedImages(new Set())
    setEnhancedImages(new Map())
    setEnhancingImages(new Set())
  }

  const enhanceImage = async (imageId: string, enhancementType: 'upscale' | 'enhance' | 'denoise' | 'sharpen' = 'upscale', scale: number = 2) => {
    const image = uploadedImages.find(img => img.id === imageId)
    if (!image) {
      toast.error('Bild nicht gefunden')
      return
    }

    setEnhancingImages(prev => new Set(prev).add(imageId))

    try {
      // Call RunwayML enhancement API
      const response = await fetch('/api/ai-studio/runwayml', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'enhance_image',
          imageUrl: image.url,
          enhancementType,
          scale,
          quality: 'high'
        })
      })

      if (!response.ok) {
        throw new Error('Enhancement request failed')
      }

      const data = await response.json()
      
      if (data.success) {
        // Poll for job completion
        await pollJobStatus(data.jobId, imageId, enhancementType)
      } else {
        throw new Error(data.error || 'Enhancement failed')
      }
    } catch (error) {
      console.error('Enhancement error:', error)
      toast.error('Bildverbesserung fehlgeschlagen')
    } finally {
      setEnhancingImages(prev => {
        const newSet = new Set(prev)
        newSet.delete(imageId)
        return newSet
      })
    }
  }

  const pollJobStatus = async (jobId: string, imageId: string, enhancementType: string) => {
    const maxAttempts = 30 // 30 seconds max
    let attempts = 0

    const poll = async (): Promise<void> => {
      try {
        const response = await fetch(`/api/ai-studio/runwayml?jobId=${jobId}`)
        const data = await response.json()

        if (data.status === 'completed') {
          setEnhancedImages(prev => new Map(prev).set(imageId, data.result.enhancedImageUrl))
          toast.success(`${enhancementType === 'upscale' ? 'Upscaling' : 'Enhancement'} erfolgreich!`)
          return
        } else if (data.status === 'failed') {
          throw new Error(data.result?.error || 'Enhancement failed')
        } else if (attempts >= maxAttempts) {
          throw new Error('Enhancement timeout')
        } else {
          attempts++
          setTimeout(poll, 1000) // Poll every second
        }
      } catch (error) {
        console.error('Polling error:', error)
        toast.error('Enhancement fehlgeschlagen')
      }
    }

    await poll()
  }

  const addEmptyRoom = () => {
    // Add two example empty room images
    const emptyRoom1: UploadedImage = {
      id: `empty_1_${Date.now()}`,
      file: new File([''], 'empty-room-1.jpg', { type: 'image/jpeg' }),
      url: 'https://images.unsplash.com/photo-1560448204-6033e33cec41?w=800&h=600&fit=crop',
      name: 'Empty Room 1',
      roomType: 'living-room'
    }
    
    const emptyRoom2: UploadedImage = {
      id: `empty_2_${Date.now()}`,
      file: new File([''], 'empty-room-2.jpg', { type: 'image/jpeg' }),
      url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop',
      name: 'Empty Room 2',
      roomType: 'bedroom'
    }
    
    if (isPremium && uploadedImages.length >= 1) {
      toast.error('Premium mode allows only one image at a time.')
    } else {
      setUploadedImages(prev => [...prev, emptyRoom1, emptyRoom2])
      
      // Trigger flip animation when adding empty rooms
      if (uploadedImages.length === 0) {
        setTimeout(() => setIsFlipped(true), 1200)
      }
    }
  }

  // Slider functionality
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && isSliderActive) {
        const sliderContainer = document.querySelector('.slider-container')
        if (sliderContainer) {
          const rect = sliderContainer.getBoundingClientRect()
          const x = e.clientX - rect.left
          const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
          setSliderPosition(percentage)
        }
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && isSliderActive) {
        e.preventDefault()
        const sliderContainer = document.querySelector('.slider-container')
        if (sliderContainer) {
          const rect = sliderContainer.getBoundingClientRect()
          const x = e.touches[0].clientX - rect.left
          const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
          setSliderPosition(percentage)
        }
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    const handleTouchEnd = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchend', handleTouchEnd)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isDragging, isSliderActive])

  return (
    <div className="relative overflow-hidden min-h-screen">
      {/* No background blur - keep background sharp */}
      {/* White Glassmorphic Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large grey stains */}
        <div className="absolute inset-0">
          {[...Array(8)].map((_, i) => (
            <div
              key={`stain-${i}`}
              className="absolute rounded-full opacity-15"
              style={{
                background: `radial-gradient(circle, rgba(71,85,105,0.4), rgba(100,116,139,0.3), transparent)`,
                width: `${200 + i * 80}px`,
                height: `${200 + i * 80}px`,
                left: `${8 + i * 12}%`,
                top: `${12 + Math.sin(i) * 20}%`,
                animation: `stain-${i} ${18 + i * 2}s ease-in-out infinite`,
                filter: 'blur(3px)'
              }}
            />
          ))}
        </div>

        {/* Light grey bubbles */}
        <div className="absolute inset-0">
          {[...Array(12)].map((_, i) => (
            <div
              key={`bubble-${i}`}
              className="absolute rounded-full opacity-20"
              style={{
                background: `radial-gradient(circle, rgba(71,85,105,0.5), rgba(100,116,139,0.3), transparent)`,
                width: `${25 + i * 20}px`,
                height: `${25 + i * 20}px`,
                left: `${3 + i * 8}%`,
                top: `${8 + Math.cos(i) * 25}%`,
                animation: `bubble-${i} ${12 + i * 1.5}s ease-in-out infinite`,
                filter: 'blur(1px)'
              }}
            />
          ))}
        </div>

        {/* Grey flowing lines */}
        <div className="absolute inset-0">
          {[...Array(5)].map((_, i) => (
            <div
              key={`line-${i}`}
              className="absolute opacity-10"
              style={{
                background: `linear-gradient(${30 + i * 30}deg, transparent, #475569, #64748b, transparent)`,
                width: '3px',
                height: '250%',
                left: `${20 + i * 20}%`,
                animation: `line-${i} ${20 + i * 6}s linear infinite`,
                filter: 'blur(1px)'
              }}
            />
          ))}
        </div>

        {/* Additional grey particles */}
        <div className="absolute inset-0">
          {[...Array(15)].map((_, i) => (
            <div
              key={`particle-${i}`}
              className="absolute rounded-full opacity-15"
              style={{
                background: `radial-gradient(circle, rgba(71,85,105,0.6), transparent)`,
                width: `${8 + i * 3}px`,
                height: `${8 + i * 3}px`,
                left: `${2 + i * 6}%`,
                top: `${5 + Math.sin(i * 0.5) * 30}%`,
                animation: `particle-${i} ${10 + i * 1}s ease-in-out infinite`,
                filter: 'blur(0.5px)'
              }}
            />
          ))}
        </div>

        {/* CSS Animations */}
        <style jsx>{`
          @keyframes stain-0 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; } 50% { transform: translate(35px, -25px) scale(1.4); opacity: 0.25; } }
          @keyframes stain-1 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; } 50% { transform: translate(-30px, 30px) scale(0.7); opacity: 0.20; } }
          @keyframes stain-2 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; } 50% { transform: translate(25px, 35px) scale(1.3); opacity: 0.23; } }
          @keyframes stain-3 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; } 50% { transform: translate(-35px, -20px) scale(0.8); opacity: 0.18; } }
          @keyframes stain-4 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; } 50% { transform: translate(40px, 25px) scale(1.2); opacity: 0.22; } }
          @keyframes stain-5 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; } 50% { transform: translate(-25px, 40px) scale(0.9); opacity: 0.21; } }
          @keyframes stain-6 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; } 50% { transform: translate(30px, -35px) scale(1.1); opacity: 0.24; } }
          @keyframes stain-7 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; } 50% { transform: translate(-40px, 15px) scale(0.6); opacity: 0.19; } }
          
          @keyframes bubble-0 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.20; } 50% { transform: translate(20px, -30px) scale(1.3); opacity: 0.35; } }
          @keyframes bubble-1 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.20; } 50% { transform: translate(-25px, 35px) scale(0.7); opacity: 0.30; } }
          @keyframes bubble-2 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.20; } 50% { transform: translate(30px, 20px) scale(1.2); opacity: 0.33; } }
          @keyframes bubble-3 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.20; } 50% { transform: translate(-20px, -25px) scale(0.8); opacity: 0.27; } }
          @keyframes bubble-4 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.20; } 50% { transform: translate(35px, 30px) scale(1.4); opacity: 0.37; } }
          @keyframes bubble-5 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.20; } 50% { transform: translate(-30px, 20px) scale(0.6); opacity: 0.25; } }
          @keyframes bubble-6 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.20; } 50% { transform: translate(25px, -35px) scale(1.1); opacity: 0.31; } }
          @keyframes bubble-7 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.20; } 50% { transform: translate(-35px, 25px) scale(0.9); opacity: 0.28; } }
          @keyframes bubble-8 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.20; } 50% { transform: translate(15px, 40px) scale(1.3); opacity: 0.34; } }
          @keyframes bubble-9 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.20; } 50% { transform: translate(-40px, -15px) scale(0.7); opacity: 0.26; } }
          @keyframes bubble-10 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.20; } 50% { transform: translate(40px, -20px) scale(1.2); opacity: 0.32; } }
          @keyframes bubble-11 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.20; } 50% { transform: translate(-15px, 45px) scale(0.8); opacity: 0.29; } }
          
          @keyframes line-0 { 0% { transform: translateY(-100%) rotate(0deg); } 100% { transform: translateY(100vh) rotate(360deg); } }
          @keyframes line-1 { 0% { transform: translateY(-100%) rotate(180deg); } 100% { transform: translateY(100vh) rotate(540deg); } }
          @keyframes line-2 { 0% { transform: translateY(-100%) rotate(90deg); } 100% { transform: translateY(100vh) rotate(450deg); } }
          @keyframes line-3 { 0% { transform: translateY(-100%) rotate(270deg); } 100% { transform: translateY(100vh) rotate(630deg); } }
          @keyframes line-4 { 0% { transform: translateY(-100%) rotate(45deg); } 100% { transform: translateY(100vh) rotate(405deg); } }
          
          @keyframes particle-0 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; } 50% { transform: translate(10px, -15px) scale(1.2); opacity: 0.25; } }
          @keyframes particle-1 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; } 50% { transform: translate(-12px, 18px) scale(0.8); opacity: 0.20; } }
          @keyframes particle-2 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; } 50% { transform: translate(15px, 12px) scale(1.1); opacity: 0.23; } }
          @keyframes particle-3 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; } 50% { transform: translate(-8px, -20px) scale(0.9); opacity: 0.18; } }
          @keyframes particle-4 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; } 50% { transform: translate(20px, 25px) scale(1.3); opacity: 0.27; } }
          @keyframes particle-5 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; } 50% { transform: translate(-18px, 15px) scale(0.7); opacity: 0.21; } }
          @keyframes particle-6 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; } 50% { transform: translate(12px, -25px) scale(1.1); opacity: 0.24; } }
          @keyframes particle-7 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; } 50% { transform: translate(-25px, 22px) scale(0.8); opacity: 0.19; } }
          @keyframes particle-8 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; } 50% { transform: translate(18px, 30px) scale(1.2); opacity: 0.26; } }
          @keyframes particle-9 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; } 50% { transform: translate(-15px, -18px) scale(0.9); opacity: 0.22; } }
          @keyframes particle-10 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; } 50% { transform: translate(25px, -12px) scale(1.1); opacity: 0.25; } }
          @keyframes particle-11 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; } 50% { transform: translate(-20px, 35px) scale(0.8); opacity: 0.20; } }
          @keyframes particle-12 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; } 50% { transform: translate(30px, -18px) scale(1.2); opacity: 0.28; } }
          @keyframes particle-13 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; } 50% { transform: translate(-12px, 28px) scale(0.9); opacity: 0.23; } }
          @keyframes particle-14 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; } 50% { transform: translate(22px, 15px) scale(1.1); opacity: 0.26; } }
        `}</style>
      </div>
      
      <div className="relative z-20 max-w-6xl mx-auto space-y-6 p-6">
        {/* Flip Container for Header */}
        <div className={`relative w-full h-32 transition-all duration-1500 ${
          isPageLoaded 
            ? 'opacity-100 translate-y-0 scale-100' 
            : 'opacity-0 translate-y-8 scale-95'
        }`} style={{ transitionDelay: '300ms' }}>
          <div 
            className="relative w-full h-full transition-transform duration-6000 ease-out"
            style={{
              transformStyle: 'preserve-3d',
              transform: isFlipped ? 'rotateX(180deg)' : 'rotateX(0deg)'
            }}
          >
            {/* Apple Liquid Glass Header */}
            <div 
              className="absolute inset-0 w-full h-full p-6 overflow-hidden transition-all duration-700 ease-out hover:scale-[1.01]"
              style={{ 
                backfaceVisibility: 'hidden',
                transform: 'translateZ(0px)',
                background: `
                  linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%),
                  radial-gradient(ellipse at top left, rgba(255, 255, 255, 0.12) 0%, transparent 50%),
                  radial-gradient(ellipse at bottom right, rgba(255, 255, 255, 0.06) 0%, transparent 50%)
                `,
                backdropFilter: 'blur(40px) saturate(200%) brightness(1.1)',
                WebkitBackdropFilter: 'blur(40px) saturate(200%) brightness(1.1)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '24px',
                boxShadow: `
                  0 20px 60px rgba(0, 0, 0, 0.08),
                  0 8px 25px rgba(0, 0, 0, 0.04),
                  inset 0 1px 0 rgba(255, 255, 255, 0.25),
                  inset 0 -1px 0 rgba(255, 255, 255, 0.05)
                `
              }}
            >
              {/* Liquid glass highlight */}
              <div 
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 60%)',
                  borderRadius: '24px'
                }}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Apple Liquid Glass Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="relative h-11 px-6 text-slate-700 font-medium transition-all duration-500 ease-out hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98] overflow-hidden group"
                    style={{ 
                      transform: 'translateZ(20px)',
                      background: `
                        linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.04) 100%),
                        radial-gradient(ellipse at top, rgba(255, 255, 255, 0.15) 0%, transparent 70%)
                      `,
                      backdropFilter: 'blur(30px) saturate(200%) brightness(1.1)',
                      WebkitBackdropFilter: 'blur(30px) saturate(200%) brightness(1.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '16px',
                      boxShadow: `
                        0 8px 32px rgba(0, 0, 0, 0.06),
                        0 2px 8px rgba(0, 0, 0, 0.04),
                        inset 0 1px 0 rgba(255, 255, 255, 0.3)
                      `
                    }}
                  >
                    {/* Liquid glass highlight */}
                    <div 
                      className="absolute inset-0 opacity-30 pointer-events-none transition-opacity duration-500 group-hover:opacity-40"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, transparent 60%)',
                        borderRadius: '16px'
                      }}
                    />
                    <span className="relative z-10">AI Studio</span>
                  </Button>
                </div>

                {/* Premium Toggle - White Glassmorphic Design */}
                <div className="transition-all duration-1000" style={{ transitionDelay: '600ms', transform: 'translateZ(15px)' }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPremium(!isPremium)}
                    className={`h-14 px-8 text-sm font-medium gap-2 transition-all duration-300 rounded-full hover:scale-105 active:scale-95 ${
                      isPremium 
                        ? 'bg-white/15 backdrop-blur-3xl text-slate-700 border border-white/30 hover:bg-white/25 shadow-[0_8px_32px_rgba(31,38,135,0.37)]' 
                        : 'bg-white/15 backdrop-blur-3xl text-slate-700 border border-white/30 hover:bg-white/25 shadow-[0_8px_32px_rgba(31,38,135,0.37)]'
                    }`}
                    style={{ transform: 'translateZ(15px)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)' }}
                  >
                    {isPremium ? (
                      <>
                        <Crown className="w-4 h-4 text-slate-600" />
                        <span className="font-semibold">Premium</span>
                      </>
                    ) : (
                      <>
                        <div className="w-4 h-4 rounded-full bg-slate-400" />
                        <span className="font-semibold">Standard</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Batch Mode Controls - Ultra-Transparent Glassmorphic Design with Round Borders */}
              {uploadedImages.length > 1 && !isPremium && (
                <div className="flex items-center gap-3 mt-6 pt-6 border-t border-white/20 transition-all duration-1000" style={{ transitionDelay: '800ms' }}>
                  <Button
                    variant={batchMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setBatchMode(!batchMode)}
                    className={`h-10 px-6 text-sm font-medium transition-all duration-300 rounded-full ${
                      batchMode 
                        ? 'bg-white/20 backdrop-blur-3xl text-slate-700 border-white/30 hover:bg-white/30 shadow-[0_8px_32px_rgba(31,38,135,0.37)]' 
                        : 'text-slate-600 bg-white/10 backdrop-blur-3xl border-white/25 hover:bg-white/20'
                    }`}
                    style={{ backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)' }}
                  >
                    <Layers className="w-4 h-4 mr-2" />
                    Stapelmodus
                  </Button>
                
                  {batchMode && (
                    <Select value={selectedStyle} onValueChange={setSelectedStyle}>
                      <SelectTrigger className="h-10 w-48 text-sm bg-white/15 backdrop-blur-3xl border-white/30 hover:bg-white/25 transition-all duration-300 rounded-full shadow-[0_8px_32px_rgba(31,38,135,0.37)]" style={{ backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)' }}>
                        <SelectValue placeholder="Stil für alle auswählen" />
                      </SelectTrigger>
                      <SelectContent 
                        className="rounded-2xl border-0 shadow-2xl"
                        style={{
                          background: `
                            linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.6) 20%),
                            linear-gradient(225deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.4) 15%)
                          `,
                          backdropFilter: 'blur(40px) saturate(200%) brightness(1.05)',
                          WebkitBackdropFilter: 'blur(40px) saturate(200%) brightness(1.05)',
                          border: '1px solid rgba(255, 255, 255, 0.3)',
                          boxShadow: `
                            0 20px 60px rgba(0, 0, 0, 0.15),
                            0 8px 25px rgba(0, 0, 0, 0.1),
                            inset 0 1px 0 rgba(255, 255, 255, 0.4)
                          `,
                          transform: 'translateY(0)',
                          transition: 'opacity 0.2s ease-out, transform 0.2s ease-out'
                        }}
                      >
                                                  {styles.map((style) => (
                            <SelectItem key={style.id} value={style.id} className="hover:bg-white/40 focus:bg-white/40 transition-all duration-200 text-slate-800 font-medium">
                              {style.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </div>

            {/* Back Side - Settings Toolbar */}
            <div 
              className="absolute inset-0 w-full h-full p-8 overflow-hidden transition-all duration-700 ease-out hover:scale-[1.01]"
              style={{ 
                backfaceVisibility: 'hidden',
                transform: 'rotateX(180deg) translateZ(0px)',
                background: `
                  linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%),
                  radial-gradient(ellipse at top left, rgba(255, 255, 255, 0.12) 0%, transparent 50%),
                  radial-gradient(ellipse at bottom right, rgba(255, 255, 255, 0.06) 0%, transparent 50%)
                `,
                backdropFilter: 'blur(40px) saturate(200%) brightness(1.1)',
                WebkitBackdropFilter: 'blur(40px) saturate(200%) brightness(1.1)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '24px',
                boxShadow: `
                  0 20px 60px rgba(0, 0, 0, 0.08),
                  0 8px 25px rgba(0, 0, 0, 0.04),
                  inset 0 1px 0 rgba(255, 255, 255, 0.25),
                  inset 0 -1px 0 rgba(255, 255, 255, 0.05)
                `
              }}
            >
              {/* Liquid glass highlight */}
              <div 
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 60%)',
                  borderRadius: '24px'
                }}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsFlipped(false)}
                    className="h-14 px-8 bg-white/70 backdrop-blur-xl text-slate-700 hover:bg-white/90 border border-slate-200/60 shadow-2xl transition-all duration-300 rounded-full hover:scale-105 active:scale-95"
                    style={{ transform: 'translateZ(20px)' }}
                  >
                    ← Zurück
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* True Glass Upload Section - Light Filter Effect */}
        {uploadedImages.length === 0 ? (
          <Card className={`relative overflow-hidden transition-all duration-1000 ${
            isPageLoaded 
              ? 'opacity-100 translate-y-0 scale-100' 
              : 'opacity-0 translate-y-8 scale-95'
          }`} style={{ 
            transitionDelay: '300ms',
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            borderRadius: '24px',
            boxShadow: `
              0 4px 12px rgba(0, 0, 0, 0.06),
              inset 0 1px 0 rgba(255, 255, 255, 0.4)
            `,
            padding: '40px'
          }}>
            <div className="text-center space-y-8">
              <div className={`transition-all duration-700 ${
                isPageLoaded 
                  ? 'opacity-100 translate-y-0 scale-100' 
                  : 'opacity-0 translate-y-8 scale-95'
              }`} style={{ transitionDelay: '500ms' }}>
                <h2 className="text-3xl font-bold text-slate-700 mb-4">Raumbilder hochladen</h2>
                <p className="text-slate-600 text-lg">
                  {isPremium 
                    ? 'Ein Bild für Premium-Verarbeitung hochladen'
                    : 'Mehrere Bilder per Drag & Drop oder Klick auswählen'
                  }
                </p>
              </div>

              {/* True Glass Upload Card - Light Filter */}
              <div className={`relative transition-all duration-700 ${
                isPageLoaded 
                  ? 'opacity-100 translate-y-0 scale-100' 
                  : 'opacity-0 translate-y-8 scale-95'
              }`} style={{ transitionDelay: '700ms' }}>
                <Card 
                  className="relative group cursor-pointer overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: 'rgba(255, 255, 255, 0.12)',
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '28px',
                    padding: '48px',
                    boxShadow: `
                      0 4px 12px rgba(0, 0, 0, 0.08),
                      inset 0 1px 0 rgba(255, 255, 255, 0.5)
                    `
                  }}
                >
                  {/* Minimal glass highlight */}
                  <div 
                    className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, transparent 40%)',
                      borderRadius: '28px'
                    }}
                  />
                  <div 
                    className="absolute inset-0 opacity-15 pointer-events-none"
                    style={{
                      background: `
                        linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, transparent 20%),
                        linear-gradient(225deg, rgba(255, 255, 255, 0.2) 0%, transparent 15%)
                      `,
                      borderRadius: '28px',
                      mask: 'linear-gradient(to bottom right, white 0%, transparent 40%)'
                    }}
                  />
                  {/* Upload Icon - Plus Symbol */}
                  <div className="relative z-10 flex flex-col items-center space-y-6">
                    <div 
                      className="w-24 h-24 rounded-full flex items-center justify-center group-hover:scale-110 transition-all duration-500 relative"
                      style={{
                        background: 'rgba(255, 255, 255, 0.18)',
                        backdropFilter: 'blur(3px)',
                        WebkitBackdropFilter: 'blur(3px)',
                        border: '1px solid rgba(255, 255, 255, 0.35)',
                        boxShadow: `
                          0 3px 8px rgba(0, 0, 0, 0.08),
                          inset 0 1px 0 rgba(255, 255, 255, 0.6)
                        `
                      }}
                    >
                      {/* Minimal highlight */}
                      <div 
                        className="absolute inset-1 rounded-full opacity-30 pointer-events-none"
                        style={{
                          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.5) 0%, transparent 50%)'
                        }}
                      />
                      <Plus className="w-12 h-12 text-slate-600 group-hover:text-slate-700 transition-colors duration-500" />
                    </div>

                    <div className="text-center space-y-2">
                      <p className="text-lg font-medium text-slate-700">Bilder hier ablegen</p>
                      <p className="text-sm text-slate-600">
                        Unterstützt: JPG, PNG, WebP • Max: 10MB • Bis zu 10 Bilder
                      </p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* True Glass Action Buttons */}
              <div className={`flex items-center justify-center gap-4 transition-all duration-700 ${
                isPageLoaded 
                  ? 'opacity-100 translate-y-0 scale-100' 
                  : 'opacity-0 translate-y-8 scale-95'
              }`} style={{ transitionDelay: '900ms' }}>
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  className="relative h-14 px-8 text-slate-700 transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none focus:ring-0 overflow-hidden"
                  style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    borderTop: '1px solid rgba(255, 255, 255, 0.4)',
                    borderRadius: '50px',
                    boxShadow: `
                      0 8px 25px rgba(0, 0, 0, 0.12),
                      inset 0 1px 0 rgba(255, 255, 255, 0.4),
                      inset 0 -1px 0 rgba(255, 255, 255, 0.1)
                    `
                  }}
                >
                  {/* Button glass reflection */}
                  <div 
                    className="absolute inset-0 opacity-30 pointer-events-none"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, transparent 50%)',
                      borderRadius: '50px'
                    }}
                  />
                  <span className="relative z-10">Bilder auswählen</span>
                </Button>

                <Button 
                  onClick={addEmptyRoom}
                  className="relative h-14 px-8 text-slate-700 transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none focus:ring-0 overflow-hidden"
                  style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '50px',
                    boxShadow: `
                      0 3px 8px rgba(0, 0, 0, 0.08),
                      inset 0 1px 0 rgba(255, 255, 255, 0.5)
                    `
                  }}
                >
                  {/* Button glass reflection */}
                  <div 
                    className="absolute inset-0 opacity-30 pointer-events-none"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, transparent 50%)',
                      borderRadius: '50px'
                    }}
                  />
                  <span className="relative z-10">Leeren Raum verwenden</span>
                </Button>
              </div>
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
        ) : (
          /* True Glass Images Grid - Light Filter */
          <Card className={`relative overflow-hidden transition-all duration-1000 ${
            isPageLoaded 
              ? 'opacity-100 translate-y-0 scale-100' 
              : 'opacity-0 translate-y-12 scale-95'
          }`} style={{ 
            transitionDelay: '300ms',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '28px',
            padding: '40px',
            boxShadow: `
              0 4px 12px rgba(0, 0, 0, 0.06),
              inset 0 1px 0 rgba(255, 255, 255, 0.3)
            `
          }}>
            {/* Minimal glass highlight */}
            <div 
              className="absolute inset-0 opacity-12 pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, transparent 40%)',
                borderRadius: '28px'
              }}
            />
            <div className="flex items-center justify-between mb-10">
              <h2 className={`text-2xl font-semibold flex items-center gap-3 text-slate-800 transition-all duration-700 ${
                isPageLoaded 
                  ? 'opacity-100 translate-x-0' 
                  : 'opacity-0 -translate-x-8'
              }`} style={{ transitionDelay: '500ms' }}>
                <Layers className="w-6 h-6" />
                Hochgeladene Bilder ({uploadedImages.length})
              </h2>
              <div className={`flex gap-4 transition-all duration-700 ${
                isPageLoaded 
                  ? 'opacity-100 translate-x-0 scale-100' 
                  : 'opacity-0 translate-x-8 scale-95'
              }`} style={{ transitionDelay: '700ms' }}>
                <Button
                  onClick={processImages}
                  disabled={isProcessing}
                  className={`h-14 px-8 transition-all duration-300 rounded-full hover:scale-105 active:scale-95 focus:outline-none focus:ring-0 ${
                    isProcessing
                      ? 'bg-white/8 text-slate-500 cursor-not-allowed backdrop-blur-sm border border-white/15'
                      : 'bg-white/15 backdrop-blur-sm text-slate-700 hover:bg-white/25 border border-white/30'
                  }`}
                  style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                      Verarbeitung...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-6 h-6 mr-3" />
                      Bilder transformieren
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {uploadedImages.map((image, index) => {
                const isProcessingThisImage = processingImages.has(image.id)
                const isTransformed = transformedImages.has(image.id)
                const result = results.find(r => r.originalImage.id === image.id)
                
                return (
                  <Card key={image.id} className={`group relative overflow-hidden transition-all duration-500 hover:scale-105 ${
                    isPageLoaded 
                      ? 'opacity-100 translate-y-0 scale-100' 
                      : 'opacity-0 translate-y-8 scale-95'
                  } ${isTransformed ? 'p-0 aspect-square' : ''} ${isTransformed && result ? 'animate-in zoom-in-95 duration-700 ease-out' : ''}`} style={{ 
                    transitionDelay: `${800 + (index * 100)}ms`,
                    background: 'rgba(255, 255, 255, 0.12)',
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    borderRadius: '24px',
                    boxShadow: `
                      0 3px 8px rgba(0, 0, 0, 0.08),
                      inset 0 1px 0 rgba(255, 255, 255, 0.4)
                    `,
                    transform: isTransformed && result ? 'scale(0.95)' : 'scale(1)',
                    transition: 'all 0.7s ease-out'
                  }}>
                    {/* Minimal glass highlight for cards */}
                    <div 
                      className="absolute inset-0 opacity-15 pointer-events-none"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, transparent 50%)',
                        borderRadius: '24px'
                      }}
                    />
                  <div className="relative">
                      <div className="aspect-square overflow-hidden">
                        {isProcessingThisImage ? (
                          /* Loading Animation on Card */
                          <div className="w-full h-full bg-white/60 backdrop-blur-xl flex items-center justify-center">
                            <div className="text-center space-y-4">
                              <div className="w-16 h-16 bg-white/80 backdrop-blur-xl border border-slate-200/70 rounded-full flex items-center justify-center mx-auto shadow-2xl">
                                <div className="w-8 h-8 border-4 border-slate-400/80 border-t-slate-600 rounded-full animate-spin"></div>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-center space-x-1">
                                  <div className="w-2 h-2 bg-slate-400/80 rounded-full animate-pulse"></div>
                                  <div className="w-2 h-2 bg-slate-400/80 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                                  <div className="w-2 h-2 bg-slate-400/80 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                                </div>
                                <p className="text-xs text-slate-700 font-medium">AI verarbeitet...</p>
                              </div>
                            </div>
                          </div>
                        ) : isTransformed && result ? (
                          /* Transformed Result - Clean Perfect Square with Container Animation */
                          <div 
                            className="w-full h-full cursor-pointer animate-in zoom-in-95 duration-700 ease-out"
                            onClick={() => {
                              setSelectedImage(result)
                              setShowImagePopup(true)
                            }}
                          >
                            <img
                              src={result.resultUrl}
                              alt="Transformed Interior"
                              className="w-full h-full object-cover rounded-3xl group-hover:scale-105 transition-transform duration-500"
                            />
                          </div>
                        ) : (
                          /* Original Image */
                      <img
                        src={image.url}
                        alt={image.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                        )}
                    </div>
                      
                      {!isProcessingThisImage && !isTransformed && (
                    <button
                      onClick={() => removeImage(image.id)}
                          className="absolute top-4 right-4 w-10 h-10 bg-red-500/90 backdrop-blur-xl hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-2xl hover:scale-110"
                    >
                          <X className="w-5 h-5" />
                    </button>
                      )}
                  </div>
                    
                                        {/* Only show room selector and name for non-transformed images */}
                    {!isTransformed && (
                      <div className="p-8">
                        <p className="text-sm font-medium text-gray-800 mb-6 truncate">{image.name}</p>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-3">Raumtyp</label>
                            <Select 
                              value={image.roomType} 
                              onValueChange={(value) => updateImageRoomType(image.id, value)}
                            >
                              <SelectTrigger className="h-12 text-sm bg-white/20 backdrop-blur-3xl border-white/30 hover:bg-white/30 transition-all duration-300 rounded-full shadow-[0_4px_20px_rgba(255,255,255,0.15),inset_0_1px_2px_rgba(255,255,255,0.1)]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent 
                                className="rounded-2xl border-0 shadow-2xl"
                                style={{
                                  background: `
                                    linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.6) 20%),
                                    linear-gradient(225deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.4) 15%)
                                  `,
                                  backdropFilter: 'blur(40px) saturate(200%) brightness(1.05)',
                                  WebkitBackdropFilter: 'blur(40px) saturate(200%) brightness(1.05)',
                                  border: '1px solid rgba(255, 255, 255, 0.3)',
                                  boxShadow: `
                                    0 20px 60px rgba(0, 0, 0, 0.15),
                                    0 8px 25px rgba(0, 0, 0, 0.1),
                                    inset 0 1px 0 rgba(255, 255, 255, 0.4)
                                  `,
                                  transform: 'translateY(0)',
                                  transition: 'opacity 0.2s ease-out, transform 0.2s ease-out'
                                }}
                              >
                                <SelectItem value="living-room" className="hover:bg-white/40 focus:bg-white/40 transition-all duration-200 text-slate-800 font-medium">Wohnzimmer</SelectItem>
                                <SelectItem value="bedroom" className="hover:bg-white/40 focus:bg-white/40 transition-all duration-200 text-slate-800 font-medium">Schlafzimmer</SelectItem>
                                <SelectItem value="kitchen" className="hover:bg-white/40 focus:bg-white/40 transition-all duration-200 text-slate-800 font-medium">Küche</SelectItem>
                                <SelectItem value="bathroom" className="hover:bg-white/40 focus:bg-white/40 transition-all duration-200 text-slate-800 font-medium">Badezimmer</SelectItem>
                                <SelectItem value="office" className="hover:bg-white/40 focus:bg-white/40 transition-all duration-200 text-slate-800 font-medium">Büro</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {/* Enhancement Button for Original Images */}
                          <Button
                            onClick={() => enhanceImage(image.id, 'upscale', 2)}
                            disabled={enhancingImages.has(image.id)}
                            className="w-full h-12 bg-blue-500/90 backdrop-blur-xl hover:bg-blue-600 text-white border border-blue-400/50 shadow-2xl transition-all duration-300 rounded-full hover:scale-105 active:scale-95 focus:outline-none focus:ring-0 disabled:opacity-50"
                          >
                            {enhancingImages.has(image.id) ? (
                              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            ) : (
                              <Sparkles className="w-5 h-5 mr-2" />
                            )}
                            {enhancingImages.has(image.id) ? 'Upscaling...' : 'Upscale 2x'}
                          </Button>
                          
                          {/* Enhanced Image Display for Original Images */}
                          {enhancedImages.has(image.id) && (
                            <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl">
                              <div className="flex items-center gap-2 mb-2">
                                <CheckCircle className="w-5 h-5 text-green-500" />
                                <span className="text-sm font-medium text-green-700">Upscaled Version Available</span>
                              </div>
                              <div className="aspect-square rounded-xl overflow-hidden bg-white/40">
                                <img
                                  src={enhancedImages.get(image.id)}
                                  alt="Enhanced"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <Button
                                onClick={() => {
                                  const link = document.createElement('a')
                                  link.href = enhancedImages.get(image.id)!
                                  link.download = `enhanced-${image.name}-${Date.now()}.jpg`
                                  document.body.appendChild(link)
                                  link.click()
                                  document.body.removeChild(link)
                                }}
                                className="w-full mt-3 h-10 bg-green-500/90 backdrop-blur-xl hover:bg-green-600 text-white border border-green-400/50 shadow-2xl transition-all duration-300 rounded-full hover:scale-105 active:scale-95 focus:outline-none focus:ring-0"
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Download Enhanced
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}


                  </Card>
                )
              })}
              
              {/* Add More Button - Same size as image card with Animation */}
              {!isPremium && (
                <Card 
                  className={`group bg-white/10 backdrop-blur-3xl border border-white/20 shadow-[0_8px_32px_rgba(31,38,135,0.37)] hover:shadow-[0_8px_32px_rgba(31,38,135,0.5)] transition-all duration-500 rounded-3xl overflow-hidden hover:bg-white/20 hover:scale-105 cursor-pointer ${
                    isPageLoaded 
                      ? 'opacity-100 translate-y-0 scale-100' 
                      : 'opacity-0 translate-y-8 scale-95'
                  }`} 
                  style={{ transitionDelay: `${800 + (uploadedImages.length * 100)}ms` }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="aspect-square flex items-center justify-center">
                    <div className="w-16 h-16 bg-white/15 backdrop-blur-2xl border border-white/30 rounded-full flex items-center justify-center shadow-[0_8px_32px_rgba(31,38,135,0.37)] group-hover:scale-110 transition-all duration-300" style={{ backdropFilter: 'blur(25px)', WebkitBackdropFilter: 'blur(25px)' }}>
                      <Plus className="w-8 h-8 text-slate-700" />
                    </div>
                  </div>
                  
                  <div className="p-8 text-center">
                    <p className="text-sm font-medium text-slate-800 mb-6">Bild hinzufügen</p>
                    
                    <div className="h-12 bg-white/15 backdrop-blur-2xl border border-white/30 rounded-full flex items-center justify-center shadow-[0_8px_32px_rgba(31,38,135,0.37)]" style={{ backdropFilter: 'blur(25px)', WebkitBackdropFilter: 'blur(25px)' }}>
                      <span className="text-xs text-slate-600">Klick zum Hochladen</span>
                    </div>
                  </div>
                </Card>
              )}
            </div>
            
            {/* Global Action Buttons for Transformed Images */}
            {results.length > 0 && (
              <div className="mt-8 flex justify-center gap-4">
                <Button
                  onClick={() => {
                    // Download all transformed images
                    results.forEach(result => downloadResult(result))
                  }}
                  className="h-14 px-8 bg-white/15 backdrop-blur-3xl text-slate-700 hover:bg-white/25 border border-white/30 shadow-[0_8px_32px_rgba(31,38,135,0.37)] transition-all duration-300 rounded-full hover:scale-105 active:scale-95 focus:outline-none focus:ring-0"
                  style={{ backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)' }}
                >
                  <Download className="w-5 h-5 mr-2" />
                  Alle herunterladen
                </Button>
                
                <Button
                  onClick={() => startOver()}
                  className="h-14 px-8 bg-red-500/90 backdrop-blur-xl hover:bg-red-600 text-white border border-red-400/50 shadow-2xl transition-all duration-300 rounded-full hover:scale-105 active:scale-95 focus:outline-none focus:ring-0"
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Neustart
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* Enhanced Glassmorphic Results Section with Animation */}
        {results.length > 0 && (
          <>
            {/* Loading Animation Overlay */}
            {isProcessing && (
              <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="bg-white/15 backdrop-blur-3xl border border-white/25 rounded-3xl p-12 shadow-[0_8px_32px_rgba(31,38,135,0.37)] max-w-md mx-4" style={{ backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)' }}>
                  <div className="text-center space-y-6">
                    {/* Animated Loading Icon */}
                    <div className="relative">
                      <div className="w-20 h-20 bg-white/20 backdrop-blur-2xl border border-white/30 rounded-full flex items-center justify-center mx-auto shadow-[0_8px_32px_rgba(31,38,135,0.37)]" style={{ backdropFilter: 'blur(25px)', WebkitBackdropFilter: 'blur(25px)' }}>
                        <div className="w-12 h-12 border-4 border-slate-400/80 border-t-slate-600 rounded-full animate-spin"></div>
                      </div>
                      {/* Floating Elements */}
                      <div className="absolute inset-0">
                        <div className="absolute top-2 left-2 w-3 h-3 bg-slate-400/60 rounded-full animate-pulse" style={{ animationDelay: '0s' }}></div>
                        <div className="absolute top-2 right-2 w-2 h-2 bg-slate-400/50 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                        <div className="absolute bottom-2 left-2 w-2 h-2 bg-slate-400/50 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                        <div className="absolute bottom-2 right-2 w-3 h-3 bg-slate-400/60 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }}></div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold text-slate-700">Bilder werden verarbeitet</h3>
                      <p className="text-slate-600">AI transformiert Ihre Bilder...</p>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-white/20 backdrop-blur-xl rounded-full h-2 overflow-hidden" style={{ backdropFilter: 'blur(25px)', WebkitBackdropFilter: 'blur(25px)' }}>
                      <div className="h-full bg-white/40 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Image Popup Modal */}
            {showImagePopup && selectedImage && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className={`bg-white/15 backdrop-blur-3xl border border-white/25 rounded-3xl shadow-[0_8px_32px_rgba(31,38,135,0.37)] ${isSliderActive ? 'max-w-2xl' : 'max-w-3xl'} w-full max-h-[90vh] overflow-hidden`} style={{ backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)' }}>
                  <div className="relative">
                    {/* Close Button - Only show when slider is off */}
                    {!isSliderActive && (
                      <button
                        onClick={() => setShowImagePopup(false)}
                        className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-2xl hover:bg-white/30 text-slate-700 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 z-10 shadow-[0_8px_32px_rgba(31,38,135,0.37)]"
                        style={{ backdropFilter: 'blur(25px)', WebkitBackdropFilter: 'blur(25px)' }}
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                    
                    {/* Image Content */}
                    <div className={`${isSliderActive ? 'p-4' : 'p-8'}`}>
                      <div className="flex justify-center">
                        {/* Transformed Image Only */}
                        <div className="space-y-4 max-w-xl">
                          {!isSliderActive && (
                            <div className="flex items-center justify-between">
                              <h4 className="text-lg font-semibold text-slate-800 text-center">
                                {styles.find(s => s.id === selectedImage.style)?.name}
                              </h4>
                              <Button
                                onClick={() => setIsSliderActive(!isSliderActive)}
                                className={`h-8 px-4 text-xs bg-white/15 backdrop-blur-3xl text-slate-700 hover:bg-white/25 border border-white/30 shadow-[0_8px_32px_rgba(31,38,135,0.37)] transition-all duration-300 rounded-full hover:scale-105 active:scale-95 focus:outline-none focus:ring-0 ${
                                  isSliderActive ? 'bg-white/25' : ''
                                }`}
                                style={{ backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)' }}
                              >
                                {isSliderActive ? 'Slider aus' : 'Slider an'}
                              </Button>
                            </div>
                          )}
                          
                          {isSliderActive ? (
                            /* Sliding Comparison Tool */
                            <div className="slider-container relative aspect-square rounded-2xl overflow-hidden bg-white/15 backdrop-blur-3xl border border-white/25 shadow-[0_8px_32px_rgba(31,38,135,0.37)]" style={{ backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)' }}>
                              {/* Original Image (Background) */}
                              <img
                                src={selectedImage.originalImage.url}
                                alt="Original"
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                              
                              {/* Transformed Image (Foreground with mask) */}
                              <div 
                                className="absolute inset-0 overflow-hidden"
                                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                              >
                                <img
                                  src={selectedImage.resultUrl}
                                  alt="Transformed"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              
                              {/* Slider Handle */}
                              <div 
                                className="absolute top-0 bottom-0 w-1 bg-white/80 backdrop-blur-xl cursor-ew-resize flex items-center justify-center"
                                style={{ left: `${sliderPosition}%` }}
                                onMouseDown={() => setIsDragging(true)}
                                onTouchStart={() => setIsDragging(true)}
                              >
                                <div className="w-8 h-8 bg-white/25 backdrop-blur-2xl border border-white/40 rounded-full shadow-[0_8px_32px_rgba(31,38,135,0.37)] flex items-center justify-center" style={{ backdropFilter: 'blur(25px)', WebkitBackdropFilter: 'blur(25px)' }}>
                                  <div className="w-4 h-4 bg-white/40 rounded-full"></div>
                                </div>
                              </div>
                              
                              {/* Slider Labels */}
                              <div className="absolute bottom-4 left-4 bg-white/20 backdrop-blur-2xl px-3 py-1 rounded-full shadow-[0_8px_32px_rgba(31,38,135,0.37)]" style={{ backdropFilter: 'blur(25px)', WebkitBackdropFilter: 'blur(25px)' }}>
                                <span className="text-xs font-medium text-slate-800">Vorher</span>
                              </div>
                              <div className="absolute bottom-4 right-4 bg-white/20 backdrop-blur-2xl px-3 py-1 rounded-full shadow-[0_8px_32px_rgba(31,38,135,0.37)]" style={{ backdropFilter: 'blur(25px)', WebkitBackdropFilter: 'blur(25px)' }}>
                                <span className="text-xs font-medium text-slate-800">Nachher</span>
                              </div>
                            </div>
                          ) : (
                            /* Normal Image Display */
                            <div className="aspect-square rounded-2xl overflow-hidden bg-white/15 backdrop-blur-3xl border border-white/25 shadow-[0_8px_32px_rgba(31,38,135,0.37)]" style={{ backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)' }}>
                              <img
                                src={selectedImage.resultUrl}
                                alt="Transformed"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Action Buttons - Only show when slider is off */}
                      {!isSliderActive && (
                        <div className="flex gap-4 mt-8 justify-center">
                          <Button
                            onClick={() => downloadResult(selectedImage)}
                            className="h-12 px-8 bg-white/15 backdrop-blur-3xl text-slate-700 hover:bg-white/25 border border-white/30 shadow-[0_8px_32px_rgba(31,38,135,0.37)] transition-all duration-300 rounded-full hover:scale-105 active:scale-95 focus:outline-none focus:ring-0"
                            style={{ backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)' }}
                          >
                            <Download className="w-5 h-5 mr-2" />
                            Download
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}