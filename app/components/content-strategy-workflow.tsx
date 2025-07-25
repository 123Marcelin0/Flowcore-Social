"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  ArrowLeft, 
  Sparkles, 
  Upload, 
  Video, 
  Edit3, 
  Send,
  Check,
  Loader2,
  Play,
  Download,
  Copy,
  Wand2,
  Target,
  Clock,
  MessageSquare,
  Heart,
  Eye,
  TrendingUp,
  ExternalLink,
  Maximize2,
  X,
  Bot,
  Save,
  Calendar,
  FileText,
  Settings,
  Image,
  Scissors,
  Home,
  Camera,
  Palette
} from "lucide-react"
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

interface ContentStrategyData {
  id: string
  title: string
  description: string
  category: 'content-strategies'
  content: {
    hook?: string
    script?: string
    hashtags?: string[]
    visualTips?: string[]
    platforms?: string[]
    targetAudience?: string
    estimatedReach?: number
  }
  priority: 'low' | 'medium' | 'high'
  estimatedEffort: 'quick' | 'medium' | 'complex'
}

interface ContentStrategyWorkflowProps {
  strategy: ContentStrategyData
  onBack: () => void
}

type WorkflowStep = 'strategy' | 'content' | 'media' | 'generate' | 'publish'
type MediaType = 'image' | 'video' | null

