"use client"

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  BarChart3, 
  Brain, 
  Clock, 
  FileText, 
  Mic, 
  Volume2, 
  Video, 
  Zap,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle
} from "lucide-react"

interface EnhancedAnalysisPanelProps {
  onRunAnalysis: (options?: {
    aggressiveness?: 'conservative' | 'balanced' | 'aggressive'
    preserveNaturalPauses?: boolean
    enableAutoFix?: boolean
    targetReduction?: number
  }) => Promise<any>
  onApplyDecision: (analysisData?: any) => Promise<void>
  isProcessing?: boolean
  analysisData?: any
}

export function EnhancedAnalysisPanel({
  onRunAnalysis,
  onApplyDecision,
  isProcessing = false,
  analysisData
}: EnhancedAnalysisPanelProps) {
  const [aggressiveness, setAggressiveness] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced')
  const [preserveNaturalPauses, setPreserveNaturalPauses] = useState(true)
  const [enableAutoFix, setEnableAutoFix] = useState(true)
  const [targetReduction, setTargetReduction] = useState(25)
  const [currentAnalysis, setCurrentAnalysis] = useState<any>(analysisData)

  const handleRunAnalysis = async () => {
    const options = {
      aggressiveness,
      preserveNaturalPauses,
      enableAutoFix,
      targetReduction
    }
    
    const result = await onRunAnalysis(options)
    if (result) {
      setCurrentAnalysis(result)
    }
  }

  const handleApplyDecision = async () => {
    await onApplyDecision(currentAnalysis)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5 text-blue-500" />
        <h3 className="text-lg font-semibold text-white">Enhanced AI Analysis</h3>
        <Badge variant="outline" className="text-xs">
          Advanced Heuristics
        </Badge>
      </div>

      {/* Analysis Controls */}
      <Card className="bg-black/40 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Analysis Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Aggressiveness */}
          <div>
            <label className="text-xs text-white/70 mb-2 block">Editing Aggressiveness</label>
            <div className="flex gap-2">
              {(['conservative', 'balanced', 'aggressive'] as const).map((level) => (
                <Button
                  key={level}
                  variant={aggressiveness === level ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAggressiveness(level)}
                  className="flex-1 text-xs"
                  disabled={isProcessing}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {/* Target Reduction */}
          <div>
            <label className="text-xs text-white/70 mb-2 block">
              Target Reduction: {targetReduction}%
            </label>
            <input
              type="range"
              min="10"
              max="50"
              value={targetReduction}
              onChange={(e) => setTargetReduction(Number(e.target.value))}
              className="w-full accent-blue-500"
              disabled={isProcessing}
            />
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs text-white/70">
              <input
                type="checkbox"
                checked={preserveNaturalPauses}
                onChange={(e) => setPreserveNaturalPauses(e.target.checked)}
                disabled={isProcessing}
                className="accent-blue-500"
              />
              Preserve Natural Pauses
            </label>
            <label className="flex items-center gap-2 text-xs text-white/70">
              <input
                type="checkbox"
                checked={enableAutoFix}
                onChange={(e) => setEnableAutoFix(e.target.checked)}
                disabled={isProcessing}
                className="accent-blue-500"
              />
              Enable Auto-Fix
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleRunAnalysis}
              disabled={isProcessing}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              {isProcessing ? (
                <>
                  <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Analyzing...
                </>
              ) : (
                <>
                  <BarChart3 className="w-3 h-3 mr-2" />
                  Run Analysis
                </>
              )}
            </Button>
            
            {currentAnalysis && (
              <Button
                onClick={handleApplyDecision}
                disabled={isProcessing}
                className="flex-1 bg-green-600 hover:bg-green-700"
                size="sm"
              >
                <CheckCircle className="w-3 h-3 mr-2" />
                Apply Decision
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {currentAnalysis && (
        <Card className="bg-black/40 border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm">Analysis Results</CardTitle>
            <CardDescription className="text-xs">
              Quality Score: {currentAnalysis.decision?.qualityScore || 0}/100
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-black/20">
                <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                <TabsTrigger value="heuristics" className="text-xs">Heuristics</TabsTrigger>
                <TabsTrigger value="decision" className="text-xs">Decision</TabsTrigger>
                <TabsTrigger value="recommendations" className="text-xs">Tips</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-3 mt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-black/20 rounded-lg p-3">
                    <div className="text-xs text-white/70 mb-1">Original Duration</div>
                    <div className="text-sm font-medium text-white">
                      {currentAnalysis.decision?.statistics?.originalDuration?.toFixed(1)}s
                    </div>
                  </div>
                  <div className="bg-black/20 rounded-lg p-3">
                    <div className="text-xs text-white/70 mb-1">Final Duration</div>
                    <div className="text-sm font-medium text-white">
                      {currentAnalysis.decision?.statistics?.finalDuration?.toFixed(1)}s
                    </div>
                  </div>
                  <div className="bg-black/20 rounded-lg p-3">
                    <div className="text-xs text-white/70 mb-1">Reduction</div>
                    <div className="text-sm font-medium text-green-400">
                      {currentAnalysis.decision?.statistics?.reductionPercentage?.toFixed(1)}%
                    </div>
                  </div>
                  <div className="bg-black/20 rounded-lg p-3">
                    <div className="text-xs text-white/70 mb-1">Quality Score</div>
                    <div className="text-sm font-medium text-blue-400">
                      {currentAnalysis.decision?.qualityScore}/100
                    </div>
                  </div>
                </div>
                
                <Progress 
                  value={currentAnalysis.decision?.qualityScore || 0} 
                  className="h-2"
                />
              </TabsContent>

              {/* Heuristics Tab */}
              <TabsContent value="heuristics" className="space-y-3 mt-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-white/70">
                      <Volume2 className="w-3 h-3" />
                      Silence Regions
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {currentAnalysis.heuristics?.silenceRegions || 0}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-white/70">
                      <Mic className="w-3 h-3" />
                      Filler Words
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {currentAnalysis.heuristics?.fillerDetections || 0}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-white/70">
                      <BarChart3 className="w-3 h-3" />
                      Acoustic Features
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {currentAnalysis.heuristics?.acousticFeatures || 0}
                    </Badge>
                  </div>
                  
                  {currentAnalysis.heuristics?.scriptAlignment > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-white/70">
                        <FileText className="w-3 h-3" />
                        Script Alignments
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {currentAnalysis.heuristics.scriptAlignment}
                      </Badge>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Decision Tab */}
              <TabsContent value="decision" className="space-y-3 mt-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-white/70">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      Keep Segments
                    </div>
                    <Badge variant="outline" className="text-xs bg-green-500/20">
                      {currentAnalysis.decision?.keepSegments?.length || 0}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-white/70">
                      <XCircle className="w-3 h-3 text-red-500" />
                      Remove Segments
                    </div>
                    <Badge variant="outline" className="text-xs bg-red-500/20">
                      {currentAnalysis.decision?.removeSegments?.length || 0}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="bg-black/20 rounded-lg p-2">
                    <div className="text-xs text-white/70 mb-1">Silence Removed</div>
                    <div className="text-xs font-medium text-white">
                      {currentAnalysis.decision?.statistics?.silenceRemoved || 0}
                    </div>
                  </div>
                  <div className="bg-black/20 rounded-lg p-2">
                    <div className="text-xs text-white/70 mb-1">Fillers Removed</div>
                    <div className="text-xs font-medium text-white">
                      {currentAnalysis.decision?.statistics?.fillersRemoved || 0}
                    </div>
                  </div>
                  <div className="bg-black/20 rounded-lg p-2">
                    <div className="text-xs text-white/70 mb-1">Bad Takes</div>
                    <div className="text-xs font-medium text-white">
                      {currentAnalysis.decision?.statistics?.badTakesRemoved || 0}
                    </div>
                  </div>
                  <div className="bg-black/20 rounded-lg p-2">
                    <div className="text-xs text-white/70 mb-1">Script Deviations</div>
                    <div className="text-xs font-medium text-white">
                      {currentAnalysis.decision?.statistics?.scriptDeviations || 0}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Recommendations Tab */}
              <TabsContent value="recommendations" className="space-y-2 mt-3">
                {currentAnalysis.decision?.recommendations?.length > 0 ? (
                  currentAnalysis.decision.recommendations.slice(0, 5).map((rec: string, index: number) => (
                    <div key={index} className="flex items-start gap-2 p-2 bg-black/20 rounded-lg">
                      <TrendingUp className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-white/90">{rec}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-white/50 text-center py-4">
                    No recommendations available
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

