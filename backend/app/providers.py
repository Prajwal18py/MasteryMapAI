import os, json, re, asyncio
import httpx
from fastapi import HTTPException


async def generate(system, prompt, limit=2400):
    groq = bool(os.getenv("GROQ_API_KEY"))
    key = os.getenv("GROQ_API_KEY") or os.getenv("MISTRAL_API_KEY")
    if not key:
        raise HTTPException(
            503,
            "Add a Groq or Mistral API key to backend/.env, then restart. Reference mode works without a key.",
        )
    try:
        async with asyncio.timeout(55), httpx.AsyncClient(timeout=httpx.Timeout(50, connect=10)) as client:
            for attempt in range(2):
                r = await client.post(
                    (
                        "https://api.groq.com/openai/v1/chat/completions"
                        if groq
                        else "https://api.mistral.ai/v1/chat/completions"
                    ),
                    headers={"Authorization": "Bearer " + key},
                    json={
                        "model": (
                            os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
                            if groq
                            else os.getenv("MISTRAL_MODEL", "mistral-small-latest")
                        ),
                        "temperature": 0.2,
                        "max_tokens": limit,
                        "messages": [
                            {"role": "system", "content": system},
                            {"role": "user", "content": prompt},
                        ],
                    },
                )
                if r.status_code != 429:
                    break
                try:
                    quota = "insufficient_quota" in str(r.json().get("error", {}).get("code", ""))
                except (ValueError, AttributeError):
                    quota = False
                try:
                    delay = float(r.headers.get("retry-after", "2"))
                except ValueError:
                    delay = 60
                if attempt or quota or not 0 <= delay <= 8:
                    break
                await asyncio.sleep(max(1, delay))
        if r.status_code == 429:
            retry = r.headers.get("retry-after")
            suffix = f" Provider retry-after: {retry}." if retry and len(retry) < 50 else ""
            raise HTTPException(429, "AI provider rate/quota limit reached (429). Wait for the limit to reset or check your provider quota. Your saved work is unchanged." + suffix)
        if r.status_code != 200:
            raise HTTPException(
                502,
                f"AI provider returned {r.status_code}. Check model availability and quota.",
            )
        content = r.json()["choices"][0]["message"]["content"]
        if not isinstance(content, str) or not content.strip():
            raise HTTPException(502, "The AI provider returned an empty answer. Please retry.")
        return content
    except (TimeoutError, httpx.TimeoutException):
        raise HTTPException(504, "The AI provider took too long. Retry, or use course references without AI.")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            502, "AI provider unavailable. Retry or use reference mode."
        )


def parse_json(raw):
    try:
        return json.loads(re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip()))
    except Exception:
        raise HTTPException(
            502, "The AI reply was not valid JSON. No changes were saved."
        )
