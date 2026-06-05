import { Bench } from "tinybench";
import { Trie } from "../src/minisearch/trie/trie";
import { Radix } from "../src/minisearch/trie/radix";
import { MISSING_WORDS, getDatasetWords } from "./datasets";
import {
  collectUniqueNodesVisited,
  SearchMetrics,
  summarizeCount,
} from "./search-metrics";

function summarizeResult(task: any) {
  return {
    meanMs: task.result.latency.mean,
    throughputOpsPerSec: task.result.throughput.mean,
    samples: task.result.latency.samplesCount,
  };
}

export async function runSearchMissBenchmarks(size: number) {
  const words = await getDatasetWords(size);
  const trie = new Trie();
  const radix = new Radix();

  for (const word of words) {
    trie.insert(word);
    radix.insert(word);
  }

  const queries = MISSING_WORDS;
  const trieVisited: number[] = [];
  const radixVisited: number[] = [];

  for (const query of queries) {
    trieVisited.push(collectUniqueNodesVisited(trie.searchSteps(query)));
    radixVisited.push(collectUniqueNodesVisited(radix.searchSteps(query)));
  }

  const bench = new Bench({ name: `Search Miss ${size}` });
  let queryIndex = 0;

  bench.add("Trie missing search", () => {
    trie.search(queries[queryIndex++ % queries.length]);
  });
  bench.add("Radix missing search", () => {
    radix.search(queries[queryIndex++ % queries.length]);
  });

  await bench.run();

  return {
    trie: {
      time: summarizeResult(bench.tasks[0]),
      nodesVisited: summarizeCount(trieVisited),
    } as SearchMetrics,
    radix: {
      time: summarizeResult(bench.tasks[1]),
      nodesVisited: summarizeCount(radixVisited),
    } as SearchMetrics,
  };
}
