export function getSnippets(
  text: string,
  query: string,
  contextLength = 200,
): string[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

  if (terms.length === 0) {
    return [];
  }

  const lowerText = text.toLowerCase();

  type Range = {
    start: number;
    end: number;
  };

  const ranges: Range[] = [];

  // 1. Find all occurrences of all terms
  for (const term of terms) {
    let index = 0;

    while (true) {
      index = lowerText.indexOf(term, index);

      if (index === -1) {
        break;
      }

      ranges.push({
        start: Math.max(0, index - contextLength),

        end: Math.min(text.length, index + term.length + contextLength),
      });

      index += term.length;
    }
  }

  if (ranges.length === 0) {
    return [];
  }

  // 2. Sort ranges by start position
  ranges.sort((a, b) => a.start - b.start);

  // 3. Merge overlapping ranges
  const merged: Range[] = [];

  let current = ranges[0];

  for (let i = 1; i < ranges.length; i++) {
    const next = ranges[i];

    if (next.start <= current.end) {
      current.end = Math.max(current.end, next.end);
    } else {
      merged.push(current);
      current = next;
    }
  }

  merged.push(current);

  // 4. Extract snippets
  return merged.map((range) => {
    const snippet = text.slice(range.start, range.end);

    return (
      (range.start > 0 ? "..." : "") +
      snippet +
      (range.end < text.length ? "..." : "")
    );
  });
}
