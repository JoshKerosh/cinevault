#!/usr/bin/env python3
"""Fetch movie data from TMDB, OMDb, and Trakt and write Obsidian notes."""
import argparse
import sys
from dotenv import load_dotenv
from rich.console import Console
from rich.progress import track

load_dotenv()

from src.fetcher.tmdb import TMDBClient
from src.fetcher.omdb import OMDbClient
from src.fetcher.trakt import TraktClient
from src.fetcher.writer import VaultWriter

console = Console()


def dedupe(movies: list[dict]) -> list[dict]:
    seen: set = set()
    out = []
    for m in movies:
        key = m.get("tmdb_id")
        if key and key not in seen:
            seen.add(key)
            out.append(m)
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description="CineVault fetcher")
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--upcoming", action="store_true", help="Upcoming movies only")
    group.add_argument("--trending", action="store_true", help="Trending movies only")
    group.add_argument("--movie", metavar="TITLE", help="Fetch a specific movie by title")
    args = parser.parse_args()

    try:
        tmdb = TMDBClient()
        omdb = OMDbClient()
        trakt = TraktClient()
        writer = VaultWriter()
    except ValueError as e:
        console.print(f"[red]Config error:[/red] {e}")
        console.print("Copy .env.example to .env and fill in your API keys.")
        sys.exit(1)

    # --- Discover movies (stubs: title + tmdb_id) ---
    stubs: list[dict] = []

    if args.movie:
        console.print(f"Searching for: [cyan]{args.movie}[/cyan]")
        stubs = tmdb.search(args.movie, limit=1)
    elif args.upcoming:
        console.print("Fetching upcoming movies...")
        stubs = tmdb.get_upcoming()
    elif args.trending:
        console.print("Fetching trending movies...")
        stubs = tmdb.get_trending() + trakt.get_trending()
    else:
        console.print("Full fetch: upcoming + trending + anticipated")
        stubs = (
            tmdb.get_upcoming()
            + tmdb.get_trending()
            + trakt.get_trending()
            + trakt.get_anticipated()
        )

    stubs = dedupe(stubs)
    console.print(f"  {len(stubs)} unique movies discovered")

    # --- Enrich each stub with full details ---
    movies: list[dict] = []
    for stub in track(stubs, description="Fetching details..."):
        tmdb_id = stub.get("tmdb_id")
        if not tmdb_id:
            continue
        try:
            full = tmdb.get_full(tmdb_id)
            movies.append(full)
        except Exception as e:
            console.print(f"  [yellow]skip[/yellow] {stub.get('title')}: {e}")

    # --- Enrich with ratings from OMDb ---
    for movie in track(movies, description="Fetching ratings..."):
        imdb_id = movie.get("imdb_id")
        if imdb_id:
            try:
                ratings = omdb.get_ratings(imdb_id)
                if ratings:
                    movie["ratings"].update(ratings)
            except Exception:
                pass

    # --- Write vault notes ---
    created, updated, skipped = writer.write_movies(movies)
    console.print(f"\n[green]Done.[/green] {created} created, {updated} updated, {skipped} skipped")


if __name__ == "__main__":
    main()
