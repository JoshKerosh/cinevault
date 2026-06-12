#!/usr/bin/env tsx
/**
 * CineVault MCP server — exposes the vault as tools for Claude Code / Claude Desktop.
 * Run: tsx server/mcp.ts
 * Add to Claude Code settings under mcpServers.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { config } from 'dotenv'
import path from 'path'
import { spawn } from 'child_process'

config({ path: path.resolve(__dirname, '../.env') })

const PROJECT_ROOT = path.resolve(__dirname, '..')
const PYTHON = process.platform === 'win32' ? 'python' : 'python3'

async function runSearch(query: string, topK: number): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const child = spawn(PYTHON, [path.join(PROJECT_ROOT, 'search.py'), query, '--top-k', String(topK)], {
      cwd: PROJECT_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let out = ''
    child.stdout.on('data', (d: Buffer) => { out += d.toString() })
    child.on('close', (code) => {
      if (code !== 0) { reject(new Error('search failed')); return }
      try { resolve(JSON.parse(out)) } catch { reject(new Error('invalid JSON')) }
    })
  })
}

import fs from 'fs'

function getVaultDir(): string {
  const vp = process.env.VAULT_PATH || './vault'
  return path.resolve(PROJECT_ROOT, vp, 'movies')
}

function readMovieFile(title: string): string | null {
  const dir = getVaultDir()
  if (!fs.existsSync(dir)) return null
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'))
  const match = files.find((f) => f.toLowerCase().includes(title.toLowerCase()))
  if (!match) return null
  return fs.readFileSync(path.join(dir, match), 'utf-8')
}

function listMovieFiles(): string[] {
  const dir = getVaultDir()
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).filter((f) => f.endsWith('.md'))
}

const server = new Server(
  { name: 'cinevault', version: '1.0.0' },
  { capabilities: { tools: {} } }
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'search_vault',
      description: 'Semantic search of the CineVault movie database',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          top_k: { type: 'number', description: 'Number of results (default 5)' },
        },
        required: ['query'],
      },
    },
    {
      name: 'get_movie',
      description: 'Read a specific movie note from the vault by title',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Movie title (partial match ok)' },
        },
        required: ['title'],
      },
    },
    {
      name: 'list_movies',
      description: 'List all movies in the vault',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'get_upcoming',
      description: 'Read the most recent upcoming releases digest',
      inputSchema: { type: 'object', properties: {} },
    },
  ],
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  if (name === 'search_vault') {
    const query = String((args as Record<string, unknown>).query)
    const topK = Number((args as Record<string, unknown>).top_k ?? 5)
    const results = await runSearch(query, topK)
    return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] }
  }

  if (name === 'get_movie') {
    const title = String((args as Record<string, unknown>).title)
    const content = readMovieFile(title)
    if (!content) return { content: [{ type: 'text', text: `Movie not found: ${title}` }] }
    return { content: [{ type: 'text', text: content }] }
  }

  if (name === 'list_movies') {
    const files = listMovieFiles()
    return { content: [{ type: 'text', text: files.join('\n') }] }
  }

  if (name === 'get_upcoming') {
    const upcomingDir = path.join(PROJECT_ROOT, process.env.VAULT_PATH || 'vault', 'upcoming')
    if (!fs.existsSync(upcomingDir)) return { content: [{ type: 'text', text: 'No upcoming data found.' }] }
    const files = fs.readdirSync(upcomingDir).filter((f) => f.endsWith('.md')).sort().reverse()
    if (!files.length) return { content: [{ type: 'text', text: 'No upcoming digest files found.' }] }
    const content = fs.readFileSync(path.join(upcomingDir, files[0]), 'utf-8')
    return { content: [{ type: 'text', text: content }] }
  }

  return { content: [{ type: 'text', text: `Unknown tool: ${name}` }] }
})

const transport = new StdioServerTransport()
await server.connect(transport)
