import { useMemo, useState } from 'react'
import type { MovieListItem } from '../api'

interface Props {
  movies: MovieListItem[]
  loading: boolean
}

const GENRES_COLORS: Record<string, string> = {
  'Action': '#ef4444', 'Adventure': '#f97316', 'Animation': '#eab308',
  'Comedy': '#22c55e', 'Crime': '#8b5cf6', 'Documentary': '#06b6d4',
  'Drama': '#6366f1', 'Fantasy': '#a855f7', 'Horror': '#dc2626',
  'Mystery': '#0ea5e9', 'Romance': '#ec4899', 'Science Fiction': '#3b82f6',
  'Thriller': '#f59e0b', 'Western': '#d97706', 'Family': '#84cc16',
  'History': '#a16207', 'Music': '#db2777', 'War': '#64748b',
}

function GenreTag({ genre }: { genre: string }) {
  const color = GENRES_COLORS[genre] || '#6b7280'
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}>
      {genre}
    </span>
  )
}

function PosterPlaceholder({ title }: { title: string }) {
  const initials = title.split(' ').filter(w => /^[A-Za-z0-9]/.test(w)).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  return (
    <div className="w-full h-full flex items-center justify-center text-2xl font-bold"
      style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)', color: '#a5b4fc' }}>
      {initials || '?'}
    </div>
  )
}

function StarRating({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-1">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="#eab308">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
      <span className="text-sm font-semibold text-yellow-400">{value}</span>
      <span className="text-xs" style={{ color: '#6b7280' }}>IMDb</span>
    </span>
  )
}

function DetailView({ movie, onBack }: { movie: MovieListItem; onBack: () => void }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Back button */}
      <button onClick={onBack}
        className="flex items-center gap-2 px-4 py-3 text-sm font-medium shrink-0 hover:text-white transition-colors"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#818cf8' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
        Back to library
      </button>

      {/* Poster — scales with viewport height, full image always visible */}
      <div className="relative shrink-0" style={{ height: '32vh', background: '#0d0d1a' }}>
        {movie.poster_url
          ? <img src={movie.poster_url} alt={movie.title} className="w-full h-full object-contain" />
          : <PosterPlaceholder title={movie.title} />}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #080810 8%, transparent 50%)' }} />
        {movie.status && (
          <div className="absolute top-3 right-3">
            <span className="text-xs px-2 py-1 rounded-full font-medium"
              style={{
                background: movie.status === 'Released' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)',
                color: movie.status === 'Released' ? '#34d399' : '#fbbf24',
                border: `1px solid ${movie.status === 'Released' ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
                backdropFilter: 'blur(4px)',
              }}>
              {movie.status}
            </span>
          </div>
        )}
      </div>

      {/* Info — fills remaining height, no scroll */}
      <div className="flex-1 overflow-hidden px-4 py-3 flex flex-col gap-2 -mt-5 relative">
        <div>
          <h2 className="text-lg font-bold text-white leading-tight truncate">{movie.title}</h2>
          <p className="text-sm" style={{ color: '#6366f1' }}>{movie.year}</p>
        </div>

        <div className="flex flex-wrap gap-1">
          {movie.genres.map(g => <GenreTag key={g} genre={g} />)}
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {movie.imdb && <StarRating value={movie.imdb} />}
          {movie.runtime_minutes && (
            <span className="text-xs flex items-center gap-1" style={{ color: '#94a3b8' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
              </svg>
              {movie.runtime_minutes} min
            </span>
          )}
          {movie.release_date && (
            <span className="text-xs" style={{ color: '#64748b' }}>{movie.release_date}</span>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {movie.director && (
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: '#4b5563' }}>Director</span>
              <span className="text-sm font-medium truncate" style={{ color: '#cbd5e1' }}>{movie.director}</span>
            </div>
          )}
          {movie.trailer_youtube_key && (
            <a
              href={`https://www.youtube.com/watch?v=${movie.trailer_youtube_key}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all hover:scale-105 active:scale-95 shrink-0"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z"/>
              </svg>
              Watch Trailer
            </a>
          )}
        </div>

        {movie.synopsis && (
          <div className="rounded-lg p-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs leading-relaxed line-clamp-3" style={{ color: '#94a3b8' }}>{movie.synopsis}</p>
          </div>
        )}

        {movie.cast && movie.cast.length > 0 && (
          <div className="overflow-hidden">
            <p className="text-xs font-semibold mb-1 uppercase tracking-wider" style={{ color: '#4b5563' }}>Cast</p>
            <div className="space-y-1">
              {movie.cast.slice(0, 4).map((c, i) => {
                const [actor, role] = c.split(' as ')
                return (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium truncate" style={{ color: '#e2e8f0' }}>{actor?.trim()}</span>
                    {role && <span className="text-xs truncate shrink-0" style={{ color: '#6b7280' }}>{role.trim()}</span>}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function MovieBrowser({ movies, loading }: Props) {
  const [search, setSearch] = useState('')
  const [genre, setGenre] = useState('')
  const [selected, setSelected] = useState<MovieListItem | null>(null)

  const allGenres = useMemo(() => {
    const set = new Set<string>()
    movies.forEach(m => m.genres.forEach(g => set.add(g)))
    return [...set].sort()
  }, [movies])

  const filtered = useMemo(() => {
    return movies.filter(m => {
      const matchSearch = !search || m.title.toLowerCase().includes(search.toLowerCase())
      const matchGenre = !genre || m.genres.includes(genre)
      return matchSearch && matchGenre
    })
  }, [movies, search, genre])

  if (selected) {
    return (
      <aside style={{ width: '100%', height: '100%', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <DetailView movie={selected} onBack={() => setSelected(null)} />
      </aside>
    )
  }

  return (
    <aside className="flex flex-col overflow-hidden"
      style={{ width: '100%', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Search + filter */}
      <div className="px-3 py-3 space-y-2 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="13" height="13" viewBox="0 0 24 24"
            fill="none" stroke="#4b5563" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input type="text" placeholder="Search movies..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg outline-none transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }} />
        </div>
        <select value={genre} onChange={e => setGenre(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-lg outline-none"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: genre ? '#e2e8f0' : '#6b7280' }}>
          <option value="">All genres</option>
          {allGenres.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <p className="text-xs px-1" style={{ color: '#4b5563' }}>{filtered.length} movies</p>
      </div>

      {/* Movie list */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="space-y-0">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-3"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="skeleton w-10 h-14 rounded shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3 rounded w-3/4" />
                  <div className="skeleton h-2.5 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <p className="text-sm" style={{ color: '#4b5563' }}>
              {movies.length === 0 ? 'Run /ingest to fetch movies' : 'No results'}
            </p>
          </div>
        )}

        {filtered.map(movie => (
          <button key={movie.file} onClick={() => setSelected(movie)}
            className="w-full flex items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-white/5 group"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            {/* Mini poster */}
            <div className="w-12 h-16 rounded overflow-hidden shrink-0 relative"
              style={{ background: '#1e1b4b' }}>
              {movie.poster_url
                ? <img src={movie.poster_url} alt={movie.title} className="poster-img w-full h-full object-cover" />
                : <PosterPlaceholder title={movie.title} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                {movie.title}
              </p>
              <p className="text-sm mt-0.5 flex items-center gap-2" style={{ color: '#6b7280' }}>
                <span>{movie.year}</span>
                {movie.imdb && (
                  <span className="flex items-center gap-0.5">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="#eab308">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    <span className="text-yellow-500">{movie.imdb}</span>
                  </span>
                )}
              </p>
              {movie.genres[0] && (
                <p className="text-sm mt-1 truncate" style={{ color: GENRES_COLORS[movie.genres[0]] || '#6b7280' }}>
                  {movie.genres.slice(0, 2).join(' · ')}
                </p>
              )}
            </div>
            {/* Arrow hint */}
            <svg className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        ))}
      </div>
    </aside>
  )
}
