"""Explicit one-time download; API serving never downloads model code or weights."""

from pathlib import Path
import os

root = Path(__file__).resolve().parents[1]
os.environ.setdefault("HF_HOME", str(root / ".cache/huggingface"))
from sentence_transformers import SentenceTransformer

model = SentenceTransformer(
    "sentence-transformers/all-MiniLM-L6-v2", device="cpu", trust_remote_code=False
)
model.save(str(root / "backend/models/embeddings"))
print("Semantic retrieval is ready. Restart the backend if already running.")
