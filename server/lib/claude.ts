import { spawn } from 'child_process'

const CMD = process.env.CINEVAULT_CLAUDE_CMD || 'claude'
const MODEL = process.env.CINEVAULT_MODEL || 'sonnet'

export async function spawnClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(CMD, ['-p', '--output-format', 'json', '--model', MODEL], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
    child.stderr.on('data', (d: Buffer) => { stderr += d.toString() })

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`claude exited ${code}: ${stderr.trim()}`))
      } else {
        resolve(stdout)
      }
    })

    child.on('error', reject)

    child.stdin.write(prompt)
    child.stdin.end()
  })
}

export async function checkClaude(): Promise<boolean> {
  try {
    await spawnClaude('Reply with: {"ok":true}')
    return true
  } catch {
    return false
  }
}
