"use client"

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { X, RefreshCw } from 'lucide-react'

import { ImageSettings, VideoSettings, InteriorSettings } from './types'

interface SettingsSidebarProps {
  activeTab: 'image' | 'video' | 'interior'
  imageSettings: ImageSettings
  videoSettings: VideoSettings
  interiorSettings: InteriorSettings
  onImageSettingsChange: (settings: ImageSettings) => void
  onVideoSettingsChange: (settings: VideoSettings) => void
  onInteriorSettingsChange: (settings: InteriorSettings) => void
  onClose: () => void
}

const apiProviders = [
  { value: 'decor8ai', label: 'Decor8AI', description: 'Professional interior design AI' },
  { value: 'aihomedesign', label: 'AI Home Design', description: 'Alternative interior design service' }
]

const roomTypes = [
  'livingroom', 'kitchen', 'diningroom', 'bedroom', 'bathroom', 'kidsroom',
  'familyroom', 'readingnook', 'sunroom', 'walkincloset', 'mudroom', 'toyroom',
  'office', 'foyer', 'powderroom', 'laundryroom', 'gym', 'basement', 'garage',
  'balcony', 'cafe', 'homebar', 'study_room', 'front_porch', 'back_porch',
  'back_patio', 'openplan', 'boardroom', 'meetingroom', 'openworkspace', 'privateoffice'
]

const designStyles = [
  'minimalist', 'scandinavian', 'industrial', 'boho', 'traditional', 'artdeco',
  'midcenturymodern', 'coastal', 'tropical', 'eclectic', 'contemporary', 'frenchcountry',
  'rustic', 'shabbychic', 'vintage', 'country', 'modern', 'asian_zen', 'hollywoodregency',
  'bauhaus', 'mediterranean', 'farmhouse', 'victorian', 'gothic', 'moroccan',
  'southwestern', 'transitional', 'maximalist', 'arabic', 'japandi', 'retrofuturism',
  'artnouveau', 'urbanmodern', 'wabi_sabi', 'grandmillennial', 'coastalgrandmother',
  'newtraditional', 'cottagecore', 'luxemodern', 'high_tech', 'organicmodern',
  'tuscan', 'cabin', 'desertmodern', 'global', 'industrialchic', 'modernfarmhouse',
  'europeanclassic', 'neotraditional', 'warmminimalist'
]

