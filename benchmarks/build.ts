import { mkdir, writeFile } from "fs/promises";
import { resolve } from "path";
import { Bench } from "tinybench";
import { supportedDatasetSizes, getDatasetWords } from "./datasets";
import { runExactSearchBenchmarks } from "./exact-search";
import { runPrefixSearchBenchmarks } from "./prefix-search";
import { runFuzzySearchBenchmarks } from "./fuzzy-search";
import { runSearchMissBenchmarks } from "./miss-search";
import { runWorstCaseSearchBenchmarks } from "./worst-case-search";
import {
  computeTrieStructure,
  computeRadixStructure,
  StructureMetrics,
} from "./structural-metrics";
import { Trie } from "../src/minisearch/trie/trie";
import { Radix } from "../src/minisearch/trie/radix";
import {
  FuzzySearchMetrics,
  SearchMetrics,
  WorstCaseSearchResult,
} from "./search-metrics";
import {
  computeDatasetStats,
  DatasetStats,
  measureMemory,
  MemoryMetrics,
  ScalingMetrics,
  computeScalingMetrics,
} from "./analysis-utils";
import {
  exportStructureCSV,
  exportMemoryCSV,
  exportScalingCSV,
  exportGraphData,
} from "./export-results";

export type BuildResult = {
  meanMs: number;
  throughputOpsPerSec: number;
  wordsPerSecond: number;
  memory?: MemoryMetrics;
};

export type CompressionMetrics = {
  compressionRatio: number;
  nodeReductionPercent: number;
};

export type DatasetReport = {
  datasetSize: number;
  datasetStats: DatasetStats;
  compression: CompressionMetrics;
  trie: {
    build: BuildResult;
    exactSearch: SearchMetrics;
    prefixSearch: SearchMetrics;
    fuzzySearch: FuzzySearchMetrics;
    searchMiss: SearchMetrics;
    structure: StructureMetrics;
    memory?: MemoryMetrics;
    scaling?: ScalingMetrics;
  };
  radix: {
    build: BuildResult;
    exactSearch: SearchMetrics;
    prefixSearch: SearchMetrics;
    fuzzySearch: FuzzySearchMetrics;
    searchMiss: SearchMetrics;
    structure: StructureMetrics;
    memory?: MemoryMetrics;
    scaling?: ScalingMetrics;
  };
  worstCase: WorstCaseSearchResult;
};

function flattenSearchMetrics(name: string, metrics: SearchMetrics) {
  return {
    structure: name,
    meanMs: metrics.time.meanMs,
    throughputOpsPerSec: metrics.time.throughputOpsPerSec,
    samples: metrics.time.samples,
    nodesVisitedAverage: metrics.nodesVisited.average,
    nodesVisitedMin: metrics.nodesVisited.min,
    nodesVisitedMax: metrics.nodesVisited.max,
    nodesVisitedTotal: metrics.nodesVisited.total,
  };
}

function flattenFuzzySearchMetrics(name: string, metrics: FuzzySearchMetrics) {
  return {
    structure: name,
    meanMs: metrics.time.meanMs,
    throughputOpsPerSec: metrics.time.throughputOpsPerSec,
    samples: metrics.time.samples,
    nodesVisitedAverage: metrics.nodesVisited.average,
    nodesVisitedMin: metrics.nodesVisited.min,
    nodesVisitedMax: metrics.nodesVisited.max,
    nodesVisitedTotal: metrics.nodesVisited.total,
    nodesPrunedAverage: metrics.nodesPruned.average,
    nodesPrunedMin: metrics.nodesPruned.min,
    nodesPrunedMax: metrics.nodesPruned.max,
    nodesPrunedTotal: metrics.nodesPruned.total,
    matchesFoundAverage: metrics.matchesFound.average,
    matchesFoundMin: metrics.matchesFound.min,
    matchesFoundMax: metrics.matchesFound.max,
    matchesFoundTotal: metrics.matchesFound.total,
    pruningPercentage: metrics.pruningPercentage,
  };
}

