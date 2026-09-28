import { Fragment, ReactNode } from "react";
// Small safe renderer: text becomes React nodes, never injected HTML.
function inline(text: string): ReactNode[] {
  return text
    .split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g)
    .map((part, i) =>
      part.startsWith("`") ? (
        <code key={i}>{part.slice(1, -1)}</code>
      ) : part.startsWith("**") ? (
        <strong key={i}>{part.slice(2, -2)}</strong>
      ) : part.startsWith("*") ? (
        <em key={i}>{part.slice(1, -1)}</em>
      ) : (
        part
      ),
    );
}
export default function StudentMarkdown({ text }: { text: string }) {
  const lines = text.replace(/<br\s*\/?>/gi, " · ").split("\n");
  const out: ReactNode[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    if (line.trim().startsWith("```")) {
      const lang = line.trim().slice(3);
      const body = [];
      while (++i < lines.length && !lines[i].trim().startsWith("```"))
        body.push(lines[i]);
      out.push(
        <pre key={i}>
          <small>{lang}</small>
          <code>{body.join("\n")}</code>
        </pre>,
      );
      continue;
    }
    if (
      line.includes("|") &&
      i + 1 < lines.length &&
      /^\s*\|?\s*:?-{3}/.test(lines[i + 1])
    ) {
      const cells = (s: string) =>
        s
          .trim()
          .replace(/^\||\|$/g, "")
          .split("|")
          .map((x) => x.trim());
      const headers = cells(line);
      i++;
      const rows = [];
      while (i + 1 < lines.length && lines[i + 1].includes("|"))
        rows.push(cells(lines[++i]));
      out.push(
        <div className="table-wrap" key={i}>
          <table>
            <thead>
              <tr>
                {headers.map((x, k) => (
                  <th key={k}>{inline(x)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, k) => (
                <tr key={k}>
                  {row.map((x, j) => (
                    <td key={j}>{inline(x)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (/^#{1,4}\s/.test(line)) {
      out.push(<h3 key={i}>{inline(line.replace(/^#+\s*/, ""))}</h3>);
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s/.test(line)) {
      out.push(
        <div className="md-item" key={i}>
          <span>•</span>
          <span>{inline(line.replace(/^\s*([-*]|\d+\.)\s/, ""))}</span>
        </div>,
      );
      continue;
    }
    if (/^>\s?/.test(line)) {
      out.push(
        <blockquote key={i}>{inline(line.replace(/^>\s?/, ""))}</blockquote>,
      );
      continue;
    }
    out.push(<p key={i}>{inline(line)}</p>);
  }
  return <div className="student-markdown">{out}</div>;
}
