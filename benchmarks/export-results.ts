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
    "Trie Stored Characters",
    "Trie Max Depth",
    "Trie Avg Depth",
    "Radix Nodes",
    "Radix Stored Characters",
    "Radix Max Depth",
    "Radix Avg Depth",
    "Node Reduction %",
  ];

  const rows = reports.map((r) => {
    const nodeReduction =
      (1 - r.radix.structure.nodeCount / r.trie.structure.nodeCount) * 100;
    return [
      r.datasetSize,
      r.trie.structure.nodeCount,
      r.trie.structuralMemory.totalStoredCharacters,
      r.trie.structure.maxDepth,
      r.trie.structure.averageDepth.toFixed(2),
      r.radix.structure.nodeCount,
      r.radix.structuralMemory.totalStoredCharacters,
      r.radix.structure.maxDepth,
      r.radix.structure.averageDepth.toFixed(2),
      nodeReduction.toFixed(1),
    ];
  });

  const csv = [csvHeader(headers), ...rows.map((r) => csvRow(r))].join("\n");
  await writeFile(outputPath, csv, "utf8");
}

export async function exportMemoryCSV(
  reports: DatasetReport[],
  outputPath: string,
) {
  const headers = [
    "Dataset Size",
    "Trie Est. Memory (KB)",
    "Radix Est. Memory (KB)",
    "Est. Memory Reduction %",
    "Trie Runtime Heap (MB)",
    "Radix Runtime Heap (MB)",
  ];

  const rows = reports.map((r) => {
    const trieEst = r.trie.structuralMemory.estimatedMemory / 1024;
    const radixEst = r.radix.structuralMemory.estimatedMemory / 1024;
    const reduction = ((trieEst - radixEst) / trieEst) * 100;

    return [
      r.datasetSize,
      trieEst.toFixed(1),
      radixEst.toFixed(1),
      reduction.toFixed(1),
      r.trie.runtimeMemory.memoryMB.toFixed(2),
      r.radix.runtimeMemory.memoryMB.toFixed(2),
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
    "Trie Est. Memory/Word (KB)",
    "Trie BuildTime/Word (ms)",
    "Radix Nodes/Word",
    "Radix Est. Memory/Word (KB)",
    "Radix BuildTime/Word (ms)",
  ];

  const rows = reports.map((r) => [
    r.datasetSize,
    r.trie.scaling.nodesPerWord.toFixed(3),
    (r.trie.scaling.estimatedMemoryPerWord * 1024).toFixed(2),
    r.trie.scaling.buildTimePerWord.toFixed(4),
    r.radix.scaling.nodesPerWord.toFixed(3),
    (r.radix.scaling.estimatedMemoryPerWord * 1024).toFixed(2),
    r.radix.scaling.buildTimePerWord.toFixed(4),
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
    trieEstimatedKB: r.trie.structuralMemory.estimatedMemory / 1024,
    radixEstimatedKB: r.radix.structuralMemory.estimatedMemory / 1024,
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
