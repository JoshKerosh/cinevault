const BASE = '/api'

export interface QueryResponse {
  answer: string
  movies: MovieResult[]
  sourcesUsed: string[]
  confidence: 'high' | 'medium' | 'low'
  error?: string
}

export interface MovieResult {
  title: string
  year: number
  imdb: number | null
  rt: number | null
  genres: string[]
  synopsis: string
  poster_url?: string | null
}

export interface MovieListItem {
  file: string
  title: string
  year: number | null
  genres: string[]
  imdb: number | null
  director: string | null
  status: string | null
  poster_url: string | null
  runtime_minutes: number | null
  release_date: string | null
  cast: string[]
  synopsis: string | null
  trailer_youtube_key: string | null
}

export async function queryMovies(message: string): Promise<QueryResponse> {
  const res = await fetch(`${BASE}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  })
  if (!res.ok) throw new Error(`Server error: ${res.status}`)
  return res.json()
}

export async function getMovies(): Promise<MovieListItem[]> {
  const res = await fetch(`${BASE}/movies`)
  if (!res.ok) throw new Error(`Server error: ${res.status}`)
  return res.json()
}

export async function getHealth(): Promise<{ status: string; claudeAvailable: boolean }> {
  const res = await fetch(`${BASE}/health`)
  if (!res.ok) throw new Error(`Server error: ${res.status}`)
  return res.json()
}
