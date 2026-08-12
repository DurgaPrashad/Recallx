import { Fragment } from "react";

function renderInline(text: string, keyPrefix: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>;
    }
    return <Fragment key={`${keyPrefix}-${i}`}>{part}</Fragment>;
  });
}

/** Minimal markdown renderer: paragraphs, `**bold**`, and `-`/`*` bullet lists. No dependency needed for the modest formatting Claude/Hindsight responses use. */
export function MarkdownLite({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className="flex flex-col gap-2">
      {blocks.map((block, bi) => {
        const lines = block.split("\n").filter((l) => l.trim().length > 0);
        const isList = lines.length > 0 && lines.every((l) => /^[-*]\s+/.test(l.trim()));
        if (isList) {
          return (
            <ul key={bi} className="list-disc space-y-1 pl-5">
              {lines.map((l, li) => (
                <li key={li}>{renderInline(l.trim().replace(/^[-*]\s+/, ""), `${bi}-${li}`)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={bi}>
            {lines.map((l, li) => (
              <Fragment key={li}>
                {renderInline(l, `${bi}-${li}`)}
                {li < lines.length - 1 && <br />}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
