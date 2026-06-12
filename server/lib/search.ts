import { spawn } from 'child_process'
import path from 'path'

const PROJECT_ROOT = path.resolve(__dirname, '../..')
const PYTHON = process.platform === 'win32' ? 'python' : 'python3'
const SEARCH_SCRIPT = path.join(PROJECT_ROOT, 'search.py')

export interface Chunk {
  text: string
  file_path: string
  section: string
  title: string
  year: string
  score: number
}

export async function searchVault(query: string, topK = 5): Promise<Chunk[]> {
  return new Promise((resolve, reject) => {
    const child = spawn(PYTHON, [SEARCH_SCRIPT, query, '--top-k', String(topK)], {
      cwd: PROJECT_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
    child.stderr.on('data', (d: Buffer) => { stderr += d.toString() })

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`search.py failed: ${stderr.trim()}`))
        return
      }
      try {
        resolve(JSON.parse(stdout))
      } catch {
        reject(new Error(`Invalid JSON from search.py: ${stdout.slice(0, 200)}`))
      }
    })

    child.on('error', reject)
  })
}
