import { Router } from 'express'
import { spawn } from 'child_process'
import path from 'path'

const router = Router()
const PROJECT_ROOT = path.resolve(__dirname, '../..')

function runScript(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const python = path.join(PROJECT_ROOT, '.venv', 'Scripts', 'python.exe')
    const proc = spawn(python, [script], { cwd: PROJECT_ROOT })
    let out = ''
    proc.stdout.on('data', d => { out += d.toString() })
    proc.stderr.on('data', d => { out += d.toString() })
    proc.on('close', code => {
      if (code === 0) resolve(out)
      else reject(new Error(out || `Exit code ${code}`))
    })
  })
}

router.post('/', async (_req, res) => {
  try {
    const fetchLog = await runScript('fetcher.py')
    const indexLog = await runScript('indexer.py')
    res.json({ ok: true, log: fetchLog + '\n' + indexLog })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    res.status(500).json({ ok: false, error: msg })
  }
})

export default router
