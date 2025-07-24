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
  Bot
} from "lucide-react"
import { toast } from 'sonner'

interface TrendData {
  id: string
  thumbnail_url: string
  reel_url: string
  title?: string
  creator?: string
  script?: string
  description?: string
}

interface TrendOptimizationWorkflowProps {
  trend: TrendData
  onBack: () => void
}

type WorkflowStep = 'analyze' | 'optimize' | 'customize' | 'generate' | 'upload'

// Utility function to extract trend information from URLs and trend data
const extractTrendInformation = (trend: TrendData) => {
  const url = trend.reel_url || ''
  const title = trend.title || ''
  const description = trend.description || ''
  const script = trend.script || ''
  
  // Extract information from various sources
  let trendScore = 75 // Default
  let keyElements: string[] = []
  let targetAudience = ''
  let contentGoal = ''
  
  // Analyze URL and content for patterns
  const combinedText = `${url} ${title} ${description} ${script}`.toLowerCase()
  
  // Extract trend score based on engagement indicators
  if (combinedText.includes('viral') || combinedText.includes('trending')) trendScore += 10
  if (combinedText.includes('luxury') || combinedText.includes('premium')) trendScore += 5
  if (combinedText.includes('quick') || combinedText.includes('fast')) trendScore += 8
  
  // Extract key elements
  if (combinedText.includes('modern') || combinedText.includes('contemporary')) keyElements.push('Moderne Architektur')
  if (combinedText.includes('drone') || combinedText.includes('aerial')) keyElements.push('Drohnenaufnahmen')
  if (combinedText.includes('tour') || combinedText.includes('walkthrough')) keyElements.push('Hausführung')
  if (combinedText.includes('luxury') || combinedText.includes('premium')) keyElements.push('Luxus-Features')
  if (combinedText.includes('kitchen') || combinedText.includes('küche')) keyElements.push('Küchen-Highlight')
  if (combinedText.includes('garden') || combinedText.includes('outdoor')) keyElements.push('Außenbereich')
  if (combinedText.includes('secret') || combinedText.includes('hidden')) keyElements.push('Versteckte Features')
  if (combinedText.includes('hook') || combinedText.includes('attention')) keyElements.push('Starker Hook')
  
  // Extract target audience
  if (combinedText.includes('first') || combinedText.includes('erste') || combinedText.includes('buyer')) {
    targetAudience = 'Erstkäufer und junge Familien'
  } else if (combinedText.includes('family') || combinedText.includes('familien')) {
    targetAudience = 'Familien mit Kindern'
  } else if (combinedText.includes('luxury') || combinedText.includes('premium') || combinedText.includes('high-end')) {
    targetAudience = 'Luxus-Immobilienkäufer'
  } else if (combinedText.includes('investment') || combinedText.includes('investor')) {
    targetAudience = 'Immobilieninvestoren'
  } else if (combinedText.includes('downsizing') || combinedText.includes('senior')) {
    targetAudience = 'Senioren und Downsizer'
  } else {
    targetAudience = 'Immobilienkäufer und -interessierte'
  }
  
  // Extract content goal
  if (combinedText.includes('sale') || combinedText.includes('verkauf') || combinedText.includes('selling')) {
    contentGoal = 'Immobilienverkauf fördern'
  } else if (combinedText.includes('brand') || combinedText.includes('makler') || combinedText.includes('agent')) {
    contentGoal = 'Makler-Branding stärken'
  } else if (combinedText.includes('tips') || combinedText.includes('advice') || combinedText.includes('tipps')) {
    contentGoal = 'Immobilien-Expertise zeigen'
  } else if (combinedText.includes('market') || combinedText.includes('trend') || combinedText.includes('update')) {
    contentGoal = 'Markttrends aufzeigen'
  } else {
    contentGoal = 'Immobilien-Content erstellen'
  }
  
  // Ensure we have at least some key elements
  if (keyElements.length === 0) {
    keyElements = ['Professionelle Präsentation', 'Hochwertige Aufnahmen', 'Klare Botschaft']
  }
  
  return {
    trendScore: Math.min(100, trendScore),
    keyElements,
    targetAudience,
    contentGoal
  }
}

