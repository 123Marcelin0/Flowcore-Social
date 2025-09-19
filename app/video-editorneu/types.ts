// Shared types for the Video Editor Neue page

// Segment of the main project timeline
export type Segment = {
  id: string
  type: "video" | "image" | "text"
  startTime: number
  duration: number
  thumbnailUrl: string
  title: string
  content: { text?: string; videoUrl?: string; imageUrl?: string }
  captions?: Array<{
    id: string
    text: string
    startTime: number
    duration: number
    style: { fontSize: number; color: string; position: "top" | "center" | "bottom"; fontWeight: "normal" | "bold" }
  }>
}

// Text overlay used by preview/timeline
export type TextOverlay = {
  id: string
  start: number
  duration: number
  text: string
  tokens?: Array<{ w: string; offset: number; dur: number }>
  style?: { position?: "top" | "center" | "bottom"; fontSize?: number; color?: string }
}

// Transcript segment used by TranscriptEditor
export type TranscriptSegmentUI = {
  id: string
  text: string
  startTime: number
  endTime: number
  speaker?: string
  confidence?: number
  words?: Array<{
    word: string
    start: number
    end: number
    kept?: boolean
    isRemoved?: boolean
    removalReason?: string
    confidence?: number
  }>
  isAiCard?: boolean
  lineBreakIndex?: number | null
}

// Visual/icon overlay
export type VisualOverlay = {
  id: string
  start: number
  duration: number
  mediaUrl: string
  placement?: 'aboveSub' | 'belowSub' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'
  size?: number
  offsetX?: number
  offsetY?: number
  emoji?: string
  animation?: 'pop' | 'flip' | 'bounce' | 'slide'
}

// Helper type for timeline clip items
export type TimelineClip = { id: string; src: string; start: number; duration: number }

// Caption rendering configuration passed to preview components
export type CaptionConfig = {
  styleKey: string
  colorMain: string
  colorSecond: string
  colorThird: string
  accentColor: string
  fontSize: number
  fontWeight: 'Light' | 'Regular' | 'Medium' | 'Bold' | 'Heavy'
  uppercase: boolean
  lineSpacing: number
  maxLines: number
  maxCharsPerLine: number
  positionYPercent: number
  bottomOffsetPercent: number
  animation: 'pop' | 'fade' | 'slideUp'
  animEnabled: boolean
  wordLead: number
  wordTrail: number
}


