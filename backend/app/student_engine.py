"""Subject-scoped evidence, scheduling and explicitly heuristic projections."""

import math
from datetime import datetime, timezone
from .engine import update_mastery


def analytics(concepts, questions, attempts):
    out = []
    now = datetime.now(timezone.utc)
    bank = {q["id"]: q for q in questions}
    for c in concepts:
        xs = [a for a in attempts if a["concept"] == c["id"]]
        m = 35
        track = []
        for a in xs:
            m = update_mastery(m, bool(a["correct"]), bool(a["hint"]))
            track.append(m)
        days = (
            max(
                0,
                (now - datetime.fromisoformat(xs[-1]["created_at"])).total_seconds()
                / 86400,
            )
            if xs
            else None
        )
        retention = (
            round(m * math.exp(-days / (7 + 2 * min(len(xs), 20)))) if xs else None
        )
        loss = m - retention if xs else 0
        out.append(
            {
                **c,
                "mastery": m if xs else None,
                "prior": 35,
                "attempts": len(xs),
                "correct": sum(a["correct"] for a in xs),
                "retention": retention,
                "risk": (
                    "High"
                    if loss >= 20
                    else "Medium" if loss >= 10 else "Low" if xs else "Unknown"
                ),
                "confidence": (
                    "Higher"
                    if len(xs) >= 20
                    else "Medium" if len(xs) >= 8 else "Low" if xs else "Unassessed"
                ),
                "change": track[-1] - track[-2] if len(track) > 1 else None,
                "days": days,
            }
        )
    known = [c for c in out if c["attempts"]]
    n = len(attempts)
    accuracy = lambda a: (
        round(sum(x["correct"] for x in a) / len(a) * 100) if a else None
    )
    daily = {}
    for a in attempts:
        d = a["created_at"][:10]
        daily.setdefault(d, {"date": d, "answers": 0, "correct": 0})
        daily[d]["answers"] += 1
        daily[d]["correct"] += a["correct"]
    trend = [
        {**d, "accuracy": round(d["correct"] / d["answers"] * 100)}
        for d in daily.values()
    ]
    last_by_question = {a["question_id"]: a for a in attempts}
    distinct = list(last_by_question.values())
    k = sum(a["correct"] for a in distinct)
    den = len(distinct)
    if den:
        p = k / den
        z = 1.96
        mid = (p + z * z / (2 * den)) / (1 + z * z / den)
        radius = (
            z
            * math.sqrt(p * (1 - p) / den + z * z / (4 * den * den))
            / (1 + z * z / den)
        )
        band = [round((mid - radius) * 100), round((mid + radius) * 100)]
    else:
        band = None
    return {
        "concepts": out,
        "overall": (
            round(sum(c["mastery"] for c in known) / len(known)) if known else None
        ),
        "coverage": round(len(known) / max(1, len(out)) * 100),
        "answers": n,
        "accuracy": accuracy(attempts),
        "trend": trend,
        "interval": band,
        "distinctQuestions": den,
        "dimensions": [
            {
                "name": "Overall mastery",
                "value": (
                    round(sum(c["mastery"] for c in known) / len(known))
                    if known
                    else None
                ),
                "unit": "%",
            },
            {
                "name": "Estimated retention",
                "value": (
                    round(sum(c["retention"] for c in known) / len(known))
                    if known
                    else None
                ),
                "unit": "%",
            },
            {
                "name": "Accuracy change",
                "value": (
                    accuracy(attempts[-5:]) - accuracy(attempts[-10:-5])
                    if n >= 10
                    else None
                ),
                "unit": "pp",
            },
            {
                "name": "Applied accuracy",
                "value": accuracy(
                    [
                        a
                        for a in attempts
                        if bank.get(a["question_id"], {}).get("difficulty", 0) > 1
                    ]
                ),
                "unit": "%",
            },
            {
                "name": "Theory recall",
                "value": accuracy(
                    [
                        a
                        for a in attempts
                        if bank.get(a["question_id"], {}).get("difficulty") == 1
                    ]
                ),
                "unit": "%",
            },
            {
                "name": "Independent answers",
                "value": (
                    round(sum(not a["hint"] for a in attempts) / n * 100) if n else None
                ),
                "unit": "%",
            },
        ],
        "recent": attempts[-10:][::-1],
    }


def forecast(data, preferences):
    date = preferences.get("examDate")
    days = (
        max(
            0,
            (
                datetime.fromisoformat(date).replace(tzinfo=timezone.utc)
                - datetime.now(timezone.utc)
            ).days,
        )
        if date
        else 7
    )
    total = preferences.get("totalMarks", 100)
    weights = preferences.get("weights", {})
    cs = data["concepts"]
    den = sum(weights.get(c["id"], 1) for c in cs) or 1
    topics = []
    for c in cs:
        weight = weights.get(c["id"], 1)
        marks = total * weight / den
        p = (
            (c["retention"] / 100) * math.exp(-days / (7 + 2 * min(c["attempts"], 20)))
            if c["attempts"]
            else None
        )
        topics.append(
            {
                "id": c["id"],
                "name": c["name"],
                "marks": round(marks, 1),
                "projected": round(p * 100) if p is not None else None,
                "marksAtRisk": round(marks * (1 - p), 1) if p is not None else None,
            }
        )
    assessed = [x for x in topics if x["projected"] is not None]
    weight = sum(x["marks"] for x in assessed)
    return {
        "days": days,
        "topics": sorted(
            topics,
            key=lambda x: (
                x["marksAtRisk"] if x["marksAtRisk"] is not None else x["marks"]
            ),
            reverse=True,
        ),
        "projected": (
            round(sum(x["marks"] * x["projected"] for x in assessed) / weight)
            if weight
            else None
        ),
        "unknownMarks": round(
            sum(x["marks"] for x in topics if x["projected"] is None), 1
        ),
        "method": "BKT plus hand-set time decay; conditional scenario, not a validated exam prediction",
        "interval": data["interval"],
        "intervalMethod": "95% Wilson interval of latest distinct-question correctness; repeated exposure and non-random items limit interpretation",
    }
