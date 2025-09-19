"use client"

import React from "react"
import { FileText, SquarePlay } from "lucide-react"

export function MediaProcessingPanel({ 
  uploadedFile, 
  scriptText, 
  isProcessing, 
  processingStep, 
  processingProgress, 
  onChooseFile, 
  onDropFile, 
  onOpenScript, 
  onSaveScript, 
  onBackToEditor, 
  onProcess, 
  onSkipProcessing, 
  onCloseScript,
  onProfessionalProcess
}: { 
  uploadedFile: File | null
  scriptText: string
  isProcessing: boolean
  processingStep: string
  processingProgress: number
  onChooseFile: (file: File) => void
  onDropFile: (file: File) => void
  onOpenScript: () => void
  onSaveScript: (text: string) => void
  onBackToEditor: () => void
  onProcess: () => void
  onSkipProcessing: () => Promise<void>
  onCloseScript: () => void
  onProfessionalProcess?: (type: 'analyze' | 'quick' | 'complete') => Promise<void>
}) {
  const [localScript, setLocalScript] = React.useState<string>("")
  const [showScript, setShowScript] = React.useState<boolean>(false)

  React.useEffect(() => {
    setLocalScript(scriptText || "")
  }, [scriptText])

  return (
    <div className="relative w-full h-screen bg-black text-white overflow-hidden flex items-center justify-center">
      <div className="max-w-4xl w-full mx-auto p-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-normal text-white mb-4">Media Processing</h1>
          <p className="text-xl text-white/70">Upload and process your speaker-to-camera videos with AI</p>
        </div>

        <div className="relative mb-8">
          <div
            className="rounded-[24px] border-2 border-dashed border-white/20 p-16 text-center bg-gradient-to-br from-white/5 to-transparent backdrop-blur-md transition-all"
            onDragOver={(e) => {
              e.preventDefault()
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)'
            }}
            onDragLeave={(e) => {
              e.preventDefault()
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
            }}
            onDrop={(e) => {
              e.preventDefault()
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
              const files = Array.from(e.dataTransfer.files)
              if (files.length > 0) {
                onDropFile(files[0])
              }
            }}
          >
            <div className="flex flex-col items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md">
                <SquarePlay className="w-10 h-10 text-white/80" strokeWidth={1.2} />
              </div>
              <div>
                <h3 className="text-2xl font-medium text-white mb-2">
                  {uploadedFile ? uploadedFile.name : 'Drop your video here'}
                </h3>
                <p className="text-white/60">
                  {uploadedFile ? `${(uploadedFile.size / 1024 / 1024).toFixed(1)} MB` : 'Support for MP4, MOV, AVI up to 2GB'}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) onChooseFile(file)
                  }}
                  className="hidden"
                  id="video-upload"
                />
                <label
                  htmlFor="video-upload"
                  className="px-8 py-3 rounded-[14px] bg-white/10 border border-white/20 text-white hover:bg-white/15 transition-all backdrop-blur-md cursor-pointer"
                >
                  {uploadedFile ? 'Choose Different File' : 'Choose File'}
                </label>

                <button
                  onClick={() => setShowScript(true)}
                  className="px-4 py-2 rounded-[10px] bg-white/5 border border-white/10 text-white/60 hover:text-white/80 hover:bg-white/10 transition-all text-sm flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" strokeWidth={1.5} />
                  {localScript.trim() ? 'Edit Script' : 'Add Script'}
                </button>
              </div>
              {localScript.trim() && (
                <div className="mt-2 px-3 py-1 rounded-[8px] bg-white/5 border border-white/10">
                  <p className="text-white/70 text-sm">Script added ({localScript.length} characters)</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-12">
          <div className="rounded-[18px] border border-white/10 p-6 bg-gradient-to-br from-white/5 to-transparent backdrop-blur-md">
            <h4 className="text-lg font-medium text-white mb-2">Auto Crop</h4>
            <p className="text-white/60 text-sm">Automatically crop to speaker focus</p>
          </div>
          <div className="rounded-[18px] border border-white/10 p-6 bg-gradient-to-br from-white/5 to-transparent backdrop-blur-md">
            <h4 className="text-lg font-medium text-white mb-2">Professional Audio</h4>
            <p className="text-white/60 text-sm">Instagram Reel-quality editing with AI</p>
          </div>
          <div className="rounded-[18px] border border-white/10 p-6 bg-gradient-to-br from-white/5 to-transparent backdrop-blur-md">
            <h4 className="text-lg font-medium text-white mb-2">Auto Subtitles</h4>
            <p className="text-white/60 text-sm">Generate subtitles automatically</p>
          </div>
          <div className="rounded-[18px] border border-white/10 p-6 bg-gradient-to-br from-white/5 to-transparent backdrop-blur-md">
            <h4 className="text-lg font-medium text-white mb-2">Smart Segments</h4>
            <p className="text-white/60 text-sm">Intelligent scene detection</p>
          </div>
        </div>

        {/* Processing Options */}
        {uploadedFile && !isProcessing && (
          <div className="space-y-8">
            <div className="text-center">
              <h3 className="text-xl font-medium text-white mb-6">Choose Processing Method</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {/* Standard Processing */}
                <div className="p-6 rounded-[20px] border border-white/20 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <SquarePlay className="w-5 h-5 text-blue-400" />
                    </div>
                    <h4 className="text-lg font-medium text-white">Standard Processing</h4>
                  </div>
                  <p className="text-white/70 text-sm mb-4">Traditional pipeline with script alignment and basic editing</p>
                  <button 
                    onClick={onProcess}
                    className="w-full px-6 py-3 rounded-[14px] bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all font-medium"
                  >
                    Start Standard Processing
                  </button>
                </div>

                {/* Professional Audio Processing */}
                {onProfessionalProcess && (
                  <div className="p-6 rounded-[20px] border border-emerald-400/30 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 backdrop-blur-md">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <span className="text-emerald-400 text-lg">✨</span>
                      </div>
                      <h4 className="text-lg font-medium text-emerald-300">Professional Audio Processing</h4>
                    </div>
                    <p className="text-white/70 text-sm mb-4">Instagram Reel-quality editing with AI-powered bad take removal</p>
                    <div className="space-y-2">
                      <button 
                        onClick={() => onProfessionalProcess('analyze')}
                        className="w-full px-4 py-2 rounded-[10px] border border-blue-400/40 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 transition-all text-sm font-medium"
                      >
                        🎯 Analyze Content First
                      </button>
                      <button 
                        onClick={() => onProfessionalProcess('quick')}
                        className="w-full px-4 py-2 rounded-[10px] border border-emerald-400/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition-all text-sm font-medium"
                      >
                        ⚡ Quick Professional Clean
                      </button>
                      <button 
                        onClick={() => onProfessionalProcess('complete')}
                        className="w-full px-4 py-2 rounded-[10px] border border-purple-400/40 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 transition-all text-sm font-medium"
                      >
                        🎬 Complete Instagram Reel Edit
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Back to Editor Button */}
            <div className="text-center">
              <button 
                onClick={onBackToEditor}
                className="px-8 py-3 rounded-[14px] border border-white/30 text-white/90 hover:bg-white/10 transition-all font-medium"
              >
                ← Back to Editor
              </button>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="max-w-md w-full mx-4">
              <div className="rounded-[24px] border border-white/20 p-8 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md text-center">
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 rounded-full border-4 border-red-500/30 border-t-red-500 animate-spin" />
                </div>
                <h4 className="text-2xl font-medium text-white mb-2">Processing Video</h4>
                <p className="text-white/80 text-lg mb-6">{processingStep}</p>

                <div className="w-full bg-white/20 rounded-full h-3 mb-4">
                  <div
                    className="bg-gradient-to-r from-red-500 to-red-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${processingProgress}%` }}
                  />
                </div>
                <p className="text-white/70">{Math.round(processingProgress)}% complete</p>

                <div className="mt-6 text-white/60 text-sm">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-white/40 rounded-full animate-pulse" />
                    <span>Please don't close this window</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showScript && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="max-w-2xl w-full mx-4">
              <div className="rounded-[20px] border border-white/20 p-6 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-medium text-white">Add Script (Optional)</h3>
                  <button
                    onClick={() => { setShowScript(false); onCloseScript() }}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all"
                  >
                    ×
                  </button>
                </div>
                <p className="text-white/60 text-sm mb-4">
                  Paste your script here to compare with the transcribed audio for better accuracy.
                </p>
                <textarea
                  value={localScript}
                  onChange={(e) => setLocalScript(e.target.value)}
                  className="w-full h-48 rounded-[12px] bg-white/10 border border-white/20 p-3 text-white outline-none"
                />
                <div className="mt-3 flex items-center justify-end gap-3">
                  <button
                    onClick={() => { setShowScript(false); onSaveScript(localScript) }}
                    className="px-6 py-2 rounded-[10px] bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 text-white hover:from-red-500/30 hover:to-red-600/30 transition-all"
                  >
                    Save Script
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-center gap-4">
          <button
            onClick={onBackToEditor}
            className="px-6 py-3 rounded-[14px] border border-white/30 text-white/90 hover:bg-white/5 transition-all"
            disabled={isProcessing}
          >
            Back to Editor
          </button>
          <button
            onClick={onProcess}
            disabled={!uploadedFile || isProcessing}
            className={`px-8 py-3 rounded-[14px] transition-all backdrop-blur-md ${uploadedFile && !isProcessing
              ? 'bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 text-white hover:from-red-500/30 hover:to-red-600/30'
              : 'bg-white/5 border border-white/20 text-white/50 cursor-not-allowed'
              }`}
          >
            {isProcessing ? 'Processing...' : 'Process with AI'}
          </button>

          {uploadedFile && !isProcessing && (
            <button
              onClick={onSkipProcessing}
              className="px-6 py-3 rounded-[14px] transition-all backdrop-blur-md bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30"
            >
              Skip Processing
            </button>
          )}
        </div>
      </div>
    </div>
  )
}



























