import os
import time
import httpx

BASE = "https://api.themoviedb.org/3"
POSTER_BASE = "https://image.tmdb.org/t/p/w500"


class TMDBClient:
    def __init__(self):
        key = os.environ.get("TMDB_API_KEY")
        if not key:
            raise ValueError("TMDB_API_KEY not set")
        self._params = {"api_key": key, "language": "en-US"}
        self._window_start = time.monotonic()
        self._calls = 0

    def _get(self, path: str, extra: dict | None = None) -> dict:
        # Stay under 40 req / 10 s
        now = time.monotonic()
        if now - self._window_start >= 10:
            self._window_start = now
            self._calls = 0
        self._calls += 1
        if self._calls >= 38:
            wait = 10 - (time.monotonic() - self._window_start) + 0.2
            if wait > 0:
                time.sleep(wait)
            self._window_start = time.monotonic()
            self._calls = 0

        params = {**self._params, **(extra or {})}
        for attempt in range(3):
            try:
                r = httpx.get(f"{BASE}{path}", params=params, timeout=15)
                r.raise_for_status()
                return r.json()
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429:
                    time.sleep(5 * (attempt + 1))
                    continue
                raise
            except httpx.RequestError:
                if attempt == 2:
                    raise
                time.sleep(2 ** attempt)
        return {}

    def get_upcoming(self, days_ahead: int = 90) -> list[dict]:
        results = []
        for page in range(1, 6):
            data = self._get("/movie/upcoming", {"page": page, "region": "US"})
            results.extend(data.get("results", []))
            if page >= data.get("total_pages", 1):
                break
        return [self._stub(m) for m in results]

    def get_trending(self, count: int = 20) -> list[dict]:
        data = self._get("/trending/movie/week")
        return [self._stub(m) for m in data.get("results", [])[:count]]

    def search(self, query: str, limit: int = 5) -> list[dict]:
        data = self._get("/search/movie", {"query": query})
        return [self._stub(m) for m in data.get("results", [])[:limit]]

    def get_full(self, tmdb_id: int) -> dict:
        data = self._get(
            f"/movie/{tmdb_id}",
            {"append_to_response": "credits,external_ids,similar"},
        )
        return self._full(data)

    def _stub(self, raw: dict) -> dict:
        return {
            "tmdb_id": raw.get("id"),
            "title": raw.get("title", ""),
            "year": int(raw["release_date"][:4]) if raw.get("release_date") else None,
            "release_date": raw.get("release_date"),
        }

    def _full(self, raw: dict) -> dict:
        genres = [g["name"] for g in raw.get("genres", [])]

        credits = raw.get("credits", {})
        cast = [
            f"{c['name']} as {c.get('character', '')}"
            for c in sorted(credits.get("cast", []), key=lambda x: x.get("order", 999))[:5]
        ]
        director = next(
            (c["name"] for c in credits.get("crew", []) if c.get("job") == "Director"),
            None,
        )
        similar_raw = raw.get("similar", {}).get("results", [])[:5]
        similar = [
            f"[[{s['title']} ({s['release_date'][:4]})]]"
            for s in similar_raw
            if s.get("release_date") and len(s["release_date"]) >= 4
        ]

        return {
            "tmdb_id": raw.get("id"),
            "title": raw.get("title", ""),
            "year": int(raw["release_date"][:4]) if raw.get("release_date") else None,
            "release_date": raw.get("release_date"),
            "genres": genres,
            "runtime_minutes": raw.get("runtime"),
            "overview": raw.get("overview", ""),
            "director": director,
            "cast": cast,
            "imdb_id": raw.get("external_ids", {}).get("imdb_id"),
            "poster_url": f"{POSTER_BASE}{raw['poster_path']}" if raw.get("poster_path") else None,
            "status": raw.get("status"),
            "similar": similar,
            "ratings": {
                "imdb": None,
                "imdb_votes": None,
                "rotten_tomatoes": None,
                "metacritic": None,
            },
        }
