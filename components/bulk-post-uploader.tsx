"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileText, CheckCircle, AlertCircle, X, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface BulkPostUploaderProps {
  onUploadComplete?: () => void
  onClose?: () => void
}

interface UploadResult {
  success: boolean
  message: string
  totalInserted?: number
  error?: string
}

export function BulkPostUploader({ onUploadComplete, onClose }: BulkPostUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<any[] | null>(null)
  const [progress, setProgress] = useState(0)
  const [useV2Api, setUseV2Api] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.json')) {
      toast.error('Please select a JSON file')
      return
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('File size must be less than 10MB')
      return
    }

    setSelectedFile(file)
    setUploadResult(null)

    // Preview the JSON structure
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      
      if (Array.isArray(data)) {
        setPreviewData(data.slice(0, 3)) // Show first 3 items as preview
      } else if (data.posts && Array.isArray(data.posts)) {
        setPreviewData(data.posts.slice(0, 3))
      } else {
        toast.error('JSON must contain an array of posts or an object with a "posts" array')
        setSelectedFile(null)
        return
      }
    } catch (error) {
      toast.error('Invalid JSON file')
      setSelectedFile(null)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setProgress(0)

    try {
      // Read and parse file
      const text = await selectedFile.text()
      const data = JSON.parse(text)
      
      let posts: any[] = []
      if (Array.isArray(data)) {
        posts = data
      } else if (data.posts && Array.isArray(data.posts)) {
        posts = data.posts
      } else {
        throw new Error('Invalid JSON structure')
      }

      setProgress(25)

      // Get current user session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      setProgress(50)

      // Upload posts using selected API version
      const apiEndpoint = useV2Api ? '/api/bulk-upload-posts-v2' : '/api/bulk-upload-posts';
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ posts })
      })

      setProgress(75)

      const result = await response.json()

      setProgress(100)

      if (result.success) {
        setUploadResult({
          success: true,
          message: result.message,
          totalInserted: result.totalInserted
        })
        toast.success(`Successfully uploaded ${result.totalInserted} posts!`)
        onUploadComplete?.()
      } else {
        setUploadResult({
          success: false,
          message: result.error || 'Upload failed',
          error: result.error
        })
        toast.error(result.error || 'Upload failed')
      }

    } catch (error) {
      console.error('Upload error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      setUploadResult({
        success: false,
        message: errorMessage,
        error: errorMessage
      })
      toast.error(errorMessage)
    } finally {
      setIsUploading(false)
    }
  }

  const handleReset = () => {
    setSelectedFile(null)
    setPreviewData(null)
    setUploadResult(null)
    setProgress(0)
    setUseV2Api(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">Bulk Upload Posts</CardTitle>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* API Version Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Upload Method</label>
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                checked={!useV2Api}
                onChange={() => setUseV2Api(false)}
                className="mr-2"
              />
              <span className="text-sm">Standard Upload</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                checked={useV2Api}
                onChange={() => setUseV2Api(true)}
                className="mr-2"
              />
              <span className="text-sm">SQL Function Upload (bypass user profiles)</span>
            </label>
          </div>
          {useV2Api && (
            <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
              <strong>Note:</strong> This method requires running SQL setup first. If it fails, you'll get instructions.
            </div>
          )}
        </div>

        {/* File Upload Section */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Select JSON File
            </label>
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                {selectedFile ? selectedFile.name : 'Click to select a JSON file'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Maximum file size: 10MB
              </p>
            </div>
          </div>

          {/* Preview Section */}
          {previewData && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Preview (first 3 posts):</h4>
              <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto">
                <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                  {JSON.stringify(previewData, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Expected Format Info */}
          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription className="text-xs">
              <strong>Expected JSON format:</strong> Array of posts or {"{"}"posts": [...]{"}"} object. Each post can have fields like: 
              caption/content/text, image_url/media_url, likes, comments, shares, views, platform, hashtags, etc.
            </AlertDescription>
          </Alert>
        </div>

        {/* Upload Progress */}
        {isUploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Uploading posts...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {/* Upload Result */}
        {uploadResult && (
          <Alert className={uploadResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            {uploadResult.success ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600" />
            )}
            <AlertDescription className={uploadResult.success ? 'text-green-700' : 'text-red-700'}>
              {uploadResult.message}
              {uploadResult.totalInserted && (
                <div className="mt-1 text-sm">
                  {uploadResult.totalInserted} posts were successfully imported and will appear in your dashboard.
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button 
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="flex-1"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Posts
              </>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleReset}
            disabled={isUploading}
          >
            Reset
          </Button>
        </div>

        {/* Instructions */}
        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>Instructions:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Choose upload method: Standard (requires user profile) or SQL Function (bypasses profiles)</li>
            <li>Upload a JSON file containing your social media posts data</li>
            <li>Beiträge werden als "veröffentlicht" markiert und als Erinnerung gespeichert (nicht für zukünftige Veröffentlichungen)</li>
            <li>Supported fields: caption, content, image_url, video_url, likes, comments, shares, views, platform, etc.</li>
            <li>All posts will be imported under your current user account</li>
            <li>Maximum 200 posts per upload</li>
          </ul>
          {useV2Api && (
            <div className="mt-2 p-2 bg-blue-50 rounded text-blue-700">
              <strong>SQL Function Method:</strong> If this fails, run the SQL commands from <code>database/fix-bulk-upload.sql</code> in your Supabase SQL Editor first.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 