"""Transparent learning heuristics; no trained-model accuracy claims."""

import json, math
from pathlib import Path
from datetime import datetime, timezone

DATA = json.loads(Path(__file__).with_name("course.json").read_text())
CONCEPTS, QUESTIONS = DATA["concepts"], DATA["questions"]


def update_mastery(prior, correct, hint=False):
    p, s, g = prior / 100, 0.22 if hint else 0.12, 0.25
    post = (
        p * (1 - s) / (p * (1 - s) + (1 - p) * g)
        if correct
        else p * s / (p * s + (1 - p) * (1 - g))
    )
    return round(min(0.99, max(0.05, post + (1 - post) * 0.08)) * 100)


def state(attempts):
    out = []
    for c in CONCEPTS:
        a = [x for x in attempts if x["concept"] == c["id"]]
        m = 35
        history = []
        for x in a:
            m = update_mastery(m, x["correct"], x["hint"])
            history.append(m)
        age = (
            max(
                0,
                (
                    datetime.now(timezone.utc)
                    - datetime.fromisoformat(a[-1]["created_at"])
                ).total_seconds()
                / 86400,
            )
            if a
            else None
        )
        retained = round(m * math.exp(-age / (7 + 2 * min(len(a), 20)))) if a else None
        out.append(
            {
                **c,
                "mastery": m,
                "attempts": len(a),
                "correct": sum(x["correct"] for x in a),
                "confidence": (
                    "Unassessed"
                    if not a
                    else "Low" if len(a) < 8 else "Medium" if len(a) < 20 else "Higher"
                ),
                "retention": retained,
                "retentionRisk": (
                    None
                    if not a
                    else (
                        "High"
                        if m - retained >= 20
                        else "Medium" if m - retained >= 10 else "Low"
                    )
                ),
                "recentChange": history[-1] - history[-2] if len(history) > 1 else None,
            }
        )
    return out


def analytics(a, extra_questions=None):
    cs = state(a)
    known = [c for c in cs if c["attempts"]]
    n = len(a)
    acc = lambda xs: (
        round(sum(x["correct"] for x in xs) / len(xs) * 100) if xs else None
    )
    bank = {q["id"]: q for q in QUESTIONS + (extra_questions or [])}
    recall = [x for x in a if bank.get(x["question_id"], {}).get("difficulty") == 1]
    applied = [x for x in a if bank.get(x["question_id"], {}).get("difficulty", 0) > 1]
    dims = [
        (
            "Overall mastery",
            round(sum(c["mastery"] for c in known) / len(known)) if known else None,
            "%",
            "Average over assessed concepts",
        ),
        (
            "Retention estimate",
            round(sum(c["retention"] for c in known) / len(known)) if known else None,
            "%",
            "Time-decay heuristic; not calibrated",
        ),
        (
            "Accuracy change",
            acc(a[-5:]) - acc(a[-10:-5]) if n >= 10 else None,
            "pp",
            "Last five vs previous five answers",
        ),
        (
            "Applied-question accuracy",
            acc(applied),
            "%",
            f"{len(applied)} medium / hard MCQ answers",
        ),
        ("Theory recall", acc(recall), "%", f"{len(recall)} foundational answers"),
        (
            "Independent answers",
            round(sum(not x["hint"] for x in a) / n * 100) if n else None,
            "%",
            "Answered without a hint; not confidence",
        ),
    ]
    trend = []
    for i, x in list(enumerate(a))[-30:]:
        k = [c for c in state(a[: i + 1]) if c["attempts"]]
        trend.append(
            {
                "date": x["created_at"][:10],
                "mastery": round(sum(c["mastery"] for c in k) / len(k)),
            }
        )
    return {
        "concepts": cs,
        "overall": dims[0][1],
        "dimensions": [dict(name=x, value=y, unit=z, detail=d) for x, y, z, d in dims],
        "trend": trend,
        "patterns": {
            "answers": n,
            "accuracy": acc(a),
            "hintRate": round(sum(x["hint"] for x in a) / n * 100) if n else None,
            "medianSeconds": sorted(x["seconds"] for x in a)[n // 2] if n else None,
        },
    }
