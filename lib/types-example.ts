// Example usage of the speaker-to-camera pipeline types
import { 
  Transcript,
  Word,
  Segment,
  Pause,
  KeepSegment,
  KeepReason,
  DecisionInput,
  DecisionOutput,
  DecisionPolicy,
  DEFAULT_DECISION_POLICY,
  createKeepSegment,
  createPause,
  validateDecisionOutput
} from './types'

// Example: Creating a transcript with word-level timing
export function createExampleTranscript(): Transcript {
  const words: Word[] = [
    { word: "Welcome", start: 0.5, end: 1.2 },
    { word: "to", start: 1.3, end: 1.4 },
    { word: "our", start: 1.5, end: 1.8 },
    { word: "um", start: 2.0, end: 2.3 },     // Filler word
    { word: "presentation", start: 2.5, end: 3.5 },
    { word: "about", start: 3.6, end: 4.0 },
    { word: "AI", start: 4.1, end: 4.4 },
    { word: "video", start: 4.5, end: 5.0 },
    { word: "editing", start: 5.1, end: 5.8 }
  ]

  const segments: Segment[] = [
    {
      start: 0.5,
      end: 2.3,
      text: "Welcome to our um",
      confidence: 0.85,
      words: words.slice(0, 4)
    },
    {
      start: 2.5,
      end: 5.8,
      text: "presentation about AI video editing",
      confidence: 0.95,
      words: words.slice(4)
    }
  ]

  return {
    text: "Welcome to our um presentation about AI video editing",
    segments,
    language: "en",
    duration: 5.8
  }
}

// Example: Creating decision input
export function createExampleDecisionInput(): DecisionInput {
  const transcript = createExampleTranscript()
  const scriptText = "Welcome to our presentation about AI video editing"
  
  const customPolicy: DecisionPolicy = {
    ...DEFAULT_DECISION_POLICY,
    removeFiller: true,
    minConfidence: 0.8
  }

  return {
    transcript,
    scriptText,
    policy: customPolicy,
    metadata: {
      videoId: "example-video-123",
      originalDuration_ms: 5800,
      language: "en",
      speakerInfo: {
        name: "John Doe",
        role: "Presenter"
      }
    }
  }
}

// Example: Creating decision output with various keep reasons
export function createExampleDecisionOutput(): DecisionOutput {
  // Create keep segments with different reasons
  const keepSegments: KeepSegment[] = [
    createKeepSegment(
      500, 2300, 
      "Welcome to our", 
      'script_match', 
      0.9, 
      "Matches script opening perfectly"
    ),
    createKeepSegment(
      2500, 5800, 
      "presentation about AI video editing", 
      'script_match', 
      0.95, 
      "Core content matches script"
    )
  ]

  // Create detected pauses
  const pauseList: Pause[] = [
    createPause(2000, 2300, 'filler', 0.8, 'Filler word "um" detected'),
    createPause(2300, 2500, 'natural_break', 0.7, 'Natural pause between sentences')
  ]

  return {
    keepSegments,
    pauseList,
    analysisMetadata: {
      timestamp: new Date().toISOString(),
      model: 'gpt-4o',
      policyUsed: DEFAULT_DECISION_POLICY,
      hasScript: true,
      scriptLength: 50,
      transcriptLength: 53,
      processingTime_ms: 1250
    },
    stats: {
      originalDuration_ms: 5800,
      finalDuration_ms: 5500,
      removedDuration_ms: 300,
      reductionPercentage: 5.2,
      totalSegments: 2,
      segmentsKept: 2,
      segmentsRemoved: 0,
      averageConfidence: 0.925,
      lowConfidenceSegments: 0,
      fillerWordsRemoved: 1,
      pausesRemoved: 1,
      duplicatesRemoved: 0,
      reasonCounts: {
        'script_match': 2,
        'dedupe_best_take': 0,
        'filler_trim': 0,
        'pause_trim': 0,
        'ai_summary': 0,
        'high_confidence': 0,
        'natural_speech': 0,
        'topic_relevant': 0,
        'transition_keep': 0,
        'fallback_keep': 0
      },
      scriptMatchStats: {
        perfectMatches: 2,
        partialMatches: 0,
        noMatches: 0,
        averageSimilarity: 0.95
      }
    },
    warnings: [],
    recommendations: [
      "Consider removing filler word 'um' for cleaner presentation",
      "Audio quality is excellent, no additional processing needed"
    ],
    qualityAssessment: {
      overallScore: 0.92,
      audioQuality: 0.95,
      speechClarity: 0.90,
      contentCoherence: 0.95,
      flowNaturalness: 0.88,
      issues: ["Minor filler word detected"]
    }
  }
}

// Example: Validate decision output
export function validateExample() {
  const output = createExampleDecisionOutput()
  const validation = validateDecisionOutput(output)
  
  if (validation.valid) {
    console.log("✅ Decision output is valid")
  } else {
    console.log("❌ Validation errors:", validation.errors)
  }
  
  return validation
}

// Example: Different keep reasons in action
export function createKeepReasonsExample(): KeepSegment[] {
  return [
    createKeepSegment(1000, 3000, "This matches our script perfectly", 'script_match', 0.95),
    createKeepSegment(3000, 4500, "Take two of this sentence", 'dedupe_best_take', 0.88),
    createKeepSegment(4500, 6000, "Clear speech without filler", 'filler_trim', 0.92),
    createKeepSegment(6000, 7500, "Natural pause removed", 'pause_trim', 0.85),
    createKeepSegment(7500, 9000, "AI identified key point", 'ai_summary', 0.90),
    createKeepSegment(9000, 10500, "High confidence transcription", 'high_confidence', 0.98),
    createKeepSegment(10500, 12000, "Natural speaking pattern", 'natural_speech', 0.87),
    createKeepSegment(12000, 13500, "Relevant to main topic", 'topic_relevant', 0.83),
    createKeepSegment(13500, 15000, "Important transition", 'transition_keep', 0.91),
    createKeepSegment(15000, 16500, "Fallback criteria met", 'fallback_keep', 0.75)
  ]
}
