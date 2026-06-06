import { Trie } from "../src/minisearch/trie/trie";
import { Radix } from "../src/minisearch/trie/radix";

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

export type StructuralMemoryMetrics = {
  nodeCount: number;
  totalStoredCharacters: number;
  estimatedMemory: number;
};

export type CompressionStats = {
  nodeCount: number;
  nodeReductionPercent: number;
  maxDepth: number;
  depthReductionPercent: number;
  structuralCharacterCount: number;
};

export type ScalingMetrics = {
  nodesPerWord: number;
  estimatedMemoryPerWord: number;
  buildTimePerWord: number;
};

// Structural memory overhead constants (relative units for comparison)
const NODE_OVERHEAD = 50; // bytes per node (approximate V8 object overhead)
const CHAR_OVERHEAD = 1; // bytes per character stored in edges

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
  estimatedMemory: number,
  buildTimeMs: number,
  wordCount: number,
): ScalingMetrics {
  return {
    nodesPerWord: wordCount > 0 ? nodeCount / wordCount : 0,
    estimatedMemoryPerWord: wordCount > 0 ? estimatedMemory / wordCount : 0,
    buildTimePerWord: wordCount > 0 ? buildTimeMs / wordCount : 0,
  };
}

export function computeTrieStructuralMemory(
  trie: Trie,
): StructuralMemoryMetrics {
  let nodeCount = 0;
  let totalStoredCharacters = 0;

  function traverse(node: any): void {
    nodeCount++;
    if (node.children) {
      for (const [char, child] of node.children) {
        totalStoredCharacters += 1; // Each entry in the map contributes one character
        traverse(child);
      }
    }
  }

  traverse(trie.root);

  const estimatedMemory =
    nodeCount * NODE_OVERHEAD + totalStoredCharacters * CHAR_OVERHEAD;

  return {
    nodeCount,
    totalStoredCharacters,
    estimatedMemory,
  };
}

export function computeRadixStructuralMemory(
  radix: Radix,
): StructuralMemoryMetrics {
  const radixAny = radix as any;
  let nodeCount = 0;
  let totalStoredCharacters = 0;

  // Defensive check for root
  if (!radixAny.root) {
    return {
      nodeCount: 0,
      totalStoredCharacters: 0,
      estimatedMemory: 0,
    };
  }

  function traverse(node: any): void {
    if (!node) return;

    nodeCount++;

    // Each node has an 'edge' property containing the label string
    // The root node has edge="", which contributes 0 characters (correct)
    if (node.edge && typeof node.edge === "string") {
      totalStoredCharacters += node.edge.length;
    }

    // Traverse children - ensure proper defensive checks
    if (node.children) {
      if (Array.isArray(node.children)) {
        for (const child of node.children) {
          if (child) traverse(child);
        }
      }
    }
  }

  traverse(radixAny.root);

  const estimatedMemory =
    nodeCount * NODE_OVERHEAD + totalStoredCharacters * CHAR_OVERHEAD;

  return {
    nodeCount,
    totalStoredCharacters,
    estimatedMemory,
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
