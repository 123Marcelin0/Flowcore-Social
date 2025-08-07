# Pixabay Integration & Music Synchronization Setup Guide

## 🎵 Music Synchronization Feature

### What You Need to Adjust

**Nothing!** The music synchronization feature is fully implemented and ready to use. Here's how to try it:

### How to Use Music Synchronization

1. **Go to AI Studio Video Editor**
   - Navigate to your dashboard
   - Click on "AI Studio" → "Video Editor"

2. **Upload Media Files**
   - Go to the "Media Library" tab
   - Upload some videos/images or use the new Pixabay search feature

3. **Add Background Music**
   - Go to the "Timeline" tab
   - Add a background music URL in the "Background Music URL" field
   - You can use any MP3 URL (e.g., from a CDN, your own server, etc.)

4. **Enable Music Sync**
   - In the "Timeline" tab, find the "Music Synchronization" section
   - Check "Enable Music-Synchronized Pacing"
   - Click "Analyze Music" to analyze your music

5. **Configure Pacing**
   - Adjust the sliders for slow motion and fast pace thresholds
   - Enable "Sync Cuts to Beats" for beat synchronization
   - Enable "Dynamic Speed Variations" for variable speeds

6. **Create Video**
   - Click "Create Video" to render with music-synchronized pacing
   - The system will automatically:
     - Analyze your music (BPM, energy, tempo)
     - Generate dynamic pacing (slow motion to fast-paced)
     - Apply clean animations based on music energy
     - Synchronize cuts to musical beats

### Music Sync Features

- **Automatic Speed Variations**: 0.25x (4x slow motion) to 2.5x (fast-paced)
- **Energy-Based Pacing**: Low energy = slow motion, high energy = fast pacing
- **Beat Synchronization**: Cuts synchronized to musical beats
- **Dynamic Animations**: Different animations for different energy levels
- **Clean Transitions**: Smooth transitions between different pacing sections

---

## 🖼️ Pixabay API Integration

### Setup Required

You need to get a Pixabay API key and add it to your environment variables.

### Step 1: Get Pixabay API Key

1. Go to [Pixabay](https://pixabay.com/api/docs/)
2. Sign up for a free account
3. Get your API key from the dashboard
4. The free tier includes:
   - 5,000 requests per hour
   - Access to millions of free images and videos
   - High-quality stock content

### Step 2: Add Environment Variable

Add this to your `.env.local` file:

```bash
PIXABAY_API_KEY=your_pixabay_api_key_here
```

### Step 3: Restart Your Development Server

```bash
pnpm dev
```

### How to Use Pixabay Search

1. **In the Media Library**
   - Click the "Search Pixabay" button
   - Enter your search query (e.g., "nature", "business", "technology")
   - Select media type: All, Images, or Videos
   - Click the search button

2. **Download Media**
   - Browse the search results
   - Click "Download" on any image or video
   - The media will be automatically added to your library
   - You can then use it in your video projects

3. **Features**
   - Search millions of free stock photos and videos
   - Filter by media type (images/videos)
   - Preview before downloading
   - Automatic integration with your media library
   - Proper attribution and licensing information stored

---

## 🚀 Where to Try These Features

### Music Synchronization
- **Location**: AI Studio → Video Editor → Timeline Tab
- **Prerequisites**: 
  - Upload some media files
  - Add a background music URL
- **Result**: Professional music-video quality with automatic pacing

### Pixabay Integration
- **Location**: AI Studio → Video Editor → Media Library Tab
- **Prerequisites**: 
  - Pixabay API key in environment variables
- **Result**: Access to millions of free stock media

---

## 🎯 Example Workflow

### Creating a Music-Synchronized Video

1. **Upload Media**: Add your photos/videos to the media library
2. **Add Music**: Provide a background music URL
3. **Enable Sync**: Turn on music synchronization
4. **Analyze**: Let the system analyze your music
5. **Configure**: Adjust pacing settings if needed
6. **Render**: Create your video with automatic music sync

### Using Pixabay Stock Media

1. **Search**: Use the Pixabay search feature
2. **Browse**: Look through high-quality stock content
3. **Download**: Add media to your library
4. **Use**: Include in your video projects
5. **Create**: Build professional content with stock media

---

## 🔧 Troubleshooting

### Music Sync Issues
- **No music analysis**: Check that your music URL is accessible
- **Fallback to template**: System will use regular templates if music sync fails
- **Slow analysis**: Music analysis takes a few seconds, be patient

### Pixabay Issues
- **API key error**: Make sure `PIXABAY_API_KEY` is set in your environment
- **No results**: Try different search terms
- **Download fails**: Check your internet connection and try again

### General Issues
- **Build errors**: Run `pnpm build` to check for any issues
- **Missing features**: Make sure you're using the latest version
- **Performance**: Music sync works best with shorter videos (under 5 minutes)

---

## 🎉 What You Get

### Music Synchronization
- ✅ Automatic music analysis (BPM, energy, tempo)
- ✅ Dynamic pacing with variable speeds
- ✅ Beat-synchronized cuts
- ✅ Energy-based animations
- ✅ Professional music-video quality
- ✅ No manual timing required

### Pixabay Integration
- ✅ Access to millions of free stock media
- ✅ High-quality images and videos
- ✅ Easy search and download
- ✅ Automatic library integration
- ✅ Proper licensing information
- ✅ No attribution required (Pixabay license)

Both features are now fully integrated into your video editor and ready to use! 