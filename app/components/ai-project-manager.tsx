"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Folder,
  Clock,
  ArrowRight,
  CheckCircle,
  Loader2,
  AlertCircle,
  Home,
  ImageIcon,
  VideoIcon,
  FileText,
  Eye,
  Download,
  Trash2,
  MoreVertical,
  Calendar,
  User
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'

export interface AIProject {
  id: string
  name: string
  type: 'interior-design' | 'image-enhance' | 'video-edit' | 'content-creation'
  thumbnail: string
  createdAt: string
  updatedAt: string
  status: 'completed' | 'processing' | 'failed' | 'draft'
  progress?: number
  fileCount?: number
  fileSize?: string
  metadata?: {
    originalFiles?: string[]
    processedFiles?: string[]
    settings?: Record<string, any>
    processingTime?: number
  }
}

interface AIProjectManagerProps {
  maxRecentProjects?: number
  showCreateButton?: boolean
  onProjectClick?: (project: AIProject) => void
  onCreateProject?: (type: AIProject['type']) => void
  className?: string
}

// Mock projects data for demonstration
const generateMockProjects = (): AIProject[] => [
  {
    id: '1',
    name: 'Villa Munich Interior Design',
    type: 'interior-design',
    thumbnail: '/placeholder.jpg',
    createdAt: '2 hours ago',
    updatedAt: '2 hours ago',
    status: 'completed',
    fileCount: 5,
    fileSize: '12.3 MB',
    metadata: {
      originalFiles: ['living-room.jpg', 'bedroom.jpg'],
      processedFiles: ['living-room-modern.jpg', 'bedroom-scandinavian.jpg'],
      settings: { style: 'modern', roomType: 'living-room' },
      processingTime: 45000
    }
  },
  {
    id: '2',
    name: 'Property Promotional Video',
    type: 'video-edit',
    thumbnail: '/placeholder.jpg',
    createdAt: '1 day ago',
    updatedAt: '1 day ago',
    status: 'completed',
    fileCount: 3,
    fileSize: '256 MB',
    metadata: {
      originalFiles: ['property-tour.mp4'],
      processedFiles: ['property-tour-edited.mp4', 'social-clips.mp4'],
      settings: { duration: '60s', format: 'instagram-reel' },
      processingTime: 120000
    }
  },
  {
    id: '3',
    name: 'Apartment Photos Enhancement',
    type: 'image-enhance',
    thumbnail: '/placeholder.jpg',
    createdAt: '3 days ago',
    updatedAt: '3 days ago',
    status: 'completed',
    fileCount: 12,
    fileSize: '45.7 MB',
    metadata: {
      originalFiles: ['apt-1.jpg', 'apt-2.jpg', 'apt-3.jpg'],
      processedFiles: ['apt-1-enhanced.jpg', 'apt-2-enhanced.jpg'],
      settings: { enhancement: 'upscale-4x', format: 'jpg' },
      processingTime: 30000
    }
  },
  {
    id: '4',
    name: 'Social Media Content Package',
    type: 'content-creation',
    thumbnail: '/placeholder.jpg',
    createdAt: '5 days ago',
    updatedAt: '5 days ago',
    status: 'completed',
    fileCount: 8,
    fileSize: '2.1 MB',
    metadata: {
      settings: { platform: 'instagram', contentType: 'property-listing' },
      processingTime: 15000
    }
  },
  {
    id: '5',
    name: 'Office Space Design',
    type: 'interior-design',
    thumbnail: '/placeholder.jpg',
    createdAt: '1 week ago',
    updatedAt: '1 week ago',
    status: 'processing',
    progress: 65,
    fileCount: 2,
    fileSize: '8.9 MB'
  }
]

