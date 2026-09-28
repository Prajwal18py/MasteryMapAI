export default function StudyTrace({
  events,
  concepts,
}: {
  events: any[];
  concepts: any[];
}) {
  const name = (id: string) => concepts.find((c) => c.id === id)?.name || id;
  function describe(e: any) {
    const o = e.output || {};
    if (o.error) return o.error;
    if (e.agent === "Supervisor")
      return `${o.minutes} minutes · ${o.goal} · ${o.mode}`;
    if (e.agent === "Learner model")
      return `${o.answers} answers · ${o.coverage}% coverage. Confidence reflects evidence count; forgetting risk reflects estimated decay, not current mastery.`;
    if (e.agent === "Planner")
      return `${(o.concepts || []).map(name).join(" → ")}. ${o.rationale || "Critic revision applied."}`;
    if (e.agent === "Critic")
      return `${o.approved ? "Approved" : "Revision requested"}: ${o.reason}`;
    if (e.agent === "Retrieval")
      return (o.items || [])
        .map((x: any) => `${name(x.id)}: ${x.sources.length} source passage(s)`)
        .join(" · ");
    if (e.agent === "Assessment")
      return (o.items || [])
        .map(
          (x: any) =>
            `${x.title}: ${x.minutes} min, ${x.questionIds.length} practice questions`,
        )
        .join(" · ");
    if (e.agent === "Reviewer")
      return Object.entries(o)
        .map(([k, v]) => `${k}: ${v ? "passed" : "failed"}`)
        .join(" · ");
    return o.next || e.action;
  }
  return (
    <div>
      {events.map((e, i) => (
        <article className="study-step" key={i}>
          <header>
            <span className="trace-index">
              {String(i + 1).padStart(2, "0")}
            </span>
            <strong>{e.agent}</strong>
            <span>{e.status === "failed" ? "Failed" : "Complete"}</span>
          </header>
          <p>{describe(e)}</p>
          <details>
            <summary>Technical details</summary>
            <pre>{JSON.stringify(e.output, null, 2)}</pre>
          </details>
        </article>
      ))}
    </div>
  );
}
