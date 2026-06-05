import { Bench } from "tinybench";
import { Trie } from "../src/minisearch/trie/trie";
import { Radix } from "../src/minisearch/trie/radix";
import { generateTypoQueries, getDatasetWords } from "./datasets";
import {
  collectFuzzyStepCounts,
  CountStats,
  FuzzySearchMetrics,
  pruningPercentage,
  summarizeCount,
} from "./search-metrics";

function summarizeResult(task: any) {
  return {
    meanMs: task.result.latency.mean,
    throughputOpsPerSec: task.result.throughput.mean,
    samples: task.result.latency.samplesCount,
  };
}

export async function runFuzzySearchBenchmarks(size: number) {
  const words = await getDatasetWords(size);
  const trie = new Trie();
  const radix = new Radix();

  for (const word of words) {
    trie.insert(word);
    radix.insert(word);
  }

  const queries = generateTypoQueries(words, 200);
  const trieNodesVisited: number[] = [];
  const trieNodesPruned: number[] = [];
  const trieMatchesFound: number[] = [];
  const radixNodesVisited: number[] = [];
  const radixNodesPruned: number[] = [];
  const radixMatchesFound: number[] = [];

  for (const query of queries) {
    const trieCounts = collectFuzzyStepCounts(trie.fuzzySearchSteps(query, 1));
    trieNodesVisited.push(trieCounts.nodesVisited);
    trieNodesPruned.push(trieCounts.nodesPruned);
    trieMatchesFound.push(trieCounts.matchesFound);

    const radixCounts = collectFuzzyStepCounts(
      radix.fuzzySearchSteps(query, 1),
    );
    radixNodesVisited.push(radixCounts.nodesVisited);
    radixNodesPruned.push(radixCounts.nodesPruned);
    radixMatchesFound.push(radixCounts.matchesFound);
  }

  const bench = new Bench({ name: `Fuzzy Search ${size}` });
  let queryIndex = 0;

  bench.add("Trie fuzzy search", () => {
    trie.fuzzySearch(queries[queryIndex++ % queries.length], 1);
  });
  bench.add("Radix fuzzy search", () => {
    radix.fuzzySearch(queries[queryIndex++ % queries.length], 1);
  });

  await bench.run();

  const trieVisitedStats = summarizeCount(trieNodesVisited);
  const triePrunedStats = summarizeCount(trieNodesPruned);
  const trieFoundStats = summarizeCount(trieMatchesFound);
  const radixVisitedStats = summarizeCount(radixNodesVisited);
  const radixPrunedStats = summarizeCount(radixNodesPruned);
  const radixFoundStats = summarizeCount(radixMatchesFound);

  return {
    trie: {
      time: summarizeResult(bench.tasks[0]),
      nodesVisited: trieVisitedStats,
      nodesPruned: triePrunedStats,
      matchesFound: trieFoundStats,
      pruningPercentage: pruningPercentage(
        trieVisitedStats.total,
        triePrunedStats.total,
      ),
    } as FuzzySearchMetrics,
    radix: {
      time: summarizeResult(bench.tasks[1]),
      nodesVisited: radixVisitedStats,
      nodesPruned: radixPrunedStats,
      matchesFound: radixFoundStats,
      pruningPercentage: pruningPercentage(
        radixVisitedStats.total,
        radixPrunedStats.total,
      ),
    } as FuzzySearchMetrics,
  };
}
