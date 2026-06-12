import express from 'express'
import cors from 'cors'
import { config } from 'dotenv'
import path from 'path'
import { checkClaude } from './lib/claude'
import queryRoute from './routes/query'
import moviesRoute from './routes/movies'
import graphRoute from './routes/graph'

config({ path: path.resolve(__dirname, '../.env') })

const app = express()
const PORT = process.env.PORT || 8787

app.use(cors())
app.use(express.json())

app.use('/api/query', queryRoute)
app.use('/api/movies', moviesRoute)
app.use('/api/graph', graphRoute)

app.get('/api/health', async (_req, res) => {
  const claudeOk = await checkClaude()
  res.json({ status: 'ok', claudeAvailable: claudeOk })
})

app.listen(PORT, () => {
  console.log(`CineVault backend running on http://localhost:${PORT}`)
})
