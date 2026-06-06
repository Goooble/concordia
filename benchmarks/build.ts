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
  StructuralMemoryMetrics,
  computeTrieStructuralMemory,
  computeRadixStructuralMemory,
  CompressionStats,
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
  trie: {
    build: BuildResult;
    exactSearch: SearchMetrics;
    prefixSearch: SearchMetrics;
    fuzzySearch: FuzzySearchMetrics;
    structure: StructureMetrics;
    structuralMemory: StructuralMemoryMetrics;
    runtimeMemory: MemoryMetrics;
    scaling: ScalingMetrics;
  };
  radix: {
    build: BuildResult;
    exactSearch: SearchMetrics;
    prefixSearch: SearchMetrics;
    fuzzySearch: FuzzySearchMetrics;
    structure: StructureMetrics;
    structuralMemory: StructuralMemoryMetrics;
    runtimeMemory: MemoryMetrics;
    scaling: ScalingMetrics;
  };
};

function flattenSearchMetrics(name: string, metrics: SearchMetrics) {
  return {
    structure: name,
    meanMs: metrics.time.meanMs,
    throughputOpsPerSec: metrics.time.throughputOpsPerSec,
    samples: metrics.time.samples,
    nodesVisitedAverage: metrics.nodesVisited.average,
  };
}

