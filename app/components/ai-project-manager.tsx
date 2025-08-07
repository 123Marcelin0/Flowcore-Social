1"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { 
  MoreHorizontal, 
  Play, 
  Pause, 
  Trash2, 
  Edit, 
  Eye,
  Plus,
  FolderOpen,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Types
export interface AIProject {
  id: string
  name: string
  description: string
  status: 'planning' | 'in-progress' | 'completed' | 'paused'
  progress: number
  createdAt: string
  updatedAt: string
  thumbnail?: string
  category: string
  priority: 'low' | 'medium' | 'high'
}

// Project Status Badge Component
interface ProjectStatusBadgeProps {
  status: AIProject['status']
}

const ProjectStatusBadge: React.FC<ProjectStatusBadgeProps> = ({ status }) => {
  const statusConfig = {
    planning: { label: 'Planning', className: 'bg-blue-100 text-blue-800', icon: Clock },
    'in-progress': { label: 'In Progress', className: 'bg-yellow-100 text-yellow-800', icon: Play },
    completed: { label: 'Completed', className: 'bg-green-100 text-green-800', icon: CheckCircle },
    paused: { label: 'Paused', className: 'bg-gray-100 text-gray-800', icon: Pause }
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <Badge className={cn('flex items-center gap-1', config.className)}>
      <Icon className="w-3 h-3" aria-hidden="true" />
      <span>{config.label}</span>
    </Badge>
  )
}

// Priority Badge Component
interface PriorityBadgeProps {
  priority: AIProject['priority']
}

const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
  const priorityConfig = {
    low: { label: 'Low', className: 'bg-gray-100 text-gray-800' },
    medium: { label: 'Medium', className: 'bg-orange-100 text-orange-800' },
    high: { label: 'High', className: 'bg-red-100 text-red-800' }
  }

  const config = priorityConfig[priority]

  return (
    <Badge className={cn('text-xs', config.className)}>
      {config.label}
    </Badge>
  )
}

// Project Card Component
interface ProjectCardProps {
  project: AIProject
  onEdit: (project: AIProject) => void
  onDelete: (projectId: string) => void
  onToggleStatus: (projectId: string) => void
  onView: (project: AIProject) => void
}

