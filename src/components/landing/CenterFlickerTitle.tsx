import { type ElementType, type ReactNode } from "react";
import fvLogo from "@/assets/fv-logo.png";

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
  let skipNextSpace = false;

  for (const token of text.split(/(\s+)/)) {
    if (!token) continue;
    if (/^\s+$/.test(token)) {
      if (!skipNextSpace) {
        parts.push(
          <span key={`s-${i}`} aria-hidden className="inline-block w-[0.4em] shrink-0">
            {"\u00a0"}
          </span>
        );
      }
      skipNextSpace = false;
      i += Array.from(token).length;
      continue;
    }
    if (token === "FV") {
      const idx = i;
      skipNextSpace = true;
      parts.push(
        <span
          key={`fv-${idx}`}
          aria-hidden
          className="inline-flex items-center self-center shrink-0"
        >
          <img
            src={fvLogo}
            alt=""
            className="engraved-logo block h-[2.5em] w-[2.5em] object-contain mix-blend-screen animate-landing-letter motion-reduce:animate-none"
            style={{ animationDelay: `${Math.abs(idx + 0.5 - center) * LETTER_STEP_S}s` }}
          />
        </span>
      );
      i += 2;
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
