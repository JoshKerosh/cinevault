import { Router } from 'express'
import path from 'path'
import fs from 'fs'

const router = Router()

const PROJECT_ROOT = path.resolve(__dirname, '../..')

function parseSimpleFrontmatter(content: string): Record<string, string> {
  const meta: Record<string, string> = {}
  const match = content.match(/^---\n([\s\S]*?)\n---/)
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
      genres: meta.genres ? meta.genres.replace(/[\[\]]/g, '').split(',').map((g) => g.trim()) : [],
      imdb: meta['  imdb'] ? parseFloat(meta['  imdb']) : null,
      director: meta.director || null,
      status: meta.status || null,
    }
  })

  res.json(movies)
})

export default router