const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onEdit,
  onDelete,
  onToggleStatus,
  onView
}) => {
  const isCompleted = project.status === 'completed'
  const isPaused = project.status === 'paused'

  return (
    <Card className="group hover:shadow-lg transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold truncate" id={`project-title-${project.id}`}>
              {project.name}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {project.description}
            </p>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={`Open menu for project ${project.name}`}
                aria-describedby={`project-title-${project.id}`}
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" aria-label={`Actions for ${project.name}`}>
              <DropdownMenuItem onClick={() => onView(project)}>
                <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(project)}>
                <Edit className="mr-2 h-4 w-4" aria-hidden="true" />
                Edit Project
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onToggleStatus(project.id)}
                className={cn(isCompleted && "text-gray-500")}
              >
                {isCompleted ? (
                  <>
                    <Pause className="mr-2 h-4 w-4" aria-hidden="true" />
                    Mark Incomplete
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                    Mark Complete
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(project.id)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex items-center gap-2 mt-2">
          <ProjectStatusBadge status={project.status} />
          <PriorityBadge priority={project.priority} />
          <Badge variant="outline" className="text-xs">
            {project.category}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {project.thumbnail && (
          <div className="mb-4 relative aspect-video rounded-lg overflow-hidden bg-gray-100">
            <img
              src={project.thumbnail}
              alt={`Preview thumbnail for ${project.name} project`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}
        
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Progress</span>
            <span aria-label={`${project.progress}% complete`}>
              {project.progress}%
            </span>
          </div>
          
          <Progress 
            value={project.progress} 
            className="h-2"
            aria-label={`Project progress: ${project.progress}% complete`}
            aria-valuenow={project.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            role="progressbar"
          />
          
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Created: {new Date(project.createdAt).toLocaleDateString()}</span>
            <span>Updated: {new Date(project.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Project Header Component
interface ProjectHeaderProps {
  totalProjects: number
  completedProjects: number
  onCreateNew: () => void
  onFilterChange: (filter: string) => void
  currentFilter: string
}

const ProjectHeader: React.FC<ProjectHeaderProps> = ({
  totalProjects,
  completedProjects,
  onCreateNew,
  onFilterChange,
  currentFilter
}) => {
  const completionRate = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">AI Projects</h1>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span aria-label={`${totalProjects} total projects`}>
            {totalProjects} Projects
          </span>
          <span aria-label={`${completedProjects} completed projects`}>
            {completedProjects} Completed
          </span>
          <span aria-label={`${completionRate}% completion rate`}>
            {completionRate}% Complete
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" aria-label="Filter projects">
              <FolderOpen className="mr-2 h-4 w-4" aria-hidden="true" />
              {currentFilter === 'all' ? 'All Projects' : currentFilter}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent aria-label="Project filter options">
            <DropdownMenuItem onClick={() => onFilterChange('all')}>
              All Projects
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onFilterChange('planning')}>
              Planning
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onFilterChange('in-progress')}>
              In Progress
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onFilterChange('completed')}>
              Completed
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onFilterChange('paused')}>
              Paused
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Button onClick={onCreateNew} aria-label="Create new AI project">
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          New Project
        </Button>
      </div>
    </div>
  )
}

// Empty Projects State Component
interface EmptyProjectsStateProps {
  onCreateNew: () => void
}

const EmptyProjectsState: React.FC<EmptyProjectsStateProps> = ({ onCreateNew }) => {
  return (
    <div className="text-center py-12" role="status" aria-live="polite">
      <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <FolderOpen className="w-12 h-12 text-gray-400" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        No AI Projects Yet
      </h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        Start your first AI-powered project to streamline your content creation workflow.
      </p>
      <Button onClick={onCreateNew} aria-label="Create your first AI project">
        <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
        Create Your First Project
      </Button>
    </div>
  )
}

// Main AI Project Manager Component
interface AIProjectManagerProps {
  projects?: AIProject[]
  onProjectCreate?: (project: Omit<AIProject, 'id' | 'createdAt' | 'updatedAt'>) => void
  onProjectUpdate?: (project: AIProject) => void
  onProjectDelete?: (projectId: string) => void
  onProjectView?: (project: AIProject) => void
}

export const AIProjectManager: React.FC<AIProjectManagerProps> = ({
  projects = [],
  onProjectCreate,
  onProjectUpdate,
  onProjectDelete,
  onProjectView
}) => {
  const [filter, setFilter] = useState('all')
  const [isCreating, setIsCreating] = useState(false)

  const filteredProjects = projects.filter(project => {
    if (filter === 'all') return true
    return project.status === filter
  })

  const completedProjects = projects.filter(p => p.status === 'completed').length

  const handleCreateNew = () => {
    setIsCreating(true)
    // This would typically open a modal or navigate to a creation form
    console.log('Creating new project...')
  }

  const handleEdit = (project: AIProject) => {
    console.log('Editing project:', project.id)
    onProjectUpdate?.(project)
  }

  const handleDelete = (projectId: string) => {
    if (confirm('Are you sure you want to delete this project?')) {
      console.log('Deleting project:', projectId)
      onProjectDelete?.(projectId)
    }
  }

  const handleToggleStatus = (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (project) {
      const newStatus = project.status === 'completed' ? 'in-progress' : 'completed'
      onProjectUpdate?.({ ...project, status: newStatus })
    }
  }

  const handleView = (project: AIProject) => {
    console.log('Viewing project:', project.id)
    onProjectView?.(project)
  }

  return (
    <div className="space-y-6" role="main" aria-label="AI Project Manager">
      <ProjectHeader
        totalProjects={projects.length}
        completedProjects={completedProjects}
        onCreateNew={handleCreateNew}
        onFilterChange={setFilter}
        currentFilter={filter}
      />
      
      {filteredProjects.length === 0 ? (
        <EmptyProjectsState onCreateNew={handleCreateNew} />
      ) : (
        <div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          role="list"
          aria-label={`${filteredProjects} projects displayed`}
        >
          {filteredProjects.map((project) => (
            <div key={project.id} role="listitem">
              <ProjectCard
                project={project}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleStatus={handleToggleStatus}
                onView={handleView}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AIProjectManager 