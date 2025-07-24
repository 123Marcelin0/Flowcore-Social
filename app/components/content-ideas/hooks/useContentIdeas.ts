"use client"

import { useState, useCallback, useRef } from "react"
import { toast } from "sonner"
import { chatContextAnalyzer, type UserContext } from "@/lib/chat-context-analyzer"
import { enhancedContentGenerator } from "@/lib/enhanced-content-generator"
import { supabase } from "@/lib/supabase"

export type ContentStep = "overview" | "strategies" | "brainstorm" | "inspiration" | "develop" | "script"

export function useContentIdeas() {
  // Main navigation state
  const [currentStep, setCurrentStep] = useState<ContentStep>("overview")
  const [selectedStrategy, setSelectedStrategy] = useState<string>("")

  // Chat and AI state
  const [chatMessages, setChatMessages] = useState<Array<{type: 'user' | 'ai', content: string, ideas?: any[]}>>([])
  const [currentInput, setCurrentInput] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [chatHistory, setChatHistory] = useState<Array<{id: string, type: 'user' | 'ai', message: string, timestamp: Date}>>([])
  const [isTyping, setIsTyping] = useState(false)
  const [isAiChatOpen, setIsAiChatOpen] = useState(false)

  // UI state
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false)
  const [isCreatingPost, setIsCreatingPost] = useState(false)
  const [showPostPopup, setShowPostPopup] = useState(false)
  const [isLoadingTrends, setIsLoadingTrends] = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [showFinalizeModal, setShowFinalizeModal] = useState(false)

  // Content data state
  const [savedReels, setSavedReels] = useState<any[]>([])
  const [currentReels, setCurrentReels] = useState<any[]>([])
  const [finalizedScript, setFinalizedScript] = useState<any>(null)

  // Script page state
  const [uploadedMedia, setUploadedMedia] = useState<Array<{id: string, type: 'image' | 'video', url: string, name: string}>>([])
  const [scriptTitle, setScriptTitle] = useState("")
  const [scriptDescription, setScriptDescription] = useState("")
  const [scriptContent, setScriptContent] = useState("")
  const [visualGuidance, setVisualGuidance] = useState("")
  const [contentType, setContentType] = useState<'video' | 'photo'>('video')
  const [isUploadingMedia, setIsUploadingMedia] = useState(false)
  const [generatedHashtags, setGeneratedHashtags] = useState<string[]>([
    '#immobilien', '#makler', '#eigenheim', '#wohnung', '#haus', 
    '#investment', '#traumhaus', '#neubau', '#renovierung', '#einrichtung'
  ])

  // Upload ref for file input
  const uploadInputRef = useRef<HTMLInputElement | null>(null)

  // Swipe functionality state
  const [currentStrategyIndex, setCurrentStrategyIndex] = useState(0)
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set())
  const [savedStrategies, setSavedStrategies] = useState<any[]>([])
  const [viewMode, setViewMode] = useState<'swipe' | 'saved'>('swipe')
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null)

  // Copy to clipboard functionality
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set())

  // Chat context integration
  const [userContext, setUserContext] = useState<UserContext | null>(null)
  const [isContextLoading, setIsContextLoading] = useState(false)
  const [contextLoadingMessage, setContextLoadingMessage] = useState("")

  // Content regeneration state
  const [currentContentPackage, setCurrentContentPackage] = useState<any>(null)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [regeneratingComponent, setRegeneratingComponent] = useState<string | null>(null)
  const [refinementFeedback, setRefinementFeedback] = useState("")
  const [showRefinementDialog, setShowRefinementDialog] = useState(false)
  const [showComponentRegeneration, setShowComponentRegeneration] = useState(false)

  // Copy to clipboard function
  const copyToClipboard = useCallback(async (text: string, itemId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedItems(prev => new Set(prev).add(itemId))
      toast.success('In Zwischenablage kopiert!')
      
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopiedItems(prev => {
          const newSet = new Set(prev)
          newSet.delete(itemId)
          return newSet
        })
      }, 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      toast.error('Kopieren fehlgeschlagen')
    }
  }, [])

  // Load and analyze user context
  const loadUserContext = useCallback(async () => {
    if (isContextLoading || userContext) return
    
    setIsContextLoading(true)
    setContextLoadingMessage("Analysiere deine Chat-Historie...")
    
    try {
      const context = await chatContextAnalyzer.analyzeUserContext()
      setUserContext(context)
      setContextLoadingMessage("")
      toast.success('Chat-Kontext analysiert!')
    } catch (error) {
      console.error('Error loading user context:', error)
      setContextLoadingMessage("")
      const fallbackContext: UserContext = {
        userId: 'unknown',
        topics: ['content creation', 'social media'],
        themes: ['content-creation'],
        userStyle: { tone: 'professional', vocabulary: 'mixed', length: 'detailed', formality: 'formal' },
        recentInterests: ['social media marketing'],
        communicationPatterns: { questionTypes: [], responsePreferences: [], engagementStyle: 'neutral', topicTransitions: [] },
        contextSummary: 'Fallback context - using default professional content creation preferences.',
        analyzedAt: new Date(),
        messageCount: 0,
        timeRange: { from: new Date(), to: new Date() }
      }
      setUserContext(fallbackContext)
      toast.info('Standard-Einstellungen verwendet')
    } finally {
      setIsContextLoading(false)
    }
  }, [isContextLoading, userContext])

  // File upload handler
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    setIsUploadingMedia(true)
    
    setTimeout(() => {
      const newMedia = files.map((file, index) => ({
        id: (Date.now() + index).toString(),
        type: file.type.startsWith('video/') ? 'video' as const : 'image' as const,
        url: URL.createObjectURL(file),
        name: file.name
      }))
      
      setUploadedMedia(prev => [...prev, ...newMedia])
      setIsUploadingMedia(false)
      toast.success(`${files.length} Datei(en) hochgeladen!`)
    }, 1000)
  }, [])

  const handleRemoveMedia = useCallback((mediaId: string) => {
    setUploadedMedia(prev => prev.filter(media => media.id !== mediaId))
  }, [])

  const triggerSuccessAnimation = useCallback(() => {
    setShowSuccessAnimation(true)
    setTimeout(() => setShowSuccessAnimation(false), 2000)
  }, [])

  const handleCreatePost = useCallback(async () => {
    setIsCreatingPost(true)
    await new Promise(resolve => setTimeout(resolve, 800))
    setIsCreatingPost(false)
    setShowPostPopup(true)
  }, [])

  return {
    // State
    currentStep,
    selectedStrategy,
    chatMessages,
    currentInput,
    isGenerating,
    chatHistory,
    isTyping,
    isAiChatOpen,
    showSuccessAnimation,
    isCreatingPost,
    showPostPopup,
    isLoadingTrends,
    showUpdateModal,
    showFinalizeModal,
    savedReels,
    currentReels,
    finalizedScript,
    uploadedMedia,
    scriptTitle,
    scriptDescription,
    scriptContent,
    visualGuidance,
    contentType,
    isUploadingMedia,
    generatedHashtags,
    uploadInputRef,
    currentStrategyIndex,
    flippedCards,
    savedStrategies,
    viewMode,
    swipeDirection,
    copiedItems,
    userContext,
    isContextLoading,
    contextLoadingMessage,
    currentContentPackage,
    isRegenerating,
    regeneratingComponent,
    refinementFeedback,
    showRefinementDialog,
    showComponentRegeneration,

    // Setters
    setCurrentStep,
    setSelectedStrategy,
    setChatMessages,
    setCurrentInput,
    setIsGenerating,
    setChatHistory,
    setIsTyping,
    setIsAiChatOpen,
    setShowSuccessAnimation,
    setIsCreatingPost,
    setShowPostPopup,
    setIsLoadingTrends,
    setShowUpdateModal,
    setShowFinalizeModal,
    setSavedReels,
    setCurrentReels,
    setFinalizedScript,
    setUploadedMedia,
    setScriptTitle,
    setScriptDescription,
    setScriptContent,
    setVisualGuidance,
    setContentType,
    setIsUploadingMedia,
    setGeneratedHashtags,
    setCurrentStrategyIndex,
    setFlippedCards,
    setSavedStrategies,
    setViewMode,
    setSwipeDirection,
    setCopiedItems,
    setUserContext,
    setIsContextLoading,
    setContextLoadingMessage,
    setCurrentContentPackage,
    setIsRegenerating,
    setRegeneratingComponent,
    setRefinementFeedback,
    setShowRefinementDialog,
    setShowComponentRegeneration,

    // Functions
    copyToClipboard,
    loadUserContext,
    handleFileUpload,
    handleRemoveMedia,
    triggerSuccessAnimation,
    handleCreatePost,
  }
} 