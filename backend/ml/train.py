"""Run from backend: python -m ml.train --synthetic --output models/demo.
Real data: --csv path.csv --output models/local (no synthetic flag).
CSV: student_id,concept,correct,hint,seconds,difficulty,created_at. IDs must be pseudonymous.
"""

import argparse, csv, hashlib, json, random, time
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from pathlib import Path
import numpy as np
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import roc_auc_score, brier_score_loss, log_loss
from app.engine import CONCEPTS
from .features import FEATURES, IDS, vector, sequence


def synthetic(seed=42):
    rng = np.random.default_rng(seed)
    out = []
    for s in range(160):
        skill = rng.normal(0, 0.7, len(IDS))
        stamp = datetime(2025, 1, 1, tzinfo=timezone.utc)
        for i in range(55):
            j = int(rng.integers(len(IDS)))
            d = int(rng.integers(1, 4))
            hint = int(rng.random() < 0.2)
            p = 1 / (1 + np.exp(-(skill[j] - 0.55 * (d - 1) + 0.2 * hint)))
            y = int(rng.random() < p)
            skill[j] += 0.09
            stamp += timedelta(hours=float(rng.uniform(1, 36)))
            out.append(
                dict(
                    student_id=f"synthetic-{s}",
                    concept=IDS[j],
                    correct=y,
                    hint=hint,
                    seconds=int(rng.integers(15, 150)),
                    difficulty=d,
                    created_at=stamp.isoformat(),
                )
            )
    return out


def validate(rows):
    seen = set()
    for r in rows:
        if r["concept"] not in IDS:
            raise ValueError("Unsupported concept: " + r["concept"])
        for k in ["correct", "hint", "seconds", "difficulty"]:
            r[k] = int(r[k])
        if (
            r["correct"] not in [0, 1]
            or r["hint"] not in [0, 1]
            or r["difficulty"] not in [1, 2, 3]
            or not 0 <= r["seconds"] <= 3600
        ):
            raise ValueError("Invalid response fields")
        t = datetime.fromisoformat(r["created_at"])
        if t.tzinfo is None:
            raise ValueError("Timestamps need timezone, e.g. +00:00")
        r["created_at"] = t.astimezone(timezone.utc).isoformat()
        key = (r["student_id"], r["created_at"])
        if key in seen:
            raise ValueError("Duplicate student/timestamp; clean duplicates first")
        seen.add(key)
    if len(set(r["student_id"] for r in rows)) < 30:
        raise ValueError("Need at least 30 students for three disjoint groups")
    return rows


def examples(rows):
    histories = defaultdict(list)
    X = []
    T = []
    L = []
    Y = []
    G = []
    B = []
    stamps = []
    for r in sorted(rows, key=lambda r: (r["created_at"], r["student_id"])):
        h = histories[r["student_id"]]
        v = vector(h, r["concept"], r["difficulty"], r["created_at"])
        tok, l = sequence(h)
        X.append(v)
        T.append(tok)
        L.append(l)
        Y.append(r["correct"])
        G.append(r["student_id"])
        B.append(v[6] * 0.88 + (1 - v[6]) * 0.25)
        stamps.append(r["created_at"])
        h.append(r)
    return (
        np.array(X, dtype=np.float32),
        np.array(T),
        np.array(L),
        np.array(Y),
        np.array(G),
        np.array(B),
        np.array(stamps),
    )


def metrics(y, p):
    return dict(
        auc=round(float(roc_auc_score(y, p)), 4) if len(set(y)) > 1 else None,
        brier=round(float(brier_score_loss(y, p)), 4),
        logLoss=round(float(log_loss(y, p, labels=[0, 1])), 4),
        accuracy=round(float(np.mean((p >= 0.5) == y)), 4),
        n=len(y),
        reliability=[
            dict(
                count=int(sum((p >= a) & (p < b))),
                predicted=round(float(np.mean(p[(p >= a) & (p < b)])), 3),
                observed=round(float(np.mean(y[(p >= a) & (p < b)])), 3),
            )
            for a, b in zip(np.arange(0, 1, 0.2), np.arange(0.2, 1.01, 0.2))
            if sum((p >= a) & (p < b))
        ],
    )


