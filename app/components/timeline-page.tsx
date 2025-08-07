"use client"

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { EnhancedLiquidGlass } from '../../components/ui/enhanced-liquid-glass'
import { LiquidTimeline, TimelineTrack, TimelineClip } from '../../components/ui/liquid-timeline'
import { SharedNavigation } from '../../components/ui/shared-navigation'
import { SharedLayout, PageTransition, ViewTransition } from '../../components/ui/shared-layout'
import { MilestoneTimeline } from '../../components/ui/milestone-timeline'
import { VersionHistory } from '../../components/ui/version-history'
import { CollaborationIndicators } from '../../components/ui/collaboration-indicators'
import { ExportHistory } from '../../components/ui/export-history'
import { 
  Clock,
  Users,
  History,
  FileVideo,
  Plus,
  Filter,
  Search,
  Grid3X3,
  List,
  Calendar,
  Bookmark,
  Star,
  Eye,
  MoreHorizontal,
  Download
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Project {
  id: string
  name: string
  duration: number
  createdAt: Date
  updatedAt: Date
  status: 'draft' | 'in-progress' | 'completed' | 'exported'
  thumbnail?: string
  tracks: TimelineTrack[]
  milestones: ProjectMilestone[]
  versions: ProjectVersion[]
  exports: ProjectExport[]
  collaborators: Collaborator[]
}

interface ProjectMilestone {
  id: string
  name: string
  description?: string
  completedAt?: Date
  isRequired: boolean
  order: number
  estimatedDuration?: number
  actualDuration?: number
  assignedTo?: string
  dependencies?: string[]
  status?: 'not-started' | 'in-progress' | 'completed' | 'blocked'
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

interface Collaborator {
  id: string
  name: string
  email: string
  avatar?: string
  role: 'owner' | 'editor' | 'viewer'
  status: 'online' | 'away' | 'offline'
  lastSeen?: Date
  currentActivity?: {
    type: 'viewing' | 'editing' | 'commenting'
    location: string
    timestamp: Date
  }
  cursor?: {
    x: number
    y: number
    color: string
  }
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
  settings?: any
  error?: string
  estimatedTime?: number
  actualTime?: number
}

// Sample data for demonstration
const sampleProject: Project = {
  id: 'project-1',
  name: 'Summer Campaign Video',
  duration: 45,
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-20'),
  status: 'in-progress',
  thumbnail: '/placeholder.jpg',
  tracks: [
    {
      id: 'video-1',
      name: 'Main Video',
      type: 'video',
      height: 80,
      visible: true,
      volume: 100,
      clips: [
        {
          id: 'clip-1',
          type: 'video',
          name: 'Intro Scene',
          startTime: 0,
          duration: 8,
          trackId: 'video-1',
          thumbnailUrl: '/placeholder.jpg',
          color: '#3b82f6'
        },
        {
          id: 'clip-2',
          type: 'video',
          name: 'Main Content',
          startTime: 10,
          duration: 25,
          trackId: 'video-1',
          thumbnailUrl: '/placeholder.jpg',
          color: '#3b82f6'
        }
      ]
    },
    {
      id: 'audio-1',
      name: 'Background Music',
      type: 'audio',
      height: 60,
      visible: true,
      volume: 75,
      clips: [
        {
          id: 'clip-3',
          type: 'audio',
          name: 'Background Track',
          startTime: 0,
          duration: 45,
          trackId: 'audio-1',
          color: '#10b981'
        }
      ]
    }
  ],
  milestones: [
    { 
      id: 'm1', 
      name: 'Project Setup', 
      description: 'Define project type, platform, and basic settings',
      completedAt: new Date('2024-01-15'), 
      isRequired: true, 
      order: 1,
      estimatedDuration: 2,
      actualDuration: 1.5,
      assignedTo: 'John Doe'
    },
    { 
      id: 'm2', 
      name: 'Media Upload', 
      description: 'Upload and organize content files',
      completedAt: new Date('2024-01-16'), 
      isRequired: true, 
      order: 2,
      estimatedDuration: 3,
      actualDuration: 2.5,
      assignedTo: 'John Doe'
    },
    { 
      id: 'm3', 
      name: 'Template Selection', 
      description: 'Choose from curated design templates',
      completedAt: new Date('2024-01-17'), 
      isRequired: true, 
      order: 3,
      estimatedDuration: 1,
      actualDuration: 0.5,
      assignedTo: 'Jane Smith'
    },
    { 
      id: 'm4', 
      name: 'Content Editing', 
      description: 'Arrange, edit, and enhance content',
      isRequired: true, 
      order: 4,
      estimatedDuration: 8,
      assignedTo: 'John Doe',
      status: 'in-progress'
    },
    { 
      id: 'm5', 
      name: 'Effects & Transitions', 
      description: 'Apply visual effects and transitions',
      isRequired: false, 
      order: 5,
      estimatedDuration: 4,
      dependencies: ['Content Editing']
    },
    { 
      id: 'm6', 
      name: 'Audio & Music', 
      description: 'Add background music and audio effects',
      isRequired: false, 
      order: 6,
      estimatedDuration: 2,
      dependencies: ['Content Editing']
    },
    { 
      id: 'm7', 
      name: 'Preview & Review', 
      description: 'Final preview with quick-edit capabilities',
      isRequired: true, 
      order: 7,
      estimatedDuration: 2,
      dependencies: ['Content Editing']
    },
    { 
      id: 'm8', 
      name: 'Export & Share', 
      description: 'Render and export final video',
      isRequired: true, 
      order: 8,
      estimatedDuration: 1,
      dependencies: ['Preview & Review']
    }
  ],
  versions: [
    { 
      id: 'v1', 
      name: 'Initial Draft', 
      description: 'First version with basic content',
      createdAt: new Date('2024-01-15'), 
      createdBy: 'John Doe',
      duration: 30, 
      isActive: false,
      fileSize: 85000000,
      tags: ['draft', 'initial'],
      changes: [
        { type: 'added', description: 'Added intro scene', timestamp: new Date('2024-01-15') },
        { type: 'added', description: 'Added main content', timestamp: new Date('2024-01-15') }
      ]
    },
    { 
      id: 'v2', 
      name: 'With Music', 
      description: 'Added background music and audio effects',
      createdAt: new Date('2024-01-18'), 
      createdBy: 'Jane Smith',
      duration: 42, 
      isActive: false,
      fileSize: 125000000,
      tags: ['music', 'audio'],
      changes: [
        { type: 'added', description: 'Added background music track', timestamp: new Date('2024-01-18') },
        { type: 'modified', description: 'Adjusted audio levels', timestamp: new Date('2024-01-18') }
      ]
    },
    { 
      id: 'v3', 
      name: 'Final Edit', 
      description: 'Final version with all edits and effects',
      createdAt: new Date('2024-01-20'), 
      createdBy: 'John Doe',
      duration: 45, 
      isActive: true,
      fileSize: 145000000,
      tags: ['final', 'complete'],
      isStarred: true,
      changes: [
        { type: 'added', description: 'Added transitions', timestamp: new Date('2024-01-20') },
        { type: 'modified', description: 'Color correction', timestamp: new Date('2024-01-20') },
        { type: 'added', description: 'Final audio mix', timestamp: new Date('2024-01-20') }
      ]
    }
  ],
  exports: [
    { 
      id: 'e1', 
      name: 'HD Export', 
      description: 'High definition export for web sharing',
      format: 'MP4', 
      quality: '1080p', 
      createdAt: new Date('2024-01-19'), 
      completedAt: new Date('2024-01-19'),
      status: 'completed',
      downloadUrl: '#',
      shareUrl: '#',
      fileSize: 125000000,
      duration: 45,
      settings: {
        bitrate: 5000,
        framerate: 30,
        codec: 'H.264',
        resolution: '1920x1080'
      }
    },
    { 
      id: 'e2', 
      name: '4K Export', 
      description: 'Ultra high definition export',
      format: 'MP4', 
      quality: '4K', 
      createdAt: new Date('2024-01-20'), 
      status: 'processing',
      progress: 65,
      estimatedTime: 600,
      actualTime: 390,
      settings: {
        bitrate: 15000,
        framerate: 30,
        codec: 'H.265',
        resolution: '3840x2160'
      }
    },
    { 
      id: 'e3', 
      name: 'Social Media GIF', 
      description: 'Animated GIF for social media',
      format: 'GIF', 
      quality: '720p', 
      createdAt: new Date('2024-01-18'), 
      status: 'failed',
      error: 'File size exceeded limit for GIF format',
      settings: {
        framerate: 15,
        resolution: '1280x720'
      }
    }
  ],
  collaborators: [
    {
      id: 'u1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'owner',
      status: 'online',
      currentActivity: {
        type: 'editing',
        location: 'Timeline Editor',
        timestamp: new Date()
      },
      cursor: {
        x: 500,
        y: 300,
        color: '#3b82f6'
      }
    },
    {
      id: 'u2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'editor',
      status: 'online',
      currentActivity: {
        type: 'viewing',
        location: 'Version History',
        timestamp: new Date(Date.now() - 120000)
      }
    },
    {
      id: 'u3',
      name: 'Mike Johnson',
      email: 'mike@example.com',
      role: 'viewer',
      status: 'away',
      lastSeen: new Date(Date.now() - 1800000)
    }
  ]
}

export function TimelinePage() {
  const router = useRouter()
  const [project, setProject] = useState<Project>(sampleProject)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [viewMode, setViewMode] = useState<'timeline' | 'milestones' | 'versions' | 'exports'>('timeline')
  const [showProjectInfo, setShowProjectInfo] = useState(true)

  // Timeline handlers
  const handleClipMove = (clipId: string, newStartTime: number, newTrackId: string) => {
    setProject(prev => ({
      ...prev,
      tracks: prev.tracks.map(track => ({
        ...track,
        clips: track.clips.map(clip => 
          clip.id === clipId 
            ? { ...clip, startTime: newStartTime, trackId: newTrackId }
            : clip
        ).filter(clip => clip.trackId === track.id)
      })).map(track => 
        track.id === newTrackId 
          ? {
              ...track,
              clips: [
                ...track.clips,
                ...prev.tracks.flatMap(t => t.clips).find(c => c.id === clipId && c.trackId !== newTrackId) 
                  ? [{ ...prev.tracks.flatMap(t => t.clips).find(c => c.id === clipId)!, trackId: newTrackId }]
                  : []
              ]
            }
          : track
      )
    }))
  }

  const handleClipResize = (clipId: string, newDuration: number, resizeType: 'start' | 'end') => {
    setProject(prev => ({
      ...prev,
      tracks: prev.tracks.map(track => ({
        ...track,
        clips: track.clips.map(clip =>
          clip.id === clipId ? { ...clip, duration: Math.max(0.1, newDuration) } : clip
        )
      }))
    }))
  }

  const handleClipSplit = (clipId: string, splitTime: number) => {
    setProject(prev => ({
      ...prev,
      tracks: prev.tracks.map(track => ({
        ...track,
        clips: track.clips.flatMap(clip => {
          if (clip.id !== clipId) return [clip]
          
          const splitPoint = splitTime - clip.startTime
          if (splitPoint <= 0.1 || splitPoint >= clip.duration - 0.1) return [clip]
          
          return [
            {
              ...clip,
              id: `${clip.id}-part1`,
              duration: splitPoint,
              name: `${clip.name} (1)`
            },
            {
              ...clip,
              id: `${clip.id}-part2`,
              startTime: splitTime,
              duration: clip.duration - splitPoint,
              name: `${clip.name} (2)`
            }
          ]
        })
      }))
    }))
  }

  const handleClipMerge = (clipId: string, targetClipId: string) => {
    console.log('Merge clips:', clipId, targetClipId)
  }

  const handleClipUpdate = (clipId: string, updates: Partial<TimelineClip>) => {
    setProject(prev => ({
      ...prev,
      tracks: prev.tracks.map(track => ({
        ...track,
        clips: track.clips.map(clip =>
          clip.id === clipId ? { ...clip, ...updates } : clip
        )
      }))
    }))
  }

  const handleTrackAdd = (type: TimelineTrack['type']) => {
    const newTrack: TimelineTrack = {
      id: `${type}-${Date.now()}`,
      name: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Track`,
      type,
      height: type === 'video' ? 80 : type === 'audio' ? 60 : 50,
      visible: true,
      volume: type === 'audio' ? 100 : undefined,
      clips: []
    }
    setProject(prev => ({
      ...prev,
      tracks: [...prev.tracks, newTrack]
    }))
  }

  const handleTrackRemove = (trackId: string) => {
    setProject(prev => ({
      ...prev,
      tracks: prev.tracks.filter(track => track.id !== trackId)
    }))
  }

  const handleTrackReorder = (fromIndex: number, toIndex: number) => {
    setProject(prev => {
      const newTracks = [...prev.tracks]
      const [movedTrack] = newTracks.splice(fromIndex, 1)
      newTracks.splice(toIndex, 0, movedTrack)
      return { ...prev, tracks: newTracks }
    })
  }

  const handleTrackUpdate = (trackId: string, updates: Partial<TimelineTrack>) => {
    setProject(prev => ({
      ...prev,
      tracks: prev.tracks.map(track =>
        track.id === trackId ? { ...track, ...updates } : track
      )
    }))
  }

  const handleTrackDuplicate = (trackId: string) => {
    const trackToDuplicate = project.tracks.find(t => t.id === trackId)
    if (trackToDuplicate) {
      const newTrack: TimelineTrack = {
        ...trackToDuplicate,
        id: `${trackToDuplicate.type}-${Date.now()}`,
        name: `${trackToDuplicate.name} Copy`,
        clips: trackToDuplicate.clips.map(clip => ({
          ...clip,
          id: `${clip.id}-copy-${Date.now()}`,
          trackId: `${trackToDuplicate.type}-${Date.now()}`
        }))
      }
      setProject(prev => ({
        ...prev,
        tracks: [...prev.tracks, newTrack]
      }))
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400'
      case 'in-progress': case 'processing': return 'text-blue-400'
      case 'draft': return 'text-yellow-400'
      case 'failed': return 'text-red-400'
      default: return 'text-white/60'
    }
  }

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20'
      case 'in-progress': case 'processing': return 'bg-blue-500/20'
      case 'draft': return 'bg-yellow-500/20'
      case 'failed': return 'bg-red-500/20'
      default: return 'bg-white/10'
    }
  }

  return (
    <SharedLayout variant="timeline">
      <PageTransition className="p-6 space-y-6">
        {/* Header */}
        <SharedNavigation
          title={project.name}
          subtitle={
            <div className="flex items-center gap-4 text-sm text-white/60">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatTime(project.duration)}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Updated {project.updatedAt.toLocaleDateString()}
              </span>
              <span className={cn(
                "px-2 py-1 rounded-full text-xs font-medium",
                getStatusBg(project.status),
                getStatusColor(project.status)
              )}>
                {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
              </span>
            </div>
          }
          onBack={() => router.back()}
          onSave={() => console.log('Save project')}
          onShare={() => console.log('Share project')}
          onExport={() => console.log('Export project')}
          onSettings={() => console.log('Open settings')}
          isPlaying={isPlaying}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onReset={() => setCurrentTime(0)}
          currentTime={currentTime}
          duration={project.duration}
          customActions={
            <div className="flex items-center bg-white/10 rounded-lg p-1">
              {[
                { key: 'timeline', icon: Grid3X3, label: 'Timeline' },
                { key: 'milestones', icon: Bookmark, label: 'Milestones' },
                { key: 'versions', icon: History, label: 'Versions' },
                { key: 'exports', icon: Download, label: 'Exports' }
              ].map(({ key, icon: Icon, label }) => (
                <motion.button
                  key={key}
                  onClick={() => setViewMode(key as any)}
                  className={cn(
                    "px-3 py-2 rounded-md text-sm font-medium transition-all",
                    viewMode === key
                      ? "bg-white/20 text-white"
                      : "text-white/60 hover:text-white/80"
                  )}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title={label}
                >
                  <Icon className="w-4 h-4" />
                </motion.button>
              ))}
            </div>
          }
        />

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Timeline/Content Area */}
          <div className="xl:col-span-3 space-y-6">
            <ViewTransition isVisible={viewMode === 'timeline'}>
              <LiquidTimeline
                tracks={project.tracks}
                duration={project.duration}
                currentTime={currentTime}
                zoom={zoom}
                onTimeChange={setCurrentTime}
                onZoomChange={setZoom}
                onClipMove={handleClipMove}
                onClipResize={handleClipResize}
                onClipSplit={handleClipSplit}
                onClipMerge={handleClipMerge}
                onClipUpdate={handleClipUpdate}
                onTrackAdd={handleTrackAdd}
                onTrackRemove={handleTrackRemove}
                onTrackReorder={handleTrackReorder}
                onTrackUpdate={handleTrackUpdate}
                onTrackDuplicate={handleTrackDuplicate}
                height={600}
                showWaveforms={true}
                snapToGrid={true}
                gridSize={0.5}
              />
            </ViewTransition>

            {/* Milestones View */}
            <ViewTransition isVisible={viewMode === 'milestones'}>
              <MilestoneTimeline
                milestones={project.milestones}
                currentMilestone={4}
                onMilestoneClick={(milestone) => console.log('Milestone clicked:', milestone)}
                showProgress={true}
              />
            </ViewTransition>

            {/* Versions View */}
            <ViewTransition isVisible={viewMode === 'versions'}>
              <VersionHistory
                versions={project.versions}
                onVersionSelect={(version) => console.log('Version selected:', version)}
                onVersionRestore={(version) => console.log('Version restore:', version)}
                onVersionDownload={(version) => console.log('Version download:', version)}
                onVersionDelete={(version) => console.log('Version delete:', version)}
              />
            </ViewTransition>

            {/* Exports View */}
            <ViewTransition isVisible={viewMode === 'exports'}>
              <ExportHistory
                exports={project.exports}
                onExportDownload={(exportItem) => window.open(exportItem.downloadUrl, '_blank')}
                onExportDelete={(exportItem) => console.log('Export delete:', exportItem)}
                onExportShare={(exportItem) => console.log('Export share:', exportItem)}
                onExportRetry={(exportItem) => console.log('Export retry:', exportItem)}
                onNewExport={() => console.log('New export')}
              />
            </ViewTransition>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Collaboration Indicators */}
            <CollaborationIndicators
              collaborators={project.collaborators}
              currentUser="u1"
              isOnline={true}
              onInviteUser={() => console.log('Invite user')}
              onManagePermissions={() => console.log('Manage permissions')}
            />

            {/* Project Info */}
            {showProjectInfo && (
              <SharedCard variant="default" padding="md">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white/90">Project Info</h3>
                  <SharedIconButton
                    icon={<MoreHorizontal className="w-4 h-4" />}
                    onClick={() => setShowProjectInfo(false)}
                    variant="default"
                    size="sm"
                  />
                </div>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/60">Duration:</span>
                    <span className="text-white/90">{formatTime(project.duration)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Tracks:</span>
                    <span className="text-white/90">{project.tracks.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Clips:</span>
                    <span className="text-white/90">
                      {project.tracks.reduce((sum, track) => sum + track.clips.length, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Created:</span>
                    <span className="text-white/90">{project.createdAt.toLocaleDateString()}</span>
                  </div>
                </div>
              </SharedCard>
            )}

            {/* Milestones */}
            <SharedCard variant="default" padding="md">
              <h3 className="text-lg font-semibold text-white/90 mb-4">Milestones</h3>
              <div className="space-y-2">
                {project.milestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg transition-colors",
                      milestone.completedAt 
                        ? "bg-green-500/10 border border-green-500/20" 
                        : "bg-white/5 border border-white/10"
                    )}
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      milestone.completedAt ? "bg-green-400" : "bg-white/30"
                    )} />
                    <span className={cn(
                      "text-sm flex-1",
                      milestone.completedAt ? "text-white/90" : "text-white/60"
                    )}>
                      {milestone.name}
                    </span>
                    {milestone.isRequired && (
                      <Star className="w-3 h-3 text-yellow-400" />
                    )}
                  </div>
                ))}
              </div>
            </SharedCard>

            {/* Versions */}
            <SharedCard variant="default" padding="md">
              <h3 className="text-lg font-semibold text-white/90 mb-4">Versions</h3>
              <div className="space-y-2">
                {project.versions.map((version) => (
                  <div
                    key={version.id}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg transition-colors cursor-pointer",
                      version.isActive 
                        ? "bg-blue-500/10 border border-blue-500/20" 
                        : "bg-white/5 border border-white/10 hover:bg-white/10"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-6 rounded bg-white/10 flex items-center justify-center",
                      version.isActive && "bg-blue-500/20"
                    )}>
                      <FileVideo className="w-3 h-3 text-white/60" />
                    </div>
                    <div className="flex-1">
                      <div className={cn(
                        "text-sm font-medium",
                        version.isActive ? "text-white/90" : "text-white/70"
                      )}>
                        {version.name}
                      </div>
                      <div className="text-xs text-white/50">
                        {formatTime(version.duration)} • {version.createdAt.toLocaleDateString()}
                      </div>
                    </div>
                    {version.isActive && (
                      <Eye className="w-4 h-4 text-blue-400" />
                    )}
                  </div>
                ))}
              </div>
            </SharedCard>

            {/* Exports */}
            <SharedCard variant="default" padding="md">
              <h3 className="text-lg font-semibold text-white/90 mb-4">Export History</h3>
              <div className="space-y-2">
                {project.exports.map((exportItem) => (
                  <div
                    key={exportItem.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/10"
                  >
                    <div className={cn(
                      "w-8 h-6 rounded flex items-center justify-center",
                      getStatusBg(exportItem.status)
                    )}>
                      <Download className="w-3 h-3 text-white/60" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white/90">
                        {exportItem.name}
                      </div>
                      <div className="text-xs text-white/50">
                        {exportItem.format} • {exportItem.quality}
                        {exportItem.fileSize && ` • ${formatFileSize(exportItem.fileSize)}`}
                      </div>
                    </div>
                    <SharedStatusBadge 
                      status={exportItem.status as any}
                      size="sm"
                    />
                  </div>
                ))}
              </div>
            </SharedCard>
          </div>
        </div>
      </PageTransition>
    </SharedLayout>
  )
}