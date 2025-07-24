"use client"

import React, { useState, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
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
  ExternalLink
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

export function TrendOptimizationWorkflow({ trend, onBack }: TrendOptimizationWorkflowProps) {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('analyze')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  
  const [analysisData, setAnalysisData] = useState<any>(null)
  const [customScript, setCustomScript] = useState('')
  const [customInstructions, setCustomInstructions] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [contentGoal, setContentGoal] = useState('')
  const [generatedContent, setGeneratedContent] = useState<any>(null)
  
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
      
      setAnalysisData({
        keyElements: [
          'Moderne Architektur',
          'Drone Shots',
          'Quick Transitions',
          'Emotional Hook'
        ],
        successFactors: [
          'Strong opening hook (0-3s)',
          'Visual variety and movement',
          'Clear value proposition',
          'Call-to-action at end'
        ],
        trendScore: 85,
        viralPotential: 'Hoch'
      })
      
      setCurrentStep('optimize')
      toast.success('Trend erfolgreich analysiert!')
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
        hashtags: ['#immobilien', '#luxusimmobilien', '#hausbesichtigung', '#traumhaus', '#immobilienmakler'],
        timingTips: [
          'Beste Posting-Zeit: 18:00-20:00 Uhr',
          'Optimal: Dienstag oder Donnerstag',
          'Story-Teasers 2h vorher posten'
        ],
        technicalTips: [
          'Vertikales 9:16 Format verwenden',
          'Gute Beleuchtung essentiell',
          'Stabilisierung für smooth shots',
          'Audio-Qualität beachten'
        ]
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
        <Card className="bg-white/90 backdrop-blur-sm border-0 rounded-xl shadow-sm">
          <CardContent className="p-6">
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
                      ${isActive ? 'border-orange-500 bg-orange-100 text-orange-600' : 
                        isCompleted ? 'border-green-500 bg-green-100 text-green-600' : 
                        'border-gray-300 bg-gray-100 text-gray-400'}
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
          </CardContent>
        </Card>
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
                    Content Anpassung
                  </h3>
                  
                  <div className="space-y-6 flex-1 flex flex-col">
                    {/* Generated Script */}
                    <div className="flex-1 flex flex-col">
                      <div className="flex items-center justify-between mb-2">
                        <Label>Optimiertes Script</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(generatedContent.script)}
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          Kopieren
                        </Button>
                      </div>
                      <Textarea
                        value={customScript || generatedContent.script}
                        onChange={(e) => setCustomScript(e.target.value)}
                        rows={10}
                        className="font-mono text-sm flex-1"
                      />
                    </div>

                    {/* Additional Tips */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Timing Tipps
                        </h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                          {generatedContent.timingTips.map((tip: string, index: number) => (
                            <li key={index}>• {tip}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <h4 className="font-medium text-purple-900 mb-2 flex items-center gap-2">
                          <Video className="w-4 h-4" />
                          Technische Tipps
                        </h4>
                        <ul className="text-sm text-purple-800 space-y-1">
                          {generatedContent.technicalTips.map((tip: string, index: number) => (
                            <li key={index}>• {tip}</li>
                          ))}
                        </ul>
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
    </div>
  )
} 