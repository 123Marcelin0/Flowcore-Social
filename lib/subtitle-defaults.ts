export interface AiCaptionSegmentationSettings {
  minWordsPerCard: number
  maxWordsPerCard: number
  targetCpsRange: [number, number]
  globalMinPause: number
  lingerSec: number
}

// Defaults aligned with useSubtitleSettings and editor segmentation behavior
export const DEFAULT_SUBTITLE_SETTINGS: AiCaptionSegmentationSettings = {
  minWordsPerCard: 2,
  maxWordsPerCard: 6,
  targetCpsRange: [12, 17],
  globalMinPause: 0.28,
  lingerSec: 1.0,
}