export function SettingsSidebar({
  activeTab,
  imageSettings,
  videoSettings,
  interiorSettings,
  onImageSettingsChange,
  onVideoSettingsChange,
  onInteriorSettingsChange,
  onClose
}: SettingsSidebarProps) {
  const resetSettings = () => {
    if (activeTab === 'image') {
      onImageSettingsChange({
        model: 'dall-e-3',
        size: '1024x1024',
        quality: 'standard',
        style: 'vivid',
        count: 1
      })
    } else if (activeTab === 'video') {
      onVideoSettingsChange({
        model: 'veo-2',
        duration: 5,
        fps: 24,
        resolution: '720p',
        style: 'cinematic',
        motionIntensity: 5,
        cameraMovement: 'static'
      })
    } else {
      onInteriorSettingsChange({
        apiProvider: 'decor8ai',
        service: 'virtual-staging',
        roomType: 'livingroom',
        designStyle: 'modern',
        colorScheme: 'COLOR_SCHEME_0',
        specialityDecor: 'SPECIALITY_DECOR_0',
        numImages: 1,
        scaleFactor: 2,
        matchStyling: false,
        seed: null,
        guidanceScale: 15,
        designCreativity: 0.39,
        wallColorHex: '#FFFFFF'
      })
    }
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-6 overflow-y-auto">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {activeTab === 'image' ? 'Image' : activeTab === 'video' ? 'Video' : 'Interior Design'} Settings
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {activeTab === 'interior' ? (
          // Interior Design Settings
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">API Provider</Label>
              <Select
                value={interiorSettings.apiProvider}
                onValueChange={(value) => onInteriorSettingsChange({ ...interiorSettings, apiProvider: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {apiProviders.map((provider) => (
                    <SelectItem key={provider.value} value={provider.value}>
                      <div>
                        <div className="font-medium">{provider.label}</div>
                        <div className="text-xs text-gray-500">{provider.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Room Type</Label>
              <Select
                value={interiorSettings.roomType}
                onValueChange={(value) => onInteriorSettingsChange({ ...interiorSettings, roomType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roomTypes.map((room) => (
                    <SelectItem key={room} value={room}>
                      {room.charAt(0).toUpperCase() + room.slice(1).replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Design Style</Label>
              <Select
                value={interiorSettings.designStyle}
                onValueChange={(value) => onInteriorSettingsChange({ ...interiorSettings, designStyle: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {designStyles.map((style) => (
                    <SelectItem key={style} value={style}>
                      {style.charAt(0).toUpperCase() + style.slice(1).replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">
                Images per Input: {interiorSettings.numImages}
              </Label>
              <Slider
                value={[interiorSettings.numImages]}
                onValueChange={(value) => onInteriorSettingsChange({ ...interiorSettings, numImages: value[0] })}
                max={4}
                min={1}
                step={1}
                className="w-full"
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">
                Design Creativity: {interiorSettings.designCreativity}
              </Label>
              <Slider
                value={[interiorSettings.designCreativity]}
                onValueChange={(value) => onInteriorSettingsChange({ ...interiorSettings, designCreativity: value[0] })}
                max={1}
                min={0}
                step={0.1}
                className="w-full"
              />
            </div>

            {interiorSettings.service === 'change-wall-color' && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Wall Color</Label>
                <Input
                  type="color"
                  value={interiorSettings.wallColorHex}
                  onChange={(e) => onInteriorSettingsChange({ ...interiorSettings, wallColorHex: e.target.value })}
                  className="w-full h-10"
                />
              </div>
            )}
          </div>
        ) : activeTab === 'image' ? (
          // Image Settings
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Model</Label>
              <Select
                value={imageSettings.model}
                onValueChange={(value) => onImageSettingsChange({ ...imageSettings, model: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dall-e-3">
                    <div>
                      <div className="font-medium">DALL-E 3</div>
                      <div className="text-xs text-gray-500">Latest, highest quality</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="dall-e-2">
                    <div>
                      <div className="font-medium">DALL-E 2</div>
                      <div className="text-xs text-gray-500">Fast and reliable</div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Size</Label>
              <Select
                value={imageSettings.size}
                onValueChange={(value) => onImageSettingsChange({ ...imageSettings, size: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1024x1024">Square (1024x1024)</SelectItem>
                  <SelectItem value="1024x1792">Portrait (1024x1792)</SelectItem>
                  <SelectItem value="1792x1024">Landscape (1792x1024)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Quality</Label>
              <Select
                value={imageSettings.quality}
                onValueChange={(value) => onImageSettingsChange({ ...imageSettings, quality: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="hd">HD Quality</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Style</Label>
              <Select
                value={imageSettings.style}
                onValueChange={(value) => onImageSettingsChange({ ...imageSettings, style: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vivid">Vivid</SelectItem>
                  <SelectItem value="natural">Natural</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          // Video Settings
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Model</Label>
              <Select
                value={videoSettings.model}
                onValueChange={(value) => onVideoSettingsChange({ ...videoSettings, model: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="veo-2">
                    <div>
                      <div className="font-medium">Veo 2</div>
                      <div className="text-xs text-gray-500">Latest Google model</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="veo-3">
                    <div>
                      <div className="font-medium">Veo 3</div>
                      <div className="text-xs text-gray-500">Experimental features</div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">
                Duration: {videoSettings.duration}s
              </Label>
              <Slider
                value={[videoSettings.duration]}
                onValueChange={(value) => onVideoSettingsChange({ ...videoSettings, duration: value[0] })}
                max={30}
                min={3}
                step={1}
                className="w-full"
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Resolution</Label>
              <Select
                value={videoSettings.resolution}
                onValueChange={(value) => onVideoSettingsChange({ ...videoSettings, resolution: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="480p">480p (SD)</SelectItem>
                  <SelectItem value="720p">720p (HD)</SelectItem>
                  <SelectItem value="1080p">1080p (FHD)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">
                Motion Intensity: {videoSettings.motionIntensity}
              </Label>
              <Slider
                value={[videoSettings.motionIntensity]}
                onValueChange={(value) => onVideoSettingsChange({ ...videoSettings, motionIntensity: value[0] })}
                max={10}
                min={1}
                step={1}
                className="w-full"
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Camera Movement</Label>
              <Select
                value={videoSettings.cameraMovement}
                onValueChange={(value) => onVideoSettingsChange({ ...videoSettings, cameraMovement: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="static">Static</SelectItem>
                  <SelectItem value="slow-zoom">Slow Zoom</SelectItem>
                  <SelectItem value="pan-left">Pan Left</SelectItem>
                  <SelectItem value="pan-right">Pan Right</SelectItem>
                  <SelectItem value="crane-up">Crane Up</SelectItem>
                  <SelectItem value="crane-down">Crane Down</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Style</Label>
              <Select
                value={videoSettings.style}
                onValueChange={(value) => onVideoSettingsChange({ ...videoSettings, style: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cinematic">Cinematic</SelectItem>
                  <SelectItem value="documentary">Documentary</SelectItem>
                  <SelectItem value="artistic">Artistic</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Reset Settings */}
        <Button
          variant="outline"
          onClick={resetSettings}
          className="w-full gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Reset to Defaults
        </Button>
      </div>
    </div>
  )
}
