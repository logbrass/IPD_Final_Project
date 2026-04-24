// Run once: node scripts/download-avatars.js
// Downloads YouTube channel avatars to public/avatars/ for static serving.
import 'dotenv/config'
import axios from 'axios'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { fetchChannelByHandle } from '../server/youtube.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, '../public/avatars')

const CREATORS = [
  { id: 'pewdiepie',     handle: 'pewdiepie' },
  { id: 'mrbeast',       handle: 'mrbeast' },
  { id: 'markiplier',    handle: 'markiplier' },
  { id: 'smosh',         handle: 'smosh' },
  { id: 'vsauce',        handle: 'vsauce' },
  { id: 'jacksepticeye', handle: 'jacksepticeye' },
  { id: 'nigahiga',      handle: 'NigaHiga' },
  { id: 'mkbhd',         handle: 'mkbhd' },
  { id: 'markrober',     handle: 'MarkRober' },
  { id: 'rhettlink',     handle: 'GoodMythicalMorning' },
  { id: 'slomo',         handle: 'TheSlowMoGuys' },
  { id: 'lonelygirl15',  handle: 'lonelygirl15' },
]

async function downloadImage(url, destPath) {
  // Request 400px version — just swap the size suffix in the YouTube CDN URL
  const sized = url.replace(/=s\d+-/, '=s400-')
  const resp = await axios.get(sized, { responseType: 'arraybuffer', timeout: 15000 })
  await fs.writeFile(destPath, resp.data)
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true })

  for (const { id, handle } of CREATORS) {
    const dest = path.join(OUT_DIR, `${id}.jpg`)
    try {
      const channel = await fetchChannelByHandle(handle)
      if (!channel.avatar_url) throw new Error('No avatar URL returned')
      await downloadImage(channel.avatar_url, dest)
      console.log(`✓  ${id}  (${channel.title})`)
    } catch (err) {
      console.error(`✗  ${id}  — ${err.message}`)
    }
  }

  console.log('\nDone → public/avatars/')
}

main()