def main():
    ap = argparse.ArgumentParser()
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--synthetic", action="store_true")
    src.add_argument("--csv")
    ap.add_argument("--output", default="models/local")
    ap.add_argument("--epochs", type=int, default=18)
    args = ap.parse_args()
    import torch
    from .network import KnowledgeTracer

    torch.set_num_threads(2)
    torch.manual_seed(42)
    np.random.seed(42)
    random.seed(42)
    rows = validate(
        synthetic()
        if args.synthetic
        else list(csv.DictReader(open(args.csv, encoding="utf-8-sig")))
    )
    X, T, L, Y, G, B, S = examples(rows)
    groups = sorted(set(G))
    random.shuffle(groups)
    n = len(groups)
    train = np.isin(G, groups[: int(n * 0.7)])
    val = np.isin(G, groups[int(n * 0.7) : int(n * 0.85)])
    test = np.isin(G, groups[int(n * 0.85) :])
    for mask in (train, val, test):
        if len(set(Y[mask])) < 2:
            raise ValueError("Every split needs correct and incorrect responses")
    out = Path(args.output)
    out.mkdir(parents=True, exist_ok=True)
    models = {
        "logistic": make_pipeline(
            StandardScaler(), LogisticRegression(max_iter=600, random_state=42)
        ),
        "forest": RandomForestClassifier(
            n_estimators=100,
            max_depth=7,
            min_samples_leaf=15,
            n_jobs=2,
            random_state=42,
        ),
    }
    scores = {}
    predictions = {}
    for name, m in models.items():
        m.fit(X[train], Y[train])
        scores[name] = brier_score_loss(Y[val], m.predict_proba(X[val])[:, 1])
        predictions[name] = m.predict_proba(X[test])[:, 1]
    winner = min(scores, key=scores.get)
    joblib.dump(models[winner], out / "response.joblib")
    net = KnowledgeTracer(len(IDS))
    opt = torch.optim.Adam(net.parameters(), lr=0.003)
    loss = torch.nn.BCEWithLogitsLoss()
    tx = torch.tensor(X)
    tt = torch.tensor(T, dtype=torch.long)
    tl = torch.tensor(L, dtype=torch.long)
    ty = torch.tensor(Y, dtype=torch.float32)
    best = float("inf")
    best_epoch = 0
    for epoch in range(args.epochs):
        net.train()
        inds = np.where(train)[0]
        np.random.shuffle(inds)
        for start in range(0, len(inds), 128):
            idx = inds[start : start + 128]
            opt.zero_grad()
            err = loss(net(tt[idx], tl[idx], tx[idx]), ty[idx])
            err.backward()
            torch.nn.utils.clip_grad_norm_(net.parameters(), 1)
            opt.step()
        net.eval()
        with torch.no_grad():
            v = float(loss(net(tt[val], tl[val], tx[val]), ty[val]))
        if v < best:
            best = v
            best_epoch = epoch + 1
            torch.save(net.state_dict(), out / "tracer.pt")
    net.load_state_dict(torch.load(out / "tracer.pt", weights_only=True))
    net.eval()
    with torch.no_grad():
        predictions["gru"] = torch.sigmoid(net(tt[test], tl[test], tx[test])).numpy()
    predictions["bkt"] = B[test]
    # Late responses in held-out learners; all model parameters remain fitted on other students.
    late = np.array([sum((G == g) & (S < s)) >= 10 for g, s in zip(G[test], S[test])])
    report = dict(
        version=1,
        synthetic=args.synthetic,
        trainingSource=(
            "Synthetic simulator — not real student evidence"
            if args.synthetic
            else "Operator-supplied pseudonymous CSV; provenance requires operator review"
        ),
        target="Probability of a correct next MCQ response, not an exam score",
        created_at=datetime.now(timezone.utc).isoformat(),
        features=FEATURES,
        concepts=IDS,
        seed=42,
        selectedML=winner,
        bestEpoch=best_epoch,
        datasetSha256=hashlib.sha256(
            json.dumps(rows, sort_keys=True).encode()
        ).hexdigest(),
        split={
            "method": "Disjoint students 70/15/15; history strictly precedes each target; validation selects ML and GRU epoch",
            "students": dict(
                train=int(sum(train) / 55) if args.synthetic else len(set(G[train])),
                validation=len(set(G[val])),
                test=len(set(G[test])),
            ),
            "responses": dict(
                train=int(sum(train)), validation=int(sum(val)), test=int(sum(test))
            ),
        },
        metrics={k: metrics(Y[test], p) for k, p in predictions.items()},
        lateHistoryMetrics={
            k: metrics(Y[test][late], p[late])
            for k, p in predictions.items()
            if sum(late) > 0
        },
        limitations=[
            (
                "Synthetic scores are not evidence of real-world accuracy."
                if args.synthetic
                else "Local held-out evaluation does not establish transfer to other institutions."
            ),
            "Repeated questions can inflate performance; collect question IDs and evaluate unseen items before claims.",
            "No calibrated exam score, causal intervention effect, or clinical inference.",
            "Late-history evaluation is within held-out students, not a calendar-time deployment simulation.",
        ],
    )
    (out / "report.json").write_text(json.dumps(report, indent=2))
    print(
        json.dumps(
            {
                "output": str(out),
                "synthetic": args.synthetic,
                "metrics": report["metrics"],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