export function TrendOptimizationWorkflow({ trend, onBack }: TrendOptimizationWorkflowProps) {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('analyze')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isFullscreenScript, setIsFullscreenScript] = useState(false)
  const [isAiOptimizing, setIsAiOptimizing] = useState(false)
  const [showAiOptimizeDialog, setShowAiOptimizeDialog] = useState(false)
  
  const [analysisData, setAnalysisData] = useState<any>(null)
  const [customScript, setCustomScript] = useState('')
  const [customInstructions, setCustomInstructions] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [contentGoal, setContentGoal] = useState('')
  const [generatedContent, setGeneratedContent] = useState<any>(null)
  const [userOptimizationInput, setUserOptimizationInput] = useState('')
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const steps = [
    { id: 'analyze', label: 'Trend Analyse', icon: TrendingUp },
    { id: 'optimize', label: 'KI Optimierung', icon: Sparkles },
    { id: 'customize', label: 'Anpassung', icon: Edit3 },
    { id: 'generate', label: 'Generierung', icon: Wand2 },
    { id: 'upload', label: 'Upload', icon: Upload }
  ]

  const getCurrentStepIndex = () => steps.findIndex(step => step.id === currentStep)
  const progress = ((getCurrentStepIndex() + 1) / steps.length) * 100

  const handleAnalyzeTrend = async () => {
    setIsAnalyzing(true)
    try {
      // Simulate AI analysis
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Extract information from trend data and auto-fill
      const extractedInfo = extractTrendInformation(trend)
      
      setAnalysisData({
        keyElements: extractedInfo.keyElements,
        successFactors: [
          'Strong opening hook (0-3s)',
          'Visual variety and movement',
          'Clear value proposition',
          'Call-to-action at end'
        ],
        trendScore: extractedInfo.trendScore,
        viralPotential: extractedInfo.trendScore > 85 ? 'Sehr Hoch' : extractedInfo.trendScore > 70 ? 'Hoch' : 'Mittel'
      })
      
      // Auto-fill form fields
      setTargetAudience(extractedInfo.targetAudience)
      setContentGoal(extractedInfo.contentGoal)
      
      setCurrentStep('optimize')
      toast.success('Trend erfolgreich analysiert und Felder automatisch ausgefüllt!')
    } catch (error) {
      toast.error('Fehler bei der Analyse')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleOptimizeWithAI = async () => {
    setIsGenerating(true)
    try {
      // Simulate AI optimization
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      const optimizedScript = `🏠 HOOK (0-3s): "Dieses ${contentGoal || 'Traumhaus'} versteckt ein Geheimnis..."

📱 HAUPTINHALT (3-15s):
• Schnelle Tour durch die wichtigsten Bereiche
• Einzigartige architektonische Features hervorheben
• Das "Geheimnis" enthüllen (verstecktes Büro/Raum)
• Key Selling Points erwähnen (${targetAudience || 'Lage, Größe, Ausstattung'})

💡 VISUELLE TIPPS:
• Smooth Kamerabewegungen
• Gute Beleuchtung - zur goldenen Stunde filmen
• Schnelle Schnitte zwischen Räumen (2-3 Sekunden je Raum)
• Mit Außenaufnahme beenden

🎯 CTA: "DM für private Besichtigung!"

#immobilien #luxusimmobilien #hausbesichtigung #traumhaus #immobilienmakler`

      setGeneratedContent({
        script: optimizedScript,
        hashtags: ['#immobilien', '#luxusimmobilien', '#hausbesichtigung', '#traumhaus', '#immobilienmakler']
      })
      
      setCurrentStep('customize')
      toast.success('Content optimiert!')
    } catch (error) {
      toast.error('Fehler bei der Optimierung')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerateFinalContent = async () => {
    setIsGenerating(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      setCurrentStep('upload')
      toast.success('Finaler Content generiert!')
    } catch (error) {
      toast.error('Fehler bei der Generierung')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleFileUpload = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setIsUploading(true)
      // Simulate upload
      setTimeout(() => {
        setIsUploading(false)
        toast.success('Video erfolgreich hochgeladen!')
      }, 2000)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('In Zwischenablage kopiert!')
  }

  const downloadScript = () => {
    const script = customScript || generatedContent?.script || ''
    const blob = new Blob([script], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trend-script-${trend.title?.replace(/[^a-zA-Z0-9]/g, '-') || 'script'}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Script heruntergeladen!')
  }

  const handleAiOptimize = async () => {
    if (!userOptimizationInput.trim()) {
      toast.error('Bitte geben Sie Ihre Verbesserungsvorschläge ein')
      return
    }

    setIsAiOptimizing(true)
    setShowAiOptimizeDialog(false)

    try {
      const currentScript = customScript || generatedContent?.script || ''
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Bitte optimiere das folgende Content-Script basierend auf den Verbesserungsvorschlägen des Nutzers:

AKTUELLES SCRIPT:
${currentScript}

VERBESSERUNGSVORSCHLÄGE/KRITIK:
${userOptimizationInput}

Bitte erstelle eine verbesserte Version des Scripts, die:
1. Die Kritikpunkte berücksichtigt
2. Die gleiche Struktur beibehält (Hook, Hauptinhalt, CTA)
3. Für ${targetAudience || 'Immobilienkäufer'} optimiert ist
4. Das Ziel "${contentGoal || 'Immobilien-Content erstellen'}" unterstützt

Antworte nur mit dem optimierten Script, ohne zusätzliche Erklärungen.`,
          useContext: false
        })
      })

      if (!response.ok) {
        throw new Error('Failed to optimize script')
      }

      const data = await response.json()
      
      if (data.response) {
        setCustomScript(data.response.trim())
        setUserOptimizationInput('')
        toast.success('Script erfolgreich optimiert!')
      } else {
        throw new Error('No response received')
      }
    } catch (error) {
      console.error('Error optimizing script:', error)
      toast.error('Fehler bei der Script-Optimierung')
    } finally {
      setIsAiOptimizing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 rounded-lg bg-transparent hover:bg-gray-100"
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück
            </Button>
            
            {/* Centered Trend Optimierung Button with Red Gradient and Pulse */}
            <button
              className="relative inline-flex items-center gap-3 px-8 py-3 rounded-full bg-gradient-to-r from-[#dc2626] via-[#ea580c] to-[#f97316] font-medium text-xl transition-all duration-300 ease-in-out group hover:scale-105"
            >
              {/* Pulse effect on hover */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#dc2626] via-[#ea580c] to-[#f97316] opacity-0 group-hover:opacity-75 group-hover:animate-ping"></div>
              
              {/* Animated border with gradient */}
              <div className="absolute inset-0 rounded-full border-2 border-transparent bg-gradient-to-r from-[#dc2626] via-[#ea580c] to-[#f97316] transition-all duration-300 group-hover:opacity-50" 
                   style={{ mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', maskComposite: 'xor' }}></div>
              
              {/* Hover glow effect */}
              <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300 bg-gradient-to-r from-[#dc2626] via-[#ea580c] to-[#f97316] blur-md"></div>
              
              {/* Content with white text */}
              <Sparkles className="w-6 h-6 relative z-10 text-white" />
              <span className="relative z-10 text-white">Trend Optimierung</span>
            </button>
            
            <div className="w-20"></div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="max-w-6xl mx-auto px-6 mb-8">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">Workflow Fortschritt</h3>
            <span className="text-sm text-gray-500">{Math.round(progress)}% Abgeschlossen</span>
          </div>
          {/* Updated Progress bar with red-orange gradient */}
          <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
            <div 
              className="h-3 rounded-full transition-all duration-300 bg-gradient-to-r from-[#dc2626] via-[#ea580c] to-[#f97316]"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = step.id === currentStep
              const isCompleted = getCurrentStepIndex() > index
              
              return (
                <div key={step.id} className="flex flex-col items-center gap-2">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all
                    ${isActive ? 'border-orange-500 text-orange-600' : 
                      isCompleted ? 'border-green-500 text-green-600' : 
                      'border-gray-300 text-gray-400'}
                  `}>
                    {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-xs font-medium ${isActive ? 'text-orange-600' : isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          {/* Original Trend Preview */}
          <Card className="bg-white/90 backdrop-blur-sm border-0 rounded-xl shadow-sm">
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Play className="w-5 h-5 text-orange-600" />
                Original Trend
              </h3>
              <div className="aspect-[9/16] relative overflow-hidden rounded-xl mb-4">
                <img
                  src={trend.thumbnail_url}
                  alt={trend.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <p className="font-semibold text-sm mb-1">{trend.title}</p>
                  <p className="text-xs text-white/80">{trend.creator}</p>
                </div>
              </div>
              
              {/* Updated Original ansehen button with Trend Entdecken style and link icon */}
              <button
                onClick={() => window.open(trend.reel_url, '_blank')}
                className="relative w-full inline-flex items-center justify-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-[#dc2626] via-[#ea580c] to-[#f97316] font-medium transition-all duration-300 ease-in-out group hover:scale-105"
              >
                {/* Pulse effect on hover */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#dc2626] via-[#ea580c] to-[#f97316] opacity-0 group-hover:opacity-75 group-hover:animate-ping"></div>
                
                {/* Animated border */}
                <div className="absolute inset-0 rounded-full border-2 border-transparent bg-gradient-to-r from-[#dc2626] via-[#ea580c] to-[#f97316] transition-all duration-300 group-hover:opacity-50" 
                     style={{ mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', maskComposite: 'xor' }}></div>
                
                {/* Hover glow effect */}
                <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300 bg-gradient-to-r from-[#dc2626] via-[#ea580c] to-[#f97316] blur-md"></div>
                
                {/* Content with white text and link icon */}
                <ExternalLink className="w-5 h-5 relative z-10 text-white" />
                <span className="relative z-10 text-white font-medium">Original ansehen</span>
              </button>
            </CardContent>
          </Card>

          {/* Main Workflow Content - Updated to use min-height for full height matching */}
          <div className="lg:col-span-2 flex">
            {currentStep === 'analyze' && (
              <Card className="bg-white/90 backdrop-blur-sm border-0 rounded-xl shadow-sm flex-1 flex flex-col">
                <CardContent className="p-6 flex-1 flex flex-col">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-orange-600" />
                    Trend Analyse
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Lass unsere KI den Trend analysieren, um die Erfolgswahrscheinlichkeit zu bewerten und 
                    Optimierungsvorschläge zu entwickeln.
                  </p>
                  <div className="flex-1"></div>
                  <Button 
                    onClick={handleAnalyzeTrend}
                    disabled={isAnalyzing}
                    className="w-full bg-gradient-to-r from-[#dc2626] via-[#ea580c] to-[#f97316] hover:from-red-700 hover:via-orange-700 hover:to-yellow-700 text-white"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analysiere Trend...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Trend analysieren
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {currentStep === 'optimize' && analysisData && (
              <Card className="bg-white/90 backdrop-blur-sm border-0 rounded-xl shadow-sm flex-1 flex flex-col">
                <CardContent className="p-6 flex-1 flex flex-col">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-orange-600" />
                    KI Optimierung
                  </h3>
                  
                  {/* Analysis Results */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Trend Score</h4>
                      <div className="flex items-center gap-2">
                        <div className="text-2xl font-bold text-green-600">{analysisData.trendScore}%</div>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          {analysisData.viralPotential} Potenzial
                        </Badge>
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Schlüssel-Elemente</h4>
                      <div className="flex flex-wrap gap-1">
                        {analysisData.keyElements.map((element: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {element}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Customization Inputs */}
                  <div className="space-y-4 mb-6 flex-1">
                    <div>
                      <Label htmlFor="audience">Zielgruppe</Label>
                      <Input
                        id="audience"
                        placeholder="z.B. Erste Käufer, Familien, Investoren..."
                        value={targetAudience}
                        onChange={(e) => setTargetAudience(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="goal">Content Ziel</Label>
                      <Input
                        id="goal"
                        placeholder="z.B. Hausverkauf, Makler-Branding, Tipps..."
                        value={contentGoal}
                        onChange={(e) => setContentGoal(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="instructions">Zusätzliche Anweisungen (optional)</Label>
                      <Textarea
                        id="instructions"
                        placeholder="Spezielle Wünsche für den Content..."
                        value={customInstructions}
                        onChange={(e) => setCustomInstructions(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={handleOptimizeWithAI}
                    disabled={isGenerating}
                    className="w-full bg-gradient-to-r from-[#dc2626] via-[#ea580c] to-[#f97316] hover:from-red-700 hover:via-orange-700 hover:to-yellow-700 text-white"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Optimiere mit KI...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        Mit KI optimieren
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {currentStep === 'customize' && generatedContent && (
              <Card className="bg-white/90 backdrop-blur-sm border-0 rounded-xl shadow-sm flex-1 flex flex-col">
                <CardContent className="p-6 flex-1 flex flex-col">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-orange-600" />
                    Content Script
                  </h3>
                  
                  <div className="flex-1 flex flex-col">
                    {/* Large Clickable Script Area */}
                    <div className="flex-1 flex flex-col">
                      <div className="flex items-center justify-between mb-4">
                        <Label className="text-lg font-medium">Dein optimierter Content-Script</Label>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => setShowAiOptimizeDialog(true)}
                            disabled={isAiOptimizing}
                            className="relative bg-gradient-to-r from-[#dc2626] via-[#ea580c] to-[#f97316] hover:from-red-700 hover:via-orange-700 hover:to-yellow-700 text-white border-0 transition-all duration-300 group overflow-hidden"
                            size="sm"
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-orange-400 via-red-500 to-pink-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                            {isAiOptimizing ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-1 animate-spin relative z-10" />
                                <span className="relative z-10">Optimiere...</span>
                              </>
                            ) : (
                              <>
                                <Bot className="w-4 h-4 mr-1 relative z-10" />
                                <span className="relative z-10">Ändern</span>
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={downloadScript}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>
                      
                      {/* Big Content Script Box */}
                      <div 
                        className="flex-1 min-h-[400px] p-6 bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-xl cursor-pointer hover:border-orange-300 hover:shadow-lg transition-all duration-300 group relative overflow-hidden"
                        onClick={() => setIsFullscreenScript(true)}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative z-10">
                          <div className="flex items-center justify-center mb-4 opacity-60 group-hover:opacity-100 transition-opacity">
                            <Maximize2 className="w-6 h-6 text-orange-600 mr-2" />
                            <span className="text-gray-600 font-medium">Klicken für Vollbild-Ansicht</span>
                          </div>
                          <div className="font-mono text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                            {(customScript || generatedContent.script).substring(0, 500)}
                            {(customScript || generatedContent.script).length > 500 && '...'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={handleGenerateFinalContent}
                    disabled={isGenerating}
                    className="w-full mt-6 bg-gradient-to-r from-[#dc2626] via-[#ea580c] to-[#f97316] hover:from-red-700 hover:via-orange-700 hover:to-yellow-700 text-white"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generiere finalen Content...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Content finalisieren
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {currentStep === 'upload' && (
              <Card className="bg-white/90 backdrop-blur-sm border-0 rounded-xl shadow-sm flex-1 flex flex-col">
                <CardContent className="p-6 flex-1 flex flex-col">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-orange-600" />
                    Content Upload
                  </h3>
                  
                  <div className="text-center py-8 flex-1 flex flex-col justify-center">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 mb-4">
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-2">Video hier ablegen oder klicken zum Auswählen</p>
                      <p className="text-sm text-gray-500">Unterstützte Formate: MP4, MOV, AVI</p>
                      <Button 
                        onClick={handleFileUpload}
                        disabled={isUploading}
                        className="mt-4"
                        variant="outline"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Lade hoch...
                          </>
                        ) : (
                          'Datei auswählen'
                        )}
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h4 className="font-medium text-green-900 mb-2">✅ Content bereit zum Posten!</h4>
                      <p className="text-sm text-green-800">
                        Dein optimierter Content ist fertig. Du kannst ihn jetzt auf deinen Social Media Kanälen veröffentlichen.
                      </p>
                    </div>
                    
                    <div className="flex gap-3">
                      <Button 
                        className="flex-1 bg-gradient-to-r from-[#dc2626] via-[#ea580c] to-[#f97316] hover:from-red-700 hover:via-orange-700 hover:to-yellow-700 text-white"
                        onClick={() => toast.success('Content erfolgreich geplant!')}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Jetzt posten
                      </Button>
                      <Button variant="outline" onClick={() => setCurrentStep('customize')}>
                        <Edit3 className="w-4 h-4 mr-2" />
                        Bearbeiten
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Script Dialog */}
      <Dialog open={isFullscreenScript} onOpenChange={setIsFullscreenScript}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 bg-white">
          <div className="flex flex-col h-full">
            {/* Header */}
            <DialogHeader className="flex-shrink-0 px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-2xl font-bold text-gray-900">
                  Content Script - Vollbild-Ansicht
                </DialogTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(customScript || generatedContent?.script || '')}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Kopieren
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadScript}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsFullscreenScript(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </DialogHeader>
            
            {/* Content */}
            <div className="flex-1 overflow-hidden">
              <Textarea
                value={customScript || generatedContent?.script || ''}
                onChange={(e) => setCustomScript(e.target.value)}
                className="w-full h-full border-0 focus:ring-0 font-mono text-base leading-relaxed resize-none rounded-none"
                placeholder="Dein optimierter Content-Script..."
              />
            </div>
            
            {/* Footer */}
            <div className="flex-shrink-0 px-6 py-4 border-t bg-gray-50">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Du kannst den Script hier bearbeiten, kopieren oder herunterladen.
                </p>
                <Button
                  onClick={() => setIsFullscreenScript(false)}
                  className="bg-gradient-to-r from-[#dc2626] via-[#ea580c] to-[#f97316] hover:from-red-700 hover:via-orange-700 hover:to-yellow-700 text-white"
                >
                  Schließen
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Optimization Dialog */}
      <Dialog open={showAiOptimizeDialog} onOpenChange={setShowAiOptimizeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-orange-600" />
              Script mit KI optimieren
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="optimization-input" className="text-sm font-medium text-gray-700">
                Was möchten Sie am Script verbessern?
              </Label>
              <Textarea
                id="optimization-input"
                placeholder="z.B. 'Mache den Hook emotionaler', 'Füge mehr Call-to-Actions hinzu', 'Verkürze den Text'..."
                value={userOptimizationInput}
                onChange={(e) => setUserOptimizationInput(e.target.value)}
                rows={4}
                className="mt-2"
              />
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Bot className="w-4 h-4 flex-shrink-0" />
              <span>Unsere KI wird Ihr Feedback nutzen, um das Script zu verbessern.</span>
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowAiOptimizeDialog(false)
                setUserOptimizationInput('')
              }}
              className="flex-1"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleAiOptimize}
              disabled={!userOptimizationInput.trim() || isAiOptimizing}
              className="flex-1 bg-gradient-to-r from-[#dc2626] via-[#ea580c] to-[#f97316] hover:from-red-700 hover:via-orange-700 hover:to-yellow-700 text-white"
            >
              {isAiOptimizing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Optimiere...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Optimieren
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 