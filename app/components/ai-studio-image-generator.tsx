"use client"

import React, { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Wand2, 
  Upload, 
  Download, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
  ImageIcon,
  Copy,
  RefreshCw,
  Settings,
  Palette,
  Camera,
  Zap,
  Video
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = (SUPABASE_URL && SUPABASE_ANON && !/localhost:54321/i.test(SUPABASE_URL) && !/dummy|placeholder/i.test(SUPABASE_ANON))
  ? createClient(SUPABASE_URL, SUPABASE_ANON)
  : ({ from: () => ({ select: async () => ({ data: [], error: null }) }) } as any)

interface UploadedImage {
  id: string
  file: File
  url: string
  name: string
}

interface GeneratedImage {
  id: string
  prompt: string
  url: string
  createdAt: Date
  status: 'generating' | 'completed' | 'failed'
  style?: string
  aspectRatio?: string
}

const prePrompts = [
  { id: 'portrait', name: 'Portrait', prompt: 'Professionelles Portrait einer Person mit cinematischer Beleuchtung und weichem Bokeh-Hintergrund' },
  { id: 'landscape', name: 'Landschaft', prompt: 'Atemberaubende Landschaftsaufnahme mit dramatischem Himmel und perfekter goldener Stunde' },
  { id: 'product', name: 'Produkt', prompt: 'Hochwertige Produktfotografie mit minimalistischem Hintergrund und professioneller Beleuchtung' },
  { id: 'abstract', name: 'Abstrakt', prompt: 'Kreative abstrakte Komposition mit fließenden Formen und lebendigen Farbverläufen' },
  { id: 'architecture', name: 'Architektur', prompt: 'Moderne Architektur mit geometrischen Linien und interessanten Licht- und Schattenspielen' },
  { id: 'fantasy', name: 'Fantasy', prompt: 'Magische Fantasy-Szene mit mystischer Atmosphäre und übernatürlichen Elementen' }
]

const imageStyles = [
  { id: 'photorealistic', name: 'Photorealistisch', description: 'Natürlich wirkende Fotos' },
  { id: 'digital_art', name: 'Digital Art', description: 'Moderne digitale Kunst' },
  { id: 'oil_painting', name: 'Ölgemälde', description: 'Klassischer Malstil' },
  { id: 'watercolor', name: 'Aquarell', description: 'Weiche Aquarell-Optik' },
  { id: 'pencil_sketch', name: 'Bleistiftskizze', description: 'Handgezeichneter Look' },
  { id: 'anime', name: 'Anime', description: 'Japanischer Anime-Stil' }
]

const aspectRatios = [
  { id: '1280x720', name: '16:9 (Landscape)', description: '1280×720' },
  { id: '720x1280', name: '9:16 (Portrait)', description: '720×1280' },
  { id: '960x960', name: '1:1 (Square)', description: '960×960' },
  { id: '1024x576', name: '16:9 (HD)', description: '1024×576' },
  { id: '576x1024', name: '9:16 (Stories)', description: '576×1024' }
]

// Staggered entry animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: 'easeOut'
    }
  }
}

// Interactive hover animations
const buttonHoverVariants = {
  scale: 1.02,
  transition: {
    type: "spring",
    stiffness: 400,
    damping: 10
  }
}

const iconHoverVariants = {
  rotate: 10,
  scale: 1.1,
  transition: {
    type: "spring",
    stiffness: 400,
    damping: 10
  }
}

