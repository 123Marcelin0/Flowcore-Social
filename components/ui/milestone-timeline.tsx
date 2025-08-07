"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { EnhancedLiquidGlass } from './enhanced-liquid-glass'
import { 
  CheckCircle2,
  Circle,
  Clock,
  Star,
  Calendar,
  User,
  Users,
  AlertCircle
} from 'lucide-react'

interface MilestoneTimelineProps {
  milestones: ProjectMilestone[]
  currentMilestone?: number
  onMilestoneClick?: (milestone: ProjectMilestone) => void
  showProgress?: boolean
  className?: string
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

export function MilestoneTimeline({
  milestones,
  currentMilestone,
  onMilestoneClick,
  showProgress = true,
  className
}: MilestoneTimelineProps) {
  const sortedMilestones = [...milestones].sort((a, b) => a.order - b.order)
  const completedCount = milestones.filter(m => m.completedAt).length
  const totalCount = milestones.length
  const progressPercentage = (completedCount / totalCount) * 100

  const getMilestoneStatus = (milestone: ProjectMilestone) => {
    if (milestone.completedAt) return 'completed'
    if (milestone.status) return milestone.status
    if (currentMilestone === milestone.order) return 'in-progress'
    if (currentMilestone && milestone.order < currentMilestone) return 'completed'
    return 'not-started'
  }

  const getStatusIcon = (status: string, isRequired: boolean) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-400" />
      case 'in-progress':
        return <Clock className="w-5 h-5 text-blue-400" />
      case 'blocked':
        return <AlertCircle className="w-5 h-5 text-red-400" />
      default:
        return isRequired ? (
          <Star className="w-5 h-5 text-yellow-400" />
        ) : (
          <Circle className="w-5 h-5 text-white/40" />
        )
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'border-green-500/30 bg-green-500/10'
      case 'in-progress': return 'border-blue-500/30 bg-blue-500/10'
      case 'blocked': return 'border-red-500/30 bg-red-500/10'
      default: return 'border-white/20 bg-white/5'
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
          <h3 className="text-xl font-bold text-white/90">Project Timeline</h3>
          <p className="text-sm text-white/60 mt-1">
            {completedCount} of {totalCount} milestones completed
          </p>
        </div>
        
        {showProgress && (
          <div className="text-right">
            <div className="text-2xl font-bold text-white/90">
              {Math.round(progressPercentage)}%
            </div>
            <div className="text-sm text-white/60">Complete</div>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {showProgress && (
        <div className="mb-8">
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-white/20" />
        
        {/* Milestones */}
        <div className="space-y-6">
          {sortedMilestones.map((milestone, index) => {
            const status = getMilestoneStatus(milestone)
            const isLast = index === sortedMilestones.length - 1
            
            return (
              <motion.div
                key={milestone.id}
                className="relative flex items-start gap-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {/* Timeline Node */}
                <div className="relative z-10 flex-shrink-0">
                  <motion.div
                    className={cn(
                      "w-12 h-12 rounded-full border-2 flex items-center justify-center",
                      getStatusColor(status)
                    )}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {getStatusIcon(status, milestone.isRequired)}
                  </motion.div>
                  
                  {/* Connection Line */}
                  {!isLast && (
                    <div className="absolute top-12 left-1/2 w-0.5 h-6 bg-white/10 transform -translate-x-1/2" />
                  )}
                </div>

                {/* Milestone Content */}
                <motion.div
                  className={cn(
                    "flex-1 p-4 rounded-lg border transition-all cursor-pointer",
                    getStatusColor(status),
                    "hover:bg-white/10"
                  )}
                  onClick={() => onMilestoneClick?.(milestone)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-white/90 flex items-center gap-2">
                        {milestone.name}
                        {milestone.isRequired && (
                          <Star className="w-3 h-3 text-yellow-400" />
                        )}
                      </h4>
                      {milestone.description && (
                        <p className="text-sm text-white/60 mt-1">
                          {milestone.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="text-xs text-white/50">
                      Step {milestone.order}
                    </div>
                  </div>

                  {/* Milestone Details */}
                  <div className="flex items-center gap-4 text-xs text-white/50">
                    {milestone.completedAt && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Completed {milestone.completedAt.toLocaleDateString()}
                      </div>
                    )}
                    
                    {milestone.estimatedDuration && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {milestone.estimatedDuration}h estimated
                      </div>
                    )}
                    
                    {milestone.assignedTo && (
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {milestone.assignedTo}
                      </div>
                    )}
                  </div>

                  {/* Dependencies */}
                  {milestone.dependencies && milestone.dependencies.length > 0 && (
                    <div className="mt-2 text-xs text-white/40">
                      Depends on: {milestone.dependencies.join(', ')}
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-8 pt-6 border-t border-white/10">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-green-400">
              {milestones.filter(m => m.completedAt).length}
            </div>
            <div className="text-xs text-white/60">Completed</div>
          </div>
          <div>
            <div className="text-lg font-bold text-blue-400">
              {milestones.filter(m => getMilestoneStatus(m) === 'in-progress').length}
            </div>
            <div className="text-xs text-white/60">In Progress</div>
          </div>
          <div>
            <div className="text-lg font-bold text-white/60">
              {milestones.filter(m => getMilestoneStatus(m) === 'not-started').length}
            </div>
            <div className="text-xs text-white/60">Remaining</div>
          </div>
        </div>
      </div>
    </EnhancedLiquidGlass>
  )
}