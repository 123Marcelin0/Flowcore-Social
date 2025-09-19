"use client"

import React, { useState, useRef } from "react"
import { FileText, SquarePlay, X, Upload, Sparkles, Zap, Clock, Brain, Instagram, ZoomIn, Camera } from "lucide-react"

interface UnifiedVideoProcessorProps {
  isOpen: boolean
  onClose: () => void
  onVideoProcess: (file: File, options: ProcessingOptions) => Promise<void>
  isProcessing: boolean
  processingStep: string
  processingProgress: number
}

interface ProcessingOptions {
  hasScript: boolean
  script?: string
  autoRemoveBadTakes: boolean
  autoRemovePauses: boolean
  intelligenceLevel: 'basic' | 'advanced' | 'ai_perfect'
  outputQuality: 'fast' | 'balanced' | 'maximum'
  // Enhanced pipeline options
  useEnhancedAnalysis: boolean
  enhancedOptions?: {
    aggressiveness: number
    targetReduction: number
    preserveNaturalPauses: boolean
    removeFillerWords: boolean
    autoFixMistakes: boolean
    generateVisualCues: boolean
    optimizeForReels: boolean
    reelsTargetDuration: number
    enableAutoZoom: boolean
    zoomIntensity: number
    enableMediaPipe: boolean
    mediaPipeOptions?: {
      detectionType: 'face' | 'pose' | 'both'
      targetAspectRatio: number
      maxZoomLevel: number
      confidenceThreshold: number
      enableSmoothing: boolean
    }
  }
}

