#!/usr/bin/env python3
"""Index vault Markdown notes into ChromaDB for semantic search."""
import argparse
import sys
from pathlib import Path
from dotenv import load_dotenv
from rich.console import Console
from rich.progress import track

load_dotenv()

from src.indexer.chunker import chunk_note
from src.indexer.store import add_chunks, delete_file, get_indexed_file_paths, stats

console = Console()


def get_vault_path() -> Path:
    import os
    return Path(os.environ.get("VAULT_PATH", "./vault"))


def main() -> None:
    parser = argparse.ArgumentParser(description="CineVault indexer")
    parser.add_argument("--rebuild", action="store_true", help="Drop and fully rebuild the index")
    parser.add_argument("--stats", action="store_true", help="Show index statistics")
    args = parser.parse_args()

    if args.stats:
        s = stats()
        console.print(f"Chunks indexed: [cyan]{s['chunks']}[/cyan]")
        console.print(f"Files indexed:  [cyan]{s['files']}[/cyan]")
        return

    vault = get_vault_path()
    movies_dir = vault / "movies"

    if not movies_dir.exists():
        console.print("[red]No vault/movies/ directory found.[/red] Run fetcher.py first.")
        sys.exit(1)

    md_files = list(movies_dir.glob("*.md"))
    if not md_files:
        console.print("[yellow]No .md files found in vault/movies/.[/yellow]")
        return

    if args.rebuild:
        console.print("Rebuilding index from scratch...")
        already_indexed: set[str] = set()
    else:
        already_indexed = get_indexed_file_paths()
        console.print(f"Incremental update — {len(already_indexed)} files already indexed")

    new_files = [f for f in md_files if str(f) not in already_indexed]
    console.print(f"Indexing {len(new_files)} new/changed files...")

    total_chunks = 0
    for md_file in track(new_files, description="Indexing..."):
        if args.rebuild:
            delete_file(str(md_file))
        try:
            chunks = chunk_note(md_file)
            if chunks:
                add_chunks(chunks)
                total_chunks += len(chunks)
        except Exception as e:
            console.print(f"  [yellow]skip[/yellow] {md_file.name}: {e}")

    s = stats()
    console.print(f"\n[green]Done.[/green] Added {total_chunks} chunks. Total: {s['chunks']} chunks across {s['files']} files.")


if __name__ == "__main__":
    main()