export function ContentStrategyWorkflow({ strategy, onBack }: ContentStrategyWorkflowProps) {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('strategy')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [mediaType, setMediaType] = useState<MediaType>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const [showInteriorDialog, setShowInteriorDialog] = useState(false)
  const [showVideoEditDialog, setShowVideoEditDialog] = useState(false)
  const [autoEditEnabled, setAutoEditEnabled] = useState(false)
  const [showAutoEditDialog, setShowAutoEditDialog] = useState(false)
  const [showSchedulerDialog, setShowSchedulerDialog] = useState(false)
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null)
  const [isSavingPost, setIsSavingPost] = useState(false)
  
  // Content states
  const [strategyData, setStrategyData] = useState<any>(null)
  const [customContent, setCustomContent] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [contentGoal, setContentGoal] = useState('')
  const [generatedHashtags, setGeneratedHashtags] = useState<string[]>([])
  const [generatedDescription, setGeneratedDescription] = useState('')
  const [additionalKeywords, setAdditionalKeywords] = useState('')
  const [isGeneratingHashtags, setIsGeneratingHashtags] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const stepConfig = {
    strategy: { label: 'Strategie Analyse', icon: Target, progress: 20 },
    content: { label: 'Content Entwicklung', icon: Edit3, progress: 40 },
    media: { label: 'Medien Upload', icon: Upload, progress: 60 },
    generate: { label: 'Content Generierung', icon: Wand2, progress: 80 },
    publish: { label: 'Veröffentlichung', icon: Send, progress: 100 }
  }

  // Extract strategy information
  const extractStrategyInformation = (strategy: ContentStrategyData) => {
    const title = strategy.title || ''
    const description = strategy.description || ''
    const content = strategy.content || {}
    
    let strategyScore = 80 // Base score for content strategies
    let keyElements: string[] = []
    let suggestedAudience = ''
    let suggestedGoal = ''
    
    const combinedText = `${title} ${description}`.toLowerCase()
    
    // Extract key elements based on content
    if (combinedText.includes('luxus') || combinedText.includes('luxury') || combinedText.includes('premium')) {
      keyElements.push('Luxus-Features hervorheben')
      suggestedAudience = 'Luxus-Immobilienkäufer'
      strategyScore += 10
    }
    if (combinedText.includes('familie') || combinedText.includes('family') || combinedText.includes('kinder')) {
      keyElements.push('Familienfreundliche Bereiche zeigen')
      suggestedAudience = 'Familien mit Kindern'
    }
    if (combinedText.includes('erste') || combinedText.includes('first') || combinedText.includes('starter')) {
      keyElements.push('Einsteigerfreundlich präsentieren')
      suggestedAudience = 'Erstkäufer'
    }
    if (combinedText.includes('modern') || combinedText.includes('contemporary')) {
      keyElements.push('Moderne Architektur betonen')
    }
    if (combinedText.includes('kitchen') || combinedText.includes('küche')) {
      keyElements.push('Küchen-Highlights')
    }
    if (combinedText.includes('garden') || combinedText.includes('garten') || combinedText.includes('outdoor')) {
      keyElements.push('Außenbereich präsentieren')
    }
    
    // Determine content goal
    if (combinedText.includes('verkauf') || combinedText.includes('sale')) {
      suggestedGoal = 'Verkaufsförderung'
    } else if (combinedText.includes('brand') || combinedText.includes('marke')) {
      suggestedGoal = 'Brand Awareness'
    } else if (combinedText.includes('engagement') || combinedText.includes('interaktion')) {
      suggestedGoal = 'Community Engagement'
    } else {
      suggestedGoal = 'Lead Generierung'
    }

    return {
      strategyScore: Math.min(100, strategyScore),
      keyElements,
      suggestedAudience,
      suggestedGoal
    }
  }

  const handleAnalyzeStrategy = async () => {
    setIsAnalyzing(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      const extractedInfo = extractStrategyInformation(strategy)
      setStrategyData({
        keyElements: extractedInfo.keyElements,
        successFactors: ['Klare Zielgruppenansprache', 'Emotionale Verbindung', 'Call-to-Action Integration', 'Visuell ansprechende Präsentation'],
        strategyScore: extractedInfo.strategyScore,
        effectiveness: extractedInfo.strategyScore > 85 ? 'Sehr Hoch' : extractedInfo.strategyScore > 70 ? 'Hoch' : 'Mittel'
      })
      setTargetAudience(extractedInfo.suggestedAudience)
      setContentGoal(extractedInfo.suggestedGoal)
      setCurrentStep('content')
      toast.success('Strategie erfolgreich analysiert!')
    } catch (error) {
      console.error('Strategy analysis error:', error)
      toast.error('Fehler bei der Strategie-Analyse')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setUploadedFile(file)
      
      // Determine media type
      if (file.type.startsWith('image/')) {
        setMediaType('image')
      } else if (file.type.startsWith('video/')) {
        setMediaType('video')
      }
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setUploadPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
      
      toast.success(`${file.type.startsWith('image/') ? 'Bild' : 'Video'} erfolgreich hochgeladen!`)
    }
  }

  const handleGenerateHashtagsAndDescription = async () => {
    setIsGeneratingHashtags(true)
    try {
      const currentContent = customContent || strategy.description || ''
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No authentication token available')
      }

      const keywords = additionalKeywords.trim() ? `\nZusätzliche Stichworte: ${additionalKeywords}` : ''
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          query: `Basierend auf dieser Content-Strategie generiere passende Hashtags und eine ansprechende Post-Beschreibung:\n\nSTRATEGIE:\n${currentContent}\n\nZIELGRUPPE: ${targetAudience || 'Immobilienkäufer'}\nCONTENT-ZIEL: ${contentGoal || 'Immobilien-Content erstellen'}${keywords}\n\nBitte antworte im folgenden JSON-Format:\n{\n  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", ...],\n  "description": "Eine ansprechende Beschreibung für den Post..."\n}\n\nGeneriere 10-15 relevante Hashtags (Mix aus populären und nischigen) und eine 2-3 Sätze lange, ansprechende Beschreibung, die zum Engagement auffordert.`
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      if (data.success && data.response) {
        try {
          const parsedResponse = JSON.parse(data.response.trim())
          setGeneratedHashtags(parsedResponse.hashtags || [])
          setGeneratedDescription(parsedResponse.description || '')
          toast.success('Hashtags und Beschreibung erfolgreich generiert!')
        } catch (parseError) {
          // Fallback: Manual extraction
          const hashtagMatches = data.response.match(/#[\w]+/g) || []
          setGeneratedHashtags(hashtagMatches.slice(0, 15))
          const descriptionMatch = data.response.match(/"description":\s*"([^"]+)"/)?.[1] || 'Professioneller Immobilien-Content basierend auf bewährter Strategie'
          setGeneratedDescription(descriptionMatch)
          toast.success('Hashtags und Beschreibung generiert!')
        }
      } else {
        throw new Error(data.error || 'No response received from API')
      }
    } catch (error) {
      console.error('Error generating hashtags and description:', error)
      // Fallback content
      setGeneratedHashtags(['#immobilien', '#realestate', '#traumhaus', '#property', '#home', '#luxury', '#modern'])
      setGeneratedDescription('Entdecken Sie außergewöhnliche Immobilien mit professionellem Content!')
      toast.error('Fehler bei der Generierung. Fallback-Content verwendet.')
    } finally {
      setIsGeneratingHashtags(false)
    }
  }

  const savePostToDatabase = async (status: 'draft' | 'scheduled' | 'published', publishDate?: Date) => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error('User authentication failed')
      }

      const content = customContent || strategy.description || ''
      const finalHashtags = generatedHashtags.length > 0 ? generatedHashtags : ['#immobilien', '#realestate']
      const finalDescription = generatedDescription || 'Content Strategy Post'

      const metadata: any = {
        target_audience: targetAudience,
        content_goal: contentGoal,
        strategy_source: strategy.id,
        original_strategy_title: strategy.title,
        content_text: content,
        additional_keywords: additionalKeywords,
        generated_description: finalDescription,
        generated_hashtags: finalHashtags,
        workflow_type: 'content_strategy',
        created_via: 'content_strategy_workflow',
        media_type: mediaType,
        strategy_score: strategyData?.strategyScore || 80
      }

      const postData: any = {
        user_id: user.id,
        content: content,
        status: status,
        platforms: ['instagram'],
        media_type: uploadedFile ? mediaType || 'image' : 'text',
        tags: finalHashtags,
        metadata: metadata
      }

      if (strategy.title) {
        postData.title = `Strategy: ${strategy.title.substring(0, 50)}`
      }
      if (finalDescription) {
        postData.content_text = finalDescription
      }
      if (status === 'scheduled' && publishDate) {
        postData.scheduled_at = publishDate.toISOString()
      }
      if (uploadedFile) {
        postData.media_urls = [`uploaded_${Date.now()}_${uploadedFile.name}`]
      }

      const { data, error } = await supabase
        .from('posts')
        .insert([postData])
        .select()
        .single()

      if (error) {
        console.error('Supabase error:', error)
        throw new Error(`Database error: ${error.message}`)
      }

      console.log('Post erfolgreich gespeichert:', data)
      return data
    } catch (error) {
      console.error('Error saving post:', error)
      throw error
    }
  }

  const handleSaveToDraft = async () => {
    setIsSavingPost(true)
    try {
      await savePostToDatabase('draft')
      toast.success('Post als Entwurf gespeichert!')
    } catch (error) {
      toast.error('Fehler beim Speichern des Entwurfs')
    } finally {
      setIsSavingPost(false)
    }
  }

  const handleSchedulePost = async () => {
    if (!scheduledDate) {
      toast.error('Bitte wählen Sie ein Datum aus')
      return
    }
    setIsSavingPost(true)
    try {
      await savePostToDatabase('scheduled', scheduledDate)
      toast.success('Post erfolgreich geplant!')
      setShowSchedulerDialog(false)
    } catch (error) {
      toast.error('Fehler beim Planen des Posts')
    } finally {
      setIsSavingPost(false)
    }
  }

  const handlePublishNow = async () => {
    setIsSavingPost(true)
    try {
      await savePostToDatabase('published')
      toast.success('Post erfolgreich veröffentlicht!')
    } catch (error) {
      toast.error('Fehler beim Veröffentlichen des Posts')
    } finally {
      setIsSavingPost(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('In Zwischenablage kopiert!')
  }

  const currentStepConfig = stepConfig[currentStep]
  const StepIcon = currentStepConfig.icon

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-emerald-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={onBack}
            className="flex items-center gap-2 hover:bg-white/60 transition-colors rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück
          </Button>

          <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-6 py-3 rounded-full shadow-lg">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              <span className="font-semibold">Content Strategie</span>
            </div>
          </div>

          <div className="text-sm text-gray-500">
            {currentStepConfig.progress}% Abgeschlossen
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Workflow Fortschritt</h2>
            <span className="text-sm text-gray-600">{currentStepConfig.progress}% Abgeschlossen</span>
          </div>
          
          <div className="relative">
            <Progress 
              value={currentStepConfig.progress} 
              className="h-3 bg-white/60 rounded-full overflow-hidden shadow-inner"
            />
            <div 
              className="absolute top-0 left-0 h-3 bg-gradient-to-r from-teal-500 via-cyan-500 to-emerald-500 rounded-full transition-all duration-500 shadow-sm"
              style={{ width: `${currentStepConfig.progress}%` }}
            />
          </div>
          
          {/* Step Icons */}
          <div className="flex justify-between mt-6">
            {Object.entries(stepConfig).map(([step, config], index) => {
              const Icon = config.icon
              const isActive = step === currentStep
              const isCompleted = currentStepConfig.progress > config.progress - 20
              
              return (
                <div key={step} className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isActive 
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg scale-110' 
                      : isCompleted
                      ? 'bg-gradient-to-r from-teal-400 to-cyan-400 text-white'
                      : 'bg-white/60 text-gray-400 border border-gray-200'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-xs mt-2 font-medium transition-colors ${
                    isActive ? 'text-teal-600' : isCompleted ? 'text-teal-500' : 'text-gray-400'
                  }`}>
                    {config.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Workflow Steps */}
          <div className="space-y-6">
            {/* Strategy Analysis Step */}
            {currentStep === 'strategy' && (
              <Card className="bg-white/90 backdrop-blur-sm border-0 rounded-xl shadow-sm">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-teal-600" />
                    Strategie Analyse
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg border border-teal-100">
                      <h4 className="font-medium text-teal-800 mb-2">{strategy.title}</h4>
                      <p className="text-sm text-teal-700">{strategy.description}</p>
                    </div>
                    
                    <div className="text-center">
                      <Button 
                        onClick={handleAnalyzeStrategy}
                        disabled={isAnalyzing}
                        className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-8"
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Analysiere Strategie...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Strategie analysieren
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Content Development Step */}
            {currentStep === 'content' && (
              <Card className="bg-white/90 backdrop-blur-sm border-0 rounded-xl shadow-sm">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-teal-600" />
                    Content Entwicklung
                  </h3>
                  
                  <div className="space-y-4">
                    {strategyData && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="p-4 bg-teal-50 rounded-lg">
                          <label className="text-sm font-medium text-teal-800 mb-2 block">Strategie Score</label>
                          <div className="text-2xl font-bold text-teal-600">{strategyData.strategyScore}%</div>
                        </div>
                        <div className="p-4 bg-cyan-50 rounded-lg">
                          <label className="text-sm font-medium text-cyan-800 mb-2 block">Effektivität</label>
                          <div className="text-lg font-semibold text-cyan-600">{strategyData.effectiveness}</div>
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <Label htmlFor="content" className="text-sm font-medium text-gray-700 mb-2 block">Content Text</Label>
                      <Textarea 
                        id="content"
                        placeholder="Entwickeln Sie Ihren Content basierend auf der analysierten Strategie..."
                        value={customContent}
                        onChange={(e) => setCustomContent(e.target.value)}
                        rows={6}
                        className="resize-none"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="audience" className="text-sm font-medium text-gray-700 mb-2 block">Zielgruppe</Label>
                        <Input 
                          id="audience"
                          placeholder="z.B. Junge Familien"
                          value={targetAudience}
                          onChange={(e) => setTargetAudience(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="goal" className="text-sm font-medium text-gray-700 mb-2 block">Content Ziel</Label>
                        <Input 
                          id="goal"
                          placeholder="z.B. Lead Generierung"
                          value={contentGoal}
                          onChange={(e) => setContentGoal(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-3 pt-4">
                      <Button variant="outline" onClick={() => setCurrentStep('strategy')}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Zurück
                      </Button>
                      <Button 
                        onClick={() => setCurrentStep('media')} 
                        className="flex-1 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Weiter zu Medien
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Media Upload Step */}
            {currentStep === 'media' && (
              <Card className="bg-white/90 backdrop-blur-sm border-0 rounded-xl shadow-sm">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-teal-600" />
                    Medien Upload
                  </h3>
                  
                  <div className="space-y-4">
                    {!uploadedFile ? (
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-teal-300 rounded-lg p-8 text-center cursor-pointer hover:bg-teal-50 transition-colors"
                      >
                        <Upload className="w-12 h-12 text-teal-400 mx-auto mb-4" />
                        <p className="text-lg font-medium text-gray-700 mb-2">Bild oder Video hochladen</p>
                        <p className="text-sm text-gray-500">Klicken Sie hier oder ziehen Sie Ihre Datei hinein</p>
                        <p className="text-xs text-gray-400 mt-2">Unterstützte Formate: JPG, PNG, MP4, MOV</p>
                      </div>
                    ) : (
                      <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                        {mediaType === 'image' ? (
                          <img 
                            src={uploadPreview || ''} 
                            alt="Upload preview" 
                            className="w-full h-48 object-cover"
                          />
                        ) : (
                          <video 
                            src={uploadPreview || ''} 
                            className="w-full h-48 object-cover"
                            controls
                          />
                        )}
                        <div className="absolute top-2 right-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setUploadedFile(null)
                              setUploadPreview(null)
                              setMediaType(null)
                            }}
                            className="bg-white/80 hover:bg-white"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    
                    {uploadedFile && (
                      <div className="flex gap-3">
                        {mediaType === 'image' ? (
                          <Button 
                            variant="outline" 
                            onClick={() => setShowInteriorDialog(true)}
                            className="flex-1"
                          >
                            <Home className="w-4 h-4 mr-2" />
                            Interior hinzufügen
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            onClick={() => setShowVideoEditDialog(true)}
                            className="flex-1"
                          >
                            <Scissors className="w-4 h-4 mr-2" />
                            Video schneiden
                          </Button>
                        )}
                      </div>
                    )}
                    
                    <div className="flex gap-3 pt-4">
                      <Button variant="outline" onClick={() => setCurrentStep('content')}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Zurück
                      </Button>
                      <Button 
                        onClick={() => setCurrentStep('generate')} 
                        className="flex-1 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white"
                        disabled={!uploadedFile}
                      >
                        <Wand2 className="w-4 h-4 mr-2" />
                        Weiter zu Generierung
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Generate Step */}
            {currentStep === 'generate' && (
              <Card className="bg-white/90 backdrop-blur-sm border-0 rounded-xl shadow-sm flex-1 flex flex-col">
                <CardContent className="p-6 flex-1 flex flex-col">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Wand2 className="w-5 h-5 text-teal-600" />
                    Content Generierung
                  </h3>
                  <div className="space-y-6 flex-1 flex flex-col">
                    <div>
                      <Label htmlFor="keywords" className="text-sm font-medium text-gray-700 mb-2 block">Zusätzliche Stichworte (optional)</Label>
                      <Textarea 
                        id="keywords"
                        placeholder="Basierend auf Content sofort generieren oder noch Stichworte mit eingeben (z.B. luxuriös, modern, familienfreundlich, Garten, Neubau...)"
                        value={additionalKeywords}
                        onChange={(e) => setAdditionalKeywords(e.target.value)}
                        rows={3}
                        className="text-sm"
                        style={{ color: additionalKeywords ? '#000' : '#9CA3AF' }}
                      />
                      <p className="text-xs text-gray-500 mt-1">Diese Begriffe werden bei der Hashtag- und Beschreibungsgenerierung berücksichtigt</p>
                    </div>
                    
                    <div className="text-center">
                      <Button 
                        onClick={handleGenerateHashtagsAndDescription}
                        disabled={isGeneratingHashtags}
                        className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-8"
                      >
                        {isGeneratingHashtags ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generiere Hashtags & Beschreibung...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Hashtags & Beschreibung generieren
                          </>
                        )}
                      </Button>
                    </div>

                    {(generatedHashtags.length > 0 || generatedDescription) && (
                      <div className="space-y-4 flex-1 bg-gray-50 rounded-lg p-4">
                        {generatedDescription && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <Label className="font-medium text-gray-900">Post-Beschreibung</Label>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => copyToClipboard(generatedDescription)}
                              >
                                <Copy className="w-4 h-4 mr-1" />
                                Kopieren
                              </Button>
                            </div>
                            <Textarea 
                              value={generatedDescription}
                              onChange={(e) => setGeneratedDescription(e.target.value)}
                              rows={3}
                              className="bg-white"
                            />
                          </div>
                        )}
                        
                        {generatedHashtags.length > 0 && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <Label className="font-medium text-gray-900">Hashtags ({generatedHashtags.length})</Label>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => copyToClipboard(generatedHashtags.join(' '))}
                              >
                                <Copy className="w-4 h-4 mr-1" />
                                Alle kopieren
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-2 p-3 bg-white rounded-lg border max-h-32 overflow-y-auto">
                              {generatedHashtags.map((hashtag, index) => (
                                <Badge
                                  key={index}
                                  variant="secondary"
                                  className="bg-teal-100 text-teal-800 cursor-pointer hover:bg-teal-200 transition-colors"
                                  onClick={() => copyToClipboard(hashtag)}
                                >
                                  {hashtag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex gap-3 pt-4">
                      <Button variant="outline" onClick={() => setCurrentStep('media')}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Zurück
                      </Button>
                      <Button 
                        onClick={() => setCurrentStep('publish')} 
                        disabled={!generatedHashtags.length && !generatedDescription}
                        className="flex-1 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Weiter zu Veröffentlichung
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Publish Step */}
            {currentStep === 'publish' && (
              <Card className="bg-white/90 backdrop-blur-sm border-0 rounded-xl shadow-sm">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Send className="w-5 h-5 text-teal-600" />
                    Veröffentlichung
                  </h3>
                  
                  <div className="space-y-6">
                    {/* Auto Edit Toggle */}
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full flex items-center justify-center">
                          <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Automatisch bearbeiten</p>
                          <p className="text-sm text-gray-600">KI-gestützte Nachbearbeitung</p>
                        </div>
                      </div>
                      <Switch
                        checked={autoEditEnabled}
                        onCheckedChange={(checked) => {
                          setAutoEditEnabled(checked)
                          if (checked) {
                            setShowAutoEditDialog(true)
                          }
                        }}
                      />
                    </div>

                    {/* Media Preview */}
                    {uploadedFile && uploadPreview && (
                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-4 py-2 border-b">
                          <p className="text-sm font-medium text-gray-700">Medien Vorschau</p>
                        </div>
                        {mediaType === 'image' ? (
                          <img 
                            src={uploadPreview} 
                            alt="Media preview" 
                            className="w-full h-64 object-cover"
                          />
                        ) : (
                          <video 
                            src={uploadPreview} 
                            className="w-full h-64 object-cover"
                            controls
                          />
                        )}
                        <div className="p-3 bg-gray-50 border-t">
                          <div className="flex items-center justify-between text-sm text-gray-600">
                            <span>{uploadedFile.name}</span>
                            <span>{mediaType === 'image' ? 'Bild' : 'Video'}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-3">
                      <Button
                        onClick={handleSaveToDraft}
                        disabled={isSavingPost}
                        className="w-full h-12 bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300"
                      >
                        {isSavingPost ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        Entwürfe speichern
                      </Button>

                      <Button
                        onClick={() => setShowSchedulerDialog(true)}
                        disabled={isSavingPost}
                        className="w-full h-12 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white"
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Planen
                      </Button>

                      <Button
                        onClick={handlePublishNow}
                        disabled={isSavingPost}
                        className="w-full h-12 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-semibold"
                      >
                        {isSavingPost ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4 mr-2" />
                        )}
                        Jetzt posten
                      </Button>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button variant="outline" onClick={() => setCurrentStep('generate')}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Zurück
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Preview/Media Area */}
          <div className="space-y-6">
            <Card className="bg-white/90 backdrop-blur-sm border-0 rounded-xl shadow-sm h-fit">
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-teal-600" />
                  Content Vorschau
                </h3>
                
                {/* Media Upload/Preview Area */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-8 mb-6 border-2 border-dashed border-gray-200">
                  {uploadedFile && uploadPreview ? (
                    <div className="space-y-4">
                      {mediaType === 'image' ? (
                        <img 
                          src={uploadPreview} 
                          alt="Content preview" 
                          className="w-full h-64 object-cover rounded-lg shadow-sm"
                        />
                      ) : (
                        <video 
                          src={uploadPreview} 
                          className="w-full h-64 object-cover rounded-lg shadow-sm"
                          controls
                        />
                      )}
                      <div className="flex justify-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          Ändern
                        </Button>
                        {mediaType === 'image' ? (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setShowInteriorDialog(true)}
                          >
                            <Home className="w-4 h-4 mr-2" />
                            Interior
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setShowVideoEditDialog(true)}
                          >
                            <Scissors className="w-4 h-4 mr-2" />
                            Schneiden
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="w-20 h-20 bg-gradient-to-r from-teal-100 to-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Upload className="w-10 h-10 text-teal-500" />
                      </div>
                      <h4 className="font-medium text-gray-700 mb-2">Medien hinzufügen</h4>
                      <p className="text-sm text-gray-500 mb-4">Laden Sie Ihr Bild oder Video hoch um zu beginnen</p>
                      <Button 
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Datei auswählen
                      </Button>
                    </div>
                  )}
                </div>

                {/* Strategy Info */}
                {strategyData && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-teal-50 rounded-lg text-center">
                        <div className="text-lg font-bold text-teal-600">{strategyData.strategyScore}%</div>
                        <div className="text-xs text-teal-600">Strategie Score</div>
                      </div>
                      <div className="p-3 bg-cyan-50 rounded-lg text-center">
                        <div className="text-sm font-semibold text-cyan-600">{strategyData.effectiveness}</div>
                        <div className="text-xs text-cyan-600">Effektivität</div>
                      </div>
                    </div>

                    {strategyData.keyElements && strategyData.keyElements.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Schlüssel Elemente</h4>
                        <div className="space-y-1">
                          {strategyData.keyElements.slice(0, 4).map((element: string, index: number) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              <div className="w-1.5 h-1.5 bg-teal-500 rounded-full"></div>
                              <span className="text-gray-600">{element}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      
      {/* Interior Design Dialog */}
      <Dialog open={showInteriorDialog} onOpenChange={setShowInteriorDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Home className="w-5 h-5 text-teal-600" />
              Interior Design
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-r from-teal-100 to-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Palette className="w-8 h-8 text-teal-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Interior Design Feature</h3>
            <p className="text-gray-600 mb-6">Diese Funktion wird bald verfügbar sein! Sie können dann automatisch Interior-Elemente zu Ihren Bildern hinzufügen.</p>
            <Button onClick={() => setShowInteriorDialog(false)} className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white">
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Edit Dialog */}
      <Dialog open={showVideoEditDialog} onOpenChange={setShowVideoEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scissors className="w-5 h-5 text-teal-600" />
              Video Bearbeitung
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-r from-teal-100 to-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Video className="w-8 h-8 text-teal-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Video Schnitt Feature</h3>
            <p className="text-gray-600 mb-6">Diese Funktion wird bald verfügbar sein! Sie können dann Ihre Videos direkt in der App schneiden und bearbeiten.</p>
            <Button onClick={() => setShowVideoEditDialog(false)} className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white">
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Auto Edit Dialog */}
      <Dialog open={showAutoEditDialog} onOpenChange={setShowAutoEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-orange-600" />
              Automatische Bearbeitung
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-r from-orange-100 to-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bot className="w-8 h-8 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Funktion bald verfügbar</h3>
            <p className="text-gray-600 mb-6">Die automatische Bearbeitung mit KI wird in Kürze verfügbar sein!</p>
            <Button onClick={() => setShowAutoEditDialog(false)} className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Scheduler Dialog */}
      <Dialog open={showSchedulerDialog} onOpenChange={setShowSchedulerDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Post planen
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="schedule-date" className="text-sm font-medium mb-2 block">Datum und Uhrzeit</Label>
              <Input
                id="schedule-date"
                type="datetime-local"
                value={scheduledDate ? scheduledDate.toISOString().slice(0, 16) : ''}
                onChange={(e) => setScheduledDate(new Date(e.target.value))}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowSchedulerDialog(false)} className="flex-1">
                Abbrechen
              </Button>
              <Button 
                onClick={handleSchedulePost}
                disabled={!scheduledDate || isSavingPost}
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
              >
                {isSavingPost ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Calendar className="w-4 h-4 mr-2" />
                )}
                Planen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  )
} 