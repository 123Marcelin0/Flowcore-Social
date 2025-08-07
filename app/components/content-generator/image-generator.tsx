"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Loader2, Wand2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

import { ImageSettings, GeneratedContent } from './types'

interface ImageGeneratorProps {
  settings: ImageSettings
  onContentGenerated: (content: GeneratedContent) => void
  isGenerating: boolean
  setIsGenerating: (generating: boolean) => void
}

export function ImageGenerator({ 
  settings, 
  onContentGenerated, 
  isGenerating, 
  setIsGenerating 
}: ImageGeneratorProps) {
  const [prompt, setPrompt] = useState('')

  const generateImage = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt')
      return
    }

    setIsGenerating(true)
    
    try {
      const response = await fetch('/api/generate-image', {
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
        throw new Error('Failed to generate image')
      }

      const result = await response.json()
      
      const newContent: GeneratedContent = {
        id: `img-${Date.now()}`,
        type: 'image',
        url: result.imageUrl,
        prompt,
        settings,
        createdAt: new Date()
      }

      onContentGenerated(newContent)
      toast.success('Image generated successfully!')
      
    } catch (error) {
      console.error('Image generation error:', error)
      toast.error('Failed to generate image')
    } finally {
      setIsGenerating(false)
    }
  }

  const quickPrompts = [
    "A luxurious modern living room with floor-to-ceiling windows",
    "Cozy Scandinavian bedroom with natural lighting",
    "Minimalist kitchen with marble countertops",
    "Professional real estate photo of a beautiful property"
  ]

  return (
    <div className="space-y-6">
      {/* Prompt Input */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Label className="text-lg font-semibold">Image Prompt</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to generate..."
              className="min-h-32 resize-none"
            />
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Badge variant="outline" className="text-xs">
                  {settings.model.toUpperCase()}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {settings.size}
                </Badge>
              </div>
              <Button
                onClick={generateImage}
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
                    Generate Image
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
