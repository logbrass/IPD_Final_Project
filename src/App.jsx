import { useState, useRef, useEffect } from 'react'
import './index.css'

// Known creators shown on the home screen — handle is the YouTube @handle
const HOME_CREATORS = [
  { id: 'pewdiepie',       name: 'PewDiePie',        handle: 'pewdiepie',           subscribers: '110M', since: 2010 },
  { id: 'mrbeast',         name: 'MrBeast',           handle: 'mrbeast',             subscribers: '320M', since: 2012 },
  { id: 'markiplier',      name: 'Markiplier',        handle: 'markiplier',          subscribers: '36M',  since: 2012 },
  { id: 'smosh',           name: 'Smosh',             handle: 'smosh',               subscribers: '25M',  since: 2005 },
  { id: 'vsauce',          name: 'Vsauce',            handle: 'vsauce',              subscribers: '18M',  since: 2010 },
  { id: 'jacksepticeye',   name: 'jacksepticeye',     handle: 'jacksepticeye',       subscribers: '30M',  since: 2012 },
  { id: 'nigahiga',        name: 'nigahiga',          handle: 'ryanhiga',            subscribers: '21M',  since: 2006 },
  { id: 'mkbhd',           name: 'MKBHD',             handle: 'mkbhd',               subscribers: '21M',  since: 2009 },
  { id: 'markrober',       name: 'Mark Rober',        handle: 'MarkRober',           subscribers: '50M',  since: 2011 },
  { id: 'rhettlink',       name: 'Rhett & Link',      handle: 'GoodMythicalMorning', subscribers: '11M',  since: 2006 },
  { id: 'slomo',           name: 'The Slo Mo Guys',   handle: 'TheSlowMoGuys',       subscribers: '21M',  since: 2010 },
  { id: 'vanoss',          name: 'VanossGaming',      handle: 'VanossGaming',        subscribers: '25M',  since: 2011 },
  { id: 'linus',           name: 'Linus Tech Tips',   handle: 'LinusTechTips',       subscribers: '15M',  since: 2008 },
  { id: 'veritasium',      name: 'Veritasium',        handle: 'veritasium',          subscribers: '17M',  since: 2010 },
  { id: 'kurzgesagt',      name: 'Kurzgesagt',        handle: 'kurzgesagt',          subscribers: '22M',  since: 2013 },
  { id: 'tomscott',        name: 'Tom Scott',         handle: 'TomScottGo',          subscribers: '6.7M', since: 2009 },
  { id: 'cgpgrey',         name: 'CGP Grey',          handle: 'CGPGrey',             subscribers: '6M',   since: 2010 },
  { id: 'smartereveryday', name: 'SmarterEveryDay',   handle: 'smartereveryday',     subscribers: '11M',  since: 2007 },
  { id: 'dudeperfect',     name: 'Dude Perfect',      handle: 'DudePerfect',         subscribers: '60M',  since: 2009 },
  { id: 'dream',           name: 'Dream',             handle: 'Dream',               subscribers: '35M',  since: 2014 },
  { id: 'colinfurze',      name: 'Colin Furze',       handle: 'colinfurze',          subscribers: '13M',  since: 2006 },
  { id: 'phillyD',         name: 'Philip DeFranco',   handle: 'PhilipDeFranco',      subscribers: '6.4M', since: 2006 },
  { id: 'rwj',             name: 'Ray Wm. Johnson',   handle: 'RayWilliamJohnson',   subscribers: '10M',  since: 2009 },
  { id: 'shanedawson',     name: 'Shane Dawson',      handle: 'shanedawson',         subscribers: '19M',  since: 2008 },
  { id: 'daviddobrik',     name: 'David Dobrik',      handle: 'DavidDobrik',         subscribers: '18M',  since: 2015 },
]

// 5 columns — col index 2 is center (first entry = top card, rest = below hero stacked vertically)
const LAYOUT = [
  ['pewdiepie',  'rhettlink',  'markiplier',      'tomscott',    'colinfurze'  ],
  ['mkbhd',      'vanoss',      'linus',           'veritasium',  'cgpgrey'     ],
  ['mrbeast',    'vsauce',     'dream',            'shanedawson'               ], // center
  ['slomo',      'markrober',  'smartereveryday',  'kurzgesagt',  'dudeperfect' ],
  ['smosh',      'nigahiga',   'jacksepticeye',    'rwj',         'phillyD'     ],
]

async function fetchCreatorData(handle) {
  const resp = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ handle }),
  })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: resp.statusText }))
    if (err.error === 'INSUFFICIENT_ERAS') {
      throw new Error(`INSUFFICIENT_ERAS:${err.channel || handle}`)
    }
    throw new Error(err.error || 'Server error')
  }
  return resp.json()
}

// ── LOADING SCREEN ────────────────────────────────────────────────────────────

function LoadingScreen({ creatorName }) {
  const [dots, setDots] = useState('.')
  const [phase, setPhase] = useState(0)
  const phases = [
    `Fetching ${creatorName}'s videos from YouTube`,
    'Mapping eras and timelines',
  ]
  useEffect(() => {
    const d = setInterval(() => setDots(p => p.length >= 3 ? '.' : p + '.'), 400)
    const p = setInterval(() => setPhase(x => Math.min(x + 1, phases.length - 1)), 2500)
    return () => { clearInterval(d); clearInterval(p) }
  }, [])
  return (
    <div className="loading-screen">
      <div className="loading-inner">
        <div className="loading-spinner" />
        <p className="loading-phase">{phases[phase]}{dots}</p>
      </div>
    </div>
  )
}

// ── HOME SCREEN ───────────────────────────────────────────────────────────────

function CreatorCard({ creator, onSelect, avatarUrl }) {
  const staticSrc = `/avatars/${creator.id}.jpg`
  const [src, setSrc] = useState(staticSrc)
  const [visible, setVisible] = useState(false)

  // Upgrade to live YouTube URL when it arrives — don't hide the existing image
  useEffect(() => {
    if (avatarUrl) setSrc(avatarUrl)
  }, [avatarUrl])

  return (
    <div className="creator-card" onClick={() => onSelect(creator)}>
      <div className="creator-card-avatar-wrap">
        <img
          src={src}
          alt=""
          className="creator-card-avatar"
          style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.3s' }}
          onLoad={() => setVisible(true)}
          onError={() => {
            // YouTube URL failed → fall back to static file
            if (src !== staticSrc) setSrc(staticSrc)
            // Static also failed → stays hidden (visible remains false)
          }}
        />
      </div>
      <div className="creator-card-name">{creator.name}</div>
      <div className="creator-card-subs">{creator.subscribers} subscribers</div>
      <div className="creator-card-pill">{creator.since} → now</div>
    </div>
  )
}

function HomeScreen({ onSelectCreator }) {
  const [query, setQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [avatarUrls, setAvatarUrls] = useState({})

  useEffect(() => {
    fetch('/api/avatars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handles: HOME_CREATORS.map(c => c.handle) }),
    })
      .then(r => r.json())
      .then(data => { if (data && typeof data === 'object') setAvatarUrls(data) })
      .catch(() => {})
  }, [])

  const suggestions = HOME_CREATORS.filter(c =>
    query && c.name.toLowerCase().includes(query.toLowerCase())
  )

  const handleSuggestion = (creator) => {
    onSelectCreator(creator)
    setQuery('')
    setShowSuggestions(false)
  }

  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter' && query.trim()) {
      // Allow searching any YouTube handle
      const existing = HOME_CREATORS.find(c => c.name.toLowerCase() === query.toLowerCase())
      if (existing) {
        onSelectCreator(existing)
      } else {
        // Treat the query as a YouTube @handle for any channel
        onSelectCreator({ id: query.toLowerCase(), name: query, handle: query.replace(/^@/, '') })
      }
      setQuery('')
      setShowSuggestions(false)
    }
  }

  return (
    <div className="home-bg">
      <div className="home-cols">
        {LAYOUT.map((col, ci) => (
          <div
            key={ci}
            className={`home-col${ci === 2 ? ' home-col-center' : ''}`}
            style={{ paddingTop: [40, 140, 40, 140, 40][ci] }}
          >
            {ci === 2 ? (
              <>
                <div className="center-cards-top">
                  {col.slice(0, 1).map(id => {
                    const c = HOME_CREATORS.find(x => x.id === id)
                    return c ? <CreatorCard key={id} creator={c} onSelect={onSelectCreator} avatarUrl={avatarUrls[c.handle]} /> : null
                  })}
                </div>

                <div className="home-hero">
                  <h1 className="home-title">That's History</h1>
                  <p className="home-subtitle">
                    Rediscover creators before the algorithm<br />
                    changed them — or search any YouTube handle.
                  </p>
                  <div className="search-wrap">
                    <input
                      className="search-input"
                      placeholder="Search creator or @handle"
                      value={query}
                      onChange={e => { setQuery(e.target.value); setShowSuggestions(true) }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                      onKeyDown={handleSearchSubmit}
                    />
                    {showSuggestions && suggestions.length > 0 && (
                      <div className="search-dropdown">
                        {suggestions.map(c => (
                          <div key={c.id} className="search-suggestion" onMouseDown={() => handleSuggestion(c)}>
                            {c.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="center-cards-bot">
                  {col.slice(1).map(id => {
                    const c = HOME_CREATORS.find(x => x.id === id)
                    return c ? <CreatorCard key={id} creator={c} onSelect={onSelectCreator} avatarUrl={avatarUrls[c.handle]} /> : null
                  })}
                </div>
              </>
            ) : (
              col.map(id => {
                const c = HOME_CREATORS.find(x => x.id === id)
                return c ? <CreatorCard key={id} creator={c} onSelect={onSelectCreator} avatarUrl={avatarUrls[c.handle]} /> : null
              })
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── VIEW REEL MODAL ───────────────────────────────────────────────────────────

function seededRand(n) {
  const x = Math.sin(n + 1) * 10000
  return x - Math.floor(x)
}

function ViewReelModal({ creatorData, onClose }) {
  const allVideos = creatorData.eras.flatMap(era => era.videos)
  const [currentIdx, setCurrentIdx] = useState(0)
  const filmRef = useRef(null)
  const scrollAcc = useRef(0)
  const currentVideo = allVideos[currentIdx]

  // Year markers: place each year at the proportional position of its first video
  const yearMarkers = (() => {
    const years = allVideos.map(v => parseInt(v.year))
    const minYear = Math.min(...years)
    const maxYear = Math.max(...years)
    const markers = []
    for (let y = minYear; y <= maxYear; y++) {
      const firstIdx = allVideos.findIndex(v => parseInt(v.year) >= y)
      if (firstIdx !== -1) {
        markers.push({ year: y, pct: (firstIdx / Math.max(allVideos.length - 1, 1)) * 100 })
      }
    }
    return markers
  })()

  useEffect(() => {
    const strip = filmRef.current
    if (!strip) return
    const thumb = strip.children[currentIdx]
    if (!thumb) return
    const maxScroll = strip.scrollWidth - strip.clientWidth
    const target = thumb.offsetLeft + thumb.offsetWidth / 2 - strip.clientWidth / 2
    strip.scrollTo({ left: Math.max(0, Math.min(target, maxScroll)), behavior: 'smooth' })
  }, [currentIdx])

  const handleWheel = (e) => {
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
    scrollAcc.current += delta
    const threshold = 40
    if (Math.abs(scrollAcc.current) >= threshold) {
      const steps = Math.trunc(scrollAcc.current / threshold)
      setCurrentIdx(prev => Math.max(0, Math.min(allVideos.length - 1, prev + steps)))
      scrollAcc.current = 0
    }
  }

  const handleScrub = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    const ratio = x / rect.width
    setCurrentIdx(Math.max(0, Math.min(allVideos.length - 1, Math.floor(ratio * allVideos.length))))
  }

  const seed = creatorData.channel.title.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const BARS = 280
  const waveHeights = Array.from({ length: BARS }, (_, i) =>
    Math.max(3, Math.round(seededRand(i * 2.3 + seed) * 38 + seededRand(i * 0.7 + seed) * 12 + 4))
  )

  return (
    <div className="reel-overlay" onClick={onClose} onWheel={handleWheel}>
      <div className="reel-modal" onClick={e => e.stopPropagation()}>
        <button className="reel-close" onClick={onClose}>✕</button>

        <div className="reel-player">
          <a href={currentVideo.watch_url} target="_blank" rel="noreferrer" style={{ display: 'block' }}>
            <img
              src={currentVideo.thumb}
              alt={currentVideo.title}
              className="reel-player-img"
              onError={e => { e.target.src = 'https://placehold.co/680x360/111/444?text=video' }}
            />
          </a>
        </div>

        <div className="reel-timeline">
          <div className="reel-filmstrip" ref={filmRef}>
            {allVideos.map((v, i) => (
              <div
                key={v.id}
                className={`reel-thumb${i === currentIdx ? ' reel-thumb-active' : ''}`}
                onClick={() => setCurrentIdx(i)}
              >
                <img src={v.thumb} alt="" onError={e => { e.target.src = 'https://placehold.co/56x36/333/555?text=.' }} />
              </div>
            ))}
          </div>

          <div className="reel-years" style={{ position: 'relative', display: 'block' }}>
            {yearMarkers.map(({ year, pct }) => (
              <span
                key={year}
                className="reel-year"
                style={{ position: 'absolute', left: `${pct}%`, transform: 'translateX(-50%)' }}
              >
                {year}
              </span>
            ))}
          </div>

          <div
            className="reel-waveform-wrap"
            onPointerDown={handleScrub}
            onPointerMove={e => { if (e.buttons === 1) handleScrub(e) }}
            style={{ cursor: 'ew-resize' }}
          >
            <div className="reel-waveform">
              {waveHeights.map((h, i) => {
                const isActive = (i / (BARS - 1)) <= (currentIdx / Math.max(allVideos.length - 1, 1))
                return <div key={i} className="reel-bar" style={{ height: h, background: isActive ? '#fff' : '#2e2e2e' }} />
              })}
            </div>
            <div className="reel-playhead" style={{ left: `${(currentIdx / Math.max(allVideos.length - 1, 1)) * 100}%` }} />
          </div>
        </div>

        <div className="reel-label">
          <span className="reel-label-title">{currentVideo.title}</span>
          <span className="reel-label-meta">{currentVideo.views} views · {currentVideo.year}</span>
        </div>
      </div>
    </div>
  )
}

// ── CREATOR ERAS PAGE ─────────────────────────────────────────────────────────

function CreatorAvatar({ creatorData, size = 48, className, style }) {
  const staticSrc = creatorData.creatorId ? `/avatars/${creatorData.creatorId}.jpg` : null
  const [src, setSrc] = useState(staticSrc || creatorData.channel.avatar_url)
  const [loaded, setLoaded] = useState(false)
  const s = { width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, ...style }
  if (!src) return null
  return (
    <img
      src={src}
      alt=""
      className={className}
      style={{ ...s, display: loaded ? 'block' : 'none' }}
      onLoad={() => setLoaded(true)}
      onError={() => {
        if (src !== creatorData.channel.avatar_url) setSrc(creatorData.channel.avatar_url)
      }}
    />
  )
}

function CreatorPage({ creatorData, onBack, onSelectEra }) {
  const { channel, eras } = creatorData
  const [activeEra, setActiveEra] = useState(eras[0])
  const [showReel, setShowReel] = useState(false)

  return (
    <div className="cp-page">
      <div className="cp-header">
        <button className="back-btn" onClick={onBack}>← BACK</button>
        <div className="cp-header-body">
          <div className="cp-header-left">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <CreatorAvatar creatorData={creatorData} size={48} />
              <h1 className="cp-title">{channel.title}'s Eras</h1>
            </div>
            <button className="cp-view-reel" onClick={() => setShowReel(true)}>
              <span>►</span> VIEW REEL
            </button>
          </div>
          <div>
            <p className="cp-header-desc" style={{ marginBottom: 4 }}>
              {channel.subscriber_count.toLocaleString()} subscribers · {channel.video_count.toLocaleString()} videos
            </p>
            <p className="cp-header-desc" style={{ fontStyle: 'italic', opacity: 0.7 }}>
              From {eras[0].title} → {eras[eras.length - 1].title}
            </p>
          </div>
        </div>
      </div>

      <div className="cp-timeline-wrap">
        <div
          className="cp-timeline-nodes"
          style={{ transform: `translateX(calc(-${eras.findIndex(e => e.id === activeEra.id)} * 350px + 15vw))` }}
        >
          <div className="cp-timeline-line" />
          {eras.map(era => (
            <div
              key={era.id}
              className={`cp-era-node${activeEra.id === era.id ? ' active' : ''}`}
              onClick={() => setActiveEra(era)}
            >
              <div className="cp-era-node-top">
                <span className="cp-era-date">{era.years}</span>
                <span className="cp-era-name">{era.label}</span>
              </div>
              <div className="cp-era-dot" />
            </div>
          ))}
        </div>
      </div>

      <div className="cp-content-outer">
        <div
          className="cp-content-track"
          style={{ transform: `translateX(calc(-${eras.findIndex(e => e.id === activeEra.id)} * 60vw + 15vw))` }}
        >
          {eras.map((era, i) => {
            const activeIndex = eras.findIndex(e => e.id === activeEra.id)
            const isActive = i === activeIndex
            return (
              <div
                key={era.id}
                className={`cp-content-panel${isActive ? ' cp-panel-active' : ' cp-panel-inactive'}`}
                onClick={!isActive ? () => setActiveEra(era) : undefined}
              >
                <p className="cp-content-desc">{era.description}</p>
                <div className="cp-videos-scroll">
                  {era.videos.map(v => (
                    <a
                      key={v.id}
                      href={v.watch_url}
                      target="_blank"
                      rel="noreferrer"
                      className="cp-video-card"
                      style={{ textDecoration: 'none' }}
                    >
                      <div className="cp-video-thumb-wrap">
                        <img
                          src={v.thumb}
                          alt={v.title}
                          className="cp-video-thumb"
                          onError={e => { e.target.src = 'https://placehold.co/260x148/333/666?text=video' }}
                        />
                        <span className="cp-video-duration">{v.duration}</span>
                      </div>
                      <div className="cp-video-title">{v.title}</div>
                      <div className="cp-video-meta">{v.views} views · {v.year}</div>
                    </a>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="cp-footer">
        <button className="enter-era-btn" onClick={() => onSelectEra(activeEra)}>
          → Enter this era
        </button>
      </div>

      {showReel && <ViewReelModal creatorData={creatorData} onClose={() => setShowReel(false)} />}
    </div>
  )
}

// ── MEME WALL ─────────────────────────────────────────────────────────────────

const GIPHY_KEY = 'dc6zaTOxFJmzC'

function MemeWall({ era, channel }) {
  const [memes, setMemes] = useState([])
  const [uploads, setUploads] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const query = encodeURIComponent(`${channel.title} ${era.year_start} meme`)
    fetch(`https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${query}&limit=5&rating=pg`)
      .then(r => r.json())
      .then(data => { setMemes(data.data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [era.year_start, channel.title])

  const handleUpload = (e) => {
    Array.from(e.target.files).forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => setUploads(prev => [...prev, { src: ev.target.result, name: file.name }])
      reader.readAsDataURL(file)
    })
  }

  const allItems = [
    ...uploads.map(u => ({ type: 'upload', src: u.src, alt: u.name })),
    ...memes.map(g => ({ type: 'giphy', src: g.images?.fixed_height_small?.url, alt: g.title, link: g.url })),
  ]

  return (
    <div>
      <div className="section-header">
        <h3 className="section-title">FROM THIS ERA</h3>
        <label className="meme-upload-btn">
          + Upload
          <input type="file" accept="image/*" multiple onChange={handleUpload} style={{ display: 'none' }} />
        </label>
      </div>
      {loading && <p style={{ color: '#aaa', fontSize: 12 }}>Loading memes...</p>}
      {!loading && allItems.length === 0 && (
        <p style={{ color: '#aaa', fontSize: 12 }}>No content found. Upload your own!</p>
      )}
      <div className="meme-grid">
        {allItems.map((item, i) =>
          item.type === 'giphy' ? (
            <a key={i} href={item.link} target="_blank" rel="noreferrer" className="meme-cell">
              <img src={item.src} alt={item.alt} className="meme-img" />
            </a>
          ) : (
            <div key={i} className="meme-cell">
              <img src={item.src} alt={item.alt} className="meme-img" />
            </div>
          )
        )}
      </div>
    </div>
  )
}

// ── ERA DETAIL PAGE ───────────────────────────────────────────────────────────

function EraDetailPage({ creatorData, era, onBack }) {
  const { channel } = creatorData
  const [selectedVideo, setSelectedVideo] = useState(null)
  const [comments, setComments] = useState([])
  const [draft, setDraft] = useState('')

  useEffect(() => {
    fetch(`/api/creator/${channel.channel_id}/comments/${era.slug}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setComments(data) })
      .catch(() => {})
  }, [channel.channel_id, era.slug])

  const handleComment = async (e) => {
    if ((e.key === 'Enter' || e.type === 'click') && draft.trim()) {
      const text = draft.trim()
      setDraft('')
      try {
        const resp = await fetch(`/api/creator/${channel.channel_id}/comments/${era.slug}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        })
        const comment = await resp.json()
        setComments(prev => [...prev, comment])
      } catch {
        setComments(prev => [...prev, { text, time: 'Just now' }])
      }
    }
  }

  return (
    <div className="era-page">
      <div className="era-container">
        <button className="back-btn" onClick={onBack}>← BACK</button>

        <div className="era-layout">
          <div className="era-main">
            <div className="era-hero">
              <span className="era-year-pill">{era.years}</span>
              <h1 className="era-display-title">{era.title}</h1>
              <p className="era-display-desc">{era.description}</p>
            </div>

            <div className="era-video-grid">
              {era.videos.map(v => (
                <a
                  key={v.id}
                  href={v.watch_url}
                  target="_blank"
                  rel="noreferrer"
                  className="era-vcard"
                  style={{ textDecoration: 'none' }}
                  onClick={e => { e.preventDefault(); setSelectedVideo(v) }}
                >
                  <div className="era-vthumb-wrap">
                    <img src={v.thumb} alt={v.title} className="era-vthumb"
                      onError={e2 => { e2.target.src = 'https://placehold.co/320x180/333/666?text=video' }} />
                    <span className="era-vduration">{v.duration}</span>
                  </div>
                  <div className="era-vinfo">
                    <h4 className="era-vtitle">{v.title}</h4>
                    <p className="era-vmeta">{v.views} views • {v.year}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>

          <div className="era-sidebar">
            <div className="sidebar-section from-era">
              <MemeWall era={era} channel={channel} />
            </div>

            <div className="sidebar-section comments-box">
              <div className="comments-scroll">
                {comments.map((c, i) => (
                  <div key={i} className="comment-bubble">
                    <p className="comment-text">{c.text}</p>
                    <span className="comment-time">{c.time}</span>
                  </div>
                ))}
              </div>
              <div className="comment-input-wrap">
                <input
                  type="text"
                  placeholder="Type a comment"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={handleComment}
                  className="era-input"
                />
                <button className="send-btn" onClick={handleComment}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedVideo && (
        <VideoModal video={selectedVideo} channel={channel} era={era} onClose={() => setSelectedVideo(null)} />
      )}
    </div>
  )
}

// ── VIDEO MODAL ───────────────────────────────────────────────────────────────

function VideoModal({ video, channel, era, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-inner" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-beta">LIVE</span>
          <span className="modal-creator-name">{channel.title}'s Eras</span>
          <span className="modal-era-desc">{era.description}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-player">
          <img
            src={video.thumb}
            alt={video.title}
            className="modal-player-img"
            onError={e => { e.target.src = 'https://placehold.co/600x340/333/666?text=video' }}
          />
          <div className="modal-video-title">{video.title}</div>
          <div className="modal-video-meta">{video.views} views · {video.year}</div>
        </div>
        <div className="modal-footer">
          <a href={video.watch_url} target="_blank" rel="noreferrer" className="modal-enter-era">
            → Watch on YouTube
          </a>
        </div>
      </div>
    </div>
  )
}

// ── ERROR SCREEN ──────────────────────────────────────────────────────────────

function ErrorScreen({ message, onBack }) {
  const notFound = message?.includes('CREATOR_NOT_FOUND')
  const insufficientEras = message?.startsWith('INSUFFICIENT_ERAS:')
  const channelName = insufficientEras ? message.replace('INSUFFICIENT_ERAS:', '') : null

  if (insufficientEras) {
    return (
      <div className="loading-screen">
        <div className="loading-inner">
          <p style={{ color: '#ff6b6b', fontSize: 20, marginBottom: 16, fontWeight: 700 }}>
            Sorry - That's History doesn't support {channelName}
          </p>
          <p style={{ color: '#aaa', fontSize: 14, marginBottom: 32, lineHeight: 1.6, maxWidth: 420, textAlign: 'center' }}>
            This could be because they haven't meaningfully changed their content over time,
            or their data is no longer - or never was - available on YouTube.
          </p>
          <button className="back-btn" style={{ color: '#fff' }} onClick={onBack}>← Return home</button>
        </div>
      </div>
    )
  }

  return (
    <div className="loading-screen">
      <div className="loading-inner">
        <p style={{ color: '#ff6b6b', fontSize: 18, marginBottom: 16 }}>
          {notFound ? "Sorry - That's History doesn't support that creator" : 'Failed to load creator'}
        </p>
        {!notFound && (
          <p style={{ color: '#aaa', fontSize: 14, marginBottom: 24 }}>{message}</p>
        )}
        {notFound && (
          <p style={{ color: '#666', fontSize: 13, marginBottom: 24 }}>
            Try searching with their YouTube @handle instead.
          </p>
        )}
        <button className="back-btn" style={{ color: '#fff' }} onClick={onBack}>← Return home</button>
      </div>
    </div>
  )
}

// ── APP ROOT ──────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState('home')
  const [creatorData, setCreatorData] = useState(null)  // { channel, eras }
  const [era, setEra] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingName, setLoadingName] = useState('')
  const [error, setError] = useState(null)

  const goHome = () => { setScreen('home'); setCreatorData(null); setEra(null); setError(null) }

  const goCreator = async (creator) => {
    setLoadingName(creator.name)
    setLoading(true)
    setError(null)
    setScreen('loading')
    try {
      const data = await fetchCreatorData(creator.handle || creator.id)
      setCreatorData({ ...data, creatorId: creator.id })
      setScreen('creator')
    } catch (err) {
      setError(err.message)
      setScreen('error')
    } finally {
      setLoading(false)
    }
  }

  const goEra = (e) => { setEra(e); setScreen('era') }
  const goBackToCreator = () => { setEra(null); setScreen('creator') }

  return (
    <div className="App">
      {screen === 'home' && <HomeScreen onSelectCreator={goCreator} />}
      {screen === 'loading' && <LoadingScreen creatorName={loadingName} />}
      {screen === 'error' && <ErrorScreen message={error} onBack={goHome} />}
      {screen === 'creator' && creatorData && (
        <CreatorPage creatorData={creatorData} onBack={goHome} onSelectEra={goEra} />
      )}
      {screen === 'era' && creatorData && era && (
        <EraDetailPage creatorData={creatorData} era={era} onBack={goBackToCreator} />
      )}
    </div>
  )
}
