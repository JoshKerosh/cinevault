# CineVault — Project Specification

**Version:** 2.0  
**Date:** 2026-06-11  
**Status:** Draft

---

## 1. Project Overview

CineVault is a personal, locally-running movie intelligence system. You ask it questions in natural language and it answers using up-to-date movie data it has collected from public sources.

It is built on the same architectural pattern as **BITAYA** (a prior project): movie data is stored as Markdown notes in an Obsidian vault, a Python pipeline indexes those notes into a vector database, and a Node.js backend answers queries by retrieving the most relevant notes and piping them into `claude -p` (your locally installed Claude Code CLI). **No separate API key is needed — the system uses your existing Claude subscription.**

The system has four layers:

1. **Python Fetcher** — pulls movie data from TMDB, OMDb, and Trakt APIs and writes Markdown notes into an Obsidian vault.
2. **Python Indexer + Search** — reads vault notes, generates embeddings, and stores them in ChromaDB for semantic vector search.
3. **Node.js Backend** — receives queries, calls the Python search module for relevant chunks, then spawns `claude -p` with those chunks as context.
4. **React Frontend** — browser UI with a chat window and a browseable movie library.

Additionally, a **Claude Code MCP server** exposes the vault as searchable tools, enabling `/ingest`, `/query`, and `/lint` commands to work directly from this Claude Code session.

### Goals

- Ask natural-language questions about movies and get answers grounded in real, locally-stored data.
- Stay current: re-run the fetcher whenever you want fresh data.
- Browse the full movie library visually in the browser.
- All data lives in your Obsidian vault — you own it and can browse it in Obsidian independently.
- No API costs for queries — uses your existing Claude CLI subscription.

### Non-Goals (v1)

- No user accounts or multi-user support.
- No automatic scheduled updates — data refresh is manual.
- No cloud hosting — everything runs on your local machine.
- No streaming availability data (JustWatch has no public API).

---

## 2. Use Cases

| # | As a user, I want to… | Example query |
|---|---|---|
| UC-1 | Know what movies are coming out soon | "What big movies are releasing in July 2026?" |
| UC-2 | Get aggregated ratings before watching | "What do critics and audiences think of Dune Part Two?" |
| UC-3 | Look up facts about a specific movie | "Who directed Blade Runner 2049 and how long is it?" |
| UC-4 | Get recommendations based on my taste | "Recommend me sci-fi movies similar to Interstellar with high IMDb scores" |

---

## 3. System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                             CineVault                                 │
│                                                                      │
│  ┌─────────────────┐     ┌────────────────────────────────────────┐  │
│  │ Python Fetcher  │────▶│        Obsidian Vault (vault/)         │  │
│  │  fetcher.py     │     │  movies/Blade Runner 2049 (2017).md    │  │
│  │  - TMDB API     │     │  movies/Interstellar (2014).md         │  │
│  │  - OMDb API     │     │  upcoming/Upcoming - July 2026.md      │  │
│  │  - Trakt API    │     └──────────────────┬─────────────────────┘  │
│  └─────────────────┘                        │                        │
│                                             ▼                        │
│                          ┌────────────────────────────────────────┐  │
│                          │   Python Indexer + Search              │  │
│                          │   indexer.py  /  search.py             │  │
│                          │   sentence-transformers → ChromaDB     │  │
│                          └──────────────────┬─────────────────────┘  │
│                                             │                        │
│                                             ▼                        │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │              Node.js Backend  (server/)                       │    │
│  │                                                              │    │
│  │  POST /api/query  "recommend sci-fi like Interstellar"       │    │
│  │    ① python search.py "recommend sci-fi like Interstellar"  │    │
│  │       → top-5 relevant vault chunks (JSON)                  │    │
│  │    ② spawn('claude', ['-p', '--output-format', 'json',      │    │
│  │             '--model', 'sonnet'])                            │    │
│  │       stdin: SYSTEM_PROMPT + chunks + user query            │    │
│  │       → structured JSON answer                              │    │
│  │    ③ return JSON to frontend                                │    │
│  │                                                              │    │
│  │  + MCP server  mcp.ts  (exposes vault to Claude Code)        │    │
│  └─────────────────────────────┬────────────────────────────────┘    │
│                                │                                     │
│                                ▼                                     │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │          React Frontend  (src/)  — Vite + Tailwind            │    │
│  │                                                              │    │
│  │   [Movie Browser]  |  [Chat]                                 │    │
│  └──────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘

  .claude/commands/
    /ingest  →  fetcher.py + indexer.py
    /query   →  search.py + claude -p (directly in CLI)
    /lint    →  validate vault structure and frontmatter
```

### Key architectural decision: spawn `claude -p`, not the Anthropic API

Identical to BITAYA. The Node.js backend (and the `/query` Claude Code command) do not call the Anthropic REST API. Instead they spawn the Claude Code CLI that is already installed and authenticated on your machine:

```ts
spawn('claude', ['-p', '--output-format', 'json', '--model', 'sonnet'], {
  input: SYSTEM_PROMPT + retrievedChunks + userQuery
})
```

Each query consumes tokens from your Claude subscription. No separate API key, no separate billing.

### Why RAG (not full-context like BITAYA)

BITAYA loads its entire wiki (~46 KB) into every call — this works because a legal wiki is small and bounded. CineVault's vault grows without limit: 100 movies × ~2 KB each = 200 KB; 500 movies = 1 MB. Loading everything every call would hit context limits and slow responses.

Solution: use ChromaDB to embed all notes at index time. At query time, embed the user's question and retrieve only the top-5 most semantically relevant chunks. Those ~10 KB of context go to `claude -p`. Scales to any vault size.

### Technology Stack

| Component | Technology |
|---|---|
| Data fetching / indexing | Python 3.11+ |
| Vector database | ChromaDB (local, no server) |
| Embeddings | `sentence-transformers/all-MiniLM-L6-v2` (runs on CPU, free) |
| Backend | Node.js + TypeScript (mirrors BITAYA) |
| Frontend | React 19 + Vite + Tailwind CSS |
| LLM calls | `spawn('claude', ['-p', ...])` — your existing Claude CLI |
| Claude Code commands | `.claude/commands/` Markdown files |
| MCP server | `server/mcp.ts` (stdio, mirrors BITAYA) |

---

## 4. Data Sources

### 4.1 TMDB (The Movie Database) — Primary Source

- **What it provides:** Full movie details (title, release date, genres, runtime, cast, director, plot, posters), upcoming releases calendar, similar movies, trending lists.
- **API type:** REST + JSON. Free with registration.
- **Rate limit:** 40 requests / 10 seconds.
- **API key:** Required. Register at https://www.themoviedb.org/settings/api
- **Key endpoints:**
  - `GET /movie/upcoming` — films releasing in next 90 days
  - `GET /movie/{id}` — full movie details
  - `GET /movie/{id}/credits` — cast and crew
  - `GET /movie/{id}/similar` — similar films
  - `GET /trending/movie/week` — what's trending now
  - `GET /search/movie` — search by title

### 4.2 OMDb (Open Movie Database)

- **What it provides:** IMDb rating + vote count, Rotten Tomatoes score, Metacritic score — all in one call.
- **API type:** REST + JSON. Free tier: 1,000 requests/day.
- **API key:** Required. Register at https://www.omdbapi.com/apikey.aspx
- **Link to TMDB:** TMDB returns the `imdb_id` for each movie; OMDb is queried using that ID.

### 4.3 Trakt

- **What it provides:** Trending movies, popular movies, anticipated upcoming films.
- **API type:** REST + JSON. Free.
- **API key:** Required (client ID). Register at https://trakt.tv/oauth/applications
- **Key endpoints:**
  - `GET /movies/trending` — currently trending
  - `GET /movies/popular` — all-time popular
  - `GET /movies/anticipated` — most anticipated upcoming

### 4.4 Future Sources (not in v1)

| Source | What it adds | Blocker |
|---|---|---|
| Letterboxd | User reviews and curated lists | No official API; HTML scraping required |
| JustWatch | Streaming availability (Netflix, etc.) | No public API |
| Roger Ebert (rogerebert.com) | In-depth written reviews | HTML scraping required |

---

## 5. Python Fetcher (`fetcher.py`)

### Responsibilities

1. Query TMDB, OMDb, and Trakt for movie data.
2. Merge data from all three into one unified movie record.
3. Write each movie as a Markdown note in `vault/movies/`.
4. Write monthly upcoming-release digest notes in `vault/upcoming/`.
5. Maintain `vault/.fetch-index.json` — a record of all fetched TMDB IDs to skip duplicates on future runs.

### What gets fetched per run

| Category | Source | Volume |
|---|---|---|
| Upcoming movies (next 90 days) | TMDB | ~30–60 movies |
| Trending this week | TMDB + Trakt | Top 20 |
| Popular all-time | Trakt | Top 50 |
| Full details per discovered movie | TMDB | 1 API call per movie |
| Ratings per movie | OMDb | 1 API call per movie (via IMDb ID) |

### CLI

```bash
python fetcher.py              # Full fetch (upcoming + trending + popular)
python fetcher.py --upcoming   # Upcoming movies only
python fetcher.py --trending   # Trending only
python fetcher.py --movie "Interstellar"  # Fetch one specific movie
```

### Error handling

- Respect TMDB's 40 req/10s limit with automatic throttling.
- If OMDb returns a rate-limit error, skip ratings fields for that movie and continue — do not abort.
- Retry network errors up to 3 times with exponential backoff.
- Log all skipped movies to `fetcher.log`.

---

## 6. Obsidian Vault (`vault/`)

### Location

Created by the project at:
```
C:\Users\jjl10\Desktop\Proyectos\RAG\vault\
```

Open this folder in Obsidian as a vault at any time to browse all movie notes and their wikilinks.

### Folder structure

```
vault/
├── movies/             # One Markdown note per movie
├── upcoming/           # Monthly upcoming-release digest notes
└── _index.md           # Auto-generated alphabetical index
```

### Movie note format

Filename: `{Title} ({Year}).md` — e.g., `Blade Runner 2049 (2017).md`

```markdown
---
title: Blade Runner 2049
year: 2017
genres: [Science Fiction, Drama, Mystery]
runtime_minutes: 164
director: Denis Villeneuve
cast: [Ryan Gosling, Harrison Ford, Ana de Armas, Sylvia Hoeks, Robin Wright]
imdb_id: tt1856101
tmdb_id: 335984
status: Released
release_date: 2017-10-06
ratings:
  imdb: 8.0
  imdb_votes: 620000
  rotten_tomatoes: 88
  metacritic: 81
poster_url: https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg
fetched_at: 2026-06-11
tags: [movie, released, sci-fi, drama]
---

# Blade Runner 2049

## Synopsis
Thirty years after the events of the first film, a new blade runner, LAPD Officer K,
unearths a long-buried secret that has the potential to plunge what's left of society
into chaos. K's discovery leads him on a quest to find Rick Deckard, a former LAPD
blade runner who has been missing for 30 years.

## Details
- **Director:** Denis Villeneuve
- **Runtime:** 164 minutes
- **Genres:** Science Fiction, Drama, Mystery
- **Release Date:** October 6, 2017

## Cast
1. Ryan Gosling as K
2. Harrison Ford as Rick Deckard
3. Ana de Armas as Joi
4. Sylvia Hoeks as Luv
5. Robin Wright as Lieutenant Joshi

## Ratings
| Source | Score |
|---|---|
| IMDb | 8.0 / 10 (620,000 votes) |
| Rotten Tomatoes | 88% |
| Metacritic | 81 / 100 |

## Similar Movies
- [[Blade Runner (1982)]]
- [[Arrival (2016)]]
- [[Ex Machina (2014)]]
```

Notes include Obsidian `[[wikilinks]]` to similar movies — the vault forms a navigable graph.

### Upcoming digest format

Filename: `upcoming/Upcoming - July 2026.md`

```markdown
# Upcoming Releases — July 2026

| Title | Release Date | Genre |
|---|---|---|
| Movie Title | 2026-07-04 | Action |
```

---

## 7. Python Indexer + Search

### Indexer (`indexer.py`)

Reads every `.md` file in `vault/movies/`, splits each into logical sections, generates a vector embedding per section, and stores the embeddings in ChromaDB.

- **Incremental:** tracks file modification times; already-indexed, unchanged notes are skipped.
- **Chunking strategy:** split by Markdown headings (`## Synopsis`, `## Cast`, `## Ratings`, etc.) rather than character count — keeps semantic context intact. The YAML frontmatter (title, year, director, genres) is prepended to every chunk so movie identity is always present.
- **Embedding model:** `sentence-transformers/all-MiniLM-L6-v2` — runs on CPU, no API key, ~80 MB download once.

```bash
python indexer.py            # Index all new/changed notes
python indexer.py --rebuild  # Drop and fully rebuild the index
python indexer.py --stats    # Show: total movies, total chunks, last run
```

### Search module (`search.py`)

Called by the Node.js backend as a subprocess. Accepts a query string, embeds it, queries ChromaDB for the top-K most similar chunks, and returns them as JSON.

```bash
python search.py "sci-fi movies like Interstellar" --top-k 5
# stdout: JSON array of { title, year, section, text, score }
```

The Node.js backend calls this and passes the result as context to `claude -p`.

---

## 8. Node.js Backend (`server/`)

Mirrors the BITAYA backend architecture.

### Startup

Loads environment variables from `.env`. Verifies `claude` CLI is available on PATH. Starts HTTP server on port **8787**.

### Routes

| Method | Route | Description |
|---|---|---|
| GET | `/api/health` | Returns `{ status: "ok", claudeAvailable: true, moviesIndexed: 342 }` |
| GET | `/api/movies` | Returns list of all movies from the vault index (for the browser panel) |
| GET | `/api/graph` | Returns nodes + edges for the wiki graph view (derived from wikilinks) |
| POST | `/api/chat` | General chat — retrieves context, spawns `claude -p`, returns text |
| POST | `/api/query` | Structured movie query — returns JSON with recommendations, sources cited |

### Query flow (`POST /api/query`)

```
1. Receive { message: "sci-fi movies like Interstellar" }
2. Spawn: python search.py "sci-fi movies like Interstellar" --top-k 5
   → topChunks: [{ title, year, section, text }, ...]
3. Build stdin payload:
     SYSTEM_PROMPT (defines response JSON schema and tone)
   + topChunks (formatted as labeled sections)
   + user message
4. Spawn: claude -p --output-format json --model sonnet
   stdin ← payload above
5. Parse JSON response → return to frontend
```

### Response JSON schema

```ts
{
  answer: string,          // Natural-language answer
  movies: [{               // Movies referenced in the answer
    title: string,
    year: number,
    imdb: number,
    rt: number,
    genres: string[],
    synopsis: string,
  }],
  sourcesUsed: string[],   // Vault file paths that were retrieved
  confidence: "high" | "medium" | "low"
}
```

### LLM configuration (`.env`)

```
CINEVAULT_CLAUDE_CMD=claude        # or path to claude binary
CINEVAULT_MODEL=sonnet             # sonnet | haiku | opus
```

---

## 9. MCP Server (`server/mcp.ts`)

A stdio MCP server, identical in pattern to BITAYA's. Exposes the vault as tools for Claude Code and Claude Desktop.

### Tools exposed

| Tool | Signature | Description |
|---|---|---|
| `search_vault` | `(query: string, topK?: number)` | Semantic search — returns top matching movie chunks |
| `get_movie` | `(title: string)` | Read a specific movie's full note |
| `list_movies` | `(genre?: string, year?: number)` | List all movies, optionally filtered |
| `get_upcoming` | `()` | Return the latest upcoming-releases digest |
| `reload_vault` | `()` | Reload vault metadata from disk |

### Why this matters

With the MCP server running, Claude Code (this CLI) can navigate the vault directly. The `/ingest`, `/query`, and `/lint` commands work without leaving the terminal.

---

## 10. Claude Code Commands (`.claude/commands/`)

Three Markdown files in the project's `.claude/commands/` folder. Each becomes a slash command usable in this Claude Code session.

### `/ingest`

**File:** `.claude/commands/ingest.md`

Runs the full data refresh pipeline:

```
1. python fetcher.py $ARGUMENTS
   (pass --upcoming, --trending, or --movie "Title" as optional args)
2. python indexer.py
3. Report: N new notes created, M updated, index rebuilt
```

Example usage:
```
/ingest                     # Full refresh
/ingest --upcoming          # Upcoming movies only
/ingest --movie "Dune 3"    # Fetch one specific movie
```

### `/query`

**File:** `.claude/commands/query.md`

Runs a RAG query against the vault using Claude Code itself as the LLM:

```
1. python search.py "$ARGUMENTS" --top-k 5
2. Read the returned chunks
3. Answer the question using those chunks as grounding
4. Show: answer + list of source notes used
```

Example usage:
```
/query What sci-fi movies are coming out in 2026?
/query Best movies directed by Denis Villeneuve
/query Is Sinners (2025) worth watching?
```

### `/lint`

**File:** `.claude/commands/lint.md`

Validates all notes in the vault:

```
Checks per note:
- Required frontmatter fields present (title, year, genres, runtime_minutes, director, ratings)
- Ratings fields are numbers, not null
- release_date is valid ISO format
- Similar movies wikilinks resolve to existing notes
- fetched_at is not older than 90 days (warns on stale data)

Output: table of issues per file, summary count
```

---

## 11. React Frontend (`src/`)

Built with React 19 + Vite + Tailwind CSS. Communicates with the Node.js backend at `localhost:8787`.

### Layout

Two-column layout, same screen:

```
┌──────────────────────────────────────────────────────────────────┐
│  CineVault                         342 movies · last sync 2h ago │
├─────────────────────────┬────────────────────────────────────────┤
│                         │                                        │
│   MOVIE BROWSER         │   CHAT                                 │
│   ──────────────        │   ──────                               │
│   Search [__________]   │  [conversation history]               │
│   Genre ▼   Year ▼      │                                        │
│                         │  You: recommend sci-fi like            │
│   Blade Runner 2049     │       Interstellar                     │
│   2017 · ★8.0 · Sci-Fi  │                                        │
│                         │  CineVault: Based on your vault,       │
│   Interstellar          │  here are 4 matches...                 │
│   2014 · ★8.6 · Sci-Fi  │  [Arrival (2016)] [Dune (2021)] ...   │
│                         │                                        │
│   [click → detail]      │  Sources: 5 notes retrieved ▾         │
│                         │                                        │
│                         │  [Ask about movies...]    [Send]       │
└─────────────────────────┴────────────────────────────────────────┘
```

### Movie Browser (left panel)

- Live title search
- Genre dropdown filter
- Year range slider
- Each card: title, year, IMDb rating, genre tags
- Click to expand full detail card (all fields, ratings table, cast, synopsis, poster)

### Chat (right panel)

- Multi-turn conversation with scrolling history
- Below each answer: collapsible "Sources used" section listing which vault notes were retrieved
- Conversation is context-aware across turns

### Graph tab (optional, low priority for v1)

Interactive graph of the vault — nodes are movie notes, edges are `[[wikilinks]]`. Rendered with Sigma.js (same as BITAYA's graph tab). Useful for exploring connections visually.

---

## 12. Configuration & Environment

`.env` file at the project root (never committed to git):

```
# Claude CLI
CINEVAULT_CLAUDE_CMD=claude
CINEVAULT_MODEL=sonnet        # sonnet | haiku | opus

# Data source API keys
TMDB_API_KEY=
OMDB_API_KEY=
TRAKT_CLIENT_ID=

# Paths
VAULT_PATH=./vault
CHROMA_PATH=./chroma_db

# Fetcher settings
UPCOMING_DAYS_AHEAD=90
TRENDING_COUNT=20
POPULAR_COUNT=50

# RAG settings
TOP_K_RESULTS=5
```

---

## 13. Project File Structure

```
RAG/
├── .env                         # Secrets and config (gitignored)
├── .env.example                 # Template
├── SPEC.md                      # This document
│
├── .claude/
│   └── commands/
│       ├── ingest.md            # /ingest command
│       ├── query.md             # /query command
│       └── lint.md              # /lint command
│
├── fetcher.py                   # CLI: fetch movie data → vault notes
├── indexer.py                   # CLI: vault notes → ChromaDB
├── search.py                    # CLI: query ChromaDB → JSON chunks
│
├── src/                         # Python modules
│   ├── fetcher/
│   │   ├── tmdb.py
│   │   ├── omdb.py
│   │   ├── trakt.py
│   │   └── writer.py            # Markdown note writer
│   └── indexer/
│       ├── chunker.py
│       ├── embedder.py
│       └── store.py             # ChromaDB read/write
│
├── requirements.txt             # Python deps
│
├── server/                      # Node.js backend
│   ├── package.json
│   ├── tsconfig.json
│   ├── index.ts                 # HTTP server entry point
│   ├── routes/
│   │   ├── query.ts             # POST /api/query
│   │   ├── movies.ts            # GET /api/movies
│   │   └── graph.ts             # GET /api/graph
│   ├── lib/
│   │   ├── claude.ts            # spawn('claude', ['-p', ...]) wrapper
│   │   ├── search.ts            # calls python search.py subprocess
│   │   └── prompts.ts           # SYSTEM_PROMPT definitions
│   └── mcp.ts                   # MCP stdio server
│
├── src-frontend/                # React frontend
│   ├── index.html
│   ├── vite.config.ts
│   └── src/
│       ├── App.tsx
│       ├── components/
│       │   ├── MovieBrowser.tsx
│       │   ├── Chat.tsx
│       │   └── MovieCard.tsx
│       └── api.ts               # fetch calls to backend
│
├── vault/                       # Obsidian vault (created by fetcher)
│   ├── movies/
│   ├── upcoming/
│   └── _index.md
│
└── chroma_db/                   # Vector database (created by indexer)
```

---

## 14. Setup & First Run

```bash
# 1. Python environment
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt

# 2. Node.js environment
cd server && npm install && cd ..
cd src-frontend && npm install && cd ..

# 3. Configure secrets
cp .env.example .env
# → fill in TMDB_API_KEY, OMDB_API_KEY, TRAKT_CLIENT_ID

# 4. Fetch movie data
python fetcher.py

# 5. Build the vector index
python indexer.py

# 6. Start servers (two terminals)
cd server && npm run dev         # backend on :8787
cd src-frontend && npm run dev   # frontend on :5173
```

### Updating data (any time)

```bash
python fetcher.py    # pull fresh data
python indexer.py    # re-index new/changed notes
```

Or from Claude Code: `/ingest`

---

## 15. End-to-End Query Flow

```
User types: "Best sci-fi movies from the last 5 years"
      │
      ▼ (frontend)
POST http://localhost:8787/api/query
{ message: "Best sci-fi movies from the last 5 years" }
      │
      ▼ (server/routes/query.ts)
python search.py "Best sci-fi movies from the last 5 years" --top-k 5
→ [ { title: "Dune", year: 2021, section: "Synopsis", text: "..." },
    { title: "Arrival", year: 2016, ... },
    ... ]
      │
      ▼ (server/lib/claude.ts)
spawn('claude', ['-p', '--output-format', 'json', '--model', 'sonnet'])
  stdin: SYSTEM_PROMPT
       + "## Dune (2021)\nSynopsis: ..."
       + "## Arrival (2016)\n..."
       + "User question: Best sci-fi movies from the last 5 years"
      │
      ▼ (Claude Sonnet, via your subscription)
{
  "answer": "Based on your vault, the top sci-fi films...",
  "movies": [ { "title": "Dune", "year": 2021, "imdb": 7.9, ... }, ... ],
  "sourcesUsed": ["vault/movies/Dune (2021).md", ...],
  "confidence": "high"
}
      │
      ▼ (frontend)
Renders answer + movie cards + collapsible sources
```

---

## 16. Open Decisions

| # | Decision | Status | Notes |
|---|---|---|---|
| OD-1 | Additional data sources | Open | Could add Letterboxd (scraping), JustWatch (scraping), Roger Ebert (scraping) in v2 |
| OD-2 | Graph tab in frontend | Low priority | Sigma.js graph of wikilinks — can be added after core chat works |
| OD-3 | Streaming availability | Not in v1 | No public API; requires HTML scraping |

---

## 17. Future Enhancements (v2+)

- **Watchlist:** Mark movies as "want to watch" / "watched" in the app, stored as Obsidian tags.
- **Streaming availability:** Scrape JustWatch for Netflix/HBO/etc. availability per region.
- **Director/actor pages:** Dedicated vault notes for people, linked from movie notes.
- **Scheduled auto-refresh:** Run fetcher on a weekly cron via Claude Code `/schedule`.
- **Weekly digest:** Auto-generate "What's new this week" Markdown summary.
- **More sources:** Letterboxd lists, YouTube trailer links, Roger Ebert reviews.
