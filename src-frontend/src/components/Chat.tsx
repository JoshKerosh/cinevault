import { useEffect, useRef, useState } from 'react'
import { queryMovies, type QueryResponse } from '../api'

interface Message {
  role: 'user' | 'assistant'
  content: string
  response?: QueryResponse
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return

    setMessages((m) => [...m, { role: 'user', content: text }])
    setInput('')
    setLoading(true)

    try {
      const res = await queryMovies(text)
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: res.answer, response: res },
      ])
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: `Error: ${err instanceof Error ? err.message : String(err)}` },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-gray-500 text-sm text-center mt-12">
            Ask anything about movies in your vault.
            <br />
            <span className="text-xs">Try: "Best sci-fi movies with high IMDb scores"</span>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-panel border border-border text-gray-200'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>

              {msg.response?.sourcesUsed && msg.response.sourcesUsed.length > 0 && (
                <details className="mt-2 text-xs text-gray-400">
                  <summary className="cursor-pointer hover:text-gray-300">
                    Sources ({msg.response.sourcesUsed.length})
                  </summary>
                  <ul className="mt-1 space-y-0.5 pl-2">
                    {msg.response.sourcesUsed.map((s, j) => (
                      <li key={j}>{s.split('/').pop()}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-panel border border-border rounded-lg px-4 py-2 text-sm text-gray-400 animate-pulse">
              Thinking...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-3 shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Ask about movies..."
            disabled={loading}
            className="flex-1 bg-panel border border-border rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
