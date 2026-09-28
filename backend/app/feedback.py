"""Numbered evidence and one bounded citation-repair attempt; never invent citations."""
import json
from .retrieval import check_citations

def numbered_sources(sources):
    return '\n\n'.join(f'[{i}] {s["source"]}\n{s["text"]}' for i,s in enumerate(sources,1))

async def grounded_reply(generate, instruction, context, sources):
    if not sources:
        return ('I need a relevant reference before reviewing this. Add notes or a concept summary, then try again.', 'No matching evidence', 'reference')
    evidence=numbered_sources(sources)
    payload={**context,'numberedEvidence':evidence}
    text=await generate(instruction,json.dumps(payload))
    if check_citations(text,sources):
        return text,'Source IDs checked; this does not verify every claim','generated'
    try:
        repaired=await generate(
            instruction+' Rewrite the previous draft using only the supplied evidence. Add valid inline citations [1] through ['+str(len(sources))+']. Remove unsupported factual claims. Do not cite Python list indexes. Return only the corrected answer.',
            json.dumps({**payload,'draftToRepair':text}),
        )
        if check_citations(repaired,sources):
            return repaired,'Source IDs checked after repair; review factual accuracy','generated'
    except Exception:
        # Preserve usable references when the repair call fails or hits a provider quota.
        pass
    return ('I could not verify the source references in the generated explanation. Here are the relevant passages instead:\n\n'+evidence,
            'Reference-only fallback after citation repair', 'reference')
