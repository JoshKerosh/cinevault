import json
import os
from datetime import date
from pathlib import Path


class VaultWriter:
    def __init__(self):
        vault_path = os.environ.get("VAULT_PATH", "./vault")
        self.vault = Path(vault_path)
        self.movies_dir = self.vault / "movies"
        self.upcoming_dir = self.vault / "upcoming"
        self.index_file = self.vault / ".fetch-index.json"

        self.movies_dir.mkdir(parents=True, exist_ok=True)
        self.upcoming_dir.mkdir(parents=True, exist_ok=True)

        self._index: dict = {}
        if self.index_file.exists():
            self._index = json.loads(self.index_file.read_text(encoding="utf-8"))

    def write_movies(self, movies: list[dict]) -> tuple[int, int, int]:
        created = updated = skipped = 0
        today = date.today().isoformat()

        for movie in movies:
            tmdb_id = str(movie.get("tmdb_id", ""))
            if not tmdb_id or not movie.get("title"):
                skipped += 1
                continue

            filename = self._safe_filename(movie["title"], movie.get("year"))
            path = self.movies_dir / filename

            if path.exists() and tmdb_id in self._index:
                skipped += 1
                continue

            content = self._format_note(movie, today)
            path.write_text(content, encoding="utf-8")

            if tmdb_id in self._index:
                updated += 1
            else:
                created += 1

            self._index[tmdb_id] = {"file": filename, "fetched_at": today}

        self._index_file_write()
        self._write_vault_index()
        return created, updated, skipped

    def write_upcoming_digest(self, movies: list[dict], year: int, month: int) -> None:
        month_names = [
            "", "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December",
        ]
        title = f"Upcoming - {month_names[month]} {year}"
        path = self.upcoming_dir / f"{title}.md"

        rows = "\n".join(
            f"| {m.get('title', '')} | {m.get('release_date', '')} | {', '.join(m.get('genres', [])[:2])} |"
            for m in sorted(movies, key=lambda x: x.get("release_date") or "")
        )

        content = f"# Upcoming Releases — {month_names[month]} {year}\n\n"
        content += "| Title | Release Date | Genre |\n"
        content += "|---|---|---|\n"
        content += rows + "\n"
        path.write_text(content, encoding="utf-8")

    def _format_note(self, m: dict, today: str) -> str:
        genres = m.get("genres", [])
        cast = m.get("cast", [])
        ratings = m.get("ratings", {}) or {}
        similar = m.get("similar", [])

        genres_yaml = "[" + ", ".join(genres) + "]"
        cast_yaml = "[" + ", ".join(f'"{c}"' for c in cast) + "]"
        tags_yaml = (
            "[movie, "
            + ("upcoming" if m.get("status") == "Planned" else "released")
            + "".join(f", {g.lower().replace(' ', '-')}" for g in genres[:2])
            + "]"
        )

        r_imdb = ratings.get("imdb", "")
        r_imdb_votes = ratings.get("imdb_votes", "")
        r_rt = ratings.get("rotten_tomatoes", "")
        r_mc = ratings.get("metacritic", "")

        frontmatter = f"""---
title: {m.get('title', '')}
year: {m.get('year', '')}
genres: {genres_yaml}
runtime_minutes: {m.get('runtime_minutes', '')}
director: {m.get('director', '')}
cast: {cast_yaml}
imdb_id: {m.get('imdb_id', '')}
tmdb_id: {m.get('tmdb_id', '')}
status: {m.get('status', '')}
release_date: {m.get('release_date', '')}
ratings:
  imdb: {r_imdb}
  imdb_votes: {r_imdb_votes}
  rotten_tomatoes: {r_rt}
  metacritic: {r_mc}
poster_url: {m.get('poster_url', '')}
fetched_at: {today}
tags: {tags_yaml}
---

# {m.get('title', '')}

## Synopsis
{m.get('overview', 'No synopsis available.')}

## Details
- **Director:** {m.get('director', 'Unknown')}
- **Runtime:** {m.get('runtime_minutes', '?')} minutes
- **Genres:** {', '.join(genres)}
- **Release Date:** {m.get('release_date', 'TBD')}

## Cast
"""
        for i, member in enumerate(cast, 1):
            frontmatter += f"{i}. {member}\n"

        frontmatter += "\n## Ratings\n| Source | Score |\n|---|---|\n"
        if r_imdb:
            votes_str = f" ({r_imdb_votes:,} votes)" if r_imdb_votes else ""
            frontmatter += f"| IMDb | {r_imdb} / 10{votes_str} |\n"
        if r_rt:
            frontmatter += f"| Rotten Tomatoes | {r_rt}% |\n"
        if r_mc:
            frontmatter += f"| Metacritic | {r_mc} / 100 |\n"

        if similar:
            frontmatter += "\n## Similar Movies\n"
            for s in similar:
                frontmatter += f"- {s}\n"

        return frontmatter

    def _safe_filename(self, title: str, year: int | None) -> str:
        safe = "".join(c if c.isalnum() or c in " -'." else "" for c in title)
        safe = safe.strip()
        if year:
            return f"{safe} ({year}).md"
        return f"{safe}.md"

    def _index_file_write(self) -> None:
        self.index_file.write_text(
            json.dumps(self._index, indent=2, ensure_ascii=False), encoding="utf-8"
        )

    def _write_vault_index(self) -> None:
        lines = ["# CineVault Index\n"]
        entries = sorted(self._index.items(), key=lambda kv: kv[1].get("file", ""))
        for _, meta in entries:
            filename = meta.get("file", "")
            name = filename.replace(".md", "")
            lines.append(f"- [[{name}]]\n")
        (self.vault / "_index.md").write_text("".join(lines), encoding="utf-8")
