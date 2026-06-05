export type DatasetStats = {
  wordCount: number;
  averageWordLength: number;
  shortestWordLength: number;
  longestWordLength: number;
  uniqueFirstLetters: number;
};

export type MemoryMetrics = {
  memoryBytes: number;
  memoryKB: number;
  memoryMB: number;
};

export type ScalingMetrics = {
  nodesPerWord: number;
  memoryPerWord: number;
  buildTimePerWord: number;
};

export function computeDatasetStats(words: string[]): DatasetStats {
  const firstLetters = new Set<string>();
  let totalLength = 0;
  let shortestLength = Infinity;
  let longestLength = 0;

  for (const word of words) {
    if (word.length > 0) {
      firstLetters.add(word[0].toLowerCase());
      totalLength += word.length;
      shortestLength = Math.min(shortestLength, word.length);
      longestLength = Math.max(longestLength, word.length);
    }
  }

  return {
    wordCount: words.length,
    averageWordLength: words.length > 0 ? totalLength / words.length : 0,
    shortestWordLength: shortestLength === Infinity ? 0 : shortestLength,
    longestWordLength: longestLength,
    uniqueFirstLetters: firstLetters.size,
  };
}

export function measureMemory(fn: () => void): MemoryMetrics {
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  const startMemory = process.memoryUsage().heapUsed;
  fn();
  const endMemory = process.memoryUsage().heapUsed;

  // Force garbage collection again
  if (global.gc) {
    global.gc();
  }

  const memoryBytes = Math.max(0, endMemory - startMemory);
  return {
    memoryBytes,
    memoryKB: memoryBytes / 1024,
    memoryMB: memoryBytes / (1024 * 1024),
  };
}

export function computeScalingMetrics(
  nodeCount: number,
  memoryMB: number,
  buildTimeMs: number,
  wordCount: number,
): ScalingMetrics {
  return {
    nodesPerWord: wordCount > 0 ? nodeCount / wordCount : 0,
    memoryPerWord: wordCount > 0 ? memoryMB / wordCount : 0,
    buildTimePerWord: wordCount > 0 ? buildTimeMs / wordCount : 0,
  };
}

export function csvHeader(columns: string[]): string {
  return columns.map((col) => `"${col}"`).join(",");
}

export function csvRow(values: (string | number | boolean)[]): string {
  return values
    .map((val) => {
      if (typeof val === "string") {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    })
    .join(",");
}
