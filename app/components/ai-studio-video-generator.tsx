"use client"

import React, { useState, useRef, useCallback, useEffect } from 'react'
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
  Play, 
  Download, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
  ImageIcon,
  VideoIcon,
  Clock,
  Settings,
  Zap
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface UploadedFile {
  id: string
  file: File
  url: string
  type: 'image' | 'video'
  name: string
}

interface GeneratedVideo {
  id: string
  prompt: string
  url: string
  thumbnail: string
  duration: number
  createdAt: Date
  status: 'generating' | 'completed' | 'failed'
}

const prePrompts = [
  { id: 'cinematic', name: 'Cinematisch', prompt: 'Cinematische Kamerafahrt durch eine atemberaubende Landschaft mit dynamischen Lichteffekten' },
  { id: 'abstract', name: 'Abstrakt', prompt: 'Abstrakte flüssige Formen in lebendigen Farben, die sich elegant transformieren' },
  { id: 'nature', name: 'Natur', prompt: 'Majestätische Naturszene mit fließendem Wasser und sanften Windeffekten' },
  { id: 'tech', name: 'Technologie', prompt: 'Futuristische Technologie-Visualisierung mit holografischen Elementen' },
  { id: 'space', name: 'Weltraum', prompt: 'Epische Weltraumreise durch Galaxien und Sternennebel' }
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
      ease: "easeOut" as const
    }
  }
}

// Interactive hover animations
const buttonHoverVariants = {
  scale: 1.02,
  transition: {
    type: "spring" as const,
    stiffness: 400,
    damping: 10
  }
}

const iconHoverVariants = {
  rotate: 10,
  scale: 1.1,
  transition: {
    type: "spring" as const,
    stiffness: 400,
    damping: 10
  }
}

