import { Bench } from "tinybench";
import { Trie } from "../src/minisearch/trie/trie";
import { Radix } from "../src/minisearch/trie/radix";
import {
  getDatasetWords,
  getLongestWord,
  getRandomWord,
  getShortestWord,
  MISSING_WORDS,
} from "./datasets";
import {
  collectUniqueNodesVisited,
  SearchCaseMetrics,
  SearchMetrics,
  summarizeCount,
  WorstCaseSearchResult,
} from "./search-metrics";

function summarizeResult(task: any) {
  return {
    meanMs: task.result.latency.mean,
    throughputOpsPerSec: task.result.throughput.mean,
    samples: task.result.latency.samplesCount,
  };
}

export async function runWorstCaseSearchBenchmarks(size: number) {
  const words = await getDatasetWords(size);
  const trie = new Trie();
  const radix = new Radix();

  for (const word of words) {
    trie.insert(word);
    radix.insert(word);
  }

  const cases = {
    longest: getLongestWord(words),
    shortest: getShortestWord(words),
    random: getRandomWord(words),
    missing: MISSING_WORDS[0],
  } as const;

  const trieVisited: Record<keyof typeof cases, number[]> = {
    longest: [],
    shortest: [],
    random: [],
    missing: [],
  };
  const radixVisited: Record<keyof typeof cases, number[]> = {
    longest: [],
    shortest: [],
    random: [],
    missing: [],
  };

  for (const [label, query] of Object.entries(cases) as [
    keyof typeof cases,
    string,
  ][]) {
    trieVisited[label].push(collectUniqueNodesVisited(trie.searchSteps(query)));
    radixVisited[label].push(
      collectUniqueNodesVisited(radix.searchSteps(query)),
    );
  }

  const bench = new Bench({ name: `Worst-case Search ${size}` });

  bench.add("Trie longest word", () => trie.search(cases.longest));
  bench.add("Radix longest word", () => radix.search(cases.longest));
  bench.add("Trie shortest word", () => trie.search(cases.shortest));
  bench.add("Radix shortest word", () => radix.search(cases.shortest));
  bench.add("Trie random word", () => trie.search(cases.random));
  bench.add("Radix random word", () => radix.search(cases.random));
  bench.add("Trie missing word", () => trie.search(cases.missing));
  bench.add("Radix missing word", () => radix.search(cases.missing));

  await bench.run();

  const tasks = bench.tasks;

  return {
    trie: {
      longest: {
        time: summarizeResult(tasks[0]),
        nodesVisited: summarizeCount(trieVisited.longest),
      },
      shortest: {
        time: summarizeResult(tasks[2]),
        nodesVisited: summarizeCount(trieVisited.shortest),
      },
      random: {
        time: summarizeResult(tasks[4]),
        nodesVisited: summarizeCount(trieVisited.random),
      },
      missing: {
        time: summarizeResult(tasks[6]),
        nodesVisited: summarizeCount(trieVisited.missing),
      },
    },
    radix: {
      longest: {
        time: summarizeResult(tasks[1]),
        nodesVisited: summarizeCount(radixVisited.longest),
      },
      shortest: {
        time: summarizeResult(tasks[3]),
        nodesVisited: summarizeCount(radixVisited.shortest),
      },
      random: {
        time: summarizeResult(tasks[5]),
        nodesVisited: summarizeCount(radixVisited.random),
      },
      missing: {
        time: summarizeResult(tasks[7]),
        nodesVisited: summarizeCount(radixVisited.missing),
      },
    },
  } as WorstCaseSearchResult;
}
