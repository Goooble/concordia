import { writeFile } from "fs/promises";
import { resolve } from "path";
import type { DatasetReport } from "./build";
import { csvHeader, csvRow } from "./analysis-utils";

export async function exportStructureCSV(
  reports: DatasetReport[],
  outputPath: string,
) {
  const headers = [
    "Dataset Size",
    "Trie Nodes",
    "Trie Max Depth",
    "Trie Avg Depth",
    "Trie Avg Branching",
    "Radix Nodes",
    "Radix Max Depth",
    "Radix Avg Depth",
    "Radix Avg Branching",
    "Compression Ratio",
    "Node Reduction %",
  ];

  const rows = reports.map((r) => [
    r.datasetSize,
    r.trie.structure.nodeCount,
    r.trie.structure.maxDepth,
    r.trie.structure.averageDepth.toFixed(2),
    r.trie.structure.averageBranchingFactor.toFixed(2),
    r.radix.structure.nodeCount,
    r.radix.structure.maxDepth,
    r.radix.structure.averageDepth.toFixed(2),
    r.radix.structure.averageBranchingFactor.toFixed(2),
    r.compression.compressionRatio.toFixed(3),
    r.compression.nodeReductionPercent.toFixed(1),
  ]);

  const csv = [csvHeader(headers), ...rows.map((r) => csvRow(r))].join("\n");
  await writeFile(outputPath, csv, "utf8");
}

export async function exportMemoryCSV(
  reports: DatasetReport[],
  outputPath: string,
) {
  const headers = [
    "Dataset Size",
    "Trie Memory MB",
    "Radix Memory MB",
    "Memory Reduction %",
  ];

  const rows = reports.map((r) => {
    const trieMemory = r.trie.memory?.memoryMB || 0;
    const radixMemory = r.radix.memory?.memoryMB || 0;
    const reduction =
      trieMemory > 0 ? ((trieMemory - radixMemory) / trieMemory) * 100 : 0;

    return [
      r.datasetSize,
      trieMemory.toFixed(2),
      radixMemory.toFixed(2),
      reduction.toFixed(1),
    ];
  });

  const csv = [csvHeader(headers), ...rows.map((r) => csvRow(r))].join("\n");
  await writeFile(outputPath, csv, "utf8");
}

export async function exportScalingCSV(
  reports: DatasetReport[],
  outputPath: string,
) {
  const headers = [
    "Dataset Size",
    "Trie Nodes/Word",
    "Trie Memory/Word (KB)",
    "Trie BuildTime/Word (ms)",
    "Radix Nodes/Word",
    "Radix Memory/Word (KB)",
    "Radix BuildTime/Word (ms)",
  ];

  const rows = reports.map((r) => [
    r.datasetSize,
    r.trie.scaling?.nodesPerWord.toFixed(3) || "0",
    r.trie.scaling?.memoryPerWord.toFixed(4) || "0",
    r.trie.scaling?.buildTimePerWord.toFixed(4) || "0",
    r.radix.scaling?.nodesPerWord.toFixed(3) || "0",
    r.radix.scaling?.memoryPerWord.toFixed(4) || "0",
    r.radix.scaling?.buildTimePerWord.toFixed(4) || "0",
  ]);

  const csv = [csvHeader(headers), ...rows.map((r) => csvRow(r))].join("\n");
  await writeFile(outputPath, csv, "utf8");
}

export async function exportGraphData(
  reports: DatasetReport[],
  graphDir: string,
) {
  const nodeCountData = reports.map((r) => ({
    datasetSize: r.datasetSize,
    trie: r.trie.structure.nodeCount,
    radix: r.radix.structure.nodeCount,
  }));

  const memoryData = reports.map((r) => ({
    datasetSize: r.datasetSize,
    trieMB: r.trie.memory?.memoryMB || 0,
    radixMB: r.radix.memory?.memoryMB || 0,
  }));

  const buildTimeData = reports.map((r) => ({
    datasetSize: r.datasetSize,
    trieMs: r.trie.build.meanMs,
    radixMs: r.radix.build.meanMs,
  }));

  const depthData = reports.map((r) => ({
    datasetSize: r.datasetSize,
    trieAvgDepth: r.trie.structure.averageDepth,
    radixAvgDepth: r.radix.structure.averageDepth,
  }));

  await writeFile(
    resolve(graphDir, "node-count.json"),
    JSON.stringify(nodeCountData, null, 2),
    "utf8",
  );
  await writeFile(
    resolve(graphDir, "memory.json"),
    JSON.stringify(memoryData, null, 2),
    "utf8",
  );
  await writeFile(
    resolve(graphDir, "build-time.json"),
    JSON.stringify(buildTimeData, null, 2),
    "utf8",
  );
  await writeFile(
    resolve(graphDir, "depth.json"),
    JSON.stringify(depthData, null, 2),
    "utf8",
  );
}
