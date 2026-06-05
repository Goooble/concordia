import { Bench } from "tinybench";
import { Trie } from "../src/minisearch/trie/trie";
import { Radix } from "../src/minisearch/trie/radix";
import { generatePrefixQueries, getDatasetWords } from "./datasets";
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

export async function runPrefixSearchBenchmarks(size: number) {
  const words = await getDatasetWords(size);
  const trie = new Trie();
  const radix = new Radix();

  for (const word of words) {
    trie.insert(word);
    radix.insert(word);
  }

  const queries = generatePrefixQueries(words, 200);
  const trieVisited: number[] = [];
  const radixVisited: number[] = [];

  for (const query of queries) {
    trieVisited.push(collectUniqueNodesVisited(trie.prefixSearchSteps(query)));
    radixVisited.push(
      collectUniqueNodesVisited(radix.prefixSearchSteps(query)),
    );
  }

  const bench = new Bench({ name: `Prefix Search ${size}` });
  let queryIndex = 0;

  bench.add("Trie prefix search", () => {
    trie.prefixSearch(queries[queryIndex++ % queries.length]);
  });
  bench.add("Radix prefix search", () => {
    radix.prefixSearch(queries[queryIndex++ % queries.length]);
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
