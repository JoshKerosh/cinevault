Search the CineVault movie vault and answer the user's question using retrieved context.

Steps:
1. Run: `python search.py "$ARGUMENTS" --top-k 5`
   - This outputs a JSON array of the most relevant movie note chunks
2. Read the JSON output — each chunk has: title, year, section, text, score, file_path
3. Answer the user's question using ONLY the information in those chunks
4. At the end, list the source notes used (e.g. "Sources: Blade Runner 2049 (2017).md, Interstellar (2014).md")

If the vault has no relevant results (empty JSON or all low scores), say so and suggest running `/ingest` first.

If $ARGUMENTS is empty, ask the user what they want to know about movies.
