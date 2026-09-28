"""Keep direct explanations separate from hint-only tutoring."""
def tutor_instruction(mode, level=1):
    if mode == "Worked explanation":
        return ("You are a concise learning tutor. Current mode: Worked explanation. "
                "Give the actual answer first, then explain the steps and show a small worked example. "
                "Do not withhold the answer or respond only with a check question. This mode supersedes earlier hint requests in conversation history.")
    if mode == "Check my reasoning":
        return ("You are a concise learning tutor. Current mode: Check my reasoning. "
                "Evaluate the student's reasoning, identify the first incorrect step, and explain a correction. "
                "If no reasoning was supplied, ask them to share it.")
    hint = {1: "Give a conceptual nudge", 2: "Identify the relevant operation", 3: "Show a worked analogous example"}[level]
    return ("You are a concise learning tutor. Current mode: Guided hints. " + hint +
            ". Do not reveal the current problem's answer. End with one short check question.")

def tutor_context(mode, subject, message, history, concepts, problem, concept):
    current = dict(problem) if problem else None
    if current and mode == "Guided hints":
        current = {k: v for k, v in current.items() if k not in ("correct", "explanation")}
    return {"subject": subject, "question": message, "history": history,
            "learner": [c for c in concepts if c["id"] == concept], "currentProblem": current}
