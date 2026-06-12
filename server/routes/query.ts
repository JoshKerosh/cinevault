import { Router } from 'express'
import { searchVault } from '../lib/search'
import { spawnClaude } from '../lib/claude'
import { buildPrompt } from '../lib/prompts'

const router = Router()

router.post('/', async (req, res) => {
  const { message } = req.body as { message?: string }

  if (!message?.trim()) {
    res.status(400).json({ error: 'message is required' })
    return
  }

  try {
    const topK = parseInt(process.env.TOP_K_RESULTS || '5', 10)
    const chunks = await searchVault(message, topK)

    if (chunks.length === 0) {
      res.json({
        answer: 'No relevant movies found in the vault. Run /ingest to fetch movie data first.',
        movies: [],
        sourcesUsed: [],
        confidence: 'low',
      })
      return
    }

    const prompt = buildPrompt(chunks, message)
    const raw = await spawnClaude(prompt)

    // claude -p --output-format json wraps the response in a result field
    // The result field may contain a markdown ```json ... ``` code block
    let parsed: Record<string, unknown>
    try {
      const outer = JSON.parse(raw)
      let inner = outer?.result ?? outer?.content ?? outer
      if (typeof inner === 'string') {
        // Strip markdown code fences if present
        inner = inner.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
        parsed = JSON.parse(inner)
      } else {
        parsed = inner
      }
    } catch {
      parsed = { answer: raw, movies: [], sourcesUsed: [], confidence: 'low' }
    }

    res.json(parsed)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(500).json({ error: message })
  }
})

export default router
