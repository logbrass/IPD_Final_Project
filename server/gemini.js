import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

function formatDuration(iso) {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!m) return ''
  const h = parseInt(m[1] || 0)
  const min = parseInt(m[2] || 0)
  const s = parseInt(m[3] || 0)
  return h ? `${h}:${String(min).padStart(2,'0')}:${String(s).padStart(2,'0')}`
           : `${min}:${String(s).padStart(2,'0')}`
}

export async function analyzeCreatorEras(channel, videos) {
  const videoList = videos.map(v => {
    const year = new Date(v.published_at).getFullYear()
    const views = v.view_count >= 1e6
      ? `${(v.view_count / 1e6).toFixed(1)}M`
      : `${(v.view_count / 1e3).toFixed(0)}K`
    return `[${v.video_id}] (${year}) "${v.title}" — ${views} views`
  }).join('\n')

  const prompt = `You are a YouTube historian analyzing the channel "${channel.title}".

Below are their most significant videos in chronological order:
${videoList}

Your task: identify 3–6 distinct CONTENT ERAS — not time slices. Each era must be defined by a genuine shift in what the creator was making: a new format, new subject matter, a pivot in style or tone, a viral breakout moment, or a major audience change.

Rules:
- Base era boundaries on CONTENT CHANGES, not equal time intervals. Eras should span MULTIPLE years (e.g. 2006–2010, 2011–2015) — single-year eras are only acceptable when a truly dramatic pivot happened mid-year. Prefer wider spans that capture a sustained creative phase.
- Do NOT create one era per year. Aim for 3–5 broad chapters in the creator's story, each spanning at least 2–4 years unless the channel is very young.
- Give each era a specific, evocative name that captures the vibe (e.g. "Bedroom Gaming Days", "Going Viral", "The Science Years") — not generic labels like "Early Period". Do NOT end every name with the word "Era" — vary the naming style freely.
- The description should explain WHAT changed and WHY this phase was distinct.
- Assign every video to exactly one era. Each era should have at least 2 videos.
- Each era MUST have a unique year range. No two eras may share the same year_start and year_end.
- Eras must not overlap: era N's year_end must be strictly less than era N+1's year_start.

Return ONLY valid JSON — no markdown, no explanation:
{
  "eras": [
    {
      "slug": "kebab-case-id",
      "label": "Era Name (2–4 words)",
      "years": "YYYY – YYYY",
      "year_start": YYYY,
      "year_end": YYYY,
      "description": "2–3 sentences describing what defined this phase and what changed.",
      "video_ids": ["video_id_1", "video_id_2"]
    }
  ]
}`

  const completion = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.5,
  })

  const text = completion.choices[0].message.content.trim()
  const { eras: rawEras } = JSON.parse(text)

  // Deduplicate by label — removes truly identical eras while keeping same-year eras with different content
  const seen = new Set()
  const eras = rawEras
    .sort((a, b) => a.year_start - b.year_start)
    .filter(era => {
      const key = era.label.toLowerCase().trim()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

  const videoMap = Object.fromEntries(videos.map(v => [v.video_id, v]))
  const currentYear = new Date().getFullYear()

  // If all eras collapsed to the same year but the channel has broader history, the
  // AI only saw recent content — fall back so year-based grouping reflects real dates.
  const eraYears = new Set(eras.flatMap(e => [e.year_start, e.year_end]))
  const channelAge = currentYear - new Date(channel.created_at).getFullYear()
  if (eraYears.size === 1 && channelAge > 3) {
    throw new Error(`Era analysis collapsed to ${[...eraYears][0]} despite ${channelAge}-year channel history`)
  }

  return eras.map(era => {
    const yearsDisplay = era.year_end >= currentYear
      ? `${era.year_start} – Current`
      : era.year_start === era.year_end
        ? `${era.year_start}`
        : era.years

    return {
    id: era.slug,
    slug: era.slug,
    label: era.label.toUpperCase(),
    title: era.label,
    years: yearsDisplay,
    year_start: era.year_start,
    year_end: era.year_end,
    description: era.description,
    videos: (era.video_ids || [])
      .map(id => videoMap[id])
      .filter(Boolean)
      .map(v => ({
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
      })),
    }
  })
}
