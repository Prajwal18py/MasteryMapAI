"""Features use only answers strictly BEFORE the target response."""

import math
from datetime import datetime
import numpy as np
from app.engine import CONCEPTS, update_mastery

IDS = [c["id"] for c in CONCEPTS]
FEATURES = [
    "concept_index",
    "difficulty",
    "log_prior_count",
    "prior_accuracy",
    "last_five_accuracy",
    "prior_hint_rate",
    "bkt_prior",
    "log_days_since_concept",
    "prerequisite_mastery",
]


def vector(history, concept, difficulty, timestamp):
    xs = [x for x in history if x["concept"] == concept]
    prior = 35
    for x in xs:
        prior = update_mastery(prior, x["correct"], x.get("hint", False))
    age = (
        max(
            0,
            (
                datetime.fromisoformat(timestamp)
                - datetime.fromisoformat(xs[-1]["created_at"])
            ).total_seconds()
            / 86400,
        )
        if xs
        else 0
    )
    prereqs = next(c["prereqs"] for c in CONCEPTS if c["id"] == concept)
    ps = []
    for p in prereqs:
        m = 35
        for x in history:
            if x["concept"] == p:
                m = update_mastery(m, x["correct"], x.get("hint", False))
        ps.append(m / 100)
    return [
        IDS.index(concept) / (len(IDS) - 1),
        difficulty / 3,
        math.log1p(len(xs)),
        (sum(x["correct"] for x in xs) + 1) / (len(xs) + 2),
        (sum(x["correct"] for x in xs[-5:]) + 1) / (len(xs[-5:]) + 2),
        sum(x.get("hint", 0) for x in xs) / max(1, len(xs)),
        prior / 100,
        math.log1p(min(age, 365)),
        sum(ps) / len(ps) if ps else 0.35,
    ]


def sequence(history):
    tokens = [
        1 + 2 * IDS.index(x["concept"]) + int(x["correct"]) for x in history[-20:]
    ]
    return tokens + [0] * (20 - len(tokens)), max(1, len(tokens))
