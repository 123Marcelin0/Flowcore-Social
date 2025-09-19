"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/lib/auth-context"
import LoginPage from "@/components/auth/login-page"
import { Plus_Jakarta_Sans } from "next/font/google"

// Components
import { ProcessingOverlay } from "./components/ProcessingOverlay"
import { ProjectVideoPanel } from "./components/ProjectVideoPanel"
import { ChatPopup } from "./components/ChatPopup"
import { ChatCard } from "./components/ChatCard"
import { PreviewPane } from "./components/PreviewPane"
import { CaptionSettingsPanel } from "./components/CaptionSettingsPanel"
import { TimelineDock } from "./components/TimelineDock"
import { ModeSwitcherBar } from "./components/ModeSwitcherBar"
import { MusicVolumeCard } from "./components/MusicVolumeCard"
import { MediaBackgroundCard } from "./components/MediaBackgroundCard"
import { TranscriptionProgressModal } from "@/components/TranscriptionProgressModal"
import { HeaderBar } from "@/components/video-editor/HeaderBar"
import { MediaProcessingPanel } from "@/components/video-editor/MediaProcessingPanel"
import { TranscriptEditor } from "@/components/transcript-editor"

// Hooks  
import { useVideoEditor } from "./hooks/useVideoEditor"
import { useRemovedSegments } from "@/hooks/useRemovedSegments"
import { useTranscriptionProgress } from "@/hooks/useTranscriptionProgress"

// Types
import type { CaptionConfig } from "./types"

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"] })