function flattenFuzzySearchMetrics(name: string, metrics: FuzzySearchMetrics) {
  return {
    structure: name,
    meanMs: metrics.time.meanMs,
    throughputOpsPerSec: metrics.time.throughputOpsPerSec,
    nodesVisitedAverage: metrics.nodesVisited.average,
    nodesPrunedAverage: metrics.nodesPruned.average,
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

  return {
    trie: {
      meanMs: trieTask.result.latency.mean,
      throughputOpsPerSec: trieTask.result.throughput.mean,
      wordsPerSecond: trieTask.result.throughput.mean * size,
    },
    radix: {
      meanMs: radixTask.result.latency.mean,
      throughputOpsPerSec: radixTask.result.throughput.mean,
      wordsPerSecond: radixTask.result.throughput.mean * size,
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

    const [buildResults, exactResults, prefixResults, fuzzyResults] =
      await Promise.all([
        benchmarkBuild(size, words),
        runExactSearchBenchmarks(size),
        runPrefixSearchBenchmarks(size),
        runFuzzySearchBenchmarks(size),
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

    // Compute structural memory metrics
    const trieStructuralMemory = computeTrieStructuralMemory(trie);
    const radixStructuralMemory = computeRadixStructuralMemory(radix);

    // Measure runtime heap memory
    const trieRuntimeMemory = measureMemory(() => {
      const t = new Trie();
      for (const word of words) {
        t.insert(word);
      }
    });

    const radixRuntimeMemory = measureMemory(() => {
      const r = new Radix();
      for (const word of words) {
        r.insert(word);
      }
    });

    // Compute scaling metrics using structural memory
    const trieScaling = computeScalingMetrics(
      trieStructure.nodeCount,
      trieStructuralMemory.estimatedMemory / (1024 * 1024),
      buildResults.trie.meanMs,
      size,
    );

    const radixScaling = computeScalingMetrics(
      radixStructure.nodeCount,
      radixStructuralMemory.estimatedMemory / (1024 * 1024),
      buildResults.radix.meanMs,
      size,
    );

    const datasetReport: DatasetReport = {
      datasetSize: size,
      datasetStats,
      trie: {
        build: buildResults.trie,
        exactSearch: exactResults.trie,
        prefixSearch: prefixResults.trie,
        fuzzySearch: fuzzyResults.trie,
        structure: trieStructure,
        structuralMemory: trieStructuralMemory,
        runtimeMemory: trieRuntimeMemory,
        scaling: trieScaling,
      },
      radix: {
        build: buildResults.radix,
        exactSearch: exactResults.radix,
        prefixSearch: prefixResults.radix,
        fuzzySearch: fuzzyResults.radix,
        structure: radixStructure,
        structuralMemory: radixStructuralMemory,
        runtimeMemory: radixRuntimeMemory,
        scaling: radixScaling,
      },
    };

    report.push(datasetReport);

    // Print concise per-dataset metrics
    const nodeReduction =
      (1 - radixStructure.nodeCount / trieStructure.nodeCount) * 100;
    const depthReduction =
      (1 - radixStructure.maxDepth / trieStructure.maxDepth) * 100;
    const memoryReduction =
      (1 -
        radixStructuralMemory.estimatedMemory /
          trieStructuralMemory.estimatedMemory) *
      100;

    console.log("\nCore Structural Metrics:");
    console.table({
      Metric: [
        "Node Count",
        "Stored Characters",
        "Est. Memory (KB)",
        "Max Depth",
      ],
      Trie: [
        trieStructure.nodeCount,
        trieStructuralMemory.totalStoredCharacters,
        (trieStructuralMemory.estimatedMemory / 1024).toFixed(1),
        trieStructure.maxDepth,
      ],
      Radix: [
        radixStructure.nodeCount,
        radixStructuralMemory.totalStoredCharacters,
        (radixStructuralMemory.estimatedMemory / 1024).toFixed(1),
        radixStructure.maxDepth,
      ],
    });

    console.log("\nCompression Efficiency:");
    console.table({
      Metric: [
        "Node Reduction %",
        "Max Depth Reduction %",
        "Est. Memory Reduction %",
      ],
      Value: [
        nodeReduction.toFixed(1),
        depthReduction.toFixed(1),
        memoryReduction.toFixed(1),
      ],
    });

    // Calculate traversal reductions
    const prefixTraversalReduction =
      (1 -
        prefixResults.radix.nodesVisited.average /
          prefixResults.trie.nodesVisited.average) *
      100;
    const fuzzyTraversalReduction =
      (1 -
        fuzzyResults.radix.nodesVisited.average /
          fuzzyResults.trie.nodesVisited.average) *
      100;

    console.log("\nTraversal Efficiency Improvements:");
    console.table({
      "Search Type": ["Prefix", "Fuzzy"],
      "Radix Reduction %": [
        prefixTraversalReduction.toFixed(1),
        fuzzyTraversalReduction.toFixed(1),
      ],
      "Avg Time (ms)": [
        `Prefix: ${prefixResults.radix.time.meanMs.toFixed(4)}`,
        `Fuzzy: ${fuzzyResults.radix.time.meanMs.toFixed(4)}`,
      ],
    });
  }

  // Print scaling analysis summary
  console.log("\n\n=== SCALING ANALYSIS ===\n");

  console.log("Node Count Growth:");
  console.table(
    report.map((r) => ({
      "Dataset Size": r.datasetSize,
      Trie: r.trie.structure.nodeCount,
      Radix: r.radix.structure.nodeCount,
      "Reduction %": (
        (1 - r.radix.structure.nodeCount / r.trie.structure.nodeCount) *
        100
      ).toFixed(1),
    })),
  );

  console.log("Estimated Memory Scaling:");
  console.table(
    report.map((r) => ({
      "Dataset Size": r.datasetSize,
      "Trie (KB)": (r.trie.structuralMemory.estimatedMemory / 1024).toFixed(1),
      "Radix (KB)": (r.radix.structuralMemory.estimatedMemory / 1024).toFixed(
        1,
      ),
    })),
  );

  console.log("Build Time Scaling (ms):");
  console.table(
    report.map((r) => ({
      "Dataset Size": r.datasetSize,
      Trie: r.trie.build.meanMs.toFixed(3),
      Radix: r.radix.build.meanMs.toFixed(3),
    })),
  );

  // Final summary
  console.log("\n\n=== EFFICIENCY SUMMARY ===\n");

  const lastReport = report[report.length - 1];
  if (lastReport) {
    const nodeReduction =
      (1 -
        lastReport.radix.structure.nodeCount /
          lastReport.trie.structure.nodeCount) *
      100;
    const depthReduction =
      (1 -
        lastReport.radix.structure.maxDepth /
          lastReport.trie.structure.maxDepth) *
      100;
    const memoryReduction =
      (1 -
        lastReport.radix.structuralMemory.estimatedMemory /
          lastReport.trie.structuralMemory.estimatedMemory) *
      100;

    const prefixTraversalReduction =
      (1 -
        lastReport.radix.prefixSearch.nodesVisited.average /
          lastReport.trie.prefixSearch.nodesVisited.average) *
      100;
    const fuzzyTraversalReduction =
      (1 -
        lastReport.radix.fuzzySearch.nodesVisited.average /
          lastReport.trie.fuzzySearch.nodesVisited.average) *
      100;

    const prefixSpeedup =
      lastReport.trie.prefixSearch.time.meanMs /
      lastReport.radix.prefixSearch.time.meanMs;
    const fuzzySpeedup =
      lastReport.trie.fuzzySearch.time.meanMs /
      lastReport.radix.fuzzySearch.time.meanMs;

    console.log(
      `Dataset: ${lastReport.datasetSize} words (${lastReport.datasetStats.averageWordLength.toFixed(1)} chars avg)`,
    );
    console.log(`\nStructural Efficiency (Radix vs Trie):`);
    console.log(`  • Node Reduction:       ${nodeReduction.toFixed(1)}%`);
    console.log(`  • Max Depth Reduction:  ${depthReduction.toFixed(1)}%`);
    console.log(
      `  • Estimated Memory:     ${memoryReduction.toFixed(1)}% less`,
    );

    console.log(`\nSearch Efficiency:`);
    console.log(
      `  • Prefix Traversal:     ${prefixTraversalReduction.toFixed(1)}% fewer nodes → ${prefixSpeedup.toFixed(2)}x faster`,
    );
    console.log(
      `  • Fuzzy Traversal:      ${fuzzyTraversalReduction.toFixed(1)}% fewer nodes → ${fuzzySpeedup.toFixed(2)}x faster`,
    );

    console.log(`\nBuild Performance:`);
    console.log(
      `  • Radix: ${lastReport.radix.build.meanMs.toFixed(3)}ms | Trie: ${lastReport.trie.build.meanMs.toFixed(3)}ms`,
    );

    console.log(
      `\nNote: Structural metrics (nodes, depth, estimated memory) are more reliable`,
    );
    console.log(`for cross-platform comparison than runtime heap usage.`);
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
