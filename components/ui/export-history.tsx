"use client"

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { EnhancedLiquidGlass } from './enhanced-liquid-glass'
import { SharedProgressBar, SharedStatusBadge } from './shared-components'
import { 
  Download,
  FileVideo,
  Settings,
  Play,
  Pause,
  RefreshCw,
  Trash2,
  Share2,
  Copy,
  ExternalLink,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader,
  Filter,
  Search,
  Calendar,
  FileText,
  Image,
  Music,
  Video
} from 'lucide-react'

interface ExportHistoryProps {
  exports: ProjectExport[]
  onExportDownload?: (exportItem: ProjectExport) => void
  onExportDelete?: (exportItem: ProjectExport) => void
  onExportShare?: (exportItem: ProjectExport) => void
  onExportRetry?: (exportItem: ProjectExport) => void
  onNewExport?: () => void
  className?: string
}

interface ProjectExport {
  id: string
  name: string
  description?: string
  format: 'MP4' | 'MOV' | 'AVI' | 'GIF' | 'MP3' | 'WAV' | 'PNG' | 'JPG'
  quality: '480p' | '720p' | '1080p' | '4K' | 'Original'
  createdAt: Date
  completedAt?: Date
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  progress?: number
  downloadUrl?: string
  shareUrl?: string
  fileSize?: number
  duration?: number
  settings?: ExportSettings
  error?: string
  estimatedTime?: number
  actualTime?: number
}

interface ExportSettings {
  bitrate?: number
  framerate?: number
  codec?: string
  resolution?: string
  audioQuality?: string
  includeSubtitles?: boolean
  watermark?: boolean
}

const FORMAT_ICONS = {
  MP4: Video,
  MOV: Video,
  AVI: Video,
  GIF: Image,
  MP3: Music,
  WAV: Music,
  PNG: Image,
  JPG: Image
}

