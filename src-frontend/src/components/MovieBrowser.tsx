import { useEffect, useMemo, useState } from 'react'
import { getMovies, type MovieListItem } from '../api'
import MovieCard from './MovieCard'

export default function MovieBrowser() {
  const [movies, setMovies] = useState<MovieListItem[]>([])
  const [search, setSearch] = useState('')
  const [genre, setGenre] = useState('')
  const [selected, setSelected] = useState<MovieListItem | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMovies()
      .then(setMovies)
      .catch(() => setMovies([]))
      .finally(() => setLoading(false))
  }, [])

  const allGenres = useMemo(() => {
    const set = new Set<string>()
    movies.forEach((m) => m.genres.forEach((g) => set.add(g)))
    return [...set].sort()
  }, [movies])

  const filtered = useMemo(() => {
    return movies.filter((m) => {
      const matchSearch = !search || m.title.toLowerCase().includes(search.toLowerCase())
      const matchGenre = !genre || m.genres.includes(genre)
      return matchSearch && matchGenre
    })
  }, [movies, search, genre])

  if (selected) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-3 border-b border-border shrink-0">
          <button
            onClick={() => setSelected(null)}
            className="text-sm text-gray-400 hover:text-gray-200 flex items-center gap-1"
          >
            ← Back
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <MovieCard movie={selected} />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Filters */}
      <div className="p-3 space-y-2 border-b border-border shrink-0">
        <input
          type="text"
          placeholder="Search movies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
        />
        <select
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          className="w-full bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All genres</option>
          {allGenres.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <p className="text-xs text-gray-500">{filtered.length} movies</p>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <p className="text-center text-gray-500 text-sm mt-6">Loading...</p>
        )}
        {!loading && filtered.length === 0 && (
          <p className="text-center text-gray-500 text-sm mt-6">
            No movies found.{movies.length === 0 ? ' Run /ingest first.' : ''}
          </p>
        )}
        {filtered.map((movie) => (
          <button
            key={movie.file}
            onClick={() => setSelected(movie)}
            className="w-full text-left px-4 py-3 border-b border-border hover:bg-panel transition-colors"
          >
            <p className="text-sm font-medium text-gray-100 truncate">{movie.title}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {movie.year}
              {movie.imdb ? ` · ★${movie.imdb}` : ''}
              {movie.genres[0] ? ` · ${movie.genres[0]}` : ''}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
