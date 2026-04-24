import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { fetchChannelByHandle, fetchChannelById, fetchTopVideos, fetchEarlyVideos, mergeAndSort, fetchAvatars } from './youtube.js'
import { analyzeCreatorEras } from './gemini.js'
import { buildFallbackEras } from './fallback.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
app.use(cors())
app.use(express.json())

// Batch avatar fetch for the home screen
app.post('/api/avatars', async (req, res) => {
  try {
    const { handles } = req.body
    if (!Array.isArray(handles)) return res.status(400).json({ error: 'handles must be an array' })
    const avatars = await fetchAvatars(handles)
    res.json(avatars)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Single channel info lookup
app.get('/api/channel/:handle', async (req, res) => {
  try {
    const channel = await fetchChannelByHandle(req.params.handle)
    res.json(channel)
  } catch (err) {
    res.status(404).json({ error: err.message })
  }
})

// Full pipeline: fetch top + early videos → era analysis (Gemini or fallback)
app.post('/api/analyze', async (req, res) => {
  try {
    const { handle, channelId } = req.body
    if (!handle && !channelId) {
      return res.status(400).json({ error: 'Provide handle or channelId' })
    }

    const channel = handle
      ? await fetchChannelByHandle(handle)
      : await fetchChannelById(channelId)

    // Fetch top all-time + early-days videos in parallel
    const [topVideos, earlyVideos] = await Promise.all([
      fetchTopVideos(channel.channel_id),
      fetchEarlyVideos(channel.channel_id, channel.created_at),
    ])

    // Merge, deduplicate, sort oldest → newest
    const videos = mergeAndSort(topVideos, earlyVideos)

    const yearDist = videos.reduce((acc, v) => {
      const y = new Date(v.published_at).getFullYear()
      acc[y] = (acc[y] || 0) + 1
      return acc
    }, {})
    console.log(`[${channel.title}] ${videos.length} videos — year distribution:`, yearDist)

    if (!videos.length) {
      return res.status(404).json({ error: 'No videos found for this channel' })
    }

    let eras, geminiUsed = true
    try {
      eras = await analyzeCreatorEras(channel, videos)
    } catch (geminiErr) {
      console.warn('Groq unavailable, using fallback:', geminiErr.message)
      eras = buildFallbackEras(videos)
      geminiUsed = false
    }

    // Filter out eras where year_start > year_end (reversed/invalid ranges)
    eras = eras.filter(e => e.year_start <= e.year_end || e.years?.includes('Current'))

    if (eras.length <= 1) {
      return res.status(422).json({ error: 'INSUFFICIENT_ERAS', channel: channel.title })
    }

    res.json({ channel, eras, geminiUsed })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// In production, serve the built Vite frontend from dist/
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')))
  app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'))
  })
}

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`API server → http://localhost:${PORT}`))
