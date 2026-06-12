import os
import httpx

BASE = "https://api.trakt.tv"


class TraktClient:
    def __init__(self):
        client_id = os.environ.get("TRAKT_CLIENT_ID")
        if not client_id:
            raise ValueError("TRAKT_CLIENT_ID not set")
        self._headers = {
            "Content-Type": "application/json",
            "trakt-api-version": "2",
            "trakt-api-key": client_id,
        }

    def _get(self, path: str, params: dict | None = None) -> list | dict:
        r = httpx.get(f"{BASE}{path}", headers=self._headers, params=params, timeout=15)
        r.raise_for_status()
        return r.json()

    def get_trending(self, count: int = 20) -> list[dict]:
        data = self._get("/movies/trending", {"limit": count, "page": 1})
        return [self._normalize(item["movie"]) for item in data]

    def get_popular(self, count: int = 50) -> list[dict]:
        data = self._get("/movies/popular", {"limit": count, "page": 1})
        return [self._normalize(item) for item in data]

    def get_anticipated(self, count: int = 20) -> list[dict]:
        data = self._get("/movies/anticipated", {"limit": count, "page": 1})
        return [self._normalize(item["movie"]) for item in data]

    def get_ratings(self, imdb_id: str) -> dict:
        """Return trakt_rating (0–10) and trakt_votes for a movie, or {} on failure."""
        if not imdb_id:
            return {}
        try:
            data = self._get(f"/movies/{imdb_id}/ratings")
            rating = data.get("rating")
            votes = data.get("votes")
            if rating is None:
                return {}
            return {
                "trakt_rating": round(float(rating), 2),
                "trakt_votes": int(votes) if votes else 0,
            }
        except Exception:
            return {}

    def _normalize(self, movie: dict) -> dict:
        ids = movie.get("ids", {})
        return {
            "title": movie.get("title", ""),
            "year": movie.get("year"),
            "tmdb_id": ids.get("tmdb"),
            "imdb_id": ids.get("imdb"),
        }
