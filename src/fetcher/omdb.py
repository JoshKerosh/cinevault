import os
import time
import httpx

BASE = "http://www.omdbapi.com"


class OMDbClient:
    def __init__(self):
        key = os.environ.get("OMDB_API_KEY")
        if not key:
            raise ValueError("OMDB_API_KEY not set")
        self._key = key
        self._calls_today = 0

    def get_ratings(self, imdb_id: str) -> dict:
        if self._calls_today >= 950:
            print("  [omdb] daily limit approaching, skipping ratings")
            return {}

        try:
            r = httpx.get(BASE, params={"i": imdb_id, "apikey": self._key}, timeout=10)
            r.raise_for_status()
            data = r.json()
            self._calls_today += 1
        except httpx.HTTPError:
            return {}

        if data.get("Response") == "False":
            return {}

        ratings: dict = {}

        imdb_str = data.get("imdbRating", "N/A")
        if imdb_str not in ("N/A", "", None):
            try:
                ratings["imdb"] = float(imdb_str)
            except ValueError:
                pass

        votes_str = data.get("imdbVotes", "N/A").replace(",", "")
        if votes_str not in ("N/A", "", None):
            try:
                ratings["imdb_votes"] = int(votes_str)
            except ValueError:
                pass

        for source_entry in data.get("Ratings", []):
            source = source_entry.get("Source", "")
            value = source_entry.get("Value", "")
            if source == "Rotten Tomatoes" and value.endswith("%"):
                try:
                    ratings["rotten_tomatoes"] = int(value[:-1])
                except ValueError:
                    pass
            elif source == "Metacritic" and "/" in value:
                try:
                    ratings["metacritic"] = int(value.split("/")[0])
                except ValueError:
                    pass

        return ratings
