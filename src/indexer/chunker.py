import re
import yaml
from pathlib import Path


def chunk_note(file_path: Path) -> list[dict]:
    """Split a movie note into logical sections. Each chunk includes frontmatter context."""
    text = file_path.read_text(encoding="utf-8")

    # Extract frontmatter
    meta: dict = {}
    body = text
    if text.startswith("---"):
        end = text.find("---", 3)
        if end != -1:
            try:
                meta = yaml.safe_load(text[3:end]) or {}
            except yaml.YAMLError:
                meta = {}
            body = text[end + 3:].strip()

    title = meta.get("title", file_path.stem)
    year = meta.get("year", "")
    director = meta.get("director", "")
    genres = meta.get("genres", [])
    ratings = meta.get("ratings", {}) or {}

    # Context prefix prepended to every chunk so the LLM always knows which movie
    prefix = (
        f"Movie: {title} ({year})\n"
        f"Director: {director}\n"
        f"Genres: {', '.join(genres) if isinstance(genres, list) else genres}\n"
        f"IMDb: {ratings.get('imdb', 'N/A')}  "
        f"RT: {ratings.get('rotten_tomatoes', 'N/A')}%  "
        f"Metacritic: {ratings.get('metacritic', 'N/A')}\n\n"
    )

    # Split body by ## headings
    sections = re.split(r"(?m)^(##\s+.+)$", body)
    chunks = []

    # Text before the first heading (if any)
    if sections[0].strip():
        chunks.append({
            "section": "intro",
            "text": prefix + sections[0].strip(),
            "file_path": str(file_path),
            "title": title,
            "year": year,
        })

    # Paired (heading, content) sections
    for i in range(1, len(sections) - 1, 2):
        heading = sections[i].strip("# ").strip()
        content = sections[i + 1].strip() if i + 1 < len(sections) else ""
        if content:
            chunks.append({
                "section": heading,
                "text": prefix + f"## {heading}\n{content}",
                "file_path": str(file_path),
                "title": title,
                "year": year,
            })

    return chunks
