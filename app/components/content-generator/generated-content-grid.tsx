"use client"

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2, Copy, Download, Share2, X, Play } from 'lucide-react'
import { toast } from 'sonner'

import { GeneratedContent } from './types'

interface GeneratedContentGridProps {
  content: GeneratedContent[]
  onRemoveContent: (id: string) => void
}

export function GeneratedContentGrid({ content, onRemoveContent }: GeneratedContentGridProps) {
  const copyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt)
    toast.success('Prompt copied to clipboard!')
  }

  const downloadContent = async (content: GeneratedContent) => {
    try {
      const response = await fetch(content.url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${content.type}-${Date.now()}.${content.type === 'video' ? 'mp4' : 'jpg'}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Content downloaded successfully!')
    } catch (error) {
      console.error('Download error:', error)
      toast.error('Failed to download content')
    }
  }

  if (content.length === 0) {
    return null
  }

  return (
    <Card>
      <CardContent className="p-6">
        <Label className="text-base font-semibold mb-4 block">
          Generated Content ({content.length})
        </Label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {content.map((item) => (
            <div key={item.id} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border">
                {item.isProcessing ? (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <Loader2 className="w-8 h-8 text-gray-400 animate-spin mb-2" />
                    <span className="text-sm text-gray-600">Processing...</span>
                    {item.processingProgress !== undefined && (
                      <div className="w-16 bg-gray-200 rounded-full h-1 mt-2">
                        <div 
                          className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                          style={{ width: `${item.processingProgress}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                ) : item.type === 'video' ? (
                  <div className="w-full h-full flex items-center justify-center relative">
                    <video
                      src={item.url}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center">
                        <Play className="w-6 h-6 text-white ml-1" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <img
                    src={item.url}
                    alt={item.prompt}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              {/* Action Buttons */}
              {!item.isProcessing && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => copyPrompt(item.prompt)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => downloadContent(item)}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onRemoveContent(item.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Content Info */}
              <div className="mt-2">
                <p className="text-xs text-gray-600 truncate">{item.prompt}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {item.type}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {item.createdAt.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
