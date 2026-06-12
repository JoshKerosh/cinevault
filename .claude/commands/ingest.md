Fetch fresh movie data from TMDB, OMDb, and Trakt, then rebuild the vector index.

Steps:
1. Run the fetcher: `python fetcher.py $ARGUMENTS`
   - No args = full fetch (upcoming + trending + popular)
   - `--upcoming` = upcoming movies only
   - `--trending` = trending only
   - `--movie "Title"` = fetch one specific movie
2. Run the indexer: `python indexer.py`
3. Report how many notes were created/updated and how many chunks were indexed.

If either command fails, show the error and stop. Do not proceed to the next step if a step fails.
