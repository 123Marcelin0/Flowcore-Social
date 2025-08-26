# Design Document

## Overview

This design document outlines the transformation of the video editor neu page into a transcript-first editing interface. The design replaces the current large video preview with a primary transcript editor on the left, while displaying a smaller Instagram-style (9:16) video preview on the right/center. The implementation leverages the existing neu design system's glassmorphic styling while incorporating Submagic's clean, minimal interface principles.

## Architecture

### Layout Architecture

The new layout follows a three-column structure:
- **Left Panel (Primary)**: Transcript editor occupying the space currently used by the large video preview
- **Right/Center Panel (Secondary)**: Compact 9:16 video preview with controls
- **Bottom Panel (Persistent)**: Existing CleanTimeline component with minimal modifications
- **Top Panel (Persistent)**: Existing EditorHeader with enhanced transcript-specific tools

### Component Architecture

```
TranscriptFirstVideoEditor/
├── TranscriptEditor/
│   ├── TranscriptPanel
│   ├── TranscriptSegment
│   ├── WordClickable
│   └── TranscriptControls
├── CompactVideoPreview/
│   ├── InstagramStylePreview
│   ├── VerticalVideoPlayer
│   └── CaptionOverlay
├── EnhancedToolbar/
│   ├── TranscriptTools
│   ├── ExistingTools (reused)
│   └── SyncControls
└── SharedComponents/
    ├── ExistingTimeline (modified)
    ├── ExistingProjectPanel (modified)
    └── SynchronizationEngine
```

## Components and Interfaces

### 1. TranscriptEditor (Primary Left Panel)

**TranscriptPanel Component**
```typescript
interface TranscriptPanelProps {
  transcript: TranscriptSegment[]
  currentTime: number
  onWordClick: (timestamp: number) => void
  onTextEdit: (segmentId: string, newText: string) => void
  onSegmentDelete: (segmentId: string) => void
  onSegmentSplit: (segmentId: string, position: number) => void
  onPauseInsert: (segmentId: string, position: number) => void
  isPlaying: boolean
  autoScroll: boolean
}
```

**Design Specifications:**
- **Layout**: Full height panel matching current ProjectPanel positioning
- **Styling**: Uses existing neu glassmorphic design system
  - Background: `radial-gradient(circle at 30% 30%, #3a3a3a 0%, #2a2a2a 25%, #1a1a1a 70%, #0a0a0a 100%)`
  - Border: `border-white/[0.04]`
  - Backdrop filter: `backdrop-blur-md`
- **Typography**: Clean, readable text with generous line spacing
- **Interaction**: Hover states using existing white/opacity patterns

**TranscriptSegment Component**
```typescript
interface TranscriptSegmentProps {
  segment: TranscriptSegment
  isActive: boolean
  currentWord: number
  onWordClick: (timestamp: number) => void
  onEdit: (newText: string) => void
  onDelete: () => void
  onSplit: (position: number) => void
}
```

**Features:**
- Word-level clickability with timestamp navigation
- Inline editing with contentEditable or input fields
- Context menu for cut, copy, delete, split operations
- Visual highlighting of currently spoken word
- Timestamp display with neu styling

### 2. CompactVideoPreview (Right/Center Panel)

**InstagramStylePreview Component**
```typescript
interface InstagramStylePreviewProps {
  videoRef: React.RefObject<HTMLVideoElement>
  videoUrl: string
  aspectRatio: number
  isPlaying: boolean
  isMuted: boolean
  currentTime: number
  duration: number
  captions: Caption[]
  onPlay: () => void
  onPause: () => void
  onSeek: (time: number) => void
  onMute: () => void
}
```

**Design Specifications:**
- **Aspect Ratio**: Fixed 9:16 (Instagram/TikTok style)
- **Dimensions**: Approximately 300-400px width, auto height
- **Positioning**: Right/center of the main content area
- **Styling**: 
  - Rounded corners: `rounded-[20px]`
  - Border: `border-white/10`
  - Shadow: Existing neu shadow patterns
  - Background: Black for video content

**Features:**
- Compact video controls overlay
- Real-time caption display synced with transcript
- Scrub bar with neu glassmorphic styling
- Play/pause, mute, and quality controls
- Responsive scaling while maintaining aspect ratio

### 3. Enhanced Toolbar Integration

**TranscriptTools Component**
```typescript
interface TranscriptToolsProps {
  onRemoveSilences: () => void
  onRemoveBadTakes: () => void
  onSyncTranscript: () => void
  onExportTranscript: () => void
  isProcessing: boolean
}
```

**Integration with Existing Tools:**
- Reuse existing EditorHeader component structure
- Add transcript-specific tools alongside existing ones
- Maintain existing styling and interaction patterns
- Ensure all existing functionality (Colors, Brand, Audio, Cover, AI) works with transcript

### 4. Synchronization Engine

**SyncManager Service**
```typescript
interface SyncManager {
  syncVideoToTranscript: (timestamp: number) => void
  syncTranscriptToVideo: (currentTime: number) => void
  highlightActiveWord: (currentTime: number) => void
  autoScrollTranscript: (activeSegment: string) => void
  updateCaptions: (transcriptChanges: TranscriptChange[]) => void
}
```

**Features:**
- Real-time synchronization between video playback and transcript highlighting
- Auto-scroll functionality to keep active content visible
- Bi-directional sync (transcript clicks affect video, video playback affects transcript)
- Caption generation from transcript edits

## Data Models

### TranscriptSegment Model
```typescript
interface TranscriptSegment {
  id: string
  startTime: number
  endTime: number
  text: string
  words: TranscriptWord[]
  confidence: number
  speaker?: string
}

interface TranscriptWord {
  id: string
  text: string
  startTime: number
  endTime: number
  confidence: number
}
```

### TranscriptEdit Model
```typescript
interface TranscriptEdit {
  id: string
  segmentId: string
  type: 'text_change' | 'delete' | 'split' | 'merge' | 'pause_insert'
  originalText?: string
  newText?: string
  timestamp: number
  position?: number
}
```

### Caption Model
```typescript
interface Caption {
  id: string
  text: string
  startTime: number
  endTime: number
  style: CaptionStyle
  position: CaptionPosition
}
```

## Layout Specifications

### Current Layout (Before)
```
┌─────────────────────────────────────────────────────────────┐
│ Header (EditorHeader)                                       │
├─────────────┬───────────────────────────────────────────────┤
│ ProjectPanel│ Large Video Preview                           │
│ (Left)      │ (Main Content Area)                           │
│             │                                               │
│             │                                               │
│             │                                               │
└─────────────┴───────────────────────────────────────────────┤
│ CleanTimeline (Bottom)                                      │
└─────────────────────────────────────────────────────────────┘
```

### New Layout (After)
```
┌─────────────────────────────────────────────────────────────┐
│ Enhanced Header (EditorHeader + Transcript Tools)          │
├─────────────────────────────┬───────────────────────────────┤
│ TranscriptEditor            │ Compact Video Preview        │
│ (Primary Left Panel)        │ (9:16 Instagram Style)       │
│                             │ (Right/Center)                │
│ - Word-level editing        │                               │
│ - Click to jump             │ - Real-time captions         │
│ - Cut/split/merge           │ - Compact controls            │
│ - Auto-scroll               │ - Quality preview             │
└─────────────────────────────┴───────────────────────────────┤
│ CleanTimeline (Bottom, minimal changes)                    │
└─────────────────────────────────────────────────────────────┘
```

### Responsive Behavior
- **Desktop (>1200px)**: Full three-column layout as described
- **Tablet (768-1200px)**: Transcript panel becomes collapsible, video preview scales down
- **Mobile (<768px)**: Stack vertically with transcript as primary view, video as secondary

## Visual Design System

### Typography Hierarchy
```css
/* Transcript Text */
.transcript-segment {
  font-family: 'Plus Jakarta Sans', system-ui;
  font-size: 16px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.9);
}

/* Active Word Highlight */
.transcript-word-active {
  background: linear-gradient(135deg, #dc2626, #ef4444);
  color: white;
  padding: 2px 4px;
  border-radius: 4px;
}

/* Timestamp Labels */
.transcript-timestamp {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 500;
}
```

### Glassmorphic Components
```css
/* Transcript Panel Background */
.transcript-panel {
  background: radial-gradient(circle at 30% 30%, #3a3a3a 0%, #2a2a2a 25%, #1a1a1a 70%, #0a0a0a 100%);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 14px;
  box-shadow: inset 3px 3px 6px rgba(255,255,255,0.06), inset -3px -3px 6px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3);
}

/* Transcript Segment Cards */
.transcript-segment-card {
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
}

/* Video Preview Container */
.video-preview-compact {
  background: black;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}
```

### Animation Specifications
```css
/* Word Highlight Animation */
.transcript-word-highlight {
  transition: all 200ms ease-out;
  transform: scale(1.02);
}

/* Auto-scroll Animation */
.transcript-auto-scroll {
  scroll-behavior: smooth;
  transition: scroll-position 400ms ease-out;
}

/* Video Preview Transitions */
.video-preview-controls {
  transition: opacity 300ms ease-in-out;
  opacity: 0;
}

.video-preview-container:hover .video-preview-controls {
  opacity: 1;
}
```

## Interaction Design

### Transcript Editing Workflow
1. **Word Selection**: Click any word to jump video to that timestamp
2. **Text Editing**: Double-click segment to enter edit mode
3. **Context Menu**: Right-click for cut, copy, delete, split options
4. **Drag Operations**: Drag to select multiple words/segments
5. **Keyboard Shortcuts**: Space (play/pause), Arrow keys (navigate), Delete (remove)

### Video Preview Interactions
1. **Playback Control**: Click to play/pause, hover for controls
2. **Scrubbing**: Click scrub bar to seek, drag for precise control
3. **Caption Display**: Real-time captions from transcript edits
4. **Quality Toggle**: Switch between preview and high-quality modes

### Synchronization Behaviors
1. **Video → Transcript**: Playing video highlights current word and auto-scrolls
2. **Transcript → Video**: Clicking words seeks video to exact timestamp
3. **Edit Propagation**: Transcript changes immediately update video captions
4. **Timeline Sync**: Timeline remains synchronized with both transcript and video

## Error Handling

### Transcript Processing Errors
- **ASR Failures**: Graceful fallback to manual transcript entry
- **Sync Issues**: Re-sync button to realign transcript with audio
- **Edit Conflicts**: Undo/redo system for transcript modifications
- **Performance Issues**: Virtualization for large transcripts

### Video Preview Errors
- **Loading Failures**: Fallback to audio-only mode with waveform
- **Format Issues**: Automatic transcoding or format conversion
- **Playback Errors**: Error states with retry mechanisms
- **Caption Rendering**: Fallback to basic text overlay

## Testing Strategy

### Component Testing
- Unit tests for transcript editing operations
- Integration tests for video-transcript synchronization
- Visual regression tests for layout consistency
- Accessibility tests for keyboard navigation and screen readers

### User Experience Testing
- Usability testing for transcript-first workflow
- Performance testing with large transcript files
- Cross-browser compatibility for video playback
- Mobile responsiveness testing

### End-to-End Testing
- Complete editing workflow from upload to export
- Transcript editing with real-time video sync
- Export functionality with transcript-based captions
- Integration with existing neu features

## Performance Considerations

### Optimization Strategies
- **Virtual Scrolling**: For large transcripts (>1000 segments)
- **Debounced Sync**: Prevent excessive video seeking during rapid transcript navigation
- **Lazy Loading**: Load transcript segments as needed
- **Memoization**: Cache transcript processing results
- **Web Workers**: Background processing for transcript analysis

### Memory Management
- Efficient cleanup of video preview elements
- Proper disposal of transcript event listeners
- Optimized re-renders using React.memo and useMemo
- Smart caching for frequently accessed transcript segments

### Rendering Performance
- Hardware-accelerated CSS animations for word highlighting
- Optimized video preview rendering with lower resolution during editing
- Efficient DOM updates for transcript modifications
- Background processing for non-critical transcript operations

## Accessibility Features

### Keyboard Navigation
- Full keyboard support for transcript navigation
- Tab order optimization for transcript editing
- Keyboard shortcuts for common transcript operations
- Focus management for modal dialogs and editing states

### Screen Reader Support
- Comprehensive ARIA labels for transcript segments
- Live regions for dynamic transcript updates
- Semantic HTML structure for transcript content
- Alternative text for video preview controls

### Visual Accessibility
- High contrast mode support for transcript text
- Scalable text and UI elements
- Color-blind friendly highlighting for active words
- Reduced motion preferences for auto-scroll behavior

## Integration Points

### Existing System Integration
- **ProjectPanel**: Modified to show transcript view by default
- **CleanTimeline**: Enhanced to sync with transcript edits
- **VideoPreview**: Replaced with compact Instagram-style preview
- **EditorHeader**: Extended with transcript-specific tools

### API Endpoints
- Enhanced transcript generation endpoints
- Real-time transcript editing synchronization
- Caption export with transcript formatting
- Integration with existing video processing pipeline

### Third-Party Services
- ASR services for initial transcript generation
- Video processing for caption embedding
- Cloud storage for transcript data
- Analytics for transcript editing behavior

## Migration Strategy

### Phase 1: Component Development
- Build TranscriptEditor components
- Create CompactVideoPreview component
- Develop synchronization engine
- Implement basic transcript editing

### Phase 2: Integration
- Integrate with existing neu components
- Update layout and positioning
- Implement toolbar enhancements
- Add synchronization features

### Phase 3: Polish and Optimization
- Performance optimization
- Accessibility improvements
- Mobile responsiveness
- User experience refinements

### Phase 4: Rollout
- Feature flag for gradual rollout
- User feedback collection
- Bug fixes and improvements
- Full deployment as default layout

This design maintains the existing neu aesthetic while transforming the editing paradigm to be transcript-first, providing a more intuitive and efficient video editing experience similar to Submagic's approach.