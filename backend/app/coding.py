"""Serve public practice exercises. Python execution happens in the browser."""
from fastapi import APIRouter, Depends, HTTPException
from .main import user

router = APIRouter(prefix="/api/code")
EXERCISES = [
    {
        "id": "sum",
        "title": "Sum positive numbers",
        "concept": "functions",
        "prompt": "Write solve(values) that returns the sum of positive numbers in a list.",
        "starter": "def solve(values):\n    # Your code here\n    pass",
        "tests": [
            {"input": [[1, -2, 3]], "expected": 4},
            {"input": [[]], "expected": 0},
            {"input": [[-3, -1]], "expected": 0},
            {"input": [[2, 2, 2]], "expected": 6},
        ],
    },
    {
        "id": "unique",
        "title": "Preserve unique values",
        "concept": "functions",
        "prompt": "Write solve(values) to return unique values in their original order.",
        "starter": "def solve(values):\n    pass",
        "tests": [
            {"input": [[3, 1, 3, 2, 1]], "expected": [3, 1, 2]},
            {"input": [[]], "expected": []},
        ],
    },
    {
        "id": "closure",
        "title": "Build a multiplier",
        "concept": "closures",
        "prompt": "Write solve(factor, value), defining an inner function that captures factor and multiplies value.",
        "starter": "def solve(factor, value):\n    def multiply(x):\n        pass\n    return multiply(value)",
        "tests": [
            {"input": [3, 4], "expected": 12},
            {"input": [0, 5], "expected": 0},
            {"input": [-2, 3], "expected": -6},
        ],
    },
]


import json
from pathlib import Path
EXERCISES += json.loads((Path(__file__).resolve().parents[1]/"curriculum/code-exercises.json").read_text())

@router.get("")
def exercises(u=Depends(user)):
    return {"enabled":True, "runtime":"browser", "exercises":EXERCISES, "message":"Python runs in your browser. No Docker required."}

@router.post("/run")
def retired_runner(u=Depends(user)):
    raise HTTPException(410, "Use the updated browser Code Lab. Server code execution has been removed.")
