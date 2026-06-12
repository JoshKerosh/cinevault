import type { MovieListItem } from '../api'

interface Props {
  movie: MovieListItem
}

export default function MovieCard({ movie }: Props) {
  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-100">{movie.title}</h2>
        <p className="text-sm text-gray-400">{movie.year}</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {movie.genres.map((g) => (
          <span
            key={g}
            className="text-xs px-2 py-0.5 rounded-full bg-indigo-900 text-indigo-300 border border-indigo-700"
          >
            {g}
          </span>
        ))}
      </div>

      {movie.imdb && (
        <div className="flex gap-4 text-sm">
          <span className="text-yellow-400">★ {movie.imdb} IMDb</span>
        </div>
      )}

      {movie.director && (
        <p className="text-sm text-gray-300">
          <span className="text-gray-500">Director: </span>
          {movie.director}
        </p>
      )}

      <p className="text-xs text-gray-500">
        Open in Obsidian to see full note with synopsis, cast, and ratings.
      </p>
    </div>
  )
}
