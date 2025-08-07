"use client"

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { EnhancedLiquidGlass } from './enhanced-liquid-glass'
import { 
  Users,
  User,
  Eye,
  Edit3,
  MessageCircle,
  Wifi,
  WifiOff,
  Clock,
  Activity,
  UserPlus,
  Settings
} from 'lucide-react'
import { Cursor } from 'lucide-react'

interface CollaborationIndicatorsProps {
  collaborators: Collaborator[]
  currentUser?: string
  isOnline?: boolean
  onInviteUser?: () => void
  onManagePermissions?: () => void
  className?: string
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

const ROLE_COLORS = {
  owner: 'text-purple-400 bg-purple-500/20',
  editor: 'text-blue-400 bg-blue-500/20',
  viewer: 'text-green-400 bg-green-500/20'
}

const STATUS_COLORS = {
  online: 'bg-green-400',
  away: 'bg-yellow-400',
  offline: 'bg-gray-400'
}

const ACTIVITY_ICONS = {
  viewing: Eye,
  editing: Edit3,
  commenting: MessageCircle
}

export function CollaborationIndicators({
  collaborators,
  currentUser,
  isOnline = true,
  onInviteUser,
  onManagePermissions,
  className
}: CollaborationIndicatorsProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [recentActivity, setRecentActivity] = useState<any[]>([])

  const onlineCollaborators = collaborators.filter(c => c.status === 'online')
  const activeCollaborators = collaborators.filter(c => 
    c.currentActivity && 
    new Date().getTime() - c.currentActivity.timestamp.getTime() < 300000 // 5 minutes
  )

  const getRelativeTime = (date: Date) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return date.toLocaleDateString()
  }

