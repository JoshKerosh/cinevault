import { useCallback, useEffect, useRef, useState } from 'react'
import MovieBrowser from './components/MovieBrowser'
import Chat from './components/Chat'
import { getHealth, getMovies, triggerIngest, type MovieListItem } from './api'

export default function App() {
  const [claudeOk, setClaudeOk] = useState<boolean | null>(null)
  const [movies, setMovies] = useState<MovieListItem[]>([])
  const [moviesLoading, setMoviesLoading] = useState(true)
  const [splitPct, setSplitPct] = useState(60)
  const [selectedMovie, setSelectedMovie] = useState<MovieListItem | null>(null)
  const [ingesting, setIngesting] = useState(false)

  const selectByTitle = useCallback((title: string, year?: number) => {
    const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
    const found = movies.find(m => {
      const titleMatch = normalise(m.title) === normalise(title)
      return year ? titleMatch && m.year === year : titleMatch
    }) ?? movies.find(m => normalise(m.title).includes(normalise(title)))
    if (found) setSelectedMovie(found)
  }, [movies])
  const dragging = useRef(false)
  const mainRef = useRef<HTMLDivElement>(null)

  const refreshMovies = useCallback(() => {
    setMoviesLoading(true)
    getMovies().then(m => { setMovies(m); setMoviesLoading(false) }).catch(() => setMoviesLoading(false))
  }, [])

  useEffect(() => {
    getHealth().then(h => setClaudeOk(h.claudeAvailable)).catch(() => setClaudeOk(false))
    refreshMovies()
  }, [refreshMovies])

  const handleIngest = useCallback(async () => {
    setIngesting(true)
    try {
      await triggerIngest()
      refreshMovies()
    } finally {
      setIngesting(false)
    }
  }, [refreshMovies])

  const onDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragging.current || !mainRef.current) return
      const { left, width } = mainRef.current.getBoundingClientRect()
      const pct = Math.min(80, Math.max(20, ((ev.clientX - left) / width) * 100))
      setSplitPct(Math.round(pct))
    }

    const onMouseUp = () => {
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
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
          <button
            onClick={handleIngest}
            disabled={ingesting}
            title="Refresh movie data"
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all disabled:opacity-50 hover:scale-105 active:scale-95"
            style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{ animation: ingesting ? 'spin 1s linear infinite' : 'none' }}>
              <path d="M23 4v6h-6M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            {ingesting ? 'Ingesting...' : 'Refresh'}
          </button>
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

      {/* Body — resizable split */}
      <main ref={mainRef} className="flex flex-1 overflow-hidden">
        <div style={{ width: `${splitPct}%`, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <MovieBrowser movies={movies} loading={moviesLoading} selected={selectedMovie} onSelect={setSelectedMovie} />
        </div>

        {/* Draggable divider */}
        <div
          onMouseDown={onDividerMouseDown}
          className="group shrink-0 flex items-center justify-center"
          style={{ width: 6, cursor: 'col-resize', background: 'rgba(255,255,255,0.04)', zIndex: 10 }}
        >
          <div className="w-0.5 h-8 rounded-full transition-all group-hover:h-16"
            style={{ background: 'rgba(99,102,241,0.4)', transition: 'all 0.2s' }} />
        </div>

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Chat onSelectMovie={selectByTitle} movies={movies} />
        </div>
      </main>
    </div>
  )
}
