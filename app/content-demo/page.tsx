// Demo page retained; routed system is primary.
"use client"

import React, { useState, useEffect } from 'react'
import { LiquidGlass } from '@/components/ui/liquid-glass'
import { LiquidButton } from '@/components/ui/liquid-button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { 
  Video, 
  Image as ImageIcon, 
  Play, 
  Download, 
  Edit3, 
  Eye, 
  Calendar,
  Sparkles,
  FileImage,
  FileVideo,
  MoreHorizontal
} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

// Sample data for demonstration
const sampleOptimizedPosts = [
  {
    id: '1',
    title: 'Amazing Interior Transformation',
    content: 'Check out this incredible before and after transformation! Our team worked magic on this space.',
    media_urls: ['https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=600&fit=crop'],
    media_type: 'image' as const,
    status: 'published' as const,
    published_at: '2024-01-15T10:30:00Z',
    likes: 1247,
    comments_count: 89,
    shares: 45,
    reach: 15420,
    impressions: 18900,
    created_at: '2024-01-15T10:30:00Z'
  },
  {
    id: '2',
    title: 'Kitchen Renovation Process',
    content: 'Step-by-step kitchen renovation that will inspire you to transform your own space.',
    media_urls: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=600&fit=crop'],
    media_type: 'video' as const,
    status: 'published' as const,
    published_at: '2024-01-14T14:20:00Z',
    likes: 892,
    comments_count: 67,
    shares: 23,
    reach: 9870,
    impressions: 11200,
    created_at: '2024-01-14T14:20:00Z'
  },
  {
    id: '3',
    title: 'Modern Living Room Design',
    content: 'Contemporary living room with minimalist design and natural lighting.',
    media_urls: ['https://images.unsplash.com/photo-1618220179428-22790b461013?w=400&h=600&fit=crop'],
    media_type: 'image' as const,
    status: 'published' as const,
    published_at: '2024-01-13T09:15:00Z',
    likes: 2156,
    comments_count: 134,
    shares: 78,
    reach: 23400,
    impressions: 26700,
    created_at: '2024-01-13T09:15:00Z'
  },
  {
    id: '4',
    title: 'Bathroom Makeover Reveal',
    content: 'From outdated to luxurious - see the stunning transformation of this bathroom.',
    media_urls: ['https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400&h=600&fit=crop'],
    media_type: 'video' as const,
    status: 'published' as const,
    published_at: '2024-01-12T16:45:00Z',
    likes: 1678,
    comments_count: 98,
    shares: 56,
    reach: 18900,
    impressions: 21500,
    created_at: '2024-01-12T16:45:00Z'
  }
]

const sampleRawMaterials = [
  {
    id: '1',
    filename: 'kitchen_before.jpg',
    original_filename: 'kitchen_before.jpg',
    storage_url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop',
    thumbnail_url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop',
    file_type: 'image' as const,
    file_size: 2048576,
    width: 1920,
    height: 1080,
    processing_status: 'completed' as const,
    optimization_status: 'optimized' as const,
    created_at: '2024-01-10T11:30:00Z'
  },
  {
    id: '2',
    filename: 'living_room_video.mp4',
    original_filename: 'living_room_video.mp4',
    storage_url: 'https://images.unsplash.com/photo-1618220179428-22790b461013?w=400&h=400&fit=crop',
    thumbnail_url: 'https://images.unsplash.com/photo-1618220179428-22790b461013?w=400&h=400&fit=crop',
    file_type: 'video' as const,
    file_size: 15728640,
    width: 1920,
    height: 1080,
    duration: 45,
    processing_status: 'completed' as const,
    optimization_status: 'optimized' as const,
    created_at: '2024-01-09T14:20:00Z'
  },
  {
    id: '3',
    filename: 'bathroom_raw.jpg',
    original_filename: 'bathroom_raw.jpg',
    storage_url: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400&h=400&fit=crop',
    thumbnail_url: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400&h=400&fit=crop',
    file_type: 'image' as const,
    file_size: 3145728,
    width: 2560,
    height: 1440,
    processing_status: 'processing' as const,
    optimization_status: 'pending' as const,
    created_at: '2024-01-08T09:15:00Z'
  },
  {
    id: '4',
    filename: 'bedroom_sketch.jpg',
    original_filename: 'bedroom_sketch.jpg',
    storage_url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop',
    thumbnail_url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop',
    file_type: 'image' as const,
    file_size: 1048576,
    width: 1280,
    height: 720,
    processing_status: 'failed' as const,
    optimization_status: 'failed' as const,
    created_at: '2024-01-07T16:45:00Z'
  }
]

interface MediaFile {
  id: string
  filename: string
  original_filename: string
  storage_url: string
  thumbnail_url?: string
  file_type: 'image' | 'video'
  file_size: number
  width?: number
  height?: number
  duration?: number
  processing_status: 'pending' | 'processing' | 'completed' | 'failed'
  optimization_status: 'pending' | 'optimized' | 'failed'
  created_at: string
  metadata?: any
}

