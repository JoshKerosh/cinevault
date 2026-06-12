# CineVault

Personal movie intelligence system. Fetches movie data from TMDB/OMDb/Trakt → stores as Obsidian Markdown notes → indexes into ChromaDB → answers questions via RAG using `claude -p`.

## Architecture

```
fetcher.py  →  vault/ (Markdown notes)  →  indexer.py  →  chroma_db/
                                                              ↓
server/ (Node.js)  →  search.py (Python)  ←  POST /api/query
       ↓
spawn('claude -p')  →  answer JSON  →  src-frontend/ (React)
```

## Setup

```bash
# Python
python -m venv .venv
.venv\Scripts\activate       # Windows
pip install -r requirements.txt

# Node (server)
cd server && npm install

# Node (frontend)
cd src-frontend && npm install

# Config
cp .env.example .env
# Fill in: TMDB_API_KEY, OMDB_API_KEY, TRAKT_CLIENT_ID
```

## Running

```bash
# 1. Fetch data
python fetcher.py

# 2. Build vector index
python indexer.py

# 3. Start backend (port 8787)
cd server && npm run dev

# 4. Start frontend (port 5173)
cd src-frontend && npm run dev
```

## Claude Code Commands

| Command | What it does |
|---|---|
| `/ingest` | Run fetcher + indexer to refresh all movie data |
| `/query <question>` | Search vault and answer a movie question |
| `/lint` | Validate all vault notes for missing fields / broken links |

## Key Files

- `src/fetcher/` — TMDB, OMDb, Trakt API clients
- `src/indexer/` — ChromaDB chunking, embedding, storage
- `search.py` — CLI: query → JSON chunks (called by Node backend)
- `server/lib/claude.ts` — spawns `claude -p` with context
- `server/mcp.ts` — MCP server exposing vault as tools
- `vault/` — Obsidian vault (open in Obsidian to browse)

## Environment

| Variable | Description |
|---|---|
| `CINEVAULT_CLAUDE_CMD` | Path to `claude` CLI (default: `claude`) |
| `CINEVAULT_MODEL` | Model for queries: `sonnet`, `haiku`, `opus` |
| `TMDB_API_KEY` | From themoviedb.org/settings/api |
| `OMDB_API_KEY` | From omdbapi.com/apikey.aspx |
| `TRAKT_CLIENT_ID` | From trakt.tv/oauth/applications |
