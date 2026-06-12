import { Router } from 'express'
import path from 'path'
import fs from 'fs'

const router = Router()

const PROJECT_ROOT = path.resolve(__dirname, '../..')

function parseSimpleFrontmatter(content: string): Record<string, string> {
  const meta: Record<string, string> = {}
  // Normalise line endings so the regex works on Windows-written files (\r\n)
  const normalised = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const match = normalised.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return meta
  for (const line of match[1].split('\n')) {
    const colon = line.indexOf(':')
    if (colon === -1) continue
    const key = line.slice(0, colon).trim()
    const val = line.slice(colon + 1).trim()
    meta[key] = val
  }
  return meta
}

function extractSynopsis(content: string): string | null {
  const normalised = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const m = normalised.match(/## Synopsis\n+([\s\S]*?)(?:\n## |$)/)
  return m ? m[1].trim() : null
}

function parseCastArray(raw: string): string[] {
  // Handles: ["Name as Role", "Name as Role"] or plain comma-separated
  try {
    const cleaned = raw.replace(/^[\[\s]+|[\]\s]+$/g, '')
    return cleaned.split(/",\s*"/).map(s => s.replace(/^["']|["']$/g, '').trim()).filter(Boolean)
  } catch {
    return []
  }
}

router.get('/', (_req, res) => {
  const vaultPath = process.env.VAULT_PATH
    ? path.resolve(PROJECT_ROOT, process.env.VAULT_PATH)
    : path.join(PROJECT_ROOT, 'vault')
  const moviesDir = path.join(vaultPath, 'movies')

  if (!fs.existsSync(moviesDir)) {
    res.json([])
    return
  }

  const files = fs.readdirSync(moviesDir).filter((f) => f.endsWith('.md'))
  const movies = files.map((file) => {
    const content = fs.readFileSync(path.join(moviesDir, file), 'utf-8')
    const meta = parseSimpleFrontmatter(content)
    return {
      file,
      title: meta.title || file.replace('.md', ''),
      year: meta.year ? parseInt(meta.year, 10) : null,
      genres: meta.genres ? meta.genres.replace(/[\[\]]/g, '').split(',').map((g) => g.trim().replace(/^["']|["']$/g, '')) : [],
      imdb: meta['imdb'] && meta['imdb'] !== 'None' ? parseFloat(meta['imdb']) : null,
      imdb_votes: meta['imdb_votes'] && meta['imdb_votes'] !== 'None' ? parseInt(meta['imdb_votes'], 10) : null,
      rt: meta['rotten_tomatoes'] && meta['rotten_tomatoes'] !== 'None' ? parseInt(meta['rotten_tomatoes'], 10) : null,
      metacritic: meta['metacritic'] && meta['metacritic'] !== 'None' ? parseInt(meta['metacritic'], 10) : null,
      director: meta.director || null,
      status: meta.status || null,
      poster_url: meta.poster_url || null,
      runtime_minutes: meta.runtime_minutes ? parseInt(meta.runtime_minutes, 10) : null,
      release_date: meta.release_date || null,
      cast: meta.cast ? parseCastArray(meta.cast) : [],
      synopsis: extractSynopsis(content),
      trailer_youtube_key: (meta.trailer_youtube_key && meta.trailer_youtube_key !== 'None') ? meta.trailer_youtube_key : null,
      trakt_rating: meta.trakt_rating ? parseFloat(meta.trakt_rating) : null,
      trakt_votes: meta.trakt_votes ? parseInt(meta.trakt_votes, 10) : null,
    }
  })

  res.json(movies)
})

export default router