const STATUS_CONFIG = {
  pending: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  processing: { icon: Loader, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  completed: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/20' },
  failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20' },
  cancelled: { icon: AlertCircle, color: 'text-gray-400', bg: 'bg-gray-500/20' }
}

export function ExportHistory({
  exports,
  onExportDownload,
  onExportDelete,
  onExportShare,
  onExportRetry,
  onNewExport,
  className
}: ExportHistoryProps) {
  const [filter, setFilter] = useState<'all' | 'completed' | 'processing' | 'failed'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSettings, setShowSettings] = useState<string | null>(null)

  const filteredExports = exports.filter(exportItem => {
    const matchesFilter = filter === 'all' || exportItem.status === filter
    const matchesSearch = exportItem.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size'
    const mb = bytes / (1024 * 1024)
    if (mb < 1024) return `${mb.toFixed(1)} MB`
    return `${(mb / 1024).toFixed(1)} GB`
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getRelativeTime = (date: Date) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return date.toLocaleDateString()
  }

  const getEstimatedTimeRemaining = (exportItem: ProjectExport) => {
    if (!exportItem.estimatedTime || !exportItem.progress) return null
    
    const elapsed = exportItem.actualTime || 0
    const remaining = (exportItem.estimatedTime * (100 - exportItem.progress)) / 100
    
    if (remaining < 60) return `${Math.round(remaining)}s remaining`
    return `${Math.round(remaining / 60)}m remaining`
  }

  return (
    <EnhancedLiquidGlass
      variant="timeline"
      intensity="premium"
      className={cn("p-6", className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white/90">Export History</h3>
          <p className="text-sm text-white/60 mt-1">
            {exports.length} export{exports.length !== 1 ? 's' : ''} • 
            {exports.filter(e => e.status === 'completed').length} completed
          </p>
        </div>
        
        {onNewExport && (
          <motion.button
            onClick={onNewExport}
            className="px-4 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Download className="w-4 h-4 mr-2" />
            New Export
          </motion.button>
        )}
      </div>

      {/* Filters and Search */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center bg-white/10 rounded-lg p-1">
          {[
            { key: 'all', label: 'All' },
            { key: 'completed', label: 'Completed' },
            { key: 'processing', label: 'Processing' },
            { key: 'failed', label: 'Failed' }
          ].map(({ key, label }) => (
            <motion.button
              key={key}
              onClick={() => setFilter(key as any)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                filter === key
                  ? "bg-white/20 text-white"
                  : "text-white/60 hover:text-white/80"
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {label}
            </motion.button>
          ))}
        </div>

        <div className="flex-1 max-w-xs relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Search exports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
          />
        </div>
      </div>

      {/* Export List */}
      <div className="space-y-4">
        {filteredExports.map((exportItem, index) => {
          const StatusIcon = STATUS_CONFIG[exportItem.status].icon
          const FormatIcon = FORMAT_ICONS[exportItem.format]
          
          return (
            <motion.div
              key={exportItem.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <EnhancedLiquidGlass
                variant="editor"
                intensity="medium"
                className="p-4"
              >
                <div className="flex items-start gap-4">
                  {/* Format Icon */}
                  <div className={cn(
                    "w-12 h-12 rounded-lg flex items-center justify-center",
                    STATUS_CONFIG[exportItem.status].bg
                  )}>
                    <FormatIcon className="w-6 h-6 text-white/60" />
                  </div>

                  {/* Export Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-white/90 flex items-center gap-2">
                          {exportItem.name}
                          <SharedStatusBadge 
                            status={exportItem.status as any}
                            size="sm"
                          />
                        </h4>
                        {exportItem.description && (
                          <p className="text-sm text-white/60 mt-1">
                            {exportItem.description}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {exportItem.status === 'completed' && exportItem.downloadUrl && (
                          <motion.button
                            onClick={() => onExportDownload?.(exportItem)}
                            className="p-2 text-green-400 hover:text-green-300 transition-colors"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </motion.button>
                        )}
                        
                        {exportItem.status === 'completed' && exportItem.shareUrl && (
                          <motion.button
                            onClick={() => onExportShare?.(exportItem)}
                            className="p-2 text-blue-400 hover:text-blue-300 transition-colors"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            title="Share"
                          >
                            <Share2 className="w-4 h-4" />
                          </motion.button>
                        )}
                        
                        {exportItem.status === 'failed' && (
                          <motion.button
                            onClick={() => onExportRetry?.(exportItem)}
                            className="p-2 text-yellow-400 hover:text-yellow-300 transition-colors"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            title="Retry"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </motion.button>
                        )}
                        
                        <motion.button
                          onClick={() => setShowSettings(
                            showSettings === exportItem.id ? null : exportItem.id
                          )}
                          className="p-2 text-white/60 hover:text-white transition-colors"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Settings className="w-4 h-4" />
                        </motion.button>
                        
                        <motion.button
                          onClick={() => onExportDelete?.(exportItem)}
                          className="p-2 text-red-400 hover:text-red-300 transition-colors"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>

                    {/* Export Details */}
                    <div className="flex items-center gap-4 text-xs text-white/50 mb-3">
                      <div className="flex items-center gap-1">
                        <StatusIcon className="w-3 h-3" />
                        {exportItem.status}
                      </div>
                      
                      <div>
                        {exportItem.format} • {exportItem.quality}
                      </div>
                      
                      {exportItem.fileSize && (
                        <div>
                          {formatFileSize(exportItem.fileSize)}
                        </div>
                      )}
                      
                      {exportItem.duration && (
                        <div>
                          {formatDuration(exportItem.duration)}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {getRelativeTime(exportItem.createdAt)}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {exportItem.status === 'processing' && exportItem.progress !== undefined && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-white/60">
                            Processing... {exportItem.progress}%
                          </span>
                          {getEstimatedTimeRemaining(exportItem) && (
                            <span className="text-xs text-white/50">
                              {getEstimatedTimeRemaining(exportItem)}
                            </span>
                          )}
                        </div>
                        <SharedProgressBar
                          value={exportItem.progress}
                          variant="default"
                          size="sm"
                        />
                      </div>
                    )}

                    {/* Error Message */}
                    {exportItem.status === 'failed' && exportItem.error && (
                      <div className="p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-300 mb-3">
                        {exportItem.error}
                      </div>
                    )}

                    {/* Expanded Settings */}
                    <AnimatePresence>
                      {showSettings === exportItem.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 pt-3 border-t border-white/10"
                        >
                          {exportItem.settings && (
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              <div>
                                <span className="text-white/60">Resolution:</span>
                                <span className="text-white/90 ml-2">
                                  {exportItem.settings.resolution || exportItem.quality}
                                </span>
                              </div>
                              
                              {exportItem.settings.bitrate && (
                                <div>
                                  <span className="text-white/60">Bitrate:</span>
                                  <span className="text-white/90 ml-2">
                                    {exportItem.settings.bitrate} kbps
                                  </span>
                                </div>
                              )}
                              
                              {exportItem.settings.framerate && (
                                <div>
                                  <span className="text-white/60">Framerate:</span>
                                  <span className="text-white/90 ml-2">
                                    {exportItem.settings.framerate} fps
                                  </span>
                                </div>
                              )}
                              
                              {exportItem.settings.codec && (
                                <div>
                                  <span className="text-white/60">Codec:</span>
                                  <span className="text-white/90 ml-2">
                                    {exportItem.settings.codec}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {exportItem.completedAt && (
                            <div className="mt-3 text-xs text-white/50">
                              Completed on {exportItem.completedAt.toLocaleString()}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </EnhancedLiquidGlass>
            </motion.div>
          )
        })}
      </div>

      {/* Empty State */}
      {filteredExports.length === 0 && (
        <div className="text-center py-12">
          <Download className="w-12 h-12 text-white/30 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-white/60 mb-2">
            {searchQuery ? 'No matching exports' : 'No exports yet'}
          </h4>
          <p className="text-sm text-white/40">
            {searchQuery 
              ? 'Try adjusting your search or filter criteria'
              : 'Export your project to see the history here'
            }
          </p>
        </div>
      )}
    </EnhancedLiquidGlass>
  )
}