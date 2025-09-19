# Claude Code Memory - Social Media Dashboard & Video Editor

## Project Overview
This is a comprehensive **social media and video editing platform** built for real estate professionals. The platform combines advanced video editing capabilities with AI-powered content generation and social media management tools.

## Core Technology Stack
- **Framework**: Next.js 15 with App Router
- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Database**: Supabase (PostgreSQL with real-time features)
- **AI Services**: OpenAI (GPT-5, Whisper), Replicate
- **Video Processing**: FFmpeg, Shotstack SDK
- **Authentication**: Supabase Auth
- **Deployment**: Vercel-ready configuration

## Key Application Areas

### <¬ Video Editor (`/video-editorneu/`)
**Primary Features:**
- Transcript-based video editing with word-level precision
- AI transcription using OpenAI Whisper (with Deepgram/Xenova fallbacks)
- Professional audio processing and extraction
- Timeline-based editing interface with visual clips
- Auto-zoom and cinematic effects
- Subtitle generation with multiple styling options
- Real-time preview with caption overlays

**Key Files:**
- `app/video-editorneu/page.tsx` - Main editor interface
- `app/video-editorneu/hooks/useVideoEditor.ts` - Core editor logic
- `lib/transcribe.ts` - Advanced transcription with fallbacks
- `lib/video-editor.ts` - Video processing and cutting
- `components/video-editor/CleanTimeline.tsx` - Timeline component

### > AI Studio (`/ai-studio/`)
**Capabilities:**
- Content generation using GPT-5
- Image generation (OpenAI DALL-E, Replicate)
- Video analysis and enhancement
- Interior design AI tools
- Smart content suggestions

### =ñ Social Media Management
**Features:**
- Multi-platform content publishing (Instagram, Facebook, LinkedIn)
- Performance analytics and engagement tracking
- Content scheduling and calendar management
- AI chat assistant with conversation memory
- Hashtag optimization and trending topics

### <à Real Estate Specialization
**Focused Tools:**
- Property-specific content templates
- Market trend integration
- Lead generation and audience targeting
- Professional branding tools

## API Architecture (`/app/api/`)
**Major Endpoints:**
- `/api/chat/` - AI assistant with memory and context
- `/api/generate-content/` - GPT-5 content generation
- `/api/transcribe/` - Enhanced transcription pipeline
- `/api/render/shotstack/` - Video rendering service
- `/api/professional-audio-processing/` - Audio enhancement
- `/api/ai-visual-director/` - AI video analysis
- 70+ total endpoints for comprehensive functionality

## Core Libraries (`/lib/`)
**Key Modules:**
- `transcribe.ts` - Multi-provider transcription (OpenAI ’ Deepgram ’ Xenova ’ Mock)
- `video-editor.ts` - FFmpeg-based video cutting and processing
- `audio-extractor.ts` - Professional audio extraction
- `ai-planning-service.ts` - Intelligent content planning
- `enhanced-content-generator.ts` - Advanced content creation

## Database Schema (Supabase)
**Main Tables:**
- `media_files` - Video/audio assets with processing metadata
- `chat_messages` - AI conversation history with embeddings
- `posts` - Social media content with analytics
- `user_profiles` - User information and preferences
- `content_generations` - AI-generated content tracking

## Development Commands
```bash
npm run dev          # Development server (port 3000)
npm run build        # Production build
npm run lint         # ESLint checking
npm run typecheck    # TypeScript validation
```

## Key Technical Patterns

### Video Processing Pipeline
1. File upload ’ Supabase storage
2. Audio extraction via FFmpeg
3. AI transcription with word-level timing
4. Segment analysis and cutting decisions
5. Professional rendering via Shotstack

### AI Integration
- GPT-5 for content generation and chat
- Whisper for transcription with enhanced timing
- Embedding-based semantic search
- Context-aware conversation memory

### UI/UX Design
- Glass morphism design system
- Professional dark theme
- Responsive timeline editor
- Real-time preview capabilities

## Environment Requirements
```env
OPENAI_API_KEY=sk-...           # GPT-5 and Whisper access
SUPABASE_SERVICE_ROLE_KEY=...   # Database admin access
NEXT_PUBLIC_SUPABASE_URL=...    # Supabase project URL
SHOTSTACK_API_KEY=...           # Video rendering
DEEPGRAM_API_KEY=...            # Transcription fallback
```

## Performance Considerations
- Lazy loading of heavy video components
- Streaming responses for AI generation
- Progressive audio/video processing
- Optimized database queries with RLS
- CDN integration for media assets

## Current Status
- Active development on video editor features
- Professional audio processing pipeline
- Enhanced AI chat with memory
- Multi-platform publishing capabilities
- Real estate-focused content tools

This is a sophisticated, production-ready platform combining advanced video editing with AI-powered social media management, specifically designed for real estate professionals.