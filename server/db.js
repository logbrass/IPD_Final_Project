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

export async function setCachedPage(channelId, data) {
  await getPool().query(
    `INSERT INTO creator_pages (channel_id, data, cached_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (channel_id) DO UPDATE SET data = $2, cached_at = NOW()`,
    [channelId, JSON.stringify(data)]
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
