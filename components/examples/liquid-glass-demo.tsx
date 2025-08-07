"use client"

import React, { useState } from 'react'
import { 
  EnhancedLiquidGlass, 
  LiquidPanel, 
  LiquidModal 
} from '@/components/ui/liquid-glass-system'
import { LiquidButton } from '@/components/ui/liquid-button'

export function LiquidGlassDemo() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <EnhancedLiquidGlass 
          variant="milestone" 
          intensity="premium" 
          animation="glow"
          className="p-8 text-center"
        >
          <h1 className="text-3xl font-bold text-white/90 mb-2">
            Enhanced Liquid Glass Design System
          </h1>
          <p className="text-white/60">
            Premium glassmorphism components with advanced animations
          </p>
        </EnhancedLiquidGlass>

        {/* Component Variants Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Milestone Variant */}
          <EnhancedLiquidGlass 
            variant="milestone" 
            intensity="premium" 
            animation="pulse"
            gradient
            className="p-6"
          >
            <h3 className="text-lg font-semibold text-white/90 mb-2">Milestone</h3>
            <p className="text-sm text-white/60">Premium variant with pulse animation</p>
          </EnhancedLiquidGlass>

          {/* Editor Variant */}
          <EnhancedLiquidGlass 
            variant="editor" 
            intensity="strong" 
            animation="hover"
            className="p-6"
          >
            <h3 className="text-lg font-semibold text-white/90 mb-2">Editor</h3>
            <p className="text-sm text-white/60">Strong intensity with hover effects</p>
          </EnhancedLiquidGlass>

          {/* Timeline Variant */}
          <EnhancedLiquidGlass 
            variant="timeline" 
            intensity="medium" 
            animation="hover"
            borderGlow
            className="p-6"
          >
            <h3 className="text-lg font-semibold text-white/90 mb-2">Timeline</h3>
            <p className="text-sm text-white/60">Medium intensity with border glow</p>
          </EnhancedLiquidGlass>

          {/* Modal Variant */}
          <EnhancedLiquidGlass 
            variant="modal" 
            intensity="premium" 
            animation="glow"
            gradient
            borderGlow
            className="p-6"
          >
            <h3 className="text-lg font-semibold text-white/90 mb-2">Modal</h3>
            <p className="text-sm text-white/60">Premium with all effects enabled</p>
          </EnhancedLiquidGlass>
        </div>

        {/* Liquid Panel Examples */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Default Panel */}
          <LiquidPanel
            title="Default Panel"
            subtitle="Standard panel with collapsible content"
            variant="default"
            collapsible
            headerActions={
              <LiquidButton size="sm" variant="ghost">
                Action
              </LiquidButton>
            }
          >
            <div className="space-y-4">
              <p className="text-white/70">
                This is a default liquid panel with premium glass morphism effects.
                It includes a collapsible header and smooth animations.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-lg">
                  <h4 className="text-white/80 font-medium">Feature 1</h4>
                  <p className="text-white/60 text-sm">Description here</p>
                </div>
                <div className="p-4 bg-white/5 rounded-lg">
                  <h4 className="text-white/80 font-medium">Feature 2</h4>
                  <p className="text-white/60 text-sm">Description here</p>
                </div>
              </div>
            </div>
          </LiquidPanel>

          {/* Elevated Panel */}
          <LiquidPanel
            title="Elevated Panel"
            subtitle="Enhanced panel with glow effects"
            variant="elevated"
            size="lg"
          >
            <div className="space-y-4">
              <p className="text-white/70">
                This is an elevated panel with enhanced visual effects including
                border glow and premium animations.
              </p>
              <LiquidButton 
                onClick={() => setIsModalOpen(true)}
                variant="primary"
                className="w-full"
              >
                Open Modal Demo
              </LiquidButton>
            </div>
          </LiquidPanel>
        </div>

        {/* Floating Panel */}
        <LiquidPanel
          title="Floating Panel"
          subtitle="Panel with gradient effects and pulse animation"
          variant="floating"
          size="full"
          className="text-center"
        >
          <div className="py-8">
            <p className="text-white/70 mb-6">
              This floating panel demonstrates the gradient overlay and pulse animation effects.
              Perfect for highlighting important content or call-to-action sections.
            </p>
            <div className="flex justify-center gap-4">
              <LiquidButton variant="primary">Primary Action</LiquidButton>
              <LiquidButton variant="secondary">Secondary Action</LiquidButton>
            </div>
          </div>
        </LiquidPanel>

        {/* Modal Demo */}
        <LiquidModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Premium Modal Demo"
          subtitle="Extraordinary clean liquid glass design"
          variant="premium"
          size="lg"
          headerActions={
            <LiquidButton size="sm" variant="ghost">
              Settings
            </LiquidButton>
          }
        >
          <div className="space-y-6">
            <p className="text-white/70">
              This modal demonstrates the premium liquid glass design with all effects enabled.
              It includes smooth animations, backdrop blur, and elegant transitions.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EnhancedLiquidGlass 
                variant="editor" 
                intensity="medium" 
                className="p-4"
              >
                <h4 className="text-white/80 font-medium mb-2">Quick Edit</h4>
                <p className="text-white/60 text-sm">
                  Make quick adjustments to your content with this inline editor.
                </p>
              </EnhancedLiquidGlass>
              
              <EnhancedLiquidGlass 
                variant="timeline" 
                intensity="medium" 
                className="p-4"
              >
                <h4 className="text-white/80 font-medium mb-2">Timeline View</h4>
                <p className="text-white/60 text-sm">
                  View your project timeline with smooth glass morphism effects.
                </p>
              </EnhancedLiquidGlass>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <LiquidButton 
                variant="ghost" 
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </LiquidButton>
              <LiquidButton 
                variant="primary"
                onClick={() => setIsModalOpen(false)}
              >
                Save Changes
              </LiquidButton>
            </div>
          </div>
        </LiquidModal>
      </div>
    </div>
  )
}