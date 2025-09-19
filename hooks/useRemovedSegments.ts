"use client"

import { useMemo } from "react"
import type { TranscriptSegmentUI } from "@/app/video-editorneu/types"

export function useRemovedSegments(transcriptSegments: TranscriptSegmentUI[]) {
  return useMemo(() => {
    const segments: Array<{ start: number; end: number; reason?: string }> = []

    for (const seg of transcriptSegments) {
      if (!seg.words) continue

      let currentRemoved: { start: number; end: number; reason?: string } | null = null

      for (const word of seg.words) {
        const isRemoved = (word as any)?.isRemoved || (word as any)?.kept === false
        if (isRemoved) {
          if (!currentRemoved) {
            currentRemoved = {
              start: word.start,
              end: word.end,
              reason: (word as any)?.removalReason || 'manual'
            }
          } else {
            currentRemoved.end = word.end
          }
        } else if (currentRemoved) {
          segments.push(currentRemoved)
          currentRemoved = null
        }
      }

      if (currentRemoved) {
        segments.push(currentRemoved)
      }
    }

    return segments
  }, [transcriptSegments])
}



























