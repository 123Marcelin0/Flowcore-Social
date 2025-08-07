"use client"

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { EnhancedLiquidGlass } from './enhanced-liquid-glass'
import { 
  FileVideo,
  Eye,
  Download,
  GitBranch,
  Clock,
  User,
  MessageSquare,
  MoreHorizontal,
  Play,
  Copy,
  Trash2,
  Star,
  Tag
} from 'lucide-react'
import { Restore } from 'lucide-react'

interface VersionHistoryProps {
  versions: ProjectVersion[]
  onVersionSelect?: (version: ProjectVersion) => void
  onVersionRestore?: (version: ProjectVersion) => void
  onVersionDownload?: (version: ProjectVersion) => void
  onVersionDelete?: (version: ProjectVersion) => void
  className?: string
}

interface ProjectVersion {
  id: string
  name: string
  description?: string
  createdAt: Date
  createdBy?: string
  thumbnail?: string
  duration: number
  isActive: boolean
  fileSize?: number
  changes?: VersionChange[]
  tags?: string[]
  branch?: string
  commitHash?: string
  isStarred?: boolean
}

interface VersionChange {
  type: 'added' | 'modified' | 'removed'
  description: string
  timestamp: Date
}

export function VersionHistory({
  versions,
  onVersionSelect,
  onVersionRestore,
  onVersionDownload,
  onVersionDelete,
  className
}: VersionHistoryProps) {
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState<string | null>(null)

  const sortedVersions = [...versions].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size'
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getRelativeTime = (date: Date) => {
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
    return date.toLocaleDateString()
  }

  const handleVersionAction = (version: ProjectVersion, action: string) => {
    switch (action) {
      case 'select':
        setSelectedVersion(version.id)
        onVersionSelect?.(version)
        break
      case 'restore':
        onVersionRestore?.(version)
        break
      case 'download':
        onVersionDownload?.(version)
        break
      case 'delete':
        onVersionDelete?.(version)
        break
    }
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
          <h3 className="text-xl font-bold text-white/90">Version History</h3>
          <p className="text-sm text-white/60 mt-1">
            {versions.length} version{versions.length !== 1 ? 's' : ''} • 
            {versions.filter(v => v.isActive).length} active
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <motion.button
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <GitBranch className="w-4 h-4 mr-2" />
            New Branch
          </motion.button>
        </div>
      </div>

      {/* Version List */}
      <div className="space-y-4">
        {sortedVersions.map((version, index) => (
          <motion.div
            key={version.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <EnhancedLiquidGlass
              variant="editor"
              intensity="medium"
              className={cn(
                "p-4 transition-all cursor-pointer",
                version.isActive && "ring-2 ring-blue-500/30",
                selectedVersion === version.id && "ring-2 ring-white/30"
              )}
              onClick={() => handleVersionAction(version, 'select')}
            >
              <div className="flex items-start gap-4">
                {/* Thumbnail */}
                <div className="flex-shrink-0">
                  <div className={cn(
                    "w-16 h-12 rounded-lg overflow-hidden bg-white/10 flex items-center justify-center",
                    version.isActive && "ring-2 ring-blue-400/50"
                  )}>
                    {version.thumbnail ? (
                      <img
                        src={version.thumbnail}
                        alt={version.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FileVideo className="w-6 h-6 text-white/60" />
                    )}
                  </div>
                </div>

                {/* Version Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-white/90 flex items-center gap-2">
                        {version.name}
                        {version.isActive && (
                          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                            Active
                          </span>
                        )}
                        {version.isStarred && (
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        )}
                      </h4>
                      {version.description && (
                        <p className="text-sm text-white/60 mt-1">
                          {version.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleVersionAction(version, 'download')
                        }}
                        className="p-1.5 text-white/60 hover:text-white transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Download className="w-4 h-4" />
                      </motion.button>
                      
                      {!version.isActive && (
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleVersionAction(version, 'restore')
                          }}
                          className="p-1.5 text-white/60 hover:text-white transition-colors"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Restore className="w-4 h-4" />
                        </motion.button>
                      )}
                      
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowDetails(showDetails === version.id ? null : version.id)
                        }}
                        className="p-1.5 text-white/60 hover:text-white transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>

                  {/* Version Metadata */}
                  <div className="flex items-center gap-4 text-xs text-white/50">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(version.duration)}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {version.createdBy || 'Unknown'}
                    </div>
                    
                    <div>
                      {getRelativeTime(version.createdAt)}
                    </div>
                    
                    {version.fileSize && (
                      <div>
                        {formatFileSize(version.fileSize)}
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  {version.tags && version.tags.length > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      {version.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-white/10 text-white/70 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              <AnimatePresence>
                {showDetails === version.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 pt-4 border-t border-white/10"
                  >
                    {/* Changes */}
                    {version.changes && version.changes.length > 0 && (
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-white/80 mb-2">Changes</h5>
                        <div className="space-y-1">
                          {version.changes.map((change, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                change.type === 'added' && "bg-green-400",
                                change.type === 'modified' && "bg-blue-400",
                                change.type === 'removed' && "bg-red-400"
                              )} />
                              <span className="text-white/60">{change.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleVersionAction(version, 'select')
                        }}
                        className="px-3 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 text-xs rounded-lg transition-all"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Preview
                      </motion.button>
                      
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation()
                          // Handle copy version
                        }}
                        className="px-3 py-1.5 bg-white/10 text-white/70 hover:bg-white/20 text-xs rounded-lg transition-all"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Duplicate
                      </motion.button>
                      
                      {!version.isActive && (
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleVersionAction(version, 'delete')
                          }}
                          className="px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs rounded-lg transition-all"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </EnhancedLiquidGlass>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {versions.length === 0 && (
        <div className="text-center py-12">
          <FileVideo className="w-12 h-12 text-white/30 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-white/60 mb-2">No versions yet</h4>
          <p className="text-sm text-white/40">
            Versions will appear here as you save your project
          </p>
        </div>
      )}
    </EnhancedLiquidGlass>
  )
}