import { type ElementType, type ReactNode } from "react";

const LETTER_STEP_S = 0.14;

export function CenterFlickerTitle({
  text,
  className,
  as: Tag = "h2",
}: {
  text: string;
  className: string;
  as?: ElementType;
}) {
  const chars = Array.from(text);
  const center = (chars.length - 1) / 2;
  const parts: ReactNode[] = [];
  let i = 0;

  for (const token of text.split(/(\s+)/)) {
    if (!token) continue;
    if (/^\s+$/.test(token)) {
      parts.push(
        <span key={`s-${i}`} aria-hidden>
          {token}
        </span>
      );
      i += Array.from(token).length;
      continue;
    }
    const start = i;
    parts.push(
      <span key={`w-${start}`} className="inline-flex whitespace-nowrap">
        {Array.from(token).map((ch, j) => {
          const idx = start + j;
          return (
            <span
              key={idx}
              className="inline-block animate-landing-letter motion-reduce:animate-none"
              style={{ animationDelay: `${Math.abs(idx - center) * LETTER_STEP_S}s` }}
              aria-hidden
            >
              {ch}
            </span>
          );
        })}
      </span>
    );
    i += Array.from(token).length;
  }

  return (
    <Tag className={className} aria-label={text}>
      {parts}
    </Tag>
  );
}