export function AIStudioImageGenerator() {
  const [prompt, setPrompt] = useState('')
  const [selectedPrePrompt, setSelectedPrePrompt] = useState('')
  const [showPrePrompts, setShowPrePrompts] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const [selectedStyle, setSelectedStyle] = useState('photorealistic')
  const [aspectRatio, setAspectRatio] = useState('1280x720')
  const [numVariants, setNumVariants] = useState(2)
  const [action, setAction] = useState<'text_to_image' | 'image_to_image'>('text_to_image')
  const [contentType, setContentType] = useState<'optimized' | 'raw'>('optimized')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const files = Array.from(event.dataTransfer.files)
    handleFileUpload(files)
  }, [])

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }, [])

  const handleFileUpload = useCallback(async (files: File[]) => {
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        try {
          // Upload to database via API
          const formData = new FormData()
          formData.append('file', file)
          formData.append('fileType', 'image')

          const response = await fetch('/api/media-upload', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
            },
            body: formData
          })

          const result = await response.json()

          if (!result.success) {
            toast.error(`Upload failed: ${result.error}`)
            continue
          }

          const newImage: UploadedImage = {
            id: result.data.id,
            file,
            url: result.data.storage_url || result.data.public_url,
            name: file.name
          }
          
          setUploadedImages(prev => [...prev, newImage])
          setAction('image_to_image')
          toast.success(`Bild ${file.name} hochgeladen`)
        } catch (error) {
          console.error('Upload error:', error)
          toast.error(`Failed to upload ${file.name}`)
        }
      } else {
        toast.error(`${file.name} ist kein unterstütztes Bildformat`)
      }
    }
  }, [])

  const removeUploadedImage = useCallback((id: string) => {
    setUploadedImages(prev => {
      const filtered = prev.filter(img => img.id !== id)
      if (filtered.length === 0) {
        setAction('text_to_image')
      }
      return filtered
    })
  }, [])

  const handleEnhancePrompt = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error('Bitte geben Sie zunächst einen Prompt ein')
      return
    }

    try {
      const response = await fetch('/api/ai-studio/runwayml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'enhance_prompt',
          prompt,
          type: 'image'
        })
      })

      if (!response.ok) {
        throw new Error('Prompt enhancement failed')
      }

      const { enhancedPrompt } = await response.json()
      setPrompt(enhancedPrompt)
      toast.success('Prompt wurde KI-optimiert!')
    } catch (error) {
      // Fallback to simple enhancement
      const enhanced = `${prompt} - Mit professioneller Beleuchtung, hoher Detailschärfe und cinematischer Komposition optimiert`
      setPrompt(enhanced)
      toast.success('Prompt wurde optimiert!')
    }
  }, [prompt])

  const generateImages = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error('Bitte geben Sie einen Prompt ein')
      return
    }

    if (action === 'image_to_image' && uploadedImages.length === 0) {
      toast.error('Bitte laden Sie ein Bild für Image-to-Image hoch')
      return
    }

    setIsGenerating(true)
    setGenerationProgress(0)

    try {
      // Start the job
      const response = await fetch('/api/ai-studio/runwayml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_image',
          textPrompt: prompt,
          imageUrl: uploadedImages[0]?.url || null,
          imageAction: action,
          style: selectedStyle,
          aspectRatio,
          numVariants
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Generation failed')
      }

      const { jobId } = await response.json()
      
      // Poll for job completion
      let timeoutId: NodeJS.Timeout
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/ai-studio/runwayml?jobId=${jobId}`)
          if (!statusResponse.ok) throw new Error('Status check failed')
          
          const jobStatus = await statusResponse.json()
          
          switch (jobStatus.status) {
            case 'queued':
              setGenerationProgress(10)
              break
            case 'processing':
              setGenerationProgress(prev => Math.min(prev + 5, 85))
              break
            case 'completed':
              clearInterval(pollInterval)
              clearTimeout(timeoutId)
              setGenerationProgress(100)
              
              if (jobStatus.result?.success && jobStatus.result?.images) {
                const newImages: GeneratedImage[] = jobStatus.result.images.map((img: any, i: number) => ({
                  id: img.id || `${Date.now()}_${i}`,
                  prompt,
                  url: img.url,
                  createdAt: new Date(),
                  status: 'completed' as const,
                  style: img.style || selectedStyle,
                  aspectRatio: img.aspectRatio || aspectRatio
                }))

                setGeneratedImages(prev => [...newImages, ...prev])
                toast.success(`${newImages.length} Bilder erfolgreich generiert!`)
              } else {
                throw new Error('No images received')
              }
              
              setTimeout(() => {
                setIsGenerating(false)
                setGenerationProgress(0)
              }, 1000)
              break
            case 'failed':
              clearInterval(pollInterval)
              clearTimeout(timeoutId)
              throw new Error(jobStatus.result?.error || 'Generation failed')
          }
        } catch (pollError) {
          clearInterval(pollInterval)
          clearTimeout(timeoutId)
          throw pollError
        }
      }, 2000)

      // Timeout after 5 minutes
      timeoutId = setTimeout(() => {
        clearInterval(pollInterval)
        setIsGenerating(false)
        setGenerationProgress(0)
        toast.error('Generation timeout - bitte versuchen Sie es erneut')
      }, 300000)

    } catch (error) {
      setIsGenerating(false)
      setGenerationProgress(0)
      toast.error(error instanceof Error ? error.message : 'Fehler bei der Bildgenerierung')
    }
  }, [prompt, action, uploadedImages, selectedStyle, aspectRatio, numVariants])

  const selectPrePrompt = useCallback((prePrompt: typeof prePrompts[0]) => {
    setPrompt(prePrompt.prompt)
    setSelectedPrePrompt(prePrompt.id)
    setShowPrePrompts(false)
    toast.success(`Vorlage "${prePrompt.name}" angewendet`)
  }, [])

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Dynamic Ethereal Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#0A0A10] via-[#1A0B2E] to-[#0A0A10]">
        {/* Floating Ethereal Orbs */}
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full opacity-20 animate-pulse"
              style={{
                background: i % 4 === 0 
                  ? 'linear-gradient(135deg, #301934, #5C2D91)' 
                  : i % 4 === 1
                  ? 'linear-gradient(135deg, #8A2BE2, #FFC0CB)'
                  : i % 4 === 2
                  ? 'linear-gradient(135deg, #FFD700, #FFC0CB)'
                  : 'linear-gradient(135deg, #5C2D91, #FFD700)',
                width: `${80 + i * 40}px`,
                height: `${80 + i * 40}px`,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animation: `float-${i % 6} ${15 + i * 3}s ease-in-out infinite`,
                filter: 'blur(40px)'
              }}
            />
          ))}
        </div>

        {/* Swirling Nebula Effect */}
        <div className="absolute inset-0">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={`nebula-${i}`}
              className="absolute rounded-full opacity-10"
              style={{
                background: `radial-gradient(circle, ${
                  i % 3 === 0 ? '#8A2BE2' : i % 3 === 1 ? '#FFD700' : '#FFC0CB'
                }40, transparent)`,
                width: `${200 + i * 50}px`,
                height: `${200 + i * 50}px`,
                top: `${10 + i * 8}%`,
                left: `${5 + i * 7}%`,
                animation: `drift-${i % 4} ${25 + i * 5}s linear infinite`,
                filter: 'blur(60px)'
              }}
            />
          ))}
        </div>

        {/* CSS Animations */}
        <style jsx>{`
          @keyframes float-0 { 0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); } 33% { transform: translate(30px, -20px) scale(1.2) rotate(120deg); } 66% { transform: translate(-20px, 30px) scale(0.8) rotate(240deg); } }
          @keyframes float-1 { 0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); } 33% { transform: translate(-25px, 35px) scale(1.1) rotate(-120deg); } 66% { transform: translate(40px, -15px) scale(0.9) rotate(-240deg); } }
          @keyframes float-2 { 0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); } 33% { transform: translate(50px, 10px) scale(1.3) rotate(90deg); } 66% { transform: translate(-30px, -25px) scale(0.7) rotate(270deg); } }
          @keyframes float-3 { 0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); } 33% { transform: translate(-35px, -30px) scale(0.8) rotate(-90deg); } 66% { transform: translate(25px, 40px) scale(1.2) rotate(-270deg); } }
          @keyframes float-4 { 0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); } 33% { transform: translate(20px, 45px) scale(1.1) rotate(150deg); } 66% { transform: translate(-45px, 5px) scale(0.9) rotate(300deg); } }
          @keyframes float-5 { 0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); } 33% { transform: translate(-40px, 20px) scale(0.8) rotate(-150deg); } 66% { transform: translate(35px, -35px) scale(1.3) rotate(-300deg); } }
          @keyframes drift-0 { 0% { transform: translateY(-100%) rotate(0deg); opacity: 0; } 10% { opacity: 0.1; } 90% { opacity: 0.1; } 100% { transform: translateY(100vh) rotate(360deg); opacity: 0; } }
          @keyframes drift-1 { 0% { transform: translateY(-100%) rotate(180deg); opacity: 0; } 15% { opacity: 0.08; } 85% { opacity: 0.08; } 100% { transform: translateY(100vh) rotate(540deg); opacity: 0; } }
          @keyframes drift-2 { 0% { transform: translateY(-100%) rotate(90deg); opacity: 0; } 20% { opacity: 0.12; } 80% { opacity: 0.12; } 100% { transform: translateY(100vh) rotate(450deg); opacity: 0; } }
          @keyframes drift-3 { 0% { transform: translateY(-100%) rotate(270deg); opacity: 0; } 25% { opacity: 0.06; } 75% { opacity: 0.06; } 100% { transform: translateY(100vh) rotate(630deg); opacity: 0; } }
        `}</style>
      </div>

      {/* Main Content */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="relative z-10 w-full max-w-6xl mx-auto p-6 space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-6">
          <div className="space-y-2">
            {/* Title and subtitle removed for cleaner interface */}
          </div>
          
          {/* Mode Selection - Clean Toggle Design */}
          <motion.div variants={itemVariants} className="flex justify-center">
            <div className="bg-white/10 backdrop-blur-[25px] border border-white/20 rounded-full p-1 shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
              <div className="flex gap-0.5">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setAction('text_to_image')}
                  className={`relative px-4 py-2.5 rounded-full transition-all duration-300 ${
                    action === 'text_to_image'
                      ? 'bg-white/20 text-white shadow-[0_4px_16px_rgba(147,51,234,0.3)] border border-white/30'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5" />
                    <span className="text-sm font-medium">Text</span>
                  </div>
                  {action === 'text_to_image' && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full -z-10"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setAction('image_to_image')}
                  className={`relative px-4 py-2.5 rounded-full transition-all duration-300 ${
                    action === 'image_to_image'
                      ? 'bg-white/20 text-white shadow-[0_4px_16px_rgba(236,72,153,0.3)] border border-white/30'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5" />
                    <span className="text-sm font-medium">Bild</span>
                  </div>
                  {action === 'image_to_image' && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-gradient-to-r from-pink-400/20 to-purple-400/20 rounded-full -z-10"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* Content Type Selection - Smaller Button Group */}
          <motion.div variants={itemVariants} className="flex justify-center">
            <div className="bg-white/10 backdrop-blur-[25px] border border-white/20 rounded-full p-1 shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
              <div className="flex gap-0.5">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setContentType('optimized')}
                  className={`relative px-3 py-2 rounded-full transition-all duration-300 ${
                    contentType === 'optimized'
                      ? 'bg-white/20 text-white shadow-[0_4px_16px_rgba(102,217,194,0.3)] border border-white/30'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5" />
                    <span className="text-sm font-medium">Optimiert</span>
                  </div>
                  {contentType === 'optimized' && (
                    <motion.div
                      layoutId="activeContentType"
                      className="absolute inset-0 bg-gradient-to-r from-teal-400/20 to-cyan-400/20 rounded-full -z-10"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setContentType('raw')}
                  className={`relative px-3 py-2 rounded-full transition-all duration-300 ${
                    contentType === 'raw'
                      ? 'bg-white/20 text-white shadow-[0_4px_16px_rgba(156,163,175,0.3)] border border-white/30'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span className="text-sm font-medium">Rohmaterial</span>
                  </div>
                  {contentType === 'raw' && (
                    <motion.div
                      layoutId="activeContentType"
                      className="absolute inset-0 bg-gradient-to-r from-gray-400/20 to-slate-400/20 rounded-full -z-10"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Main Generator Card */}
        <motion.div variants={itemVariants}>
          <Card className="bg-white/5 backdrop-blur-[30px] border border-white/10 rounded-[30px] shadow-[0_20px_50px_rgba(139,69,19,0.2),inset_0_1px_2px_rgba(255,255,255,0.1)] overflow-hidden">
          <CardContent className="p-8 space-y-8">
            
            {/* Text Prompt Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-lg font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-300" />
                  Bildbeschreibung
                </label>
                <Button
                  onClick={handleEnhancePrompt}
                  size="sm"
                  className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-[20px] border border-purple-300/20 hover:from-purple-500/30 hover:to-pink-500/30 text-white rounded-[20px] transition-all duration-300"
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  KI-Optimierung
                </Button>
              </div>
              
              <div className="relative">
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Beschreiben Sie das Bild, das Sie erstellen möchten..."
                  className="min-h-[120px] bg-white/5 backdrop-blur-[25px] border border-purple-200/15 rounded-[25px] text-white placeholder-gray-400 resize-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 transition-all duration-300"
                  style={{ 
                    backdropFilter: 'blur(25px) saturate(180%)',
                    boxShadow: 'inset 0 1px 3px rgba(147,51,234,0.1), 0 4px 20px rgba(139,69,19,0.1)'
                  }}
                />
              </div>
            </div>

            {/* Pre-Prompts Dropdown */}
            <div className="space-y-4">
              <Button
                onClick={() => setShowPrePrompts(!showPrePrompts)}
                variant="outline"
                className="w-full bg-white/5 backdrop-blur-[25px] border border-white/15 rounded-[25px] text-white hover:bg-white/10 transition-all duration-300"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Prompt-Vorlagen
                {showPrePrompts ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
              </Button>

              {showPrePrompts && (
                <Card className="bg-white/5 backdrop-blur-[30px] border border-white/10 rounded-[25px] overflow-hidden">
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {prePrompts.map((prePrompt) => (
                        <Button
                          key={prePrompt.id}
                          onClick={() => selectPrePrompt(prePrompt)}
                          variant="ghost"
                          className="p-4 h-auto text-left bg-white/5 backdrop-blur-[20px] border border-white/10 rounded-[20px] hover:bg-white/10 transition-all duration-300"
                        >
                          <div>
                            <div className="font-semibold text-white mb-1">{prePrompt.name}</div>
                            <div className="text-xs text-gray-400 line-clamp-2">{prePrompt.prompt}</div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Image Upload Zone (for Image-to-Image) */}
            {action === 'image_to_image' && (
              <div className="space-y-4">
                <label className="text-lg font-semibold text-white flex items-center gap-2">
                  <Upload className="w-5 h-5 text-pink-300" />
                  Startbild hochladen
                </label>
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-pink-300/20 rounded-[25px] p-8 text-center cursor-pointer bg-white/5 backdrop-blur-[25px] hover:bg-white/10 transition-all duration-300"
                  style={{ 
                    backdropFilter: 'blur(25px) saturate(180%)',
                    boxShadow: 'inset 0 1px 3px rgba(236,72,153,0.1), 0 4px 20px rgba(139,69,19,0.1)'
                  }}
                >
                  <ImageIcon className="w-12 h-12 text-pink-300 mx-auto mb-4" />
                  <p className="text-white font-medium mb-2">Bild hier ablegen oder klicken</p>
                  <p className="text-sm text-gray-400">PNG, JPG bis zu 16MB</p>
                </div>

                {/* Uploaded Images */}
                {uploadedImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {uploadedImages.map((image) => (
                      <div key={image.id} className="relative group">
                        <div className="bg-white/5 backdrop-blur-[20px] border border-white/10 rounded-[20px] p-4 transition-all duration-300">
                          <img
                            src={image.url}
                            alt={image.name}
                            className="w-full h-32 object-cover rounded-[15px] mb-2"
                          />
                          <p className="text-xs text-gray-300 truncate">{image.name}</p>
                          <Button
                            onClick={() => removeUploadedImage(image.id)}
                            size="sm"
                            variant="ghost"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-red-500/20 hover:bg-red-500/30 rounded-full p-1 transition-all duration-300"
                          >
                            <X className="w-4 h-4 text-red-300" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Advanced Options */}
            <div className="space-y-4">
              <Button
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                variant="outline"
                className="bg-white/5 backdrop-blur-[25px] border border-white/15 rounded-[25px] text-white hover:bg-white/10 transition-all duration-300"
              >
                <Settings className="w-4 h-4 mr-2" />
                Erweiterte Optionen
                {showAdvancedOptions ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
              </Button>

              {showAdvancedOptions && (
                <Card className="bg-white/5 backdrop-blur-[30px] border border-white/10 rounded-[25px] overflow-hidden">
                  <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* Style Selection */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Stil</label>
                        <Select value={selectedStyle} onValueChange={setSelectedStyle}>
                          <SelectTrigger className="bg-white/5 backdrop-blur-[20px] border border-white/15 text-white rounded-[15px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900 border-gray-700">
                            {imageStyles.map((style) => (
                              <SelectItem key={style.id} value={style.id}>
                                <div>
                                  <div className="font-medium">{style.name}</div>
                                  <div className="text-xs text-gray-400">{style.description}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Aspect Ratio */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Seitenverhältnis</label>
                        <Select value={aspectRatio} onValueChange={setAspectRatio}>
                          <SelectTrigger className="bg-white/5 backdrop-blur-[20px] border border-white/15 text-white rounded-[15px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900 border-gray-700">
                            {aspectRatios.map((ratio) => (
                              <SelectItem key={ratio.id} value={ratio.id}>
                                <div>
                                  <div className="font-medium">{ratio.name}</div>
                                  <div className="text-xs text-gray-400">{ratio.description}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Number of Variants */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Anzahl Varianten</label>
                        <Select value={numVariants.toString()} onValueChange={(value) => setNumVariants(parseInt(value))}>
                          <SelectTrigger className="bg-white/5 backdrop-blur-[20px] border border-white/15 text-white rounded-[15px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900 border-gray-700">
                            <SelectItem value="1">1 Bild</SelectItem>
                            <SelectItem value="2">2 Bilder</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Generate Button */}
            <Button
              onClick={generateImages}
              disabled={isGenerating || !prompt.trim()}
              className="w-full py-4 text-lg font-semibold bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-[25px] transition-all duration-300 shadow-[0_10px_30px_rgba(147,51,234,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generiere Bilder... {generationProgress}%
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5" />
                  {numVariants > 1 ? `${numVariants} Bilder generieren` : 'Bild generieren'}
                </div>
              )}
            </Button>

            {/* Progress Bar */}
            {isGenerating && (
              <div className="space-y-2">
                <Progress 
                  value={generationProgress} 
                  className="w-full h-2 bg-white/10 rounded-full overflow-hidden"
                />
                <div className="text-center text-sm text-gray-400">
                  Bitte warten, Ihre Bilder werden erstellt...
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        </motion.div>

        {/* Generated Images Grid */}
        {generatedImages.length > 0 && (
          <Card className="bg-white/5 backdrop-blur-[30px] border border-white/10 rounded-[30px] overflow-hidden">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <ImageIcon className="w-6 h-6 text-purple-300" />
                Generierte Bilder
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {generatedImages.map((image) => (
                  <Card key={image.id} className="bg-white/5 backdrop-blur-[25px] border border-white/10 rounded-[25px] overflow-hidden group hover:bg-white/10 transition-all duration-300">
                    <CardContent className="p-0">
                      <div className="relative">
                        <img
                          src={image.url}
                          alt="Generated"
                          className="w-full h-64 object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
                          <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 bg-white/10 backdrop-blur-[20px] border border-white/20 hover:bg-white/20 text-white rounded-[15px]"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </Button>
                            <Button
                              size="sm"
                              className="bg-white/10 backdrop-blur-[20px] border border-white/20 hover:bg-white/20 text-white rounded-[15px]"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        {image.status === 'generating' && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                          </div>
                        )}
                      </div>
                      
                      <div className="p-4 space-y-2">
                        <p className="text-sm text-gray-300 line-clamp-2">{image.prompt}</p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{image.style}</span>
                          <span>{image.aspectRatio}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => handleFileUpload(Array.from(e.target.files || []))}
        className="hidden"
      />
    </div>
  )
}