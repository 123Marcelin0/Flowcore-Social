"use client"

import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, X } from 'lucide-react'

import { UploadedImage } from './types'

interface FileUploadZoneProps {
  uploadedImages: UploadedImage[]
  onFileUpload: (files: FileList | null) => void
  onRemoveImage: (id: string) => void
}

export function FileUploadZone({ 
  uploadedImages, 
  onFileUpload, 
  onRemoveImage 
}: FileUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
        onDrop={(e) => {
          e.preventDefault()
          onFileUpload(e.dataTransfer.files)
        }}
        onDragOver={(e) => e.preventDefault()}
      >
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-lg font-medium text-gray-600 mb-2">
          Drop images here or click to upload
        </p>
        <p className="text-sm text-gray-500">
          Support for PNG, JPG, HEIC. Max 4MB per image.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => onFileUpload(e.target.files)}
        />
      </div>

      {/* Uploaded Images Grid */}
      {uploadedImages.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          {uploadedImages.map((image) => (
            <div key={image.id} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden border">
                <img
                  src={image.url}
                  alt={image.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <Button
                size="sm"
                variant="destructive"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onRemoveImage(image.id)}
              >
                <X className="w-3 h-3" />
              </Button>
              <p className="text-xs text-gray-600 mt-1 truncate">{image.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
