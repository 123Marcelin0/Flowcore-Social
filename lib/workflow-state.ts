export type ProcessingState = 'IDLE' | 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'ERROR'

export type MediaAssetType = 'video' | 'image' | 'audio' | 'vector' | 'other'

export interface MediaAssetDescriptor {
  id?: string
  name?: string
  mimeType?: string
  fileExt?: string
}

export function classifyAsset(asset: MediaAssetDescriptor): MediaAssetType {
  const mime = (asset.mimeType || '').toLowerCase().trim()
  const ext = (asset.fileExt || asset.name || '').toLowerCase().trim()
  if (mime.startsWith('video/')) return 'video'
  if (mime === 'image/svg+xml') return 'vector'
  if (mime === 'application/postscript') return 'vector' // .ai / .eps often use PS
  if (mime === 'application/pdf') return 'vector'
  if (ext.endsWith('.svg') || ext.endsWith('.ai') || ext.endsWith('.eps')) return 'vector'
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('audio/')) return 'audio'
  return 'other'
}

export interface WorkflowSnapshot {
  state: ProcessingState
  queue: MediaAssetType[]
}

export class WorkflowStateMachine {
  private _state: ProcessingState = 'IDLE'
  private _queue: MediaAssetType[] = []

  get state(): ProcessingState { return this._state }
  get queue(): MediaAssetType[] { return [...this._queue] }
  get hasVideo(): boolean { return this._queue.includes('video') }

  snapshot(): WorkflowSnapshot { return { state: this._state, queue: [...this._queue] } }

  reset(): void {
    this._queue = []
    this._state = 'IDLE'
  }

  addAsset(asset: MediaAssetDescriptor): void {
    const t = classifyAsset(asset)
    this._queue.push(t)
  }

  /** Only enters PROCESSING if a video is present */
  startIfNeeded(): boolean {
    if (this.hasVideo) {
      this._state = 'PROCESSING'
      return true
    }
    // vectors/images alone do not start processing
    if (this._state === 'IDLE') this._state = 'PENDING'
    return false
  }

  complete(): void {
    this._state = 'COMPLETE'
  }

  fail(): void {
    this._state = 'ERROR'
  }
}





