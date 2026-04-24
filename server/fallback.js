// Creates era groupings from videos purely by year — no AI needed.
// Used when Gemini quota is unavailable.

function formatDuration(iso) {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!m) return ''
  const h = parseInt(m[1] || 0), min = parseInt(m[2] || 0), s = parseInt(m[3] || 0)
  return h ? `${h}:${String(min).padStart(2,'0')}:${String(s).padStart(2,'0')}`
           : `${min}:${String(s).padStart(2,'0')}`
}

function shapeVideo(v) {
  return {
    id: v.video_id,
    video_id: v.video_id,
    title: v.title,
    views: v.view_count >= 1e6
      ? `${(v.view_count / 1e6).toFixed(1)}M`
      : `${(v.view_count / 1e3).toFixed(0)}K`,
    view_count: v.view_count,
    year: new Date(v.published_at).getFullYear().toString(),
    published_at: v.published_at,
    thumb: v.thumbnail_url,
    duration: formatDuration(v.duration),
    watch_url: v.watch_url,
  }
}

export function buildFallbackEras(videos) {
  const years = videos.map(v => new Date(v.published_at).getFullYear())
  const minYear = Math.min(...years)
  const maxYear = Math.max(...years)
  const span = maxYear - minYear

  // Divide history into up to 4 roughly equal chunks
  const numEras = span <= 3 ? 1 : span <= 6 ? 2 : span <= 10 ? 3 : 4
  const chunkSize = Math.ceil(span / numEras)

  const buckets = Array.from({ length: numEras }, (_, i) => ({
    start: minYear + i * chunkSize,
    end: Math.min(minYear + (i + 1) * chunkSize - 1, maxYear),
    videos: [],
  }))

  for (const v of videos) {
    const year = new Date(v.published_at).getFullYear()
    const bucket = buckets.find(b => year >= b.start && year <= b.end) || buckets[buckets.length - 1]
    bucket.videos.push(v)
  }

  const eraNames = ['Early Days', 'Rising Era', 'Peak Era', 'Modern Era']

  return buckets
    .filter(b => b.videos.length > 0)
    .map((b, i) => {
      const label = eraNames[i] || `Era ${i + 1}`
      const slug = label.toLowerCase().replace(/\s+/g, '-')
      return {
        id: slug,
        slug,
        label: label.toUpperCase(),
        title: label,
        years: b.end >= new Date().getFullYear() ? `${b.start} – Current` : b.start === b.end ? `${b.start}` : `${b.start} – ${b.end}`,
        year_start: b.start,
        year_end: b.end,
        description: `Videos from ${b.start}${b.end !== b.start ? `–${b.end}` : ''}, sorted by view count.`,
        videos: b.videos.sort((a, b) => new Date(a.published_at) - new Date(b.published_at)).map(shapeVideo),
      }
    })
}