interface Post {
  id: string
  title?: string
  content: string
  media_urls: string[]
  media_type: 'image' | 'video' | 'text' | 'carousel'
  status: 'draft' | 'scheduled' | 'published' | 'failed'
  published_at?: string
  likes: number
  comments_count: number
  shares: number
  reach: number
  impressions: number
  created_at: string
}

export default function ContentGalleryDemo() {
  const [activeView, setActiveView] = useState<'optimized' | 'raw'>('optimized')
  const [selectedItem, setSelectedItem] = useState<Post | MediaFile | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const handleItemClick = (item: Post | MediaFile) => {
    setSelectedItem(item)
    setIsDetailOpen(true)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getMediaUrl = (item: Post | MediaFile) => {
    if ('storage_url' in item) {
      return item.thumbnail_url || item.storage_url
    }
    return item.media_urls[0] || ''
  }

  const getMediaType = (item: Post | MediaFile) => {
    if ('file_type' in item) {
      return item.file_type
    }
    return item.media_type === 'video' ? 'video' : 'image'
  }

  const renderOptimizedPosts = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {sampleOptimizedPosts.map((post) => (
        <LiquidGlass
          key={post.id}
          variant="card"
          intensity="medium"
          className="group cursor-pointer overflow-hidden"
          onClick={() => handleItemClick(post)}
        >
          <div className="relative aspect-[9/16] bg-gradient-to-br from-mint-100/20 to-mint-200/10">
            {/* Thumbnail */}
            {post.media_urls[0] && (
              <img
                src={post.media_urls[0]}
                alt={post.title || 'Post thumbnail'}
                className="w-full h-full object-cover"
              />
            )}
            
            {/* Play button for videos */}
            {post.media_type === 'video' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <Play className="w-8 h-8 text-white ml-1" />
                </div>
              </div>
            )}

            {/* Overlay with title and date */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h3 className="text-white font-semibold text-sm line-clamp-2 mb-2">
                {post.title || 'Untitled Post'}
              </h3>
              <div className="flex items-center justify-between text-white/80 text-xs">
                <span>{new Date(post.published_at || post.created_at).toLocaleDateString()}</span>
                <div className="flex items-center gap-2">
                  <span>❤️ {post.likes}</span>
                  <span>💬 {post.comments_count}</span>
                </div>
              </div>
            </div>

            {/* Action menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="absolute top-2 right-2 w-8 h-8 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="w-4 h-4 text-white" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white/10 backdrop-blur-xl border-white/20">
                <DropdownMenuItem className="text-white hover:bg-white/20">
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem className="text-white hover:bg-white/20">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem className="text-white hover:bg-white/20">
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </LiquidGlass>
      ))}
    </div>
  )

  const renderRawMaterials = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {sampleRawMaterials.map((file) => (
        <LiquidGlass
          key={file.id}
          variant="card"
          intensity="subtle"
          className="group cursor-pointer overflow-hidden"
          onClick={() => handleItemClick(file)}
        >
          <div className="relative aspect-square bg-gradient-to-br from-mint-50/30 to-mint-100/20">
            {/* Thumbnail */}
            <img
              src={file.thumbnail_url || file.storage_url}
              alt={file.original_filename}
              className="w-full h-full object-cover"
            />
            
            {/* File type indicator */}
            <div className="absolute top-2 left-2">
              <Badge 
                variant="secondary" 
                className="bg-white/20 backdrop-blur-sm text-white border-white/30"
              >
                {file.file_type === 'video' ? (
                  <FileVideo className="w-3 h-3 mr-1" />
                ) : (
                  <FileImage className="w-3 h-3 mr-1" />
                )}
                {file.file_type}
              </Badge>
            </div>

            {/* Processing status */}
            {file.processing_status !== 'completed' && (
              <div className="absolute top-2 right-2">
                <Badge 
                  variant={file.processing_status === 'failed' ? 'destructive' : 'secondary'}
                  className="bg-white/20 backdrop-blur-sm text-white border-white/30"
                >
                  {file.processing_status}
                </Badge>
              </div>
            )}

            {/* Overlay with file info */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <h3 className="text-white font-medium text-sm line-clamp-1 mb-1">
                {file.original_filename}
              </h3>
              <div className="flex items-center justify-between text-white/80 text-xs">
                <span>{formatFileSize(file.file_size)}</span>
                <span>{new Date(file.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {/* AI Edit button */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <LiquidButton
                variant="secondary"
                size="sm"
                className="bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30"
                onClick={(e) => e.stopPropagation()}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                AI Edit
              </LiquidButton>
            </div>
          </div>
        </LiquidGlass>
      ))}
    </div>
  )

  const renderDetailView = () => {
    if (!selectedItem) return null

    const isPost = 'content' in selectedItem
    const mediaUrl = getMediaUrl(selectedItem)
    const mediaType = getMediaType(selectedItem)

    return (
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-white/20 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-white">
              {isPost ? selectedItem.title || 'Post Details' : selectedItem.original_filename}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Media Preview */}
            <div className="relative aspect-[9/16] bg-gradient-to-br from-mint-100/20 to-mint-200/10 rounded-xl overflow-hidden">
              {mediaUrl && (
                <>
                  {mediaType === 'video' ? (
                    <video
                      src={mediaUrl}
                      controls
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={mediaUrl}
                      alt={isPost ? selectedItem.title || 'Post' : selectedItem.original_filename}
                      className="w-full h-full object-cover"
                    />
                  )}
                </>
              )}
            </div>

            {/* Details */}
            <div className="space-y-4">
              {isPost ? (
                <>
                  <div>
                    <h3 className="text-white font-semibold mb-2">Content</h3>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {selectedItem.content}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-mint-300 font-medium text-sm mb-1">Performance</h4>
                      <div className="space-y-1 text-xs text-gray-400">
                        <div>❤️ Likes: {selectedItem.likes}</div>
                        <div>💬 Comments: {selectedItem.comments_count}</div>
                        <div>📤 Shares: {selectedItem.shares}</div>
                        <div>👁️ Reach: {selectedItem.reach}</div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-mint-300 font-medium text-sm mb-1">Published</h4>
                      <div className="text-xs text-gray-400">
                        {new Date(selectedItem.published_at || selectedItem.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h3 className="text-white font-semibold mb-2">File Information</h3>
                    <div className="space-y-2 text-sm text-gray-300">
                      <div><span className="text-mint-300">Size:</span> {formatFileSize(selectedItem.file_size)}</div>
                      <div><span className="text-mint-300">Type:</span> {selectedItem.file_type}</div>
                      {selectedItem.width && selectedItem.height && (
                        <div><span className="text-mint-300">Dimensions:</span> {selectedItem.width} × {selectedItem.height}</div>
                      )}
                      {selectedItem.duration && (
                        <div><span className="text-mint-300">Duration:</span> {formatDuration(selectedItem.duration)}</div>
                      )}
                      <div><span className="text-mint-300">Created:</span> {new Date(selectedItem.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-mint-300 font-medium text-sm mb-2">Status</h4>
                    <div className="flex gap-2">
                      <Badge 
                        variant={selectedItem.processing_status === 'completed' ? 'default' : 'secondary'}
                        className="bg-mint-500/20 text-mint-300 border-mint-500/30"
                      >
                        {selectedItem.processing_status}
                      </Badge>
                      <Badge 
                        variant={selectedItem.optimization_status === 'optimized' ? 'default' : 'secondary'}
                        className="bg-mint-500/20 text-mint-300 border-mint-500/30"
                      >
                        {selectedItem.optimization_status}
                      </Badge>
                    </div>
                  </div>
                </>
              )}
              
              <div className="flex gap-2 pt-4">
                <LiquidButton variant="primary" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </LiquidButton>
                <LiquidButton variant="secondary" size="sm">
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit
                </LiquidButton>
                {!isPost && (
                  <LiquidButton variant="secondary" size="sm">
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI Enhance
                  </LiquidButton>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <LiquidGlass variant="panel" intensity="strong" className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-mint-300 to-mint-500 bg-clip-text text-transparent">
            Content Gallery Demo
          </h1>
          <p className="text-gray-300 text-lg">
            Showcasing the Liquid Glass design with cool mint green palette
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex justify-center">
          <div className="flex bg-white/10 backdrop-blur-xl rounded-2xl p-1 border border-white/20">
            <LiquidButton
              variant={activeView === 'optimized' ? 'primary' : 'ghost'}
              size="md"
              onClick={() => setActiveView('optimized')}
              className={activeView === 'optimized' ? 'bg-gradient-to-r from-mint-400 to-mint-600' : ''}
            >
              <Video className="w-4 h-4 mr-2" />
              Optimized Posts
            </LiquidButton>
            <LiquidButton
              variant={activeView === 'raw' ? 'primary' : 'ghost'}
              size="md"
              onClick={() => setActiveView('raw')}
              className={activeView === 'raw' ? 'bg-gradient-to-r from-mint-400 to-mint-600' : ''}
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              Raw Materials
            </LiquidButton>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeView === 'optimized' ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-white">
                  Optimized Posts ({sampleOptimizedPosts.length})
                </h2>
              </div>
              {renderOptimizedPosts()}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-white">
                  Raw Materials ({sampleRawMaterials.length})
                </h2>
              </div>
              {renderRawMaterials()}
            </>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {renderDetailView()}
    </LiquidGlass>
  )
} 