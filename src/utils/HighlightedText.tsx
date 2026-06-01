export default function HighlightedText({
  text,
  query,
}: {
  text: string;
  query: string;
}) {
  const terms = query.split(/\s+/).filter(Boolean);

  if (terms.length === 0) {
    return <>{text}</>;
  }

  const regex = new RegExp(`(${terms.join("|")})`, "gi");

  const parts = text.split(regex);

  const highlightedTerms = new Set(terms.map((t) => t.toLowerCase()));

  return (
    <>
      {parts.map((part, i) =>
        highlightedTerms.has(part.toLowerCase()) ? (
          <span
            key={i}
            className="rounded bg-red-100 px-1 font-semibold text-red-600"
          >
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}
