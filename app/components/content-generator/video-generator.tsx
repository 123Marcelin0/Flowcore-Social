"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Loader2, Wand2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

import { VideoSettings, GeneratedContent } from './types'

interface VideoGeneratorProps {
  settings: VideoSettings
  onContentGenerated: (content: GeneratedContent) => void
  isGenerating: boolean
  setIsGenerating: (generating: boolean) => void
}

export function VideoGenerator({ 
  settings, 
  onContentGenerated, 
  isGenerating, 
  setIsGenerating 
}: VideoGeneratorProps) {
  const [prompt, setPrompt] = useState('')

  const generateVideo = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt')
      return
    }

    setIsGenerating(true)
    
    // Create processing placeholder
    const processingContent: GeneratedContent = {
      id: `vid-${Date.now()}`,
      type: 'video',
      url: '',
      prompt,
      settings,
      createdAt: new Date(),
      isProcessing: true,
      processingProgress: 0
    }
    
    onContentGenerated(processingContent)
    
    try {
      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          ...settings
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate video')
      }

      const result = await response.json()
      
      // Update the processing content with the actual result
      const finalContent: GeneratedContent = {
        ...processingContent,
        url: result.videoUrl,
        isProcessing: false,
        processingProgress: 100
      }

      // Replace the processing content with the final content
      onContentGenerated(finalContent)
      toast.success('Video generated successfully!')
      
    } catch (error) {
      console.error('Video generation error:', error)
      toast.error('Failed to generate video')
      // Remove the processing content on error
      onContentGenerated({ ...processingContent, isProcessing: false })
    } finally {
      setIsGenerating(false)
    }
  }

  const quickPrompts = [
    "A cinematic drone shot of a modern house at sunset",
    "Time-lapse of a cozy living room throughout the day",
    "Smooth camera movement through a luxury apartment",
    "Professional property walkthrough video"
  ]

  return (
    <div className="space-y-6">
      {/* Prompt Input */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Label className="text-lg font-semibold">Video Prompt</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the video you want to generate..."
              className="min-h-32 resize-none"
            />
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Badge variant="outline" className="text-xs">
                  {settings.model.toUpperCase()}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {settings.duration}s {settings.resolution}
                </Badge>
              </div>
              <Button
                onClick={generateVideo}
                disabled={!prompt.trim() || isGenerating}
                className="bg-black text-white hover:bg-gray-800 gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    Generate Video
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Prompts */}
      <Card>
        <CardContent className="p-6">
          <Label className="text-base font-semibold mb-4 block">Quick Prompts</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {quickPrompts.map((quickPrompt, index) => (
              <Button
                key={index}
                variant="outline"
                onClick={() => setPrompt(quickPrompt)}
                className="text-left h-auto p-3 justify-start"
              >
                <Sparkles className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="text-sm">{quickPrompt}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
