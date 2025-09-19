#!/usr/bin/env node

// Simple MP4 → MP3 converter using fluent-ffmpeg
// Usage: node convert.js input.mp4

const path = require('path')
const fs = require('fs')

let ffmpeg
try {
  ffmpeg = require('fluent-ffmpeg')
} catch (e) {
  console.error('Error: fluent-ffmpeg is not installed. Run: npm install fluent-ffmpeg')
  process.exit(1)
}

// Try to configure ffmpeg-static if available for portability
try {
  const ffmpegPath = require('ffmpeg-static')
  if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath)
} catch {}

const inputPath = process.argv[2]
if (!inputPath) {
  console.error('Usage: node convert.js <input-video.mp4>')
  process.exit(1)
}

if (!fs.existsSync(inputPath)) {
  console.error(`Error: input file not found: ${inputPath}`)
  process.exit(1)
}

const ext = path.extname(inputPath)
const base = inputPath.slice(0, -ext.length)
const outputPath = `${base}.mp3`

console.log(`🎬 Converting to MP3:`)
console.log(`   Input : ${inputPath}`)
console.log(`   Output: ${outputPath}`)

// Highest possible audio quality for MP3: 320k, 48kHz, 2 channels
// If source is mono/16kHz speech, you could lower these; but the requirement:
// "Ensure the output is highest possible audio quality" → use 320k stereo 48k.

ffmpeg(inputPath)
  .noVideo()
  .audioChannels(2)
  .audioFrequency(48000)
  .audioBitrate('320k')
  .format('mp3')
  .on('start', (cmd) => {
    console.log('🔧 ffmpeg started:')
    console.log(cmd)
  })
  .on('progress', (progress) => {
    if (progress && typeof progress.percent === 'number') {
      const pct = Math.max(0, Math.min(100, progress.percent))
      process.stdout.write(`\r⏳ Progress: ${pct.toFixed(1)}%   `)
    }
  })
  .on('error', (err) => {
    console.error('\n❌ Conversion failed:')
    console.error(err?.message || err)
    if (/ffmpeg/i.test(String(err))) {
      console.error('Hint: Ensure ffmpeg is installed or add ffmpeg-static as a dependency.')
    }
    process.exit(1)
  })
  .on('end', () => {
    console.log('\n✅ Conversion complete!')
    console.log(`   Saved: ${outputPath}`)
  })
  .save(outputPath)

























