export default function VideoEditorNeuPage() {
  const router = useRouter()
  const transcriptionProgress = useTranscriptionProgress()
  
  // Custom hooks for state management  
    const {
    // Media state
    currentUploadId,
    loadedMediaUrl,
    videoAspectRatio,
    uploadedFile,
    
    // Transcript state
    transcriptSegments,
    textOverlays,
    visualOverlays,
    detectedPauses,
    pausesForEditor,
    
    // Video controls
    isPreviewPlaying,
    isPreviewMuted,
    currentTime,
    previewDuration,
    previewVideoRef,
    
    // Timeline state
    initialClips,
    autoZoomPlan,
    
    // UI state
    showTranscriptView,
    showProjectVideoPanel,
    showChatPopup,
    showTextElements,
    showVideoClips,
    showAudioElements,
    showMediaView,
    analysisReady,
    isProcessing,
    isProcessingSubtitles,
    processingStep,
    processingProgress,
    
    // Professional processing
    isProfessionalProcessing,
    professionalProcessingStep,
    professionalProcessingProgress,
    badTakeAnalysis,
    handleProfessionalEdit,
    analyzeBadTakes,
    hydrateFromUpload,
    activeTool,
    activeMode,
    showMusicPopup,
    musicVolume,
    
    // Layout state
    projectTop,
    projectBottom,
    projectWidth,
    projectHeight,
    previewTop,
    modeContainerWidth,
    chatTop,
    standardGap,
    headerBarRef,
    projectAsideRef,
    mediaBgRef,
    modeContainerRef,
    modeButtonRefs,
    modes,
    
    // Media library
    searchQuery,
    filterKind,
    filteredMedia,

    // Actions
    setShowTranscriptView,
    setShowProjectVideoPanel,
    setShowChatPopup,
    setShowTextElements,
    setShowVideoClips,
    setShowAudioElements,
    setActiveTool,
    setActiveMode,
    setSearchQuery,
    setFilterKind,
    setMusicVolume,
    setShowMusicPopup,
    setShowMediaView,
    setCurrentUploadId,
    setLoadedMediaUrl,
    togglePreviewPlay,
    togglePreviewMute,
    seekRelative,
    handleTranscriptSeek,
    handleTranscriptSegmentEdit,
    handleTranscriptSegmentSplit,
    handleTranscriptSegmentRemove,
    handleTranscriptWordClick,
    handleTranscriptWordToggle,
    handleTranscriptWordAction,
    handleFileUpload,
    handleExport,
    handleAddIcons,
    handleClearIcons,
    onTextChange,
    addVideoAndTranscribe,
    trimPausesWithPace,
    generateVisualOverlaysFromTranscript,
    processVideo,
    resegmentCapCutStyle,
    applyPrecomputedCut,
    applyPauseOnlyCut,
    applyBadTakesNow,
    
    // Subtitle generation actions
    generateTestSubtitles,
    clearSubtitles,
    subtitleSettings,
    subtitleActions
    
  } = useVideoEditor()

  const removedSegments = useRemovedSegments(transcriptSegments as any)

  // Caption config for PreviewPane
  const captionConfig: CaptionConfig = {
    styleKey: subtitleSettings.style,
    colorMain: subtitleSettings.color,
    accentColor: subtitleSettings.accentColor,
    colorSecond: subtitleSettings.secondColor,
    colorThird: subtitleSettings.thirdColor,
    animation: subtitleSettings.animation,
    animEnabled: subtitleSettings.animEnabled,
    uppercase: subtitleSettings.uppercase,
    positionYPercent: subtitleSettings.positionY,
    fontSize: subtitleSettings.fontSize,
    lineSpacing: subtitleSettings.lineSpacing,
    maxLines: subtitleSettings.maxLines,
    maxCharsPerLine: subtitleSettings.lineCharMax,
    wordLead: subtitleSettings.wordLead,
    wordTrail: subtitleSettings.wordTrail,
    bottomOffsetPercent: subtitleSettings.bottomOffset,
    fontWeight: subtitleSettings.fontWeight
  }

  // Enhanced caption config with proper typing for PreviewPane
  const enhancedCaptionConfig = {
    ...captionConfig,
    colorAccent: subtitleSettings.accentColor,
    colorSecond: subtitleSettings.secondColor,
    colorThird: subtitleSettings.thirdColor
  }

  return (
    <ProtectedRoute fallback={<LoginPage />}>
      <div className={jakarta.className}>
        {/* Enhanced Transcription Progress Modal */}
        <TranscriptionProgressModal 
          isVisible={transcriptionProgress.isTranscribing}
          progress={transcriptionProgress.progress}
          step={transcriptionProgress.step}
        />

        {/* Global loading screen for other processing */}
        {(isProcessing || isProcessingSubtitles) && !transcriptionProgress.isTranscribing && (
          <ProcessingOverlay 
            visible 
            title="Processing" 
            kind={isProcessingSubtitles ? 'subtitles' : 'default'} 
            step={processingStep} 
            progress={processingProgress} 
          />
        )}
        
        {showMediaView ? (
          <MediaProcessingPanel
            uploadedFile={uploadedFile}
            scriptText=""
            isProcessing={isProfessionalProcessing || isProcessing}
            processingStep={isProfessionalProcessing ? professionalProcessingStep : processingStep}
            processingProgress={isProfessionalProcessing ? professionalProcessingProgress : processingProgress}
            onChooseFile={handleFileUpload}
            onDropFile={handleFileUpload}
            onOpenScript={() => {}}
            onSaveScript={() => {}}
            onCloseScript={() => {}}
            onBackToEditor={() => setShowMediaView(false)}
            onProcess={processVideo}
            onSkipProcessing={async () => {}}
            onProfessionalProcess={handleProfessionalEdit}
          />
        ) : (
                    // Main Video Editor View
          <div className="relative w-full h-screen bg-black text-white overflow-hidden" style={{ pointerEvents: 'auto' }}>
            {/* Header - componentized (wrapped for measurements) */}
            <div ref={headerBarRef} className="relative z-50">
              <HeaderBar
                onBack={() => router.back()}
                onTogglePlay={togglePreviewPlay}
                isPlaying={isPreviewPlaying}
                setActiveTool={(t) => {
                  setActiveTool(t as any)
                  if (t === 'text') {
                    setShowTranscriptView(true)
                    setShowTextElements(true)
                  }
                  if (t === 'mouse') setShowTranscriptView(false)
                }}
                activeTool={activeTool}
                showProjectVideoPanel={showProjectVideoPanel}
                setShowProjectVideoPanel={setShowProjectVideoPanel}
                onExport={handleExport}
                onVideoProcessed={(uploadId: string, processedVideoUrl?: string) => {
                  // Handle the processed video result
                  console.log('🎬 Receiving processed video:', { uploadId, processedVideoUrl })
                  
                  setCurrentUploadId(uploadId)
                  if (processedVideoUrl) {
                    setLoadedMediaUrl(processedVideoUrl)
                    console.log('📼 Video URL updated in editor:', processedVideoUrl)
                    
                    // Force video element to reload with new source
                    setTimeout(() => {
                      const videoElement = previewVideoRef?.current
                      if (videoElement) {
                        videoElement.load()
                        videoElement.currentTime = 0
                        console.log('🎬 Video element reloaded with processed video')
                      }
                    }, 100)
                  }
                  
                  // Try to load transcript for this upload ID
                  if (uploadId) {
                    setTimeout(async () => {
                      try {
                        console.log('🔄 Loading transcript for upload:', uploadId)
                        await hydrateFromUpload(uploadId)
                        console.log('✅ Transcript loaded successfully')
                      } catch (error) {
                        console.warn('⚠️ Could not load transcript:', error)
                      }
                    }, 1000)
                  }
                  
                  console.log('✅ Video processed successfully:', { uploadId, processedVideoUrl })
                }}
              />
            </div>

                        {/* Left Transcript Editor panel (enlarged, replaces Project Video) */}
            <div className="px-0">
              <aside
                aria-label="Transcript Editor"
                className="fixed left-2 z-40 w-[380px] max-w-[calc(100vw-2rem)] rounded-[14px] border border-white/[0.04] text-white/90 overflow-hidden"
                ref={projectAsideRef}
                                  style={{ 
                    top: (projectTop || 64) + 8, // Header height + 8px spacing (same as right-side)
                    bottom: (projectBottom || 280) + 80, // Timeline space + 80px for maximum clearance from all bottom elements
                    background: 'radial-gradient(circle at 30% 30%, #3a3a3a 0%, #2a2a2a 25%, #1a1a1a 70%, #0a0a0a 100%)', 
                    boxShadow: 'inset 3px 3px 6px rgba(255,255,255,0.06), inset -3px -3px 6px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)' 
                  }}
              >
              <div className="h-full overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.3) transparent' }}>
                {activeTool === 'text' ? (
                  <CaptionSettingsPanel
                    captionConfig={captionConfig}
                    onCaptionConfigChange={(updates) => {
                      // Update subtitle settings based on caption config changes
                      Object.entries(updates).forEach(([key, value]) => {
                        switch (key) {
                          case 'styleKey':
                            subtitleActions.setStyle(value as string);
                            break;
                          case 'fontSize':
                            subtitleActions.setFontSize(value as number);
                            break;
                          case 'colorMain':
                            subtitleActions.setColor(value as string);
                            break;
                          case 'accentColor':
                            subtitleActions.setAccentColor(value as string);
                            break;
                          case 'animEnabled':
                            subtitleActions.setAnimEnabled(value as boolean);
                            break;
                          case 'uppercase':
                            subtitleActions.setUppercase(value as boolean);
                            break;
                          case 'lineSpacing':
                            subtitleActions.setLineSpacing(value as number);
                            break;
                          case 'fontWeight':
                            subtitleActions.setFontWeight(value as 'Light' | 'Regular' | 'Medium' | 'Bold' | 'Heavy');
                            break;
                        }
                      });
                    }}
                    onAddIcons={handleAddIcons}
                    onClearIcons={handleClearIcons}
                    onGenerateTestSubtitles={generateTestSubtitles}
                    onClearSubtitles={clearSubtitles}
                    isProcessing={isProcessing}
                    isProcessingSubtitles={isProcessingSubtitles}
                  />
                ) : (
                  <TranscriptEditor
                    segments={transcriptSegments as any}
                    currentTime={currentTime}
                    isPlaying={isPreviewPlaying}
                    onSeek={handleTranscriptSeek}
                    onPlay={togglePreviewPlay}
                    onPause={togglePreviewPlay}
                    onSegmentEdit={handleTranscriptSegmentEdit}
                    onSegmentSplit={handleTranscriptSegmentSplit}
                    onSegmentRemove={handleTranscriptSegmentRemove}
                    onWordClick={handleTranscriptWordClick}
                    onWordToggle={handleTranscriptWordToggle}
                    onWordAction={handleTranscriptWordAction}
                    pauses={(pausesForEditor as any) || []}
                    onAddVisuals={generateVisualOverlaysFromTranscript}
                    onAutoZoom={async () => {}}
                    maxLines={subtitleSettings.maxLines}
                    onChangeMaxLines={() => {}}
                  />
                                  )}
                </div>
              </aside>
            </div>

            {/* Right-side element stack with consistent minimal spacing */}
            <div className="fixed right-2 z-30 flex flex-col" style={{ 
              width: modeContainerWidth ? `${modeContainerWidth}px` : 320, 
              top: previewTop + 8, // Smaller gap below header (8px)
              bottom: projectBottom // Calculated timeline space with large buffer
            }}>
              {/* Mode switcher buttons */}
              <div className="mb-2">
                <ModeSwitcherBar
                  containerRef={modeContainerRef}
                  modes={modes as unknown as string[]}
                  activeMode={activeMode}
                  onSelectMode={(mode) => {
                    setActiveMode(mode as any)
                    if (mode === 'media') setShowMediaView(true); else setShowMediaView(false)
                  }}
                  registerButtonRef={(mode, el) => { modeButtonRefs.current[mode] = el }}
                />
              </div>

              {/* Music Volume card - full width to match mode switcher */}
              <div className="mb-2">
                <MusicVolumeCard
                  value={musicVolume}
                  onChange={setMusicVolume}
                  isMuted={isPreviewMuted}
                  onToggleMute={() => {
                    const v = previewVideoRef.current
                    if (!v) return
                    const next = !isPreviewMuted
                    v.muted = next
                    // setIsPreviewMuted(next) - would need to add this to hook
                  }}
                  showPopup={showMusicPopup}
                  onTogglePopup={() => setShowMusicPopup((v: boolean) => !v)}
                />
              </div>

              {/* Media Background card - full width to match mode switcher */}
              <div className="mb-2" ref={mediaBgRef}>
                <MediaBackgroundCard />
              </div>

              {/* AI Chat assistant card - full width to match mode switcher */}
              <div className="h-80">
                <ChatCard onOpen={() => setShowChatPopup(true)} />
              </div>
            </div>

            {/* Center Video Preview - smaller vertical Instagram/TikTok style */}
            {(() => {
              const leftGap = 8
              const rightMargin = 8
              const reservedRight = Math.max(280, modeContainerWidth + rightMargin + standardGap)
              const leftOffset = (projectWidth || 380) + leftGap + 8
              return (
                <div
                  className="fixed z-20 flex items-center justify-center"
                                      style={{ left: leftOffset, right: reservedRight, top: (previewTop || 64) - 56, bottom: projectBottom }}
                >
              <PreviewPane
                videoUrl={loadedMediaUrl}
                videoRef={previewVideoRef}
                autoZoomPlan={autoZoomPlan}
                isPlaying={isPreviewPlaying}
                isMuted={isPreviewMuted}
                currentTime={currentTime}
                duration={previewDuration}
                onLoadedMetadata={(e) => {
                  const v = e.currentTarget
                  const aspectRatio = (v.videoWidth || 16) / (v.videoHeight || 9)
                  const isVertical = aspectRatio < 1
                  v.style.objectFit = isVertical ? 'contain' : 'cover'
                  v.style.backgroundColor = isVertical ? 'black' : 'transparent'
                }}
                onTogglePlay={togglePreviewPlay}
                onToggleMute={togglePreviewMute}
                onSeekRelative={seekRelative}
                activeTextOverlays={textOverlays as any}
                transcriptSegments={transcriptSegments as any}
                captionConfig={enhancedCaptionConfig}
                activeVisualOverlays={visualOverlays as any}
                subtitleAutoEmojiMode={subtitleSettings.autoEmojiMode}
                subtitleEmojiAnimation={subtitleSettings.emojiAnimation}
                isProcessing={isProcessing}
                                onRequestAddVisuals={handleAddIcons}
              />
                </div>
              )
            })()}

            {/* Clean minimal timeline (floating rounded panel) */}
            <div className="relative z-20">
              {(() => {
                const gap = standardGap
                const rightMargin = 8
                const reservedRight = modeContainerWidth + rightMargin + gap
                const timelineDuration = initialClips.length === 0 ? 60 : Math.ceil(initialClips.reduce((max, c) => Math.max(max, c.start + c.duration), 0))
                return (
                  <TimelineDock
                    rightOffset={reservedRight}
                    gapPx={gap}
                    currentTime={currentTime}
                    duration={timelineDuration}
                    onSeek={handleTranscriptSeek}
                    initialClips={initialClips as any}
                    textOverlays={textOverlays as any}
                    onTextChange={onTextChange}
                    showTextElements={showTextElements}
                    showVideoClips={showVideoClips}
                    showAudioElements={showAudioElements}
                    onToggleTextElements={() => setShowTextElements(!showTextElements)}
                    onToggleVideoClips={() => setShowVideoClips(!showVideoClips)}
                    onToggleAudioElements={() => setShowAudioElements(!showAudioElements)}
                    zoomEvents={autoZoomPlan?.zoom_events || []}
                    transitionEvents={autoZoomPlan?.transition_events || []}
                    removedSegments={removedSegments}
                  />
                )
              })()}
            </div>
          </div>
        )}

        {/* Project Video Panel Popup */}
        <ProjectVideoPanel
          visible={showProjectVideoPanel}
          onClose={() => setShowProjectVideoPanel(false)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterKind={filterKind}
          onToggleFilter={() => setFilterKind((k) => (k === 'all' ? 'photo' : k === 'photo' ? 'video' : 'all'))}
          filteredMedia={filteredMedia}
        />

        {/* Chat Popup */}
        <ChatPopup visible={showChatPopup} onClose={() => setShowChatPopup(false)} />
      </div>
    </ProtectedRoute>
  )
}
