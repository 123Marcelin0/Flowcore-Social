import { NextRequest, NextResponse } from 'next/server'

// Static mapping of subtitle styles (IDs + metadata)
const styles = [
  {
    id: 'minimal-bottom',
    name: 'Minimal Bottom',
    description: 'simple bottom bar',
    sample: { fontSize: 54, family: 'Montserrat', color: '#ffffff', bg: '#000000AA' },
  },
  { id: 'boxed-bold', name: 'Boxed Bold', description: 'bold in box' },
  { id: 'kinetic-words', name: 'Kinetic Words', description: 'word-level motion' },
  { id: 'neon-outline', name: 'Neon Outline', description: 'neon with outline' },
  { id: 'split-center', name: 'Split Center', description: 'left speaker/right caption' },
  { id: 'instagram-viral', name: 'Instagram Viral', description: 'big text + shadow + emoji' },
  { id: 'cinematic-duo', name: 'Cinematic Duo', description: 'Inter Black + EB Garamond Italic accents' },
]

export async function GET(_request: NextRequest) {
  return NextResponse.json({ success: true, styles })
}

































