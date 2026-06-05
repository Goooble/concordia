import { Trie } from "../src/minisearch/trie/trie";
import { Radix } from "../src/minisearch/trie/radix";

export type StructureMetrics = {
  nodeCount: number;
  maxDepth: number;
  averageDepth: number;
  averageBranchingFactor: number;
  maxBranchingFactor: number;
};

function getChildren(node: any): any[] {
  if (node.children instanceof Map) {
    return Array.from(node.children.values());
  }

  if (Array.isArray(node.children)) {
    return node.children;
  }

  return Object.values(node.children || {});
}

function traverseStructure(node: any, depth: number) {
  let nodeCount = 1;
  let depthSum = depth;
  let maxDepth = depth;
  let totalChildren = 0;
  let nonLeafNodes = 0;
  let maxBranchingFactor = 0;

  const children = getChildren(node);
  const childrenCount = children.length;
  if (childrenCount > 0) {
    nonLeafNodes += 1;
    totalChildren += childrenCount;
    maxBranchingFactor = childrenCount;
  }

  for (const child of children) {
    const childStats = traverseStructure(child, depth + 1);
    nodeCount += childStats.nodeCount;
    depthSum += childStats.depthSum;
    maxDepth = Math.max(maxDepth, childStats.maxDepth);
    totalChildren += childStats.totalChildren;
    nonLeafNodes += childStats.nonLeafNodes;
    maxBranchingFactor = Math.max(
      maxBranchingFactor,
      childStats.maxBranchingFactor,
    );
  }

  return {
    nodeCount,
    depthSum,
    maxDepth,
    totalChildren,
    nonLeafNodes,
    maxBranchingFactor,
  };
}

export function computeTrieStructure(trie: Trie): StructureMetrics {
  const stats = traverseStructure((trie as any).root, 0);
  return {
    nodeCount: stats.nodeCount,
    maxDepth: stats.maxDepth,
    averageDepth: stats.nodeCount === 0 ? 0 : stats.depthSum / stats.nodeCount,
    averageBranchingFactor:
      stats.nonLeafNodes === 0 ? 0 : stats.totalChildren / stats.nonLeafNodes,
    maxBranchingFactor: stats.maxBranchingFactor,
  };
}

export function computeRadixStructure(radix: Radix): StructureMetrics {
  const stats = traverseStructure((radix as any).root, 0);
  return {
    nodeCount: stats.nodeCount,
    maxDepth: stats.maxDepth,
    averageDepth: stats.nodeCount === 0 ? 0 : stats.depthSum / stats.nodeCount,
    averageBranchingFactor:
      stats.nonLeafNodes === 0 ? 0 : stats.totalChildren / stats.nonLeafNodes,
    maxBranchingFactor: stats.maxBranchingFactor,
  };
}
