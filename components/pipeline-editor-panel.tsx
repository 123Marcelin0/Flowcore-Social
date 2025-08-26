"use client"
import React from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import SubtitleStyleSelector from "@/components/SubtitleStyleSelector"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"

type MediaFile = {
  id: string
  filename: string
  storage_url: string
  file_type: string
  duration: number | null
}

export default function PipelineEditorPanel() {
  const { session } = useAuth()
  const [loading, setLoading] = React.useState(false)
  const [videos, setVideos] = React.useState<MediaFile[]>([])
  const [selectedId, setSelectedId] = React.useState<string>("")
  const [selectedUrl, setSelectedUrl] = React.useState<string>("")
  const [scriptText, setScriptText] = React.useState<string>("")
  const [targetSeconds, setTargetSeconds] = React.useState<number>(35)
  const [styleId, setStyleId] = React.useState<string>("minimal-bottom")
  const [jobId, setJobId] = React.useState<string>("")
  const [jobStatus, setJobStatus] = React.useState<string>("")
  const [segmentsCount, setSegmentsCount] = React.useState<number | null>(null)
  const [cutCount, setCutCount] = React.useState<number | null>(null)
  const [cutSeconds, setCutSeconds] = React.useState<number | null>(null)
  const [message, setMessage] = React.useState<string>("")
  const [uploading, setUploading] = React.useState(false)
  const [cleanVideoUrl, setCleanVideoUrl] = React.useState<string>("")
  const [cleanVideoStats, setCleanVideoStats] = React.useState<any>(null)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  const loadVideos = React.useCallback(async () => {
    try {
      const headers: Record<string, string> = {}
      const accessToken = (session as any)?.access_token || (session?.user as any)?.access_token || null
      if (accessToken) headers["authorization"] = `Bearer ${accessToken}`
      console.log('🔍 Loading videos with auth:', !!accessToken)
      const res = await fetch(`/api/media-files?file_type=video&limit=50`, { headers })
      console.log('📄 Media-files response:', res.status, res.statusText)
      const json = await res.json()
      console.log('📊 Media-files data:', json)
      const list = Array.isArray(json.data) ? json.data : []
      setVideos(list)
      if (list.length > 0) {
        setSelectedId(list[0].id)
        setSelectedUrl(list[0].storage_url)
        // Clear clean video when switching files
        setCleanVideoUrl("")
        setCleanVideoStats(null)
      } else {
        setSelectedId("")
        setSelectedUrl("")
      }
    } catch (err) {
      console.error('❌ Load videos error:', err)
      setVideos([])
      setSelectedId("")
      setSelectedUrl("")
    }
  }, [session])

  React.useEffect(() => {
    loadVideos()
  }, [loadVideos])

  const onPick = React.useCallback((id: string) => {
    setSelectedId(id)
    const item = videos.find(v => v.id === id)
    setSelectedUrl(item?.storage_url || "")
    // Clear clean video when switching files
    setCleanVideoUrl("")
    setCleanVideoStats(null)
  }, [videos])

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Check file size (50MB limit for Supabase free tier)
    const maxSize = 50 * 1024 * 1024 // 50MB in bytes
    if (file.size > maxSize) {
      setMessage(`File too large: ${Math.round(file.size / 1024 / 1024)}MB. Max: 50MB for upload`)
      return
    }
    
    // Warn about transcription limits
    const fileSizeMB = Math.round(file.size / 1024 / 1024)
    if (fileSizeMB > 25) {
      setMessage(`⚠️ File is ${fileSizeMB}MB. Upload will work, but transcription requires <25MB. Compress before transcribing.`)
    }
    
    setUploading(true)
    setMessage("")
    console.log('📤 Starting upload:', file.name, file.type, file.size, `(${Math.round(file.size / 1024 / 1024)}MB)`)
    
    // Debug auth state - check all possible token locations
    console.log('🔍 Auth debug - session structure:', {
      hasSession: !!session,
      sessionKeys: session ? Object.keys(session) : [],
      hasAccessToken: !!(session as any)?.access_token,
      hasUserAccessToken: !!(session?.user as any)?.access_token,
      fullSession: session // Show complete session object
    })
    
    // Check for different possible token locations in Supabase session
    const possibleTokens = {
      sessionAccessToken: (session as any)?.access_token,
      userAccessToken: (session?.user as any)?.access_token,
      sessionToken: (session as any)?.token,
      userToken: (session?.user as any)?.token,
      sessionRefreshToken: (session as any)?.refresh_token,
      userRefreshToken: (session?.user as any)?.refresh_token
    }
    
    console.log('🔍 Possible tokens found:', Object.entries(possibleTokens).map(([key, value]) => [key, !!value, value?.length || 0]))
    
    // Get access token from the correct location in Supabase session
    let accessToken = possibleTokens.sessionAccessToken || possibleTokens.userAccessToken || possibleTokens.sessionToken || possibleTokens.userToken || null
    
    if (!accessToken) {
      console.error('❌ No access token found in session, trying direct Supabase call...')
      try {
        const { data: { session: freshSession }, error } = await supabase.auth.getSession()
        if (error || !freshSession) {
          console.error('❌ Failed to get fresh session:', error)
          setMessage('Not authenticated - please log in')
          setUploading(false)
          return
        }
        console.log('🔍 Fresh session from Supabase:', freshSession)
        const freshAccessToken = (freshSession as any)?.access_token || (freshSession?.user as any)?.access_token || null
        if (!freshAccessToken) {
          console.error('❌ No access token in fresh session either')
          setMessage('Not authenticated - please log in')
          setUploading(false)
          return
        }
        // Use the fresh token
        accessToken = freshAccessToken
        console.log('✅ Using fresh access token, length:', accessToken.length)
      } catch (e) {
        console.error('❌ Error getting fresh session:', e)
        setMessage('Not authenticated - please log in')
        setUploading(false)
        return
      }
    }
    
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('fileType', 'video')
      const headers: Record<string, string> = {}
      headers["authorization"] = `Bearer ${accessToken}`
      console.log('🔐 Upload with auth token length:', accessToken.length)
      const res = await fetch('/api/media-upload', { method: 'POST', headers, body: form })
      console.log('📡 Upload response:', res.status, res.statusText)
      const json = await res.json()
      console.log('📋 Upload result:', json)
      if (!res.ok) throw new Error(json?.error || 'Upload failed')
      setMessage('Upload complete')
      await loadVideos()
      if (json?.data?.id) {
        setSelectedId(json.data.id)
        setSelectedUrl(json.data.public_url || json.data.storage_url || "")
      }
    } catch (err: any) {
      console.error('❌ Upload error:', err)
      setMessage(err?.message || 'Upload error')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const transcribe = async () => {
    if (!selectedId || !selectedUrl) return
    setLoading(true)
    setMessage("")
    try {
             console.log('🎤 Starting transcription...', { fileUrl: selectedUrl })
       setMessage('Starting transcription (large files will be automatically processed)...')
       const res = await fetch('/api/jobs/transcribe', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ uploadId: selectedId, fileUrl: selectedUrl })
       })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Transcription failed')
      setSegmentsCount(Array.isArray(json.segments) ? json.segments.length : 0)
      setMessage('Transcribed')
      
      // Auto-run alignment if script is provided
      if (scriptText.trim()) {
        console.log('📝 Auto-running script alignment...')
        setMessage('Transcribed. Running alignment...')
        
        // Add a small delay to ensure transcription data is fully committed
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        await alignScript(true)
        
        // Auto-run shot selection after alignment
        console.log('✂️ Auto-running shot selection...')
        setMessage('Aligned. Selecting shots...')
        await selectShots(true)
        
        setMessage('Auto-pipeline completed!')
      }
    } catch (e: any) {
      console.error('❌ Pipeline error:', e)
      setMessage(e?.message || 'Pipeline error')
    } finally {
      setLoading(false)
    }
  }

  const alignScript = async (isAutoPipeline = false) => {
    if (!selectedId || !scriptText.trim()) return
    if (!isAutoPipeline) {
      setLoading(true)
      setMessage("")
    }
    try {
      const res = await fetch('/api/jobs/align-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId: selectedId, scriptText })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Alignment failed')
      const shots = Array.isArray(json.selectedShots) ? json.selectedShots : []
      setCutCount(shots.length)
      const totalMs = shots.reduce((a: number, s: any) => a + Math.max(0, (s.end_ms - s.start_ms)), 0)
      setCutSeconds(Math.round(totalMs / 1000))
      if (!isAutoPipeline) setMessage('Aligned')
    } catch (e: any) {
      if (!isAutoPipeline) setMessage(e?.message || 'Alignment error')
      throw e // Re-throw for auto-pipeline error handling
    } finally {
      if (!isAutoPipeline) setLoading(false)
    }
  }

  const downloadCleanVideo = () => {
    if (!cleanVideoUrl || !selectedId) return
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = cleanVideoUrl
    a.download = `clean_video_${selectedId}.mp4`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const runNewPipeline = async () => {
    if (!selectedId) return
    setLoading(true)
    setMessage("")
    try {
      console.log('🎬 Starting updated speaker-to-camera pipeline...', { uploadId: selectedId, hasScript: !!scriptText.trim() })
      setMessage('Running LLM-based video analysis and editing (this may take a few minutes)...')
      
      const res = await fetch('/api/jobs/speaker-camera-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          uploadId: selectedId, 
          scriptText: scriptText.trim() || undefined,
          outputQuality: 'medium',
          addSubtitles: true,
          generateFiles: true
        })
      })
      
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json?.error || 'New pipeline failed')
      }
      
      // Prefer JSON reply (media saved to library)
      let savedMediaId: string | null = null
      let url: string | null = null
      const contentType = res.headers.get('Content-Type') || ''
      if (contentType.includes('application/json')) {
        const json = await res.json()
        if (!json.success) throw new Error(json?.error || 'Pipeline failed')
        savedMediaId = json.mediaId || null
        url = json.storageUrl || null
      } else {
        // Fallback: previous behavior returned raw video
        const blob = await res.blob()
        url = window.URL.createObjectURL(blob)
      }
      if (url) setCleanVideoUrl(url)
      
      // Simple completion message; stats are embedded in DB metadata
      if (savedMediaId) {
        setMessage('LLM pipeline completed! Saved to library.')
        const openBtn = document.getElementById('open-in-editor-btn') as HTMLButtonElement | null
        if (openBtn) {
          openBtn.onclick = () => {
            window.location.href = `/video-editorneu?mediaId=${encodeURIComponent(savedMediaId!)}`
          }
          openBtn.removeAttribute('disabled')
        }
      } else {
        setMessage('LLM pipeline completed!')
      }
    } catch (e: any) {
      console.error('❌ New pipeline error:', e)
      setMessage(e?.message || 'New pipeline error')
    } finally {
      setLoading(false)
    }
  }

  const createCleanVideo = async () => {
    if (!selectedId || !scriptText.trim()) return
    setLoading(true)
    setMessage("")
    try {
      console.log('🎬 Starting clean video creation...', { uploadId: selectedId, scriptLength: scriptText.length })
      setMessage('Creating clean video (this may take a few minutes)...')
      
      const res = await fetch('/api/jobs/create-clean-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          uploadId: selectedId, 
          scriptText,
          outputQuality: 'medium' // You can make this configurable later
        })
      })
      
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json?.error || 'Clean video creation failed')
      }
      
      // Get video stats from headers
      const videoStats = res.headers.get('X-Video-Stats')
      const alignmentStats = res.headers.get('X-Alignment-Stats')
      
      // Download the video
      const blob = await res.blob()
      const filename = `clean_video_${selectedId}.mp4`
      
      // Create URL for preview and save stats
      const url = window.URL.createObjectURL(blob)
      setCleanVideoUrl(url)
      
      // Parse and save stats
      if (videoStats) {
        const stats = JSON.parse(videoStats)
        setCleanVideoStats(stats)
        setMessage(`Clean video created! Original: ${stats.originalDuration?.toFixed(1)}s → Clean: ${stats.finalDuration?.toFixed(1)}s (${stats.reductionPercentage?.toFixed(1)}% reduction)`)
      } else {
        setMessage('Clean video created!')
      }
      
      // Expose "Open in Editor" CTA if saved (no-op for clean-video endpoint)
    } catch (e: any) {
      console.error('❌ Clean video creation error:', e)
      setMessage(e?.message || 'Clean video creation error')
    } finally {
      setLoading(false)
    }
  }

  const selectShots = async (isAutoPipeline = false) => {
    if (!selectedId) return
    if (!isAutoPipeline) {
      setLoading(true)
      setMessage("")
    }
    try {
      const res = await fetch('/api/jobs/select-shots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId: selectedId, targetSeconds })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Select shots failed')
      const list = Array.isArray(json.cutList) ? json.cutList : []
      setCutCount(list.length)
      const totalMs = list.reduce((a: number, s: any) => a + Math.max(0, (s.end_ms - s.start_ms)), 0)
      setCutSeconds(Math.round(totalMs / 1000))
      if (!isAutoPipeline) setMessage('Selected shots')
    } catch (e: any) {
      if (!isAutoPipeline) setMessage(e?.message || 'Selection error')
      throw e // Re-throw for auto-pipeline error handling
    } finally {
      if (!isAutoPipeline) setLoading(false)
    }
  }

  const preview = async () => {
    if (!selectedId) return
    setLoading(true)
    setMessage("")
    try {
      const res = await fetch('/api/jobs/render-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId: selectedId, cutList: [], styleId })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Preview failed')
      setMessage('Preview edit JSON generated')
    } catch (e: any) {
      setMessage(e?.message || 'Preview error')
    } finally {
      setLoading(false)
    }
  }

  const render = async () => {
    if (!selectedId) return
    setLoading(true)
    setMessage("")
    try {
      const res = await fetch('/api/render/shotstack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId: selectedId, styleId })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Render failed')
      setJobId(json.jobId)
      setJobStatus('submitted')
      setMessage('Render submitted')
    } catch (e: any) {
      setMessage(e?.message || 'Render error')
    } finally {
      setLoading(false)
    }
  }

  const debugMedia = async () => {
    if (!selectedId) return
    try {
      const res = await fetch(`/api/debug-media/${selectedId}`)
      const json = await res.json()
      console.log('🐛 Media debug info:', json)
      setMessage(`Debug: ${json.metadata?.asrSegmentCount || 0} ASR segments found`)
    } catch (e: any) {
      console.error('Debug failed:', e)
      setMessage('Debug failed')
    }
  }

  const debugSession = async () => {
    try {
      const res = await fetch('/api/debug-session')
      const json = await res.json()
      console.log('🔍 Session debug info:', json)
      setMessage(`Session debug - check console`)
    } catch (e: any) {
      console.error('Session debug failed:', e)
      setMessage('Session debug failed')
    }
  }

  const testAuth = async () => {
    try {
      const accessToken = (session as any)?.access_token || (session?.user as any)?.access_token || null
      if (!accessToken) {
        setMessage('No token to test')
        return
      }
      
      const res = await fetch('/api/test-auth', {
        headers: { 'authorization': `Bearer ${accessToken}` }
      })
      const json = await res.json()
      console.log('🧪 Auth test result:', json)
      setMessage(`Auth test: ${json.success ? 'SUCCESS' : 'FAILED'} - check console`)
    } catch (e: any) {
      console.error('Auth test failed:', e)
      setMessage('Auth test failed')
    }
  }

  const convertToMp3 = async () => {
    if (!selectedId || !selectedUrl) return
    setLoading(true)
    setMessage("")
    try {
      console.log('🎵 Starting MP3 conversion...', { fileUrl: selectedUrl })
      setMessage('Converting video to MP3...')
      
      const res = await fetch('/api/convert-to-mp3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId: selectedId, fileUrl: selectedUrl })
      })
      
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json?.error || 'MP3 conversion failed')
      }
      
      // Get the converted file as a blob for download
      const blob = await res.blob()
      const filename = `converted_${selectedId}.mp3`
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      setMessage('MP3 conversion complete! Download started.')
    } catch (e: any) {
      console.error('❌ MP3 conversion error:', e)
      setMessage(e?.message || 'MP3 conversion error')
    } finally {
      setLoading(false)
    }
  }

  const poll = async () => {
    if (!jobId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/render/status/${jobId}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Status error')
      setJobStatus(json.status || '')
      if (json.url) setMessage(`Done: ${json.url}`)
    } catch (e: any) {
      setMessage(e?.message || 'Status error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="m-2 p-3 w-[380px] bg-white/80 backdrop-blur shadow-lg border border-gray-200">
      <div className="text-sm font-semibold mb-2">Speaker-to-camera pipeline</div>
      <div className="mb-2">
        <label className="text-xs text-gray-500">Select video</label>
        <div className="flex items-center gap-2">
          <select
            className="flex-1 border rounded px-2 py-1 text-sm"
            value={selectedId}
            onChange={e => onPick(e.target.value)}
          >
            {videos.map(v => (
              <option key={v.id} value={v.id}>{v.filename}</option>
            ))}
          </select>
          <Button size="sm" variant="ghost" onClick={loadVideos} title="Refresh list">↻</Button>
        </div>
        {videos.length === 0 && (
          <div className="text-[11px] text-gray-500 mt-1">No videos found. Upload below or use the Media button (top bar), then Refresh.</div>
        )}
      </div>

      <div className="mb-3">
        <label className="text-xs text-gray-500">Upload test video</label>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept="video/*" onChange={onUpload} className="text-xs" />
          <Button size="sm" variant="secondary" disabled={uploading}>{uploading ? 'Uploading…' : 'Upload'}</Button>
        </div>
      </div>

             <div className="mb-2 flex items-center gap-2">
         <Button size="sm" onClick={transcribe} disabled={loading || !selectedId}>Transcribe</Button>
         <Button size="sm" variant="outline" onClick={convertToMp3} disabled={loading || !selectedId}>Convert to MP3</Button>
         <Button size="sm" variant="outline" onClick={debugMedia} disabled={!selectedId}>Debug</Button>
         <Button size="sm" variant="outline" onClick={debugSession}>Session</Button>
         <Button size="sm" variant="outline" onClick={testAuth}>Test Auth</Button>
         {segmentsCount != null && (
           <span className="text-xs text-gray-600">segments: {segmentsCount}</span>
         )}
       </div>
      <div className="mb-2">
        <label className="text-xs text-gray-500">Script</label>
        <Textarea value={scriptText} onChange={e => setScriptText(e.target.value)} rows={4} placeholder="Paste script here..." />
      </div>
      <div className="mb-2 flex items-center gap-2">
        <Button size="sm" onClick={() => alignScript()} disabled={loading || !selectedId}>Align script</Button>
        <Button size="sm" variant="outline" onClick={createCleanVideo} disabled={loading || !selectedId || !scriptText.trim()}>Create Clean Video</Button>
        {cutCount != null && (
          <span className="text-xs text-gray-600">shots: {cutCount}{cutSeconds != null ? ` • ${cutSeconds}s` : ''}</span>
        )}
      </div>
      <div className="mb-2 flex items-center gap-2">
        <Button size="sm" variant="default" onClick={runNewPipeline} disabled={loading || !selectedId} className="bg-blue-600 hover:bg-blue-700">
          🤖 LLM Pipeline
        </Button>
        <span className="text-xs text-gray-500">Advanced: LLM analysis + auto-cut + subtitles</span>
        <Button id="open-in-editor-btn" size="sm" variant="secondary" disabled>Open in Editor</Button>
      </div>
      
      {/* Clean Video Preview Section */}
      {cleanVideoUrl && (
        <div className="mb-4 p-3 border border-green-200 rounded-lg bg-green-50">
          <div className="mb-2">
            <label className="text-xs text-green-700 font-medium">Clean Video Preview</label>
            {cleanVideoStats && (
              <div className="text-xs text-green-600 mt-1">
                {cleanVideoStats.originalDuration ? (
                  <>
                    Original: {cleanVideoStats.originalDuration?.toFixed(1)}s → 
                    Clean: {cleanVideoStats.finalDuration?.toFixed(1)}s 
                    ({cleanVideoStats.reductionPercentage?.toFixed(1)}% reduction, 
                    {cleanVideoStats.segmentsKept} segments kept, 
                    {cleanVideoStats.segmentsRemoved} removed)
                  </>
                ) : (
                  <>
                    LLM Analysis: {cleanVideoStats.reductionPercentage?.toFixed(1)}% reduction, 
                    {cleanVideoStats.segmentsKept} segments kept, 
                    {cleanVideoStats.segmentsRemoved} removed
                    {(cleanVideoStats as any).llmModel && ` • Model: ${(cleanVideoStats as any).llmModel}`}
                    {(cleanVideoStats as any).hasScript !== undefined && ` • Script: ${(cleanVideoStats as any).hasScript ? 'Yes' : 'No'}`}
                  </>
                )}
              </div>
            )}
          </div>
          <div className="mb-2">
            <video 
              src={cleanVideoUrl} 
              controls 
              className="w-full max-h-48 rounded border"
              preload="metadata"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={downloadCleanVideo}>
              Download Clean Video
            </Button>
            <Button size="sm" variant="ghost" onClick={() => {
              setCleanVideoUrl("")
              setCleanVideoStats(null)
            }}>
              Clear
            </Button>
          </div>
        </div>
      )}
      
      <div className="mb-2 flex items-center gap-2">
        <label className="text-xs text-gray-500">Target seconds</label>
        <Input type="number" className="w-20 h-8" value={targetSeconds} onChange={e => setTargetSeconds(parseInt(e.target.value || '0', 10))} />
        <Button size="sm" variant="secondary" onClick={() => selectShots()} disabled={loading || !selectedId}>Select shots</Button>
      </div>
      <div className="mb-2">
        <SubtitleStyleSelector value={styleId} onChange={setStyleId} />
      </div>
      <div className="mb-2 flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={preview} disabled={loading || !selectedId}>Preview Edit</Button>
        <Button size="sm" onClick={render} disabled={loading || !selectedId}>Render</Button>
        {jobId && <Button size="sm" variant="ghost" onClick={poll}>Poll</Button>}
      </div>
      <div className="text-xs text-gray-600 min-h-[18px]">{jobId ? `job: ${jobId} • ${jobStatus}` : ''}</div>
      <div className="text-xs text-gray-700 mt-1">{message}</div>
    </Card>
  )
}


