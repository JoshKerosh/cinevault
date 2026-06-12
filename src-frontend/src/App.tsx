import { useEffect, useState } from 'react'
import MovieBrowser from './components/MovieBrowser'
import Chat from './components/Chat'
import { getHealth, getMovies, type MovieListItem } from './api'

export default function App() {
  const [claudeOk, setClaudeOk] = useState<boolean | null>(null)
  const [movies, setMovies] = useState<MovieListItem[]>([])
  const [moviesLoading, setMoviesLoading] = useState(true)

  useEffect(() => {
    getHealth().then(h => setClaudeOk(h.claudeAvailable)).catch(() => setClaudeOk(false))
    getMovies().then(m => { setMovies(m); setMoviesLoading(false) }).catch(() => setMoviesLoading(false))
  }, [])

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#080810' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(8,8,16,0.95)', backdropFilter: 'blur(20px)', zIndex: 10 }}>
        <div className="flex items-center gap-3">
          {/* Logo mark */}
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M7 4v16M17 4v16M3 8h4m10 0h4M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"/>
            </svg>
          </div>
          <span className="text-lg font-bold gradient-text tracking-tight">CineVault</span>
        </div>

        <div className="flex items-center gap-5">
          <span className="text-sm" style={{ color: '#6366f1' }}>
            {moviesLoading ? '...' : `${movies.length} movies indexed`}
          </span>
          <div className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full"
            style={{ background: claudeOk ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${claudeOk ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
            <span className={`w-1.5 h-1.5 rounded-full ${claudeOk ? 'bg-emerald-400 glow-violet' : 'bg-red-400'}`}
              style={claudeOk ? { boxShadow: '0 0 6px #10b981' } : {}} />
            <span style={{ color: claudeOk ? '#34d399' : '#f87171' }}>
              {claudeOk === null ? 'connecting...' : claudeOk ? 'claude ready' : 'claude offline'}
            </span>
          </div>
        </div>
      </header>

      {/* Body — 60 % library / 40 % chat */}
      <main className="flex flex-1 overflow-hidden">
        <div style={{ flex: '0 0 60%', minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <MovieBrowser movies={movies} loading={moviesLoading} />
        </div>
        <div style={{ flex: '0 0 40%', minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Chat />
        </div>
      </main>
    </div>
  )
}
