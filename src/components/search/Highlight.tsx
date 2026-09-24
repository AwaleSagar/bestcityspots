import { highlightSegments } from "@/lib/search-utils";

export function Highlight({ text, query }: { text: string; query: string | null }) {
  if (!query) return <>{text}</>;
  return (
    <>
      {highlightSegments(text, query).map((segment, index) =>
        segment.match ? (
          <mark key={index} className="bg-accent-soft rounded-sm px-px text-inherit">
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        )
      )}
    </>
  );
}