export function AIProjectManager({ 
  maxRecentProjects = 5,
  showCreateButton = true,
  onProjectClick,
  onCreateProject,
  className = ""
}: AIProjectManagerProps) {
  const { user } = useAuth()
  const [projects, setProjects] = useState<AIProject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate loading projects from API
    const loadProjects = async () => {
      setLoading(true)
      try {
        // In real implementation, this would be an API call
        const mockProjects = generateMockProjects()
        setProjects(mockProjects.slice(0, maxRecentProjects))
      } catch (error) {
        console.error('Error loading projects:', error)
        toast.error('Failed to load projects')
      } finally {
        setLoading(false)
      }
    }

    loadProjects()
  }, [maxRecentProjects])

  // Get project type icon
  const getProjectIcon = (type: AIProject['type']) => {
    switch (type) {
      case 'interior-design': return Home
      case 'image-enhance': return ImageIcon
      case 'video-edit': return VideoIcon
      case 'content-creation': return FileText
      default: return Folder
    }
  }

  // Get project type label
  const getProjectTypeLabel = (type: AIProject['type']) => {
    switch (type) {
      case 'interior-design': return 'Interior Design'
      case 'image-enhance': return 'Image Enhancement'
      case 'video-edit': return 'Video Editing'
      case 'content-creation': return 'Content Creation'
      default: return 'Unknown'
    }
  }

  // Get status color and icon
  const getStatusDisplay = (status: AIProject['status'], progress?: number) => {
    switch (status) {
      case 'completed':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          borderColor: 'border-green-200',
          label: 'Completed'
        }
      case 'processing':
        return {
          icon: Loader2,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          borderColor: 'border-blue-200',
          label: progress ? `${progress}%` : 'Processing'
        }
      case 'failed':
        return {
          icon: AlertCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          borderColor: 'border-red-200',
          label: 'Failed'
        }
      case 'draft':
        return {
          icon: Clock,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-200',
          label: 'Draft'
        }
      default:
        return {
          icon: Clock,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-200',
          label: 'Unknown'
        }
    }
  }

  // Handle project actions
  const handleDownloadProject = (project: AIProject, e: React.MouseEvent) => {
    e.stopPropagation()
    toast.success(`Downloading ${project.name}...`)
    // Implement download logic
  }

  const handleDeleteProject = (project: AIProject, e: React.MouseEvent) => {
    e.stopPropagation()
    setProjects(prev => prev.filter(p => p.id !== project.id))
    toast.success(`${project.name} deleted`)
  }

  const handleViewProject = (project: AIProject, e: React.MouseEvent) => {
    e.stopPropagation()
    onProjectClick?.(project)
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="h-5 bg-gray-200 rounded animate-pulse"></div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-teal-500" />
              <h3 className="text-lg font-semibold text-gray-900">Recent Projects</h3>
              <Badge variant="outline" className="text-xs">
                {projects.length}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {showCreateButton && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Folder className="w-4 h-4 mr-2" />
                      New Project
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onCreateProject?.('interior-design')}>
                      <Home className="w-4 h-4 mr-2" />
                      Interior Design
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onCreateProject?.('image-enhance')}>
                      <ImageIcon className="w-4 h-4 mr-2" />
                      Image Enhancement
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onCreateProject?.('video-edit')}>
                      <VideoIcon className="w-4 h-4 mr-2" />
                      Video Editing
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onCreateProject?.('content-creation')}>
                      <FileText className="w-4 h-4 mr-2" />
                      Content Creation
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button variant="ghost" size="sm">
                <Folder className="w-4 h-4 mr-2" />
                View All
              </Button>
            </div>
          </div>

          {/* Projects List */}
          {projects.length === 0 ? (
            <div className="text-center py-8">
              <Folder className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h4>
              <p className="text-gray-600 mb-4">Start creating with AI Studio tools</p>
              {showCreateButton && (
                <Button onClick={() => onCreateProject?.('interior-design')}>
                  Create First Project
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => {
                const ProjectIcon = getProjectIcon(project.type)
                const statusDisplay = getStatusDisplay(project.status, project.progress)
                const StatusIcon = statusDisplay.icon

                return (
                  <div 
                    key={project.id} 
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group"
                    onClick={() => onProjectClick?.(project)}
                  >
                    {/* Project Thumbnail */}
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                      {project.thumbnail ? (
                        <img
                          src={project.thumbnail}
                          alt={project.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ProjectIcon className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Project Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900 truncate">{project.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {getProjectTypeLabel(project.type)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {project.createdAt}
                        </span>
                        {project.fileCount && (
                          <span>{project.fileCount} files</span>
                        )}
                        {project.fileSize && (
                          <span>{project.fileSize}</span>
                        )}
                      </div>
                      
                      {/* Progress Bar for Processing */}
                      {project.status === 'processing' && project.progress && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${project.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Status & Actions */}
                    <div className="flex items-center gap-2">
                      {/* Status Badge */}
                      <Badge 
                        variant="outline" 
                        className={`${statusDisplay.bgColor} ${statusDisplay.borderColor} ${statusDisplay.color}`}
                      >
                        <StatusIcon className={`w-3 h-3 mr-1 ${
                          project.status === 'processing' ? 'animate-spin' : ''
                        }`} />
                        {statusDisplay.label}
                      </Badge>

                      {/* Actions Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => handleViewProject(project, e)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {project.status === 'completed' && (
                            <DropdownMenuItem onClick={(e) => handleDownloadProject(project, e)}>
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={(e) => handleDeleteProject(project, e)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Project Stats Component
interface ProjectStatsProps {
  projects: AIProject[]
  className?: string
}

export function ProjectStats({ projects, className = "" }: ProjectStatsProps) {
  const stats = {
    total: projects.length,
    completed: projects.filter(p => p.status === 'completed').length,
    processing: projects.filter(p => p.status === 'processing').length,
    failed: projects.filter(p => p.status === 'failed').length,
    types: {
      'interior-design': projects.filter(p => p.type === 'interior-design').length,
      'image-enhance': projects.filter(p => p.type === 'image-enhance').length,
      'video-edit': projects.filter(p => p.type === 'video-edit').length,
      'content-creation': projects.filter(p => p.type === 'content-creation').length,
    }
  }

  const statCards = [
    { label: 'Total Projects', value: stats.total, color: 'text-blue-600' },
    { label: 'Completed', value: stats.completed, color: 'text-green-600' },
    { label: 'Processing', value: stats.processing, color: 'text-orange-600' },
    { label: 'Failed', value: stats.failed, color: 'text-red-600' },
  ]

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
      {statCards.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-sm text-gray-600">{stat.label}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
} 