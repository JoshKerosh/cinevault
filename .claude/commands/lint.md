Validate all movie notes in the vault for structural correctness.

Steps:
1. List all files in `vault/movies/` matching `*.md`
2. For each file, read it and check:
   - Required frontmatter fields present: title, year, genres, runtime_minutes, director, ratings, release_date, tmdb_id, fetched_at
   - `ratings.imdb` is a number (not null) — warn if missing
   - `release_date` matches YYYY-MM-DD format
   - `year` matches the year in the filename
   - `similar` wikilinks (`[[Title (Year)]]`) resolve to existing files in vault/movies/
   - `fetched_at` is not older than 90 days — warn on stale notes
3. Report a summary table:
   - Files checked
   - Files with errors (and list each error)
   - Files with warnings (stale data, missing optional fields)
   - Files that passed

Stop after listing issues — do not auto-fix unless the user asks.