export function AIStudioVideoGenerator() {
  const [selectedModel, setSelectedModel] = useState<'veo-2' | 'veo-3'>('veo-2')
  const [prompt, setPrompt] = useState('')
  const [selectedPrePrompt, setSelectedPrePrompt] = useState('')
  const [showPrePrompts, setShowPrePrompts] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideo[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const [duration, setDuration] = useState('8')
  const [aspectRatio, setAspectRatio] = useState('16:9')
  const [resolution, setResolution] = useState('720p')
  const [quality, setQuality] = useState('high')
  const [generateAudio, setGenerateAudio] = useState(true)
  const [autoEnhance, setAutoEnhance] = useState(true)
  const [sampleCount, setSampleCount] = useState(1)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle model change and reset incompatible settings
  useEffect(() => {
    if (selectedModel === 'veo-3') {
      // Veo 3 constraints
      setDuration('8') // Fixed 8 seconds
      setAspectRatio('16:9') // Only 16:9 
      setUploadedFiles([]) // Clear uploaded files (text-to-video only)
    } else {
      // Veo 2 defaults
      if (aspectRatio === '1:1') {
        setAspectRatio('16:9') // Reset unsupported aspect ratio
      }
    }
  }, [selectedModel, aspectRatio])

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
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        try {
          const type = file.type.startsWith('image/') ? 'image' : 'video'
          
          // Upload to database via API
          const formData = new FormData()
          formData.append('file', file)
          formData.append('fileType', type)

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
          
          setUploadedFiles(prev => [...prev, {
            id: result.data.id,
            file,
            url: result.data.storage_url || result.data.public_url,
            type,
            name: file.name
          }])
          
          toast.success(`${file.name} uploaded successfully`)
        } catch (error) {
          console.error('Upload error:', error)
          toast.error(`Failed to upload ${file.name}`)
        }
      }
    }
  }, [])

  const removeFile = useCallback((id: string) => {
    setUploadedFiles(prev => {
      const file = prev.find(f => f.id === id)
      if (file) {
        URL.revokeObjectURL(file.url)
      }
      return prev.filter(f => f.id !== id)
    })
  }, [])

  const handleEnhancePrompt = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error('Bitte geben Sie zunächst einen Prompt ein')
      return
    }

    try {
      // Simulate AI enhancement
      const enhanced = `${prompt} - Mit cinematischen Kamerafahrten, professioneller Beleuchtung und hoher visueller Qualität optimiert`
      setPrompt(enhanced)
      toast.success('Prompt wurde KI-optimiert!')
    } catch (error) {
      toast.error('Fehler beim Optimieren des Prompts')
    }
  }, [prompt])

  const generateVideo = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error('Bitte geben Sie einen Prompt ein')
      return
    }

    setIsGenerating(true)
    setGenerationProgress(0)

    try {
      // Simulate video generation process
      const intervals = [
        { progress: 20, message: 'Prompt wird analysiert...' },
        { progress: 40, message: 'Frames werden generiert...' },
        { progress: 60, message: 'Video wird zusammengesetzt...' },
        { progress: 80, message: 'Finale Optimierung...' },
        { progress: 100, message: 'Video generiert!' }
      ]

      for (const interval of intervals) {
        await new Promise(resolve => setTimeout(resolve, 1500))
        setGenerationProgress(interval.progress)
        toast.info(interval.message)
      }

      // Create mock generated video
      const newVideo: GeneratedVideo = {
        id: Date.now().toString(),
        prompt,
        url: '/placeholder-video.mp4', // This would be the actual generated video URL
        thumbnail: '/placeholder-thumbnail.jpg',
        duration: parseInt(duration),
        createdAt: new Date(),
        status: 'completed'
      }

      setGeneratedVideos(prev => [newVideo, ...prev])
      toast.success('Video erfolgreich generiert!')
    } catch (error) {
      toast.error('Fehler bei der Video-Generierung')
    } finally {
      setIsGenerating(false)
      setGenerationProgress(0)
    }
  }, [prompt, duration])

  const selectPrePrompt = useCallback((prePrompt: typeof prePrompts[0]) => {
    setPrompt(prePrompt.prompt)
    setSelectedPrePrompt(prePrompt.id)
    setShowPrePrompts(false)
    toast.success(`Vorlage "${prePrompt.name}" ausgewählt`)
  }, [])

  return (
    <div className="relative overflow-hidden min-h-screen">
      {/* Veo Google Background Effect - Only for video tools */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Animated flowing particles */}
        <div className="absolute inset-0">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full opacity-20"
              style={{
                background: `radial-gradient(circle, ${
                  ['#1e3a8a', '#3730a3', '#1e40af', '#0ea5e9', '#06b6d4', '#8b5cf6'][i]
                }, transparent 70%)`,
                width: `${120 + i * 40}px`,
                height: `${120 + i * 40}px`,
                left: `${10 + i * 15}%`,
                top: `${20 + Math.sin(i) * 30}%`,
                animation: `float-${i} ${15 + i * 2}s ease-in-out infinite`,
                filter: 'blur(1px)'
              }}
            />
          ))}
        </div>

        {/* Flowing light streams */}
        <div className="absolute inset-0">
          {[...Array(4)].map((_, i) => (
            <div
              key={`stream-${i}`}
              className="absolute opacity-10"
              style={{
                background: `linear-gradient(${45 + i * 45}deg, transparent, #0ea5e9, #06b6d4, transparent)`,
                width: '2px',
                height: '200%',
                left: `${20 + i * 25}%`,
                animation: `drift-${i} ${20 + i * 5}s linear infinite`,
                filter: 'blur(2px)'
              }}
            />
          ))}
        </div>

        {/* CSS Animations */}
        <style jsx>{`
          @keyframes float-0 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(30px, -20px) scale(1.1); } }
          @keyframes float-1 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(-20px, 30px) scale(0.9); } }
          @keyframes float-2 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(40px, 15px) scale(1.2); } }
          @keyframes float-3 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(-30px, -25px) scale(0.8); } }
          @keyframes float-4 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(25px, 35px) scale(1.1); } }
          @keyframes float-5 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(-40px, 10px) scale(0.9); } }
          @keyframes drift-0 { 0% { transform: translateY(-100%) rotate(0deg); } 100% { transform: translateY(100vh) rotate(360deg); } }
          @keyframes drift-1 { 0% { transform: translateY(-100%) rotate(180deg); } 100% { transform: translateY(100vh) rotate(540deg); } }
          @keyframes drift-2 { 0% { transform: translateY(-100%) rotate(90deg); } 100% { transform: translateY(100vh) rotate(450deg); } }
          @keyframes drift-3 { 0% { transform: translateY(-100%) rotate(270deg); } 100% { transform: translateY(100vh) rotate(630deg); } }
        `}</style>
      </div>

      {/* Main Content */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="relative z-10 w-full max-w-6xl mx-auto p-6 space-y-8"
      >
        {/* Model Selection Header */}
        <div className="text-center space-y-6">
          <div className="space-y-2">
            {/* Title and subtitle removed for cleaner interface */}
          </div>
          
          {/* Model Selection - Clean Toggle Design */}
          <motion.div variants={itemVariants} className="flex justify-center">
            <div className="bg-white/10 backdrop-blur-[25px] border border-white/20 rounded-full p-1 shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
              <div className="flex gap-0.5">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedModel('veo-2')}
                  className={`relative px-5 py-2.5 rounded-full transition-all duration-300 focus:outline-none focus:ring-0 ${
                    selectedModel === 'veo-2'
                      ? 'bg-white/20 text-white shadow-[0_4px_16px_rgba(59,130,246,0.3)] border border-white/30'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                    <span className="text-sm font-medium">Veo 2</span>
                  </div>
                  {selectedModel === 'veo-2' && (
                    <motion.div
                      layoutId="activeVideoTab"
                      className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-cyan-400/20 rounded-full -z-10"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedModel('veo-3')}
                  className={`relative px-5 py-2.5 rounded-full transition-all duration-300 focus:outline-none focus:ring-0 ${
                    selectedModel === 'veo-3'
                      ? 'bg-white/20 text-white shadow-[0_4px_16px_rgba(168,85,247,0.3)] border border-white/30'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                    <span className="text-sm font-medium">Veo 3</span>
                  </div>
                  {selectedModel === 'veo-3' && (
                    <motion.div
                      layoutId="activeVideoTab"
                      className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-blue-400/20 rounded-full -z-10"
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
          <Card className="bg-white/5 backdrop-blur-[30px] border border-white/10 rounded-[30px] shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)] overflow-hidden">
          <CardContent className="p-8 space-y-8">
            
            {/* Text Prompt Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-lg font-semibold text-white">Video-Beschreibung</label>
                <motion.div whileHover={buttonHoverVariants}>
                                      <Button
                      onClick={handleEnhancePrompt}
                      size="sm"
                      className="bg-white/10 backdrop-blur-[20px] border border-white/20 hover:bg-white/20 text-white rounded-[20px] transition-all duration-300 focus:outline-none focus:ring-0"
                    >
                    <motion.div whileHover={iconHoverVariants}>
                      <Sparkles className="w-4 h-4 mr-2" />
                    </motion.div>
                    KI-Optimierung
                  </Button>
                </motion.div>
              </div>
              
              <div className="relative">
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Beschreiben Sie das Video, das Sie erstellen möchten..."
                  className="min-h-[120px] bg-white/5 backdrop-blur-[25px] border border-white/15 rounded-[25px] text-white placeholder-gray-400 resize-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-300"
                  style={{ 
                    backdropFilter: 'blur(25px) saturate(180%)',
                    boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.1), 0 4px 20px rgba(0,0,0,0.1)'
                  }}
                />
              </div>
            </div>

            {/* Pre-Prompts Dropdown */}
            <div className="space-y-4">
              <Button
                onClick={() => setShowPrePrompts(!showPrePrompts)}
                variant="outline"
                className="w-full bg-white/8 backdrop-blur-[25px] border border-white/15 hover:bg-white/15 text-white rounded-[25px] h-14 transition-all duration-300 focus:outline-none focus:ring-0"
                style={{ 
                  backdropFilter: 'blur(25px) saturate(180%)',
                  boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.1), 0 4px 20px rgba(0,0,0,0.1)'
                }}
              >
                <Wand2 className="w-5 h-5 mr-3" />
                Vorlagen auswählen
                {showPrePrompts ? <ChevronUp className="w-5 h-5 ml-auto" /> : <ChevronDown className="w-5 h-5 ml-auto" />}
              </Button>

              {showPrePrompts && (
                <Card className="bg-white/5 backdrop-blur-[30px] border border-white/10 rounded-[25px] overflow-hidden shadow-[0_15px_35px_rgba(0,0,0,0.2),inset_0_1px_2px_rgba(255,255,255,0.1)]">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {prePrompts.map((prePrompt) => (
                        <Button
                          key={prePrompt.id}
                          onClick={() => selectPrePrompt(prePrompt)}
                          variant="ghost"
                          className="h-auto p-4 bg-white/5 backdrop-blur-[20px] border border-white/10 hover:bg-white/15 text-white rounded-[20px] text-left transition-all duration-300 focus:outline-none focus:ring-0"
                          style={{ 
                            backdropFilter: 'blur(20px) saturate(180%)',
                            boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.1)'
                          }}
                        >
                          <div>
                            <div className="font-semibold text-sm mb-1">{prePrompt.name}</div>
                            <div className="text-xs text-gray-300 line-clamp-2">{prePrompt.prompt}</div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Image Upload Zone - Only for Veo 2 */}
            {selectedModel === 'veo-2' && (
              <div className="space-y-4">
                <label className="text-lg font-semibold text-white">Referenz-Bilder (Optional)</label>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-[20px] p-4 mb-4">
                  <p className="text-sm text-blue-200">
                    💡 <strong>Veo 2 Feature:</strong> Laden Sie Bilder hoch für Bild-zu-Video Generation. 
                    Das hochgeladene Bild wird als Ausgangspunkt für die Video-Erstellung verwendet.
                  </p>
                </div>
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-white/20 rounded-[25px] p-8 text-center cursor-pointer bg-white/5 backdrop-blur-[25px] hover:bg-white/10 transition-all duration-300"
                  style={{ 
                    backdropFilter: 'blur(25px) saturate(180%)',
                    boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.1), 0 4px 20px rgba(0,0,0,0.1)'
                  }}
                >
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-white font-medium mb-2">Bilder hier ablegen oder klicken zum Auswählen</p>
                  <p className="text-sm text-gray-400">PNG, JPG bis zu 10MB • Für Bild-zu-Video Generation</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={(e) => e.target.files && handleFileUpload(Array.from(e.target.files))}
                  className="hidden"
                />
              </div>
            )}

            {/* Veo 3 Info Banner */}
            {selectedModel === 'veo-3' && (
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-[20px] p-4">
                <h3 className="text-lg font-semibold text-purple-200 mb-2">🎵 Veo 3 - Erweiterte Features</h3>
                <ul className="text-sm text-purple-200 space-y-1">
                  <li>• <strong>Native Audio-Generation:</strong> Automatische Erstellung von Hintergrundmusik und Soundeffekten</li>
                  <li>• <strong>Nur Text-zu-Video:</strong> Fokus auf reine Textbeschreibungen ohne Bildeingabe</li>
                  <li>• <strong>Höhere Qualität:</strong> Verbesserte Physik-Simulation und realistische Bewegungen</li>
                  <li>• <strong>Feste Spezifikationen:</strong> 16:9 Format, 8 Sekunden Dauer für optimale Ergebnisse</li>
                </ul>
              </div>
            )}

            {/* Uploaded Files Preview */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-4">
                <label className="text-lg font-semibold text-white">Hochgeladene Dateien</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {uploadedFiles.map((file) => (
                    <div key={file.id} className="relative group">
                      <div className="aspect-square bg-white/5 backdrop-blur-[25px] border border-white/15 rounded-[20px] overflow-hidden">
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
                      <Button
                        onClick={() => removeFile(file.id)}
                        size="sm"
                        variant="destructive"
                        className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Advanced Options */}
            <div className="space-y-4">
              <Button
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                variant="ghost"
                className="text-white hover:bg-white/10 rounded-[20px]"
              >
                <Settings className="w-4 h-4 mr-2" />
                Erweiterte Optionen
                {showAdvancedOptions ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
              </Button>

              {showAdvancedOptions && (
                <Card className="bg-white/5 backdrop-blur-[30px] border border-white/10 rounded-[25px] overflow-hidden">
                  <CardContent className="p-6 space-y-6">
                    {/* Model-specific info */}
                    <div className="bg-white/10 backdrop-blur-[20px] border border-white/15 rounded-[15px] p-4">
                      <h3 className="text-lg font-semibold text-white mb-2">
                        {selectedModel === 'veo-2' ? 'Veo 2 Einstellungen' : 'Veo 3 Einstellungen'}
                      </h3>
                      <p className="text-sm text-gray-300">
                        {selectedModel === 'veo-2' 
                          ? 'Unterstützt Text-zu-Video und Bild-zu-Video Generation mit flexibler Dauer.'
                          : 'Erweiterte Text-zu-Video Generation mit nativer Audio-Erzeugung. Nur 16:9 Format, feste 8 Sekunden Dauer.'
                        }
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Duration - Model specific */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Dauer</label>
                        <Select value={duration} onValueChange={setDuration} disabled={selectedModel === 'veo-3'}>
                          <SelectTrigger className="bg-white/5 backdrop-blur-[20px] border border-white/15 text-white rounded-[15px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white/20 backdrop-blur-[20px] border border-white/30">
                            {selectedModel === 'veo-2' ? (
                              <>
                                <SelectItem value="5">5 Sekunden</SelectItem>
                                <SelectItem value="6">6 Sekunden</SelectItem>
                                <SelectItem value="7">7 Sekunden</SelectItem>
                                <SelectItem value="8">8 Sekunden</SelectItem>
                              </>
                            ) : (
                              <SelectItem value="8">8 Sekunden (fest)</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Aspect Ratio - Model specific */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Seitenverhältnis</label>
                        <Select value={aspectRatio} onValueChange={setAspectRatio} disabled={selectedModel === 'veo-3'}>
                          <SelectTrigger className="bg-white/5 backdrop-blur-[20px] border border-white/15 text-white rounded-[15px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900 border-gray-700">
                            <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                            {selectedModel === 'veo-2' && (
                              <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Resolution - Veo 3 only */}
                      {selectedModel === 'veo-3' && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-300">Auflösung</label>
                          <Select value={resolution} onValueChange={setResolution}>
                            <SelectTrigger className="bg-white/5 backdrop-blur-[20px] border border-white/15 text-white rounded-[15px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-900 border-gray-700">
                              <SelectItem value="720p">720p (Standard)</SelectItem>
                              <SelectItem value="1080p">1080p (Hoch)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Sample Count */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Anzahl Videos</label>
                        <Select value={sampleCount.toString()} onValueChange={(value) => setSampleCount(parseInt(value))}>
                          <SelectTrigger className="bg-white/5 backdrop-blur-[20px] border border-white/15 text-white rounded-[15px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900 border-gray-700">
                            <SelectItem value="1">1 Video</SelectItem>
                            <SelectItem value="2">2 Videos</SelectItem>
                            <SelectItem value="3">3 Videos</SelectItem>
                            <SelectItem value="4">4 Videos</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Veo 3 specific options */}
                    {selectedModel === 'veo-3' && (
                      <div className="space-y-4">
                        <h4 className="text-md font-semibold text-white">Veo 3 Spezielle Optionen</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-center justify-between p-4 bg-white/10 backdrop-blur-[20px] border border-white/15 rounded-[15px]">
                            <div>
                              <label className="text-sm font-medium text-white">Audio Generierung</label>
                              <p className="text-xs text-gray-300 mt-1">Erstellt passende Hintergrundmusik und Soundeffekte</p>
                            </div>
                            <Button
                              onClick={() => setGenerateAudio(!generateAudio)}
                              variant={generateAudio ? 'default' : 'outline'}
                              size="sm"
                              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                            >
                              {generateAudio ? 'An' : 'Aus'}
                            </Button>
                          </div>

                          <div className="flex items-center justify-between p-4 bg-white/10 backdrop-blur-[20px] border border-white/15 rounded-[15px]">
                            <div>
                              <label className="text-sm font-medium text-white">Prompt Verbesserung</label>
                              <p className="text-xs text-gray-300 mt-1">KI verbessert automatisch Ihren Prompt</p>
                            </div>
                            <Button
                                              onClick={() => setAutoEnhance(!autoEnhance)}
                variant={autoEnhance ? 'default' : 'outline'}
                              size="sm"
                              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                            >
                              {autoEnhance ? 'An' : 'Aus'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Generate Button */}
            <div className="flex justify-center">
              <Button
                onClick={generateVideo}
                disabled={isGenerating || !prompt.trim()}
                size="lg"
                className="h-16 px-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-[25px] shadow-[0_10px_30px_rgba(59,130,246,0.5)] hover:shadow-[0_15px_40px_rgba(59,130,246,0.6)] transition-all duration-300 disabled:opacity-50 focus:outline-none focus:ring-0"
                style={{ 
                  backdropFilter: 'blur(20px) saturate(180%)',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                    Video wird generiert...
                  </>
                ) : (
                  <>
                    <Zap className="w-6 h-6 mr-3" />
                    Video generieren
                  </>
                )}
              </Button>
            </div>

            {/* Generation Progress */}
            {isGenerating && (
              <div className="space-y-3">
                <Progress 
                  value={generationProgress} 
                  className="h-3 bg-white/10 rounded-full overflow-hidden"
                />
                <p className="text-center text-gray-300 text-sm">
                  {generationProgress}% - Ihr Video wird erstellt...
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        </motion.div>

        {/* Generated Videos Results */}
        {generatedVideos.length > 0 && (
          <motion.div variants={itemVariants} className="space-y-6">
            <h2 className="text-2xl font-bold text-white text-center">Generierte Videos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {generatedVideos.map((video) => (
                <motion.div key={video.id} whileHover={buttonHoverVariants}>
                  <Card className="bg-white/5 backdrop-blur-[30px] border border-white/10 rounded-[25px] overflow-hidden group hover:bg-white/10 transition-all duration-300">
                  <CardContent className="p-6 space-y-4">
                    <div className="aspect-video bg-gray-800 rounded-[20px] overflow-hidden relative">
                      <div className="w-full h-full flex items-center justify-center">
                        <VideoIcon className="w-16 h-16 text-gray-400" />
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50">
                        <Button size="sm" className="rounded-full focus:outline-none focus:ring-0">
                          <Play className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-white text-sm line-clamp-2">{video.prompt}</p>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {video.duration}s
                        </span>
                        <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                          {video.status === 'completed' ? 'Fertig' : 'Wird generiert...'}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 bg-white/5 border-white/15 text-white hover:bg-white/15 rounded-[15px] focus:outline-none focus:ring-0">
                        <Play className="w-4 h-4 mr-2" />
                        Abspielen
                      </Button>
                      <Button size="sm" variant="outline" className="bg-white/5 border-white/15 text-white hover:bg-white/15 rounded-[15px] focus:outline-none focus:ring-0">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}