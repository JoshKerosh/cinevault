import { Router } from 'express'
import path from 'path'
import fs from 'fs'

const router = Router()
const PROJECT_ROOT = path.resolve(__dirname, '../..')

router.get('/', (_req, res) => {
  const vaultPath = process.env.VAULT_PATH
    ? path.resolve(PROJECT_ROOT, process.env.VAULT_PATH)
    : path.join(PROJECT_ROOT, 'vault')
  const moviesDir = path.join(vaultPath, 'movies')

  if (!fs.existsSync(moviesDir)) {
    res.json({ nodes: [], edges: [] })
    return
  }

  const files = fs.readdirSync(moviesDir).filter((f) => f.endsWith('.md'))
  const nodes: { id: string; label: string }[] = []
  const edges: { source: string; target: string }[] = []
  const fileSet = new Set(files.map((f) => f.replace('.md', '')))

  for (const file of files) {
    const id = file.replace('.md', '')
    nodes.push({ id, label: id })

    const content = fs.readFileSync(path.join(moviesDir, file), 'utf-8')
    const wikilinks = [...content.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1])

    for (const link of wikilinks) {
      if (fileSet.has(link)) {
        edges.push({ source: id, target: link })
      }
    }
  }

  res.json({ nodes, edges })
})

export default router
