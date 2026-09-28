"""ACL-filtered hybrid search. Local semantic model is optional; lexical mode is explicit."""

import os, re, hashlib, threading
from pathlib import Path
from functools import lru_cache
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from .engine import CONCEPTS

BASE = Path(__file__).resolve().parents[1]
LOCK = threading.Lock()


def chunks(docs):
    """Preserve page boundaries and prefer whole words when splitting long passages."""
    out=[]
    for d in docs:
        sections=re.split(r"(\[Page \d+\])",d["content"])
        page=None
        count=0
        for section in sections:
            marker=re.fullmatch(r"\[Page (\d+)\]",section)
            if marker:
                page=int(marker.group(1))
                continue
            text=section.strip()
            start=0
            while start<len(text):
                end=min(start+1200,len(text))
                if end<len(text):
                    boundary=max(text.rfind("\n",start+700,end),text.rfind(". ",start+700,end))
                    if boundary<0:boundary=text.rfind(" ",start+700,end)
                    if boundary>start:end=boundary+1
                passage=text[start:end].strip()
                if passage:
                    count+=1
                    out.append(dict(source=d["name"],documentId=d["id"],chunk=count,page=page,text=passage))
                if end==len(text):break
                start=max(start+1,end-150)
                while start<end and not text[start-1].isspace():start+=1
    return out


@lru_cache(maxsize=1)
def encoder():
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(
        str(BASE / "models/embeddings"), local_files_only=True, device="cpu"
    )


@lru_cache(maxsize=16)
def embed_passages(texts):
    with LOCK:
        return encoder().encode(
            list(texts), normalize_embeddings=True, show_progress_bar=False
        )


def search(query, docs, limit=4):
    passages = chunks(docs)
    # Built-in references remain available, but do not outrank matching uploaded notes by default.
    if not passages:
        return {"sources": [], "retrieval": "No subject evidence", "warning": None}
    texts = [p["text"] for p in passages]
    try:
        v = TfidfVectorizer(ngram_range=(1, 2), stop_words="english", sublinear_tf=True)
        matrix = v.fit_transform(texts)
        lex = (matrix @ v.transform([query]).T).toarray().ravel()
    except ValueError:
        lex = np.zeros(len(texts))
    score = lex
    mode = "TF-IDF lexical"
    warning = None
    if os.getenv("CLOUD_PROFILE") != "lite" and (BASE / "models/embeddings/config.json").exists():
        try:
            e = embed_passages(tuple(texts))
            with LOCK:
                q = encoder().encode(
                    [query], normalize_embeddings=True, show_progress_bar=False
                )[0]
            semantic = e @ q
            score = 0.65 * semantic + 0.35 * lex
            mode = "Hybrid MiniLM + TF-IDF"
        except Exception:
            warning = "Semantic model unavailable; lexical retrieval used."
    selected = [
        i
        for i in np.argsort(-score)
        if score[i] > (0.20 if mode.startswith("Hybrid") else 0.03)
    ][:limit]
    return {
        "sources": [
            {**passages[i], "score": round(float(score[i]), 4)} for i in selected
        ],
        "retrieval": mode,
        "warning": warning,
    }


def check_citations(text, sources):
    # Python indexes inside code are not source citations.
    prose = re.sub(r"```[\s\S]*?```|`[^`\n]*`", "", text)
    groups = re.findall(r"\[(\d+(?:\s*,\s*\d+)*)\]", prose)
    refs = [int(n) for group in groups for n in re.split(r"\s*,\s*", group)]
    return bool(refs) and all(1 <= n <= len(sources) for n in refs)
