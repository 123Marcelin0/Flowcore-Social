"use client"

import React, { useState } from 'react'
import { WorkflowStepper, MilestoneCard, ProgressIndicator } from './index'
import type { MilestoneStep } from './index'

const DEMO_STEPS: MilestoneStep[] = [
  {
    id: 1,
    name: 'Project Setup',
    description: 'Define project type, platform, and basic settings',
    isRequired: true,
    isCompleted: true,
    isActive: false,
  },
  {
    id: 2,
    name: 'Media Upload',
    description: 'Upload and organize your content files',
    isRequired: true,
    isCompleted: true,
    isActive: false,
  },
  {
    id: 3,
    name: 'Template Selection',
    description: 'Choose from curated design templates',
    isRequired: false,
    isCompleted: false,
    isActive: true,
  },
  {
    id: 4,
    name: 'Content Editing',
    description: 'Arrange, edit, and enhance your content',
    isRequired: true,
    isCompleted: false,
    isActive: false,
  },
  {
    id: 5,
    name: 'Effects & Transitions',
    description: 'Apply visual effects and smooth transitions',
    isRequired: false,
    isCompleted: false,
    isActive: false,
  },
  {
    id: 6,
    name: 'Preview & Export',
    description: 'Final preview and export your creation',
    isRequired: true,
    isCompleted: false,
    isActive: false,
  },
]

export function MilestoneWorkflowDemo() {
  const [steps, setSteps] = useState(DEMO_STEPS)
  const [currentStep, setCurrentStep] = useState(3)

  const handleStepClick = (stepId: number) => {
    setCurrentStep(stepId)
    setSteps(prevSteps => 
      prevSteps.map(step => ({
        ...step,
        isActive: step.id === stepId
      }))
    )
  }

  const handleMilestoneComplete = (stepId: number) => {
    setSteps(prevSteps => 
      prevSteps.map(step => 
        step.id === stepId 
          ? { ...step, isCompleted: true, isActive: false }
          : step.id === stepId + 1
          ? { ...step, isActive: true }
          : step
      )
    )
    
    if (stepId < steps.length) {
      setCurrentStep(stepId + 1)
    }
  }

  const completedCount = steps.filter(step => step.isCompleted).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            AI Studio Editor - Milestone Workflow
          </h1>
          <p className="text-white/60 text-lg">
            Experience the new step-by-step content creation workflow
          </p>
        </div>

        {/* Progress Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <ProgressIndicator
            current={completedCount}
            total={steps.length}
            variant="circular"
            size="lg"
            showCelebration={true}
            onMilestoneComplete={(milestone) => console.log('Milestone completed:', milestone)}
          />
          
          <ProgressIndicator
            current={completedCount}
            total={steps.length}
            variant="linear"
            completedMilestones={steps.filter(s => s.isCompleted).map(s => s.id)}
            showMilestones={true}
          />
          
          <ProgressIndicator
            current={completedCount}
            total={steps.length}
            variant="stepped"
            showCelebration={true}
          />
        </div>

        {/* Workflow Stepper */}
        <WorkflowStepper
          steps={steps}
          currentStep={currentStep}
          onStepClick={handleStepClick}
          allowSkipping={false}
          showProgress={true}
          variant="horizontal"
        />

        {/* Milestone Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {steps.map((step) => (
            <MilestoneCard
              key={step.id}
              id={step.id}
              title={step.name}
              description={step.description}
              isCompleted={step.isCompleted}
              isActive={step.isActive}
              isLocked={step.id > currentStep + 1}
              isRequired={step.isRequired}
              estimatedTime={`${5 + step.id * 2} min`}
              difficulty={step.id <= 2 ? 'easy' : step.id <= 4 ? 'medium' : 'hard'}
              onActivate={() => handleStepClick(step.id)}
              onComplete={() => handleMilestoneComplete(step.id)}
            >
              {step.isActive && (
                <div className="space-y-3">
                  <p className="text-sm text-white/70">
                    This is where the step-specific interface would be rendered.
                  </p>
                  <div className="flex gap-2">
                    <div className="w-full h-2 bg-white/10 rounded-full">
                      <div className="w-3/4 h-full bg-gradient-to-r from-blue-400 to-purple-400 rounded-full" />
                    </div>
                    <span className="text-xs text-white/60 whitespace-nowrap">75%</span>
                  </div>
                </div>
              )}
            </MilestoneCard>
          ))}
        </div>

        {/* Demo Controls */}
        <div className="flex justify-center gap-4 mt-12">
          <button
            onClick={() => {
              const nextIncompleteStep = steps.find(step => !step.isCompleted)
              if (nextIncompleteStep) {
                handleMilestoneComplete(nextIncompleteStep.id)
              }
            }}
            className="px-6 py-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-xl text-white font-medium hover:from-blue-500/30 hover:to-purple-500/30 transition-all duration-300"
          >
            Complete Next Step
          </button>
          
          <button
            onClick={() => {
              setSteps(DEMO_STEPS)
              setCurrentStep(3)
            }}
            className="px-6 py-3 bg-gradient-to-r from-gray-500/20 to-gray-600/20 border border-gray-400/30 rounded-xl text-white font-medium hover:from-gray-500/30 hover:to-gray-600/30 transition-all duration-300"
          >
            Reset Demo
          </button>
        </div>
      </div>
    </div>
  )
}