import { useEffect, useState } from 'react'
import MovieBrowser from './components/MovieBrowser'
import Chat from './components/Chat'
import { getHealth } from './api'

export default function App() {
  const [claudeOk, setClaudeOk] = useState<boolean | null>(null)

  useEffect(() => {
    getHealth()
      .then((h) => setClaudeOk(h.claudeAvailable))
      .catch(() => setClaudeOk(false))
  }, [])

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface text-gray-100">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight">CineVault</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          {claudeOk === null && <span>Checking claude...</span>}
          {claudeOk === true && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              claude ready
            </span>
          )}
          {claudeOk === false && (
            <span className="flex items-center gap-1 text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              claude not found
            </span>
          )}
        </div>
      </header>

      {/* Main two-column layout */}
      <main className="flex flex-1 overflow-hidden">
        <div className="w-80 shrink-0 border-r border-border overflow-hidden">
          <MovieBrowser />
        </div>
        <div className="flex-1 overflow-hidden">
          <Chat />
        </div>
      </main>
    </div>
  )
}
