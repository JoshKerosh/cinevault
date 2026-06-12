import os
import hashlib
import chromadb
from pathlib import Path
from src.indexer.embedder import embed

COLLECTION = "movies"


def _client() -> chromadb.ClientAPI:
    chroma_path = os.environ.get("CHROMA_PATH", "./chroma_db")
    return chromadb.PersistentClient(path=chroma_path)


def _collection() -> chromadb.Collection:
    return _client().get_or_create_collection(COLLECTION, metadata={"hnsw:space": "cosine"})


def _chunk_id(chunk: dict) -> str:
    key = f"{chunk['file_path']}::{chunk['section']}"
    return hashlib.md5(key.encode()).hexdigest()


def add_chunks(chunks: list[dict]) -> None:
    if not chunks:
        return
    col = _collection()
    ids = [_chunk_id(c) for c in chunks]
    texts = [c["text"] for c in chunks]
    vectors = embed(texts)
    metadatas = [
        {
            "file_path": c["file_path"],
            "section": c["section"],
            "title": str(c.get("title", "")),
            "year": str(c.get("year", "")),
        }
        for c in chunks
    ]
    col.upsert(ids=ids, embeddings=vectors, documents=texts, metadatas=metadatas)


def search(query: str, top_k: int = 5) -> list[dict]:
    col = _collection()
    vectors = embed([query])
    results = col.query(query_embeddings=vectors, n_results=top_k, include=["documents", "metadatas", "distances"])

    chunks = []
    for doc, meta, dist in zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0],
    ):
        chunks.append({
            "text": doc,
            "file_path": meta.get("file_path", ""),
            "section": meta.get("section", ""),
            "title": meta.get("title", ""),
            "year": meta.get("year", ""),
            "score": round(1 - dist, 4),
        })
    return chunks


def get_indexed_file_paths() -> set[str]:
    col = _collection()
    results = col.get(include=["metadatas"])
    return {m.get("file_path", "") for m in results.get("metadatas", [])}


def delete_file(file_path: str) -> None:
    col = _collection()
    results = col.get(where={"file_path": file_path}, include=["metadatas"])
    ids = results.get("ids", [])
    if ids:
        col.delete(ids=ids)


def stats() -> dict:
    col = _collection()
    count = col.count()
    files = get_indexed_file_paths()
    return {"chunks": count, "files": len(files)}