export function UnifiedVideoProcessor({
  isOpen,
  onClose,
  onVideoProcess,
  isProcessing,
  processingStep,
  processingProgress
}: UnifiedVideoProcessorProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [step, setStep] = useState<'upload' | 'script' | 'processing'>('upload')
  const [script, setScript] = useState<string>('')
  const [processingOptions, setProcessingOptions] = useState<ProcessingOptions>({
    hasScript: false,
    autoRemoveBadTakes: true,
    autoRemovePauses: true,
    intelligenceLevel: 'ai_perfect',
    outputQuality: 'balanced',
    useEnhancedAnalysis: true,
    enhancedOptions: {
      aggressiveness: 0.7,
      targetReduction: 30,
      preserveNaturalPauses: true,
      removeFillerWords: true,
      autoFixMistakes: true,
      generateVisualCues: true,
      optimizeForReels: true,
      reelsTargetDuration: 30,
      enableAutoZoom: true,
      zoomIntensity: 0.25,
      enableMediaPipe: false,
      mediaPipeOptions: {
        detectionType: 'both',
        targetAspectRatio: 9/16,
        maxZoomLevel: 2.0,
        confidenceThreshold: 0.6,
        enableSmoothing: true
      }
    }
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    if (file.type.startsWith('video/')) {
      setSelectedFile(file)
      setStep('script')
    } else {
      alert('Please select a video file (MP4, MOV, AVI)')
    }
  }

  const handleStartProcessing = async () => {
    if (!selectedFile) return
    
    const options: ProcessingOptions = {
      ...processingOptions,
      script: processingOptions.hasScript ? script : undefined
    }
    
    setStep('processing')
    
    try {
      await onVideoProcess(selectedFile, options)
    } catch (error: any) {
      // Handle specific error cases with user-friendly messages
      if (error.message?.includes('no segments') || error.message?.includes('empty or inaudible')) {
        alert(`🔇 Silent Video Detected!\n\nYour video appears to have no audio or very quiet audio. Don't worry - we can still process it!\n\nOptions:\n• Continue processing for visual-only editing\n• Upload a video with clear audio for best results\n• Check your microphone settings for future recordings`)
      } else {
        throw error // Re-throw other errors
      }
    }
  }

  const resetToUpload = () => {
    setSelectedFile(null)
    setScript('')
    setStep('upload')
    setProcessingOptions({
      hasScript: false,
      autoRemoveBadTakes: true,
      autoRemovePauses: true,
      intelligenceLevel: 'ai_perfect',
      outputQuality: 'balanced',
      useEnhancedAnalysis: true,
      enhancedOptions: {
        aggressiveness: 0.7,
        targetReduction: 30,
        preserveNaturalPauses: true,
        removeFillerWords: true,
        autoFixMistakes: true,
        generateVisualCues: true,
        optimizeForReels: true,
        reelsTargetDuration: 30,
        enableAutoZoom: true,
        zoomIntensity: 0.25,
        enableMediaPipe: false,
        mediaPipeOptions: {
          detectionType: 'both',
          targetAspectRatio: 9/16,
          maxZoomLevel: 2.0,
          confidenceThreshold: 0.6,
          enableSmoothing: true
        }
      }
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="rounded-[24px] border border-white/20 p-8 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-medium text-white mb-2">
                {step === 'upload' && 'Add Video'}
                {step === 'script' && 'Processing Options'}
                {step === 'processing' && 'Processing Video'}
              </h2>
              <p className="text-white/70">
                {step === 'upload' && 'Upload your video for automatic professional processing'}
                {step === 'script' && 'Configure how we should process your video'}
                {step === 'processing' && 'Creating your perfect video...'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Upload Step */}
          {step === 'upload' && (
            <div className="space-y-8">
              <div
                className="rounded-[20px] border-2 border-dashed border-white/30 p-16 text-center bg-gradient-to-br from-white/5 to-transparent backdrop-blur-md transition-all hover:border-emerald-400/50 cursor-pointer"
                onDragOver={(e) => {
                  e.preventDefault()
                  e.currentTarget.style.borderColor = 'rgba(52, 211, 153, 0.5)'
                }}
                onDragLeave={(e) => {
                  e.preventDefault()
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'
                  const files = Array.from(e.dataTransfer.files)
                  if (files.length > 0) {
                    handleFileSelect(files[0])
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center gap-6">
                  <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center backdrop-blur-md">
                    <Upload className="w-10 h-10 text-emerald-400" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-medium text-white mb-2">
                      Drop your video here or click to browse
                    </h3>
                    <p className="text-white/60">
                      Support for MP4, MOV, AVI up to 2GB
                    </p>
                  </div>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileSelect(file)
                }}
                className="hidden"
              />

              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <span className="text-white/80 text-sm">AI-powered automatic processing</span>
                </div>
              </div>
            </div>
          )}

          {/* Script & Options Step */}
          {step === 'script' && selectedFile && (
            <div className="space-y-8">
              {/* File Info */}
              <div className="p-4 rounded-[16px] bg-white/5 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <SquarePlay className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{selectedFile.name}</p>
                    <p className="text-white/60 text-sm">{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                </div>
              </div>

              {/* Script Decision */}
              <div className="space-y-6">
                <h3 className="text-xl font-medium text-white">Do you have a script for this video?</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* No Script Option */}
                  <button
                    onClick={() => setProcessingOptions(prev => ({ ...prev, hasScript: false }))}
                    className={`p-6 rounded-[16px] border transition-all text-left ${
                      !processingOptions.hasScript
                        ? 'border-emerald-400/50 bg-emerald-500/10'
                        : 'border-white/20 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <Brain className="w-5 h-5 text-blue-400" />
                      </div>
                      <h4 className="text-lg font-medium text-white">No Script (AI Analysis)</h4>
                    </div>
                    <p className="text-white/70 text-sm">
                      AI will analyze your speech, generate the perfect transcript, and automatically remove bad takes, hesitations, and long pauses.
                    </p>
                  </button>

                  {/* With Script Option */}
                  <button
                    onClick={() => setProcessingOptions(prev => ({ ...prev, hasScript: true }))}
                    className={`p-6 rounded-[16px] border transition-all text-left ${
                      processingOptions.hasScript
                        ? 'border-emerald-400/50 bg-emerald-500/10'
                        : 'border-white/20 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-purple-400" />
                      </div>
                      <h4 className="text-lg font-medium text-white">I Have a Script</h4>
                    </div>
                    <p className="text-white/70 text-sm">
                      Compare your actual speech against your intended script to identify and remove mistakes, retakes, and deviations.
                    </p>
                  </button>
                </div>

                {/* Script Input */}
                {processingOptions.hasScript && (
                  <div className="space-y-3">
                    <label className="text-white font-medium">Enter your script:</label>
                    <textarea
                      value={script}
                      onChange={(e) => setScript(e.target.value)}
                      placeholder="Paste your script here..."
                      className="w-full h-32 px-4 py-3 rounded-[12px] bg-white/10 border border-white/20 text-white placeholder:text-white/50 resize-none focus:outline-none focus:border-emerald-400/50"
                    />
                  </div>
                )}
              </div>

              {/* Enhanced AI Analysis */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white">AI Analysis Pipeline</h3>
                
                <div className="p-6 rounded-[16px] border border-white/20 bg-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                        <Brain className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="text-lg font-medium text-white">Enhanced AI Analysis</h4>
                        <p className="text-white/60 text-sm">Advanced heuristics and intelligent decision making</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setProcessingOptions(prev => ({ ...prev, useEnhancedAnalysis: !prev.useEnhancedAnalysis }))}
                      className={`relative w-12 h-6 rounded-full transition-all ${
                        processingOptions.useEnhancedAnalysis ? 'bg-emerald-500' : 'bg-white/20'
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                        processingOptions.useEnhancedAnalysis ? 'left-7' : 'left-1'
                      }`} />
                    </button>
                  </div>

                  {processingOptions.useEnhancedAnalysis && (
                    <div className="space-y-4">
                      {/* Aggressiveness Slider */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-white font-medium text-sm">Editing Aggressiveness</label>
                          <span className="text-white/70 text-sm">{Math.round((processingOptions.enhancedOptions?.aggressiveness || 0.7) * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="1.0"
                          step="0.1"
                          value={processingOptions.enhancedOptions?.aggressiveness || 0.7}
                          onChange={(e) => setProcessingOptions(prev => ({
                            ...prev,
                            enhancedOptions: {
                              ...prev.enhancedOptions!,
                              aggressiveness: parseFloat(e.target.value)
                            }
                          }))}
                          className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500"
                        />
                      </div>

                      {/* Target Reduction */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-white font-medium text-sm">Target Length Reduction</label>
                          <span className="text-white/70 text-sm">{processingOptions.enhancedOptions?.targetReduction || 30}%</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="60"
                          step="5"
                          value={processingOptions.enhancedOptions?.targetReduction || 30}
                          onChange={(e) => setProcessingOptions(prev => ({
                            ...prev,
                            enhancedOptions: {
                              ...prev.enhancedOptions!,
                              targetReduction: parseInt(e.target.value)
                            }
                          }))}
                          className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500"
                        />
                      </div>

                      {/* Instagram Reels Optimization */}
                      <div className="p-4 rounded-[12px] bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-400/20 mb-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Instagram className="w-4 h-4 text-pink-400" />
                            <span className="text-white font-medium text-sm">Instagram Reels Optimization</span>
                          </div>
                          <button
                            onClick={() => setProcessingOptions(prev => ({
                              ...prev,
                              enhancedOptions: {
                                ...prev.enhancedOptions!,
                                optimizeForReels: !prev.enhancedOptions!.optimizeForReels
                              }
                            }))}
                            className={`relative w-10 h-5 rounded-full transition-all ${
                              processingOptions.enhancedOptions?.optimizeForReels ? 'bg-pink-500' : 'bg-white/20'
                            }`}
                          >
                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${
                              processingOptions.enhancedOptions?.optimizeForReels ? 'left-5' : 'left-0.5'
                            }`} />
                          </button>
                        </div>
                        
                        {processingOptions.enhancedOptions?.optimizeForReels && (
                          <div className="space-y-3">
                            <div className="text-white/70 text-xs mb-3">
                              AI will create perfect Instagram Reels with optimal pacing, engagement hooks, and retention strategies.
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <label className="text-white font-medium text-xs">Target Duration</label>
                              <span className="text-white/70 text-xs">{processingOptions.enhancedOptions?.reelsTargetDuration || 30}s</span>
                            </div>
                            <div className="flex gap-2">
                              {[15, 30, 60].map(duration => (
                                <button
                                  key={duration}
                                  onClick={() => setProcessingOptions(prev => ({
                                    ...prev,
                                    enhancedOptions: {
                                      ...prev.enhancedOptions!,
                                      reelsTargetDuration: duration
                                    }
                                  }))}
                                  className={`px-3 py-1 rounded-lg text-xs transition-all ${
                                    processingOptions.enhancedOptions?.reelsTargetDuration === duration
                                      ? 'bg-pink-500 text-white'
                                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                                  }`}
                                >
                                  {duration}s
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Auto-Zoom Feature */}
                      <div className="p-4 rounded-[12px] bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-400/20 mb-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <ZoomIn className="w-4 h-4 text-blue-400" />
                            <span className="text-white font-medium text-sm">Professional Auto-Zoom</span>
                          </div>
                          <button
                            onClick={() => setProcessingOptions(prev => ({
                              ...prev,
                              enhancedOptions: {
                                ...prev.enhancedOptions!,
                                enableAutoZoom: !prev.enhancedOptions!.enableAutoZoom
                              }
                            }))}
                            className={`relative w-10 h-5 rounded-full transition-all ${
                              processingOptions.enhancedOptions?.enableAutoZoom ? 'bg-blue-500' : 'bg-white/20'
                            }`}
                          >
                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${
                              processingOptions.enhancedOptions?.enableAutoZoom ? 'left-5' : 'left-0.5'
                            }`} />
                          </button>
                        </div>
                        
                        {processingOptions.enhancedOptions?.enableAutoZoom && (
                          <div className="space-y-3">
                            <div className="text-white/70 text-xs mb-3">
                              Smooth cinematic zoom using single keyframe transforms with cubic easing. No abrupt steps or jerky movements.
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <label className="text-white font-medium text-xs">Zoom Intensity</label>
                              <span className="text-white/70 text-xs">{Math.round((processingOptions.enhancedOptions?.zoomIntensity || 0.25) * 100)}%</span>
                            </div>
                            <input
                              type="range"
                              min="0.1"
                              max="0.5"
                              step="0.05"
                              value={processingOptions.enhancedOptions?.zoomIntensity || 0.25}
                              onChange={(e) => setProcessingOptions(prev => ({
                                ...prev,
                                enhancedOptions: {
                                  ...prev.enhancedOptions!,
                                  zoomIntensity: parseFloat(e.target.value)
                                }
                              }))}
                              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500"
                            />
                            
                            <div className="text-white/60 text-xs space-y-1">
                              <div>• Single transform keyframes (no steps)</div>
                              <div>• easeInOutCubic interpolation</div>
                              <div>• Subpixel positioning accuracy</div>
                              <div>• Motion blur ready</div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* MediaPipe Auto-Focus Feature */}
                      <div className="p-4 rounded-[12px] bg-gradient-to-r from-green-500/10 to-teal-500/10 border border-green-400/20 mb-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Camera className="w-4 h-4 text-green-400" />
                            <span className="text-white font-medium text-sm">MediaPipe Auto-Focus</span>
                          </div>
                          <button
                            onClick={() => setProcessingOptions(prev => ({
                              ...prev,
                              enhancedOptions: {
                                ...prev.enhancedOptions!,
                                enableMediaPipe: !prev.enhancedOptions!.enableMediaPipe
                              }
                            }))}
                            className={`relative w-10 h-5 rounded-full transition-all ${
                              processingOptions.enhancedOptions?.enableMediaPipe ? 'bg-green-500' : 'bg-white/20'
                            }`}
                          >
                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${
                              processingOptions.enhancedOptions?.enableMediaPipe ? 'left-5' : 'left-0.5'
                            }`} />
                          </button>
                        </div>
                        
                        {processingOptions.enhancedOptions?.enableMediaPipe && (
                          <div className="space-y-3">
                            <div className="text-white/70 text-xs mb-3">
                              Google MediaPipe Web detection for automatic face/body tracking and intelligent camera transforms. Real-time bounding box analysis with clean transform generation.
                            </div>
                            
                            <div>
                              <label className="text-white font-medium text-xs">Detection Type</label>
                              <select
                                value={processingOptions.enhancedOptions?.mediaPipeOptions?.detectionType || 'both'}
                                onChange={(e) => setProcessingOptions(prev => ({
                                  ...prev,
                                  enhancedOptions: {
                                    ...prev.enhancedOptions!,
                                    mediaPipeOptions: {
                                      ...prev.enhancedOptions!.mediaPipeOptions!,
                                      detectionType: e.target.value as 'face' | 'pose' | 'both'
                                    }
                                  }
                                }))}
                                className="w-full mt-1 p-2 text-xs rounded-lg bg-white/10 border border-white/20 text-white"
                              >
                                <option value="both">Face + Body</option>
                                <option value="face">Face Only</option>
                                <option value="pose">Body/Pose Only</option>
                              </select>
                            </div>
                            
                            <div>
                              <label className="text-white font-medium text-xs">Target Format</label>
                              <select
                                value={processingOptions.enhancedOptions?.mediaPipeOptions?.targetAspectRatio || 9/16}
                                onChange={(e) => setProcessingOptions(prev => ({
                                  ...prev,
                                  enhancedOptions: {
                                    ...prev.enhancedOptions!,
                                    mediaPipeOptions: {
                                      ...prev.enhancedOptions!.mediaPipeOptions!,
                                      targetAspectRatio: parseFloat(e.target.value)
                                    }
                                  }
                                }))}
                                className="w-full mt-1 p-2 text-xs rounded-lg bg-white/10 border border-white/20 text-white"
                              >
                                <option value={9/16}>9:16 (Instagram Reels)</option>
                                <option value={16/9}>16:9 (Landscape)</option>
                                <option value={1}>1:1 (Square)</option>
                              </select>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <label className="text-white font-medium text-xs">Detection Confidence</label>
                              <span className="text-white/70 text-xs">{Math.round((processingOptions.enhancedOptions?.mediaPipeOptions?.confidenceThreshold || 0.6) * 100)}%</span>
                            </div>
                            <input
                              type="range"
                              min="0.3"
                              max="0.9"
                              step="0.05"
                              value={processingOptions.enhancedOptions?.mediaPipeOptions?.confidenceThreshold || 0.6}
                              onChange={(e) => setProcessingOptions(prev => ({
                                ...prev,
                                enhancedOptions: {
                                  ...prev.enhancedOptions!,
                                  mediaPipeOptions: {
                                    ...prev.enhancedOptions!.mediaPipeOptions!,
                                    confidenceThreshold: parseFloat(e.target.value)
                                  }
                                }
                              }))}
                              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-green-500"
                            />
                            
                            <div className="text-white/60 text-xs space-y-1">
                              <div>• Real-time face/body detection</div>
                              <div>• Automatic camera following</div>
                              <div>• Clean transform generation</div>
                              <div>• Temporal smoothing filter</div>
                              <div>• Browser-native WebAssembly</div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Enhancement Options */}
                      <div className="grid grid-cols-2 gap-3 mt-4">
                        {[
                          { key: 'preserveNaturalPauses', label: 'Preserve Natural Pauses', desc: 'Keep intentional pauses for flow' },
                          { key: 'removeFillerWords', label: 'Remove Filler Words', desc: 'Remove "um", "uh", "like"' },
                          { key: 'autoFixMistakes', label: 'Auto-Fix Mistakes', desc: 'Correct speech errors' },
                          { key: 'generateVisualCues', label: 'Visual Cues', desc: 'Add automatic visual indicators' }
                        ].map(({ key, label, desc }) => (
                          <button
                            key={key}
                            onClick={() => setProcessingOptions(prev => ({
                              ...prev,
                              enhancedOptions: {
                                ...prev.enhancedOptions!,
                                [key]: !prev.enhancedOptions![key as keyof typeof prev.enhancedOptions]
                              }
                            }))}
                            className={`p-3 rounded-[10px] border transition-all text-left ${
                              processingOptions.enhancedOptions?.[key as keyof typeof processingOptions.enhancedOptions]
                                ? 'border-emerald-400/50 bg-emerald-500/10'
                                : 'border-white/20 bg-white/5 hover:bg-white/10'
                            }`}
                          >
                            <div className="text-white font-medium text-xs mb-1">{label}</div>
                            <p className="text-white/60 text-xs">{desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Processing Intelligence */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white">Processing Speed</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { key: 'basic', label: 'Basic', icon: Clock, desc: 'Fast processing, basic cleanup' },
                    { key: 'advanced', label: 'Advanced', icon: Zap, desc: 'Smart analysis, better results' },
                    { key: 'ai_perfect', label: 'AI Perfect', icon: Sparkles, desc: 'Maximum quality, best results' }
                  ].map(({ key, label, icon: Icon, desc }) => (
                    <button
                      key={key}
                      onClick={() => setProcessingOptions(prev => ({ ...prev, intelligenceLevel: key as any }))}
                      className={`p-4 rounded-[12px] border transition-all text-left ${
                        processingOptions.intelligenceLevel === key
                          ? 'border-emerald-400/50 bg-emerald-500/10'
                          : 'border-white/20 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-4 h-4 text-emerald-400" />
                        <span className="text-white font-medium text-sm">{label}</span>
                      </div>
                      <p className="text-white/60 text-xs">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-6">
                <button
                  onClick={resetToUpload}
                  className="px-6 py-3 rounded-[12px] border border-white/30 text-white hover:bg-white/10 transition-all"
                >
                  ← Change Video
                </button>
                <button
                  onClick={handleStartProcessing}
                  disabled={processingOptions.hasScript && !script.trim()}
                  className="px-8 py-3 rounded-[12px] bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Start Processing
                </button>
              </div>
            </div>
          )}

          {/* Processing Step */}
          {step === 'processing' && (
            <div className="space-y-8">
              <div className="text-center">
                <div className="w-24 h-24 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 animate-spin mx-auto mb-6" />
                <h3 className="text-2xl font-medium text-white mb-2">Processing Your Video</h3>
                <p className="text-white/80 text-lg mb-6">{processingStep}</p>

                <div className="w-full bg-white/20 rounded-full h-4 mb-4">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-4 rounded-full transition-all duration-500"
                    style={{ width: `${processingProgress}%` }}
                  />
                </div>
                <p className="text-white/70">{Math.round(processingProgress)}% complete</p>

                <div className="mt-8 p-6 rounded-[16px] bg-white/5 border border-white/10">
                  <h4 className="text-lg font-medium text-white mb-3">
                    {processingOptions.useEnhancedAnalysis ? 'Enhanced AI Pipeline:' : 'What we\'re doing:'}
                  </h4>
                  <div className="space-y-2 text-left">
                    <div className="flex items-center gap-3 text-white/70">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                      <span>Transcribing your video with AI</span>
                    </div>
                    {processingOptions.useEnhancedAnalysis ? (
                      <>
                        <div className="flex items-center gap-3 text-white/70">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                          <span>Analyzing acoustic features & silence regions</span>
                        </div>
                        <div className="flex items-center gap-3 text-white/70">
                          <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                          <span>Running advanced heuristics analysis</span>
                        </div>
                        <div className="flex items-center gap-3 text-white/70">
                          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                          <span>Making intelligent editing decisions</span>
                        </div>
                        {processingOptions.enhancedOptions?.removeFillerWords && (
                          <div className="flex items-center gap-3 text-white/70">
                            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                            <span>Removing filler words and hesitations</span>
                          </div>
                        )}
                        {processingOptions.enhancedOptions?.autoFixMistakes && (
                          <div className="flex items-center gap-3 text-white/70">
                            <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
                            <span>Auto-correcting speech mistakes</span>
                          </div>
                        )}
                        {processingOptions.enhancedOptions?.optimizeForReels && (
                          <>
                            <div className="flex items-center gap-3 text-white/70">
                              <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse" />
                              <span>Generating Instagram Reels cut plan</span>
                            </div>
                            <div className="flex items-center gap-3 text-white/70">
                              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                              <span>Optimizing for engagement & retention</span>
                            </div>
                            <div className="flex items-center gap-3 text-white/70">
                              <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse" />
                              <span>Creating EDL for social media format</span>
                            </div>
                          </>
                        )}
                        {processingOptions.enhancedOptions?.enableAutoZoom && (
                          <>
                            <div className="flex items-center gap-3 text-white/70">
                              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                              <span>Analyzing content for zoom opportunities</span>
                            </div>
                            <div className="flex items-center gap-3 text-white/70">
                              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                              <span>Generating smooth zoom transforms</span>
                            </div>
                          </>
                        )}
                        {processingOptions.enhancedOptions?.enableMediaPipe && (
                          <>
                            <div className="flex items-center gap-3 text-white/70">
                              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                              <span>Initializing MediaPipe face/body detection</span>
                            </div>
                            <div className="flex items-center gap-3 text-white/70">
                              <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" />
                              <span>Processing video frames for bounding boxes</span>
                            </div>
                            <div className="flex items-center gap-3 text-white/70">
                              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                              <span>Computing clean camera transforms</span>
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 text-white/70">
                          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                          <span>Detecting bad takes and mistakes</span>
                        </div>
                        <div className="flex items-center gap-3 text-white/70">
                          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                          <span>Removing long pauses and hesitations</span>
                        </div>
                      </>
                    )}
                    <div className="flex items-center gap-3 text-white/70">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                      <span>Creating your perfect video</span>
                    </div>
                  </div>

                  {processingOptions.useEnhancedAnalysis && (
                    <div className="space-y-3 mt-4">
                      <div className="p-4 rounded-[12px] bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-400/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Brain className="w-4 h-4 text-blue-400" />
                          <span className="text-blue-300 font-medium text-sm">Enhanced Analysis Active</span>
                        </div>
                        <div className="text-white/60 text-xs space-y-1">
                          <div>• Aggressiveness: {Math.round((processingOptions.enhancedOptions?.aggressiveness || 0.7) * 100)}%</div>
                          <div>• Target reduction: {processingOptions.enhancedOptions?.targetReduction || 30}%</div>
                          <div>• Natural pauses: {processingOptions.enhancedOptions?.preserveNaturalPauses ? 'Preserved' : 'Removed'}</div>
                        </div>
                      </div>
                      
                      {processingOptions.enhancedOptions?.optimizeForReels && (
                        <div className="p-4 rounded-[12px] bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-400/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Instagram className="w-4 h-4 text-pink-400" />
                            <span className="text-pink-300 font-medium text-sm">Instagram Reels Optimization</span>
                          </div>
                          <div className="text-white/60 text-xs space-y-1">
                            <div>• Target duration: {processingOptions.enhancedOptions?.reelsTargetDuration || 30}s</div>
                            <div>• AI-powered engagement hooks</div>
                            <div>• Retention-optimized pacing</div>
                            <div>• Social media native editing</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-6 text-white/60 text-sm">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-white/40 rounded-full animate-pulse" />
                    <span>Please don't close this window</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
