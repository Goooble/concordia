import type { TrieStep } from "../src/types";

export type TimeStats = {
  meanMs: number;
  throughputOpsPerSec: number;
  samples: number;
};

export type CountStats = {
  average: number;
  min: number;
  max: number;
  total: number;
};

export type SearchMetrics = {
  time: TimeStats;
  nodesVisited: CountStats;
};

export type FuzzySearchMetrics = SearchMetrics & {
  nodesPruned: CountStats;
  matchesFound: CountStats;
  pruningPercentage: number;
};

export type SearchMissMetrics = SearchMetrics;

export type SearchCaseMetrics = {
  longest: SearchMetrics;
  shortest: SearchMetrics;
  random: SearchMetrics;
  missing: SearchMetrics;
};

export type WorstCaseSearchResult = {
  trie: SearchCaseMetrics;
  radix: SearchCaseMetrics;
};

export function summarizeCount(values: number[]): CountStats {
  const total = values.reduce((sum, current) => sum + current, 0);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  return {
    average: values.length ? total / values.length : 0,
    min,
    max,
    total,
  };
}

export function collectUniqueNodesVisited(steps: Generator<number>): number {
  const visited = new Set<number>();
  for (const id of steps) {
    visited.add(id);
  }
  return visited.size;
}

export function collectFuzzyStepCounts(steps: Generator<TrieStep>) {
  let nodesVisited = 0;
  let nodesPruned = 0;
  let matchesFound = 0;

  for (const step of steps) {
    if (step.type === "visited" || step.type === "found") {
      nodesVisited += 1;
    }
    if (step.type === "pruned") {
      nodesPruned += 1;
    }
    if (step.type === "found") {
      matchesFound += 1;
    }
  }

  return { nodesVisited, nodesPruned, matchesFound };
}

export function pruningPercentage(nodesVisited: number, nodesPruned: number) {
  const denominator = nodesVisited + nodesPruned;
  return denominator === 0 ? 0 : (nodesPruned / denominator) * 100;
}
