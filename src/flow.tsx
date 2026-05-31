import dagre from "dagre";
import { type Edge, type Node } from "@xyflow/react";

const NODE_WIDTH = 60;
const NODE_HEIGHT = 60;

export function trieToFlow(tree: any, highlightedNodes: number[]) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  function dfs(node: any, parentId?: string) {
    const id = node.id.toString();

    nodes.push({
      id,
      position: { x: 0, y: 0 }, // dagre will overwrite
      data: {
        label: node.label,
      },
      style: {
        border: highlightedNodes.includes(node.id)
          ? "3px solid orange"
          : "1px solid gray",
        borderRadius: "50%",
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      },
    });

    if (parentId) {
      edges.push({
        id: `${parentId}-${id}`,
        source: parentId,
        target: id,
      });
    }

    for (const child of node.children) {
      dfs(child, id);
    }
  }

  dfs(tree);

  const graph = new dagre.graphlib.Graph();

  graph.setDefaultEdgeLabel(() => ({}));

  graph.setGraph({
    rankdir: "TB", // Top -> Bottom
    ranksep: 10,
    nodesep: 10,
  });

  nodes.forEach((node) => {
    graph.setNode(node.id, {
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    });
  });

  edges.forEach((edge) => {
    graph.setEdge(edge.source, edge.target);
  });

  dagre.layout(graph);

  nodes.forEach((node) => {
    const pos = graph.node(node.id);

    node.position = {
      x: pos.x - NODE_WIDTH / 2,
      y: pos.y - NODE_HEIGHT / 2,
    };
  });

  return { nodes, edges };
}
