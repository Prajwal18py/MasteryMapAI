"""Load only operator-controlled local model artifacts; never accept uploaded pickles."""

import os, json
from pathlib import Path
from functools import lru_cache
from datetime import datetime, timezone
from .engine import CONCEPTS

BASE = Path(__file__).resolve().parents[1]


def model_dir():
    return Path(os.getenv("MODEL_DIR", str(BASE / "models/demo")))


def report():
    p = model_dir() / "report.json"
    return (
        json.loads(p.read_text())
        if p.exists()
        else {
            "available": False,
            "message": "Train models with python -m ml.train --synthetic --output models/demo",
        }
    )


@lru_cache(maxsize=2)
def load(folder, stamp):
    import joblib, torch
    from ml.network import KnowledgeTracer

    m = joblib.load(Path(folder) / "response.joblib")
    n = KnowledgeTracer(len(CONCEPTS))
    n.load_state_dict(
        torch.load(Path(folder) / "tracer.pt", weights_only=True, map_location="cpu")
    )
    n.eval()
    torch.set_num_threads(2)
    return m, n


def predict(attempts):
    r = report()
    if os.getenv("CLOUD_PROFILE") == "lite":
        return {"available": False, "report": r, "predictions": [], "message": "Local ML/GRU inference is disabled in the optional lite hosting profile. Core BKT mastery and assessment remain available."}
    if "metrics" not in r:
        return {"available": False, "report": r, "predictions": []}
    try:
        import torch, numpy as np
        from ml.features import vector, sequence

        m, n = load(str(model_dir()), (model_dir() / "report.json").stat().st_mtime_ns)
        stamp = datetime.now(timezone.utc).isoformat()
        xs = np.array(
            [vector(attempts, c["id"], 2, stamp) for c in CONCEPTS], dtype=np.float32
        )
        tokens, length = sequence(attempts)
        ml = m.predict_proba(xs)[:, 1]
        with torch.no_grad():
            dl = torch.sigmoid(
                n(
                    torch.tensor([tokens] * len(xs)),
                    torch.tensor([length] * len(xs)),
                    torch.tensor(xs),
                )
            ).numpy()
        return {
            "available": True,
            "synthetic": r["synthetic"],
            "target": r["target"],
            "predictions": [
                dict(
                    concept=c["id"],
                    name=c["name"],
                    ml=round(float(a) * 100),
                    dl=round(float(b) * 100),
                )
                for c, a, b in zip(CONCEPTS, ml, dl)
            ],
            "report": r,
        }
    except ImportError:
        return {
            "available": False,
            "report": r,
            "predictions": [],
            "message": "Run setup to install the ML dependencies.",
        }
