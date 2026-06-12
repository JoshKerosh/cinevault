import { useEffect, useRef, useState } from 'react'
import { queryMovies, type QueryResponse, type MovieResult } from '../api'

interface Message {
  role: 'user' | 'assistant'
  content: string
  response?: QueryResponse
  error?: boolean
}

const SUGGESTIONS = [
  'What is coming out soon?',
  'Best horror movies in my vault?',
  'Recommend a thriller for tonight',
  'I\'m thinking of a sci-fi movie about extraterrestrial life — which one is it?',
]

function InlineMovieCard({ movie }: { movie: MovieResult }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl transition-colors hover:bg-white/5"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
        style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#c4b5fd' }}>
        {movie.title[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{movie.title}
          <span className="ml-2 text-xs font-normal" style={{ color: '#6366f1' }}>{movie.year}</span>
        </p>
        {movie.synopsis && (
          <p className="text-xs mt-0.5 line-clamp-2" style={{ color: '#94a3b8' }}>{movie.synopsis}</p>
        )}
        <div className="flex items-center gap-3 mt-1.5">
          {movie.imdb && (
            <span className="flex items-center gap-1 text-xs">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="#eab308">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span className="text-yellow-400 font-medium">{movie.imdb}</span>
            </span>
          )}
          {movie.rt && (
            <span className="text-xs" style={{ color: '#86efac' }}>🍅 {movie.rt}%</span>
          )}
          {movie.genres?.slice(0, 2).map(g => (
            <span key={g} className="text-xs px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>
              {g}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const colors: Record<string, { bg: string; text: string; dot: string }> = {
    high: { bg: 'rgba(16,185,129,0.1)', text: '#34d399', dot: '#10b981' },
    medium: { bg: 'rgba(245,158,11,0.1)', text: '#fbbf24', dot: '#f59e0b' },
    low: { bg: 'rgba(239,68,68,0.1)', text: '#f87171', dot: '#ef4444' },
  }
  const c = colors[confidence] || colors.medium
  return (
    <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full"
      style={{ background: c.bg, color: c.text }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {confidence} confidence
    </span>
  )
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text?: string) => {
    const query = (text ?? input).trim()
    if (!query || loading) return
    setMessages(m => [...m, { role: 'user', content: query }])
    setInput('')
    setLoading(true)
    try {
      const res = await queryMovies(query)
      setMessages(m => [...m, { role: 'assistant', content: res.answer, response: res }])
    } catch (err) {
      setMessages(m => [...m, {
        role: 'assistant',
        content: err instanceof Error ? err.message : 'Something went wrong',
        error: true
      }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{ minWidth: 0 }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-8 -mt-4">
            {/* Empty state */}
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', boxShadow: '0 0 40px rgba(124,58,237,0.3)' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                  <path d="M7 4v16M17 4v16M3 8h4m10 0h4M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"/>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white">Ask about your movies</h2>
              <p className="text-sm" style={{ color: '#6b7280' }}>
                Powered by your personal vault · {' '}
                <span style={{ color: '#6366f1' }}>Claude AI</span>
              </p>
            </div>

            {/* Suggestions */}
            <div className="grid grid-cols-2 gap-2 w-full max-w-xl">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)}
                  className="text-left text-sm px-4 py-3 rounded-xl transition-all hover:scale-105"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: '#94a3b8' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex msg-bubble ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-1 mr-3"
                style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M7 4v16M17 4v16M3 8h4m10 0h4M3 16h4m10 0h4"/>
                </svg>
              </div>
            )}

            <div className={`max-w-[75%] space-y-3 ${msg.role === 'user' ? '' : 'flex-1'}`}>
              {/* Bubble */}
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'text-white rounded-tr-sm'
                  : msg.error
                    ? 'rounded-tl-sm'
                    : 'rounded-tl-sm'
              }`} style={
                msg.role === 'user'
                  ? { background: 'linear-gradient(135deg,#4f46e5,#6d28d9)', boxShadow: '0 4px 20px rgba(79,70,229,0.3)' }
                  : msg.error
                    ? { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }
                    : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }
              }>
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>

              {/* Movie cards from response */}
              {msg.response?.movies && msg.response.movies.length > 0 && (
                <div className="space-y-2">
                  {msg.response.movies.map((movie, j) => (
                    <InlineMovieCard key={j} movie={movie} />
                  ))}
                </div>
              )}

              {/* Footer: confidence + sources */}
              {msg.response && (
                <div className="flex items-center gap-3 flex-wrap">
                  <ConfidenceBadge confidence={msg.response.confidence} />
                  {msg.response.sourcesUsed?.length > 0 && (
                    <details>
                      <summary className="text-xs cursor-pointer select-none"
                        style={{ color: '#6b7280' }}>
                        {msg.response.sourcesUsed.length} sources used
                      </summary>
                      <div className="mt-1.5 space-y-0.5">
                        {msg.response.sourcesUsed.map((s, j) => (
                          <p key={j} className="text-xs" style={{ color: '#4b5563' }}>
                            · {s.split(/[\\/]/).pop()}
                          </p>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-3 msg-bubble">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-1"
              style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M7 4v16M17 4v16M3 8h4m10 0h4M3 16h4m10 0h4"/>
              </svg>
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-1.5">
                {[0,1,2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: '#6366f1',
                      animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`
                    }} />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="px-6 pb-6 shrink-0">
        <div className="flex gap-3 items-center p-1.5 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 0 0 1px transparent' }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Ask anything about your movies..."
            disabled={loading}
            className="flex-1 bg-transparent px-3 py-2 text-sm outline-none disabled:opacity-50"
            style={{ color: '#e2e8f0' }}
          />
          <button onClick={() => send()} disabled={loading || !input.trim()}
            className="flex items-center justify-center w-9 h-9 rounded-xl transition-all disabled:opacity-30 hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', boxShadow: '0 4px 12px rgba(79,70,229,0.4)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
            </svg>
          </button>
        </div>
        <p className="text-center text-xs mt-2" style={{ color: '#374151' }}>
          Powered by Claude · Vault data from TMDB
        </p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
