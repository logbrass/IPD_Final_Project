import pg from 'pg'

const { Pool } = pg

let pool = null

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('railway') || process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
    })
  }
  return pool
}

export async function initDb() {
  const client = await getPool().connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS creator_pages (
        channel_id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    // Add handle column so we can look up by handle without hitting YouTube API
    await client.query(`ALTER TABLE creator_pages ADD COLUMN IF NOT EXISTS handle TEXT`)
    await client.query(`CREATE INDEX IF NOT EXISTS creator_pages_handle ON creator_pages (LOWER(handle))`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        channel_id TEXT NOT NULL,
        era_slug TEXT NOT NULL,
        text TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS comments_channel_era ON comments (channel_id, era_slug)`)
  } finally {
    client.release()
  }
}

// Fallback map for rows cached before the handle column existed.
// Maps normalised handle → possible YouTube channel title strings.
const HANDLE_TITLES = {
  pewdiepie:       ['PewDiePie'],
  mrbeast:         ['MrBeast'],
  markiplier:      ['Markiplier'],
  smosh:           ['Smosh'],
  vsauce:          ['Vsauce'],
  jacksepticeye:   ['jacksepticeye', 'JackSepticEye'],
  nigahiga:        ['nigahiga', 'Ryan Higa'],
  mkbhd:           ['Marques Brownlee', 'MKBHD'],
  markrober:       ['Mark Rober'],
  rhettlink:       ['Rhett & Link', 'RhettandLink'],
  slomo:           ['The Slow Mo Guys', 'The Slo Mo Guys'],
  vanoss:          ['VanossGaming', 'Vanoss Gaming'],
  linus:           ['Linus Tech Tips'],
  veritasium:      ['Veritasium'],
  kurzgesagt:      ['Kurzgesagt – In a Nutshell', 'Kurzgesagt'],
  tomscott:        ['Tom Scott'],
  cgpgrey:         ['CGP Grey'],
  smartereveryday: ['SmarterEveryDay', 'Smarter Every Day'],
  dudeperfect:     ['Dude Perfect'],
  dream:           ['Dream'],
  colinfurze:      ['colinfurze', 'Colin Furze'],
  phillyd:         ['Philip DeFranco'],
  rwj:             ['Ray William Johnson'],
  shanedawson:     ['Shane Dawson'],
  daviddobrik:     ['David Dobrik'],
}

export async function getCachedPageByHandle(handle) {
  const norm = handle.replace(/^@/, '').toLowerCase()

  // 1. Try exact handle column match (works for rows cached after the fix)
  const exact = await getPool().query(
    `SELECT data, cached_at, channel_id FROM creator_pages WHERE LOWER(handle) = $1`,
    [norm]
  )
  if (exact.rows.length) {
    const { data, cached_at } = exact.rows[0]
    const ageDays = (Date.now() - new Date(cached_at).getTime()) / (1000 * 60 * 60 * 24)
    return ageDays > 30 ? null : data
  }

  // 2. Fallback: match by known channel title for rows that predate the handle column
  const titles = HANDLE_TITLES[norm]
  if (!titles) return null

  const titleResult = await getPool().query(
    `SELECT data, cached_at, channel_id FROM creator_pages
     WHERE handle IS NULL
       AND LOWER(data->'channel'->>'title') = ANY($1::text[])
     LIMIT 1`,
    [titles.map(t => t.toLowerCase())]
  )
  if (!titleResult.rows.length) return null

  const { data, cached_at, channel_id } = titleResult.rows[0]
  const ageDays = (Date.now() - new Date(cached_at).getTime()) / (1000 * 60 * 60 * 24)
  if (ageDays > 30) return null

  // Back-fill handle so next request uses the fast path
  getPool().query(`UPDATE creator_pages SET handle = $1 WHERE channel_id = $2`, [norm, channel_id]).catch(() => {})

  return data
}

export async function getCachedPage(channelId) {
  const result = await getPool().query(
    `SELECT data, cached_at FROM creator_pages WHERE channel_id = $1`,
    [channelId]
  )
  if (!result.rows.length) return null
  const { data, cached_at } = result.rows[0]
  const ageDays = (Date.now() - new Date(cached_at).getTime()) / (1000 * 60 * 60 * 24)
  if (ageDays > 30) return null
  return data
}

export async function setCachedPage(channelId, data, handle = null) {
  await getPool().query(
    `INSERT INTO creator_pages (channel_id, data, handle, cached_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (channel_id) DO UPDATE
       SET data = $2,
           handle = COALESCE($3, creator_pages.handle),
           cached_at = NOW()`,
    [channelId, JSON.stringify(data), handle ? handle.replace(/^@/, '').toLowerCase() : null]
  )
}

export async function getComments(channelId, eraSlug) {
  const result = await getPool().query(
    `SELECT id, text, created_at FROM comments
     WHERE channel_id = $1 AND era_slug = $2
     ORDER BY created_at ASC`,
    [channelId, eraSlug]
  )
  return result.rows.map(r => ({
    id: r.id,
    text: r.text,
    time: new Date(r.created_at).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }),
  }))
}

export async function addComment(channelId, eraSlug, text) {
  const result = await getPool().query(
    `INSERT INTO comments (channel_id, era_slug, text)
     VALUES ($1, $2, $3)
     RETURNING id, text, created_at`,
    [channelId, eraSlug, text]
  )
  const r = result.rows[0]
  return {
    id: r.id,
    text: r.text,
    time: 'Just now',
  }
}