async function benchmarkBuild(size: number, words: string[]) {
  const bench = new Bench({ name: `Build ${size}` });

  bench.add("Trie build", () => {
    const trie = new Trie();
    for (const word of words) {
      trie.insert(word);
    }
  });

  bench.add("Radix build", () => {
    const radix = new Radix();
    for (const word of words) {
      radix.insert(word);
    }
  });

  await bench.run();

  const trieTask = bench.tasks[0];
  const radixTask = bench.tasks[1];

  // Measure memory separately
  const trieMemory = measureMemory(() => {
    const trie = new Trie();
    for (const word of words) {
      trie.insert(word);
    }
  });

  const radixMemory = measureMemory(() => {
    const radix = new Radix();
    for (const word of words) {
      radix.insert(word);
    }
  });

  return {
    trie: {
      meanMs: trieTask.result.latency.mean,
      throughputOpsPerSec: trieTask.result.throughput.mean,
      wordsPerSecond: trieTask.result.throughput.mean * size,
      memory: trieMemory,
    },
    radix: {
      meanMs: radixTask.result.latency.mean,
      throughputOpsPerSec: radixTask.result.throughput.mean,
      wordsPerSecond: radixTask.result.throughput.mean * size,
      memory: radixMemory,
    },
  };
}

async function run() {
  const report: DatasetReport[] = [];
  const resultsPath = resolve(process.cwd(), "benchmarks", "results");
  await mkdir(resultsPath, { recursive: true });

  for (const size of supportedDatasetSizes) {
    console.log(`\n=== Benchmark dataset ${size} words ===`);
    const words = await getDatasetWords(size);

    const [
      buildResults,
      exactResults,
      prefixResults,
      fuzzyResults,
      missResults,
      worstCaseResults,
    ] = await Promise.all([
      benchmarkBuild(size, words),
      runExactSearchBenchmarks(size),
      runPrefixSearchBenchmarks(size),
      runFuzzySearchBenchmarks(size),
      runSearchMissBenchmarks(size),
      runWorstCaseSearchBenchmarks(size),
    ]);

    const trie = new Trie();
    const radix = new Radix();
    for (const word of words) {
      trie.insert(word);
      radix.insert(word);
    }

    const trieStructure = computeTrieStructure(trie);
    const radixStructure = computeRadixStructure(radix);
    const datasetStats = computeDatasetStats(words);

    const compressionRatio = trieStructure.nodeCount
      ? radixStructure.nodeCount / trieStructure.nodeCount
      : 0;
    const nodeReductionPercent = (1 - compressionRatio) * 100;

    // Extract memory from build results
    const trieMemory = (buildResults.trie as any).memory as MemoryMetrics;
    const radixMemory = (buildResults.radix as any).memory as MemoryMetrics;

    // Compute scaling metrics
    const trieScaling = computeScalingMetrics(
      trieStructure.nodeCount,
      trieMemory.memoryMB,
      (buildResults.trie as any).meanMs,
      size,
    );

    const radixScaling = computeScalingMetrics(
      radixStructure.nodeCount,
      radixMemory.memoryMB,
      (buildResults.radix as any).meanMs,
      size,
    );

    const datasetReport: DatasetReport = {
      datasetSize: size,
      datasetStats,
      compression: {
        compressionRatio,
        nodeReductionPercent,
      },
      trie: {
        build: buildResults.trie,
        exactSearch: exactResults.trie,
        prefixSearch: prefixResults.trie,
        fuzzySearch: fuzzyResults.trie,
        searchMiss: missResults.trie,
        structure: trieStructure,
        memory: trieMemory,
        scaling: trieScaling,
      },
      radix: {
        build: buildResults.radix,
        exactSearch: exactResults.radix,
        prefixSearch: prefixResults.radix,
        fuzzySearch: fuzzyResults.radix,
        searchMiss: missResults.radix,
        structure: radixStructure,
        memory: radixMemory,
        scaling: radixScaling,
      },
      worstCase: worstCaseResults,
    };

    report.push(datasetReport);

    console.log("Compression Metrics:");
    console.table({
      "Trie Nodes": trieStructure.nodeCount,
      "Radix Nodes": radixStructure.nodeCount,
      "Compression Ratio": compressionRatio.toFixed(3),
      "Node Reduction %": nodeReductionPercent.toFixed(1),
    });
    console.log("Trie structure metrics:");
    console.table(trieStructure);
    console.log("Radix structure metrics:");
    console.table(radixStructure);
    console.log("Exact search results:");
    console.table([
      flattenSearchMetrics("Trie", exactResults.trie),
      flattenSearchMetrics("Radix", exactResults.radix),
    ]);

    console.log("Prefix search results:");
    console.table([
      flattenSearchMetrics("Trie", prefixResults.trie),
      flattenSearchMetrics("Radix", prefixResults.radix),
    ]);

    console.log("Fuzzy search results:");
    console.table([
      flattenFuzzySearchMetrics("Trie", fuzzyResults.trie),
      flattenFuzzySearchMetrics("Radix", fuzzyResults.radix),
    ]);

    console.log("Search miss results:");
    console.table([
      flattenSearchMetrics("Trie", missResults.trie),
      flattenSearchMetrics("Radix", missResults.radix),
    ]);

    console.log("Worst-case search results (nodes visited):");
    console.table([
      {
        structure: "Trie longest",
        nodesVisited: worstCaseResults.trie.longest.nodesVisited.average,
      },
      {
        structure: "Trie shortest",
        nodesVisited: worstCaseResults.trie.shortest.nodesVisited.average,
      },
      {
        structure: "Trie random",
        nodesVisited: worstCaseResults.trie.random.nodesVisited.average,
      },
      {
        structure: "Trie missing",
        nodesVisited: worstCaseResults.trie.missing.nodesVisited.average,
      },
      {
        structure: "Radix longest",
        nodesVisited: worstCaseResults.radix.longest.nodesVisited.average,
      },
      {
        structure: "Radix shortest",
        nodesVisited: worstCaseResults.radix.shortest.nodesVisited.average,
      },
      {
        structure: "Radix random",
        nodesVisited: worstCaseResults.radix.random.nodesVisited.average,
      },
      {
        structure: "Radix missing",
        nodesVisited: worstCaseResults.radix.missing.nodesVisited.average,
      },
    ]);
    console.log("Build results:");
    console.table([
      {
        structure: "Trie",
        meanMs: buildResults.trie.meanMs,
        throughputOpsPerSec: buildResults.trie.throughputOpsPerSec,
        wordsPerSecond: buildResults.trie.wordsPerSecond,
      },
      {
        structure: "Radix",
        meanMs: buildResults.radix.meanMs,
        throughputOpsPerSec: buildResults.radix.throughputOpsPerSec,
        wordsPerSecond: buildResults.radix.wordsPerSecond,
      },
    ]);

    console.log("Memory Usage:");
    console.table([
      {
        structure: "Trie",
        memoryMB: trieMemory.memoryMB.toFixed(2),
        memoryKB: trieMemory.memoryKB.toFixed(2),
      },
      {
        structure: "Radix",
        memoryMB: radixMemory.memoryMB.toFixed(2),
        memoryKB: radixMemory.memoryKB.toFixed(2),
      },
    ]);

    console.log("Scaling Metrics:");
    console.table([
      {
        structure: "Trie",
        nodesPerWord: trieScaling.nodesPerWord.toFixed(3),
        memoryPerWord: trieScaling.memoryPerWord.toFixed(4),
        buildTimePerWord: trieScaling.buildTimePerWord.toFixed(6),
      },
      {
        structure: "Radix",
        nodesPerWord: radixScaling.nodesPerWord.toFixed(3),
        memoryPerWord: radixScaling.memoryPerWord.toFixed(4),
        buildTimePerWord: radixScaling.buildTimePerWord.toFixed(6),
      },
    ]);
  }

  // Print scaling analysis tables
  console.log("\n\n=== SCALING ANALYSIS ===\n");

  console.log("Node Count Growth:");
  console.table(
    report.map((r) => ({
      "Dataset Size": r.datasetSize,
      "Trie Nodes": r.trie.structure.nodeCount,
      "Radix Nodes": r.radix.structure.nodeCount,
    })),
  );

  console.log("Memory Usage Scaling:");
  console.table(
    report.map((r) => ({
      "Dataset Size": r.datasetSize,
      "Trie MB": r.trie.memory?.memoryMB.toFixed(2),
      "Radix MB": r.radix.memory?.memoryMB.toFixed(2),
    })),
  );

  console.log("Build Time Scaling (ms):");
  console.table(
    report.map((r) => ({
      "Dataset Size": r.datasetSize,
      Trie: r.trie.build.meanMs.toFixed(2),
      Radix: r.radix.build.meanMs.toFixed(2),
    })),
  );

  console.log("Average Depth Scaling:");
  console.table(
    report.map((r) => ({
      "Dataset Size": r.datasetSize,
      "Trie Avg Depth": r.trie.structure.averageDepth.toFixed(2),
      "Radix Avg Depth": r.radix.structure.averageDepth.toFixed(2),
    })),
  );

  // Generate summary report
  console.log("\n\n=== SUMMARY REPORT ===\n");

  const lastReport = report[report.length - 1];
  if (lastReport) {
    const nodeReduction = lastReport.compression.nodeReductionPercent;
    const memoryReduction = lastReport.trie.memory?.memoryMB
      ? ((lastReport.trie.memory.memoryMB - lastReport.radix.memory!.memoryMB) /
          lastReport.trie.memory.memoryMB) *
        100
      : 0;
    const depthReduction =
      ((lastReport.trie.structure.averageDepth -
        lastReport.radix.structure.averageDepth) /
        lastReport.trie.structure.averageDepth) *
      100;

    const prefixSpeedup =
      lastReport.trie.prefixSearch.time.meanMs /
      lastReport.radix.prefixSearch.time.meanMs;
    const fuzzyTime =
      lastReport.trie.fuzzySearch.time.meanMs /
      lastReport.radix.fuzzySearch.time.meanMs;
    const fuzzySpeedup =
      fuzzyTime > 1
        ? `${fuzzyTime.toFixed(2)}x slower`
        : `${(1 / fuzzyTime).toFixed(2)}x faster`;

    console.log(`Dataset Size: ${lastReport.datasetSize} words`);
    console.log(`Dataset Stats:`);
    console.log(
      `  Words: ${lastReport.datasetStats.wordCount}, ` +
        `Avg Length: ${lastReport.datasetStats.averageWordLength.toFixed(1)}, ` +
        `Unique First Letters: ${lastReport.datasetStats.uniqueFirstLetters}`,
    );
    console.log(
      `\nRadix Tree Advantages:` +
        `\n  Node Reduction: ${nodeReduction.toFixed(1)}%` +
        `\n  Memory Reduction: ${memoryReduction.toFixed(1)}%` +
        `\n  Depth Reduction: ${depthReduction.toFixed(1)}%` +
        `\n  Prefix Search Speedup: ${prefixSpeedup.toFixed(2)}x` +
        `\n  Fuzzy Search: ${fuzzySpeedup}`,
    );
  }

  // Export to CSV and graph formats
  const graphDir = resolve(resultsPath, "graphs");
  await mkdir(graphDir, { recursive: true });

  await exportStructureCSV(report, resolve(resultsPath, "structure.csv"));
  await exportMemoryCSV(report, resolve(resultsPath, "memory.csv"));
  await exportScalingCSV(report, resolve(resultsPath, "scaling.csv"));
  await exportGraphData(report, graphDir);

  console.log("\n✓ CSV exports written to: benchmarks/results/");
  console.log("✓ Graph data written to: benchmarks/results/graphs/");

  const outputFile = resolve(resultsPath, "benchmark-results.json");
  await writeFile(
    outputFile,
    JSON.stringify({ datasets: report }, null, 2),
    "utf8",
  );
  console.log(`\nBenchmark report written to ${outputFile}`);
}

run().catch((error) => {
  console.error("Benchmark runner failed:", error);
  process.exit(1);
});
