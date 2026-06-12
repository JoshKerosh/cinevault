#!/usr/bin/env python3
"""Search the vault. Outputs JSON to stdout. Called by the Node.js backend."""
import argparse
import json
import sys
from dotenv import load_dotenv

load_dotenv()

from src.indexer.store import search


def main() -> None:
    parser = argparse.ArgumentParser(description="CineVault semantic search")
    parser.add_argument("query", help="Search query")
    parser.add_argument("--top-k", type=int, default=5, dest="top_k")
    args = parser.parse_args()

    try:
        chunks = search(args.query, top_k=args.top_k)
        print(json.dumps(chunks, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