  // Simulate real-time activity updates
  useEffect(() => {
    const interval = setInterval(() => {
      const activities = activeCollaborators.map(collaborator => ({
        id: Math.random().toString(),
        collaborator,
        timestamp: new Date(),
        action: `${collaborator.currentActivity?.type} ${collaborator.currentActivity?.location}`
      }))
      
      setRecentActivity(prev => [...activities, ...prev].slice(0, 10))
    }, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [activeCollaborators])

  return (
    <div className={cn("space-y-4", className)}>
      {/* Connection Status */}
      <EnhancedLiquidGlass
        variant="editor"
        intensity="medium"
        className="p-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="w-4 h-4 text-green-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-400" />
              )}
              <span className="text-sm text-white/80">
                {isOnline ? 'Connected' : 'Offline'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-white/60" />
              <span className="text-sm text-white/60">
                {onlineCollaborators.length} online
              </span>
            </div>
          </div>

          <motion.button
            onClick={() => setShowDetails(!showDetails)}
            className="p-1.5 text-white/60 hover:text-white transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Activity className="w-4 h-4" />
          </motion.button>
        </div>
      </EnhancedLiquidGlass>

      {/* Active Collaborators */}
      <EnhancedLiquidGlass
        variant="editor"
        intensity="medium"
        className="p-4"
      >
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-white/90">Active Now</h4>
          <div className="flex items-center gap-2">
            {onInviteUser && (
              <motion.button
                onClick={onInviteUser}
                className="p-1.5 text-white/60 hover:text-white transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title="Invite collaborator"
              >
                <UserPlus className="w-4 h-4" />
              </motion.button>
            )}
            {onManagePermissions && (
              <motion.button
                onClick={onManagePermissions}
                className="p-1.5 text-white/60 hover:text-white transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title="Manage permissions"
              >
                <Settings className="w-4 h-4" />
              </motion.button>
            )}
          </div>
        </div>

        {/* Collaborator Avatars */}
        <div className="flex items-center gap-2 mb-4">
          {onlineCollaborators.slice(0, 5).map((collaborator) => (
            <motion.div
              key={collaborator.id}
              className="relative"
              whileHover={{ scale: 1.1 }}
              title={`${collaborator.name} (${collaborator.role})`}
            >
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                {collaborator.avatar ? (
                  <img
                    src={collaborator.avatar}
                    alt={collaborator.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-4 h-4 text-white/60" />
                )}
              </div>
              
              {/* Status Indicator */}
              <div className={cn(
                "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-800",
                STATUS_COLORS[collaborator.status]
              )} />
              
              {/* Activity Indicator */}
              {collaborator.currentActivity && (
                <motion.div
                  className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {React.createElement(ACTIVITY_ICONS[collaborator.currentActivity.type], {
                    className: "w-2 h-2 text-white"
                  })}
                </motion.div>
              )}
            </motion.div>
          ))}
          
          {onlineCollaborators.length > 5 && (
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/60">
              +{onlineCollaborators.length - 5}
            </div>
          )}
        </div>

        {/* Current Activities */}
        {activeCollaborators.length > 0 && (
          <div className="space-y-2">
            {activeCollaborators.slice(0, 3).map((collaborator) => (
              <motion.div
                key={collaborator.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-white/5"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                  {collaborator.avatar ? (
                    <img
                      src={collaborator.avatar}
                      alt={collaborator.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-3 h-3 text-white/60" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white/80 truncate">
                      {collaborator.name}
                    </span>
                    <span className={cn(
                      "px-1.5 py-0.5 text-xs rounded-full",
                      ROLE_COLORS[collaborator.role]
                    )}>
                      {collaborator.role}
                    </span>
                  </div>
                  
                  {collaborator.currentActivity && (
                    <div className="flex items-center gap-1 text-xs text-white/50">
                      {React.createElement(ACTIVITY_ICONS[collaborator.currentActivity.type], {
                        className: "w-3 h-3"
                      })}
                      <span>
                        {collaborator.currentActivity.type} {collaborator.currentActivity.location}
                      </span>
                      <span>•</span>
                      <span>{getRelativeTime(collaborator.currentActivity.timestamp)}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {activeCollaborators.length === 0 && (
          <div className="text-center py-4">
            <Users className="w-8 h-8 text-white/30 mx-auto mb-2" />
            <p className="text-sm text-white/50">No active collaborators</p>
          </div>
        )}
      </EnhancedLiquidGlass>

      {/* Detailed Activity Panel */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <EnhancedLiquidGlass
              variant="editor"
              intensity="medium"
              className="p-4"
            >
              <h4 className="text-sm font-medium text-white/90 mb-4">Recent Activity</h4>
              
              {recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center gap-3 text-sm"
                    >
                      <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                        <User className="w-3 h-3 text-white/60" />
                      </div>
                      <div className="flex-1">
                        <span className="text-white/80">
                          {activity.collaborator.name}
                        </span>
                        <span className="text-white/50 ml-2">
                          {activity.action}
                        </span>
                      </div>
                      <span className="text-xs text-white/40">
                        {getRelativeTime(activity.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Clock className="w-8 h-8 text-white/30 mx-auto mb-2" />
                  <p className="text-sm text-white/50">No recent activity</p>
                </div>
              )}
            </EnhancedLiquidGlass>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Cursors */}
      {collaborators
        .filter(c => c.cursor && c.status === 'online' && c.id !== currentUser)
        .map((collaborator) => (
          <motion.div
            key={`cursor-${collaborator.id}`}
            className="fixed pointer-events-none z-50"
            style={{
              left: collaborator.cursor!.x,
              top: collaborator.cursor!.y,
            }}
            animate={{
              x: collaborator.cursor!.x,
              y: collaborator.cursor!.y,
            }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            <Cursor 
              className="w-4 h-4" 
              style={{ color: collaborator.cursor!.color }}
            />
            <div 
              className="absolute top-4 left-2 px-2 py-1 rounded text-xs text-white whitespace-nowrap"
              style={{ backgroundColor: collaborator.cursor!.color }}
            >
              {collaborator.name}
            </div>
          </motion.div>
        ))}
    </div>
  )
}