import axios from 'axios'

const YT = 'https://www.googleapis.com/youtube/v3'
const KEY = process.env.YOUTUBE_API_KEY

export async function fetchChannelByHandle(handle) {
  const clean = handle.replace(/^@/, '')

  // Try exact handle lookup first
  const resp = await axios.get(`${YT}/channels`, {
    params: { part: 'snippet,statistics', forHandle: clean, key: KEY },
  })
  const item = resp.data.items?.[0]
  if (item) return shapeChannel(item)

  // Fall back to name search (handles display names like "Trevor Wallace")
  const searchResp = await axios.get(`${YT}/search`, {
    params: { part: 'snippet', type: 'channel', q: clean, maxResults: 1, key: KEY },
  })
  const hit = searchResp.data.items?.[0]
  if (!hit) throw new Error(`CREATOR_NOT_FOUND`)
  return fetchChannelById(hit.id.channelId)
}

export async function fetchChannelById(channelId) {
  const resp = await axios.get(`${YT}/channels`, {
    params: { part: 'snippet,statistics', id: channelId, key: KEY },
  })
  const item = resp.data.items?.[0]
  if (!item) throw new Error(`CREATOR_NOT_FOUND`)
  return shapeChannel(item)
}

function shapeChannel(item) {
  const s = item.snippet
  const st = item.statistics || {}
  return {
    channel_id: item.id,
    title: s.title,
    description: s.description,
    created_at: s.publishedAt,   // channel creation date
    subscriber_count: parseInt(st.subscriberCount || 0),
    video_count: parseInt(st.videoCount || 0),
    avatar_url: s.thumbnails?.high?.url || s.thumbnails?.default?.url || '',
  }
}

function shapeVideoItems(items) {
  return items.map(item => {
    const thumbs = item.snippet.thumbnails
    const best = thumbs.maxres || thumbs.standard || thumbs.high || thumbs.medium || thumbs.default || {}
    return {
      video_id: item.id,
      title: item.snippet.title,
      published_at: item.snippet.publishedAt,
      view_count: parseInt(item.statistics?.viewCount || 0),
      like_count: parseInt(item.statistics?.likeCount || 0),
      duration: item.contentDetails?.duration || '',
      thumbnail_url: best.url || '',
      watch_url: `https://www.youtube.com/watch?v=${item.id}`,
    }
  })
}

async function searchAndFetchDetails(params, maxResults = 25) {
  const searchResp = await axios.get(`${YT}/search`, {
    params: { part: 'id', type: 'video', maxResults, key: KEY, ...params },
  })
  const ids = (searchResp.data.items || []).map(i => i.id.videoId).filter(Boolean)
  if (!ids.length) return []

  const detailResp = await axios.get(`${YT}/videos`, {
    params: { part: 'snippet,statistics,contentDetails', id: ids.join(','), key: KEY },
  })
  return shapeVideoItems(detailResp.data.items || [])
}

// Top 25 all-time most-viewed — gives context across the creator's whole history
export async function fetchTopVideos(channelId) {
  return searchAndFetchDetails({ channelId, order: 'viewCount' }, 25)
}

// Fetch historical videos by splitting the channel's full lifetime into up to 3 windows.
// This ensures old channels (CNN, PewDiePie) surface content from every era, not just recent.
export async function fetchEarlyVideos(channelId, channelCreatedAt) {
  const createdYear = new Date(channelCreatedAt).getFullYear()
  const currentYear = new Date().getFullYear()
  const age = currentYear - createdYear

  if (age <= 2) return [] // recent channel — fetchTopVideos already covers it

  // Exclude the last 2 years (fetchTopVideos captures recent viral content)
  const historyEnd = currentYear - 2
  const historySpan = historyEnd - createdYear
  const numWindows = historySpan <= 4 ? 1 : historySpan <= 9 ? 2 : 3
  const windowSize = Math.ceil(historySpan / numWindows)

  const windows = Array.from({ length: numWindows }, (_, i) => ({
    after:  new Date(createdYear + i * windowSize, 0, 1).toISOString(),
    before: new Date(Math.min(createdYear + (i + 1) * windowSize, historyEnd), 11, 31, 23, 59, 59).toISOString(),
  }))

  const results = await Promise.all(
    windows.map(w =>
      searchAndFetchDetails({
        channelId,
        order: 'viewCount',
        publishedAfter: w.after,
        publishedBefore: w.before,
      }, 15).catch(err => {
        console.warn(`Historical window ${w.after.slice(0,4)}–${w.before.slice(0,4)} failed:`, err.message)
        return []
      })
    )
  )

  console.log('Historical windows returned:', results.map(r => r.length), 'videos each')
  return results.flat()
}

// Merge two video lists, deduplicate by video_id, sort oldest → newest
export function mergeAndSort(listA, listB) {
  const seen = new Set()
  return [...listA, ...listB]
    .filter(v => {
      if (seen.has(v.video_id)) return false
      seen.add(v.video_id)
      return true
    })
    .sort((a, b) => new Date(a.published_at) - new Date(b.published_at))
}

// Batch avatar lookup for multiple handles — used by the home screen
export async function fetchAvatars(handles) {
  const results = await Promise.allSettled(handles.map(h => fetchChannelByHandle(h)))
  const out = {}
  handles.forEach((handle, i) => {
    if (results[i].status === 'fulfilled') {
      out[handle] = results[i].value.avatar_url
    }
  })
  return out
}
