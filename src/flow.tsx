import dagre from "dagre";
import { type Edge, type Node } from "@xyflow/react";

const NODE_SIZE = 44;

// High-saturation minimalist colors (Electric Violet, Cyber Teal, Neon Tangerine, Acid Lime)
const VIBRANT_PALETTE = ["#6366f1", "#06b6d4", "#f97316", "#10b981"];

export function buildFlowGraph(tree: any) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  function dfs(node: any, parentId?: string, depth = 0) {
    const id = node.id.toString();

    // Assign a pure, flat vibrant accent color based on tree layer
    const accentColor = VIBRANT_PALETTE[depth % VIBRANT_PALETTE.length];

    nodes.push({
      id,
      position: { x: 0, y: 0 },
      data: { label: node.label },
      // Minimalist Frame + Saturated Color Core
      style: {
        width: NODE_SIZE,
        height: NODE_SIZE,
        borderRadius: "12px", // Sleek, modern rounded squares
        backgroundColor: "#ffffff",
        border: `3px solid ${accentColor}`, // The pop of color comes entirely from a thick, crisp border
        color: "#0f172a", // Solid dark text for pure legibility
        fontSize: "13px",
        fontWeight: "700",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "none", // Stripped out complex shadows for flat minimalism
        padding: 0,
        fontFamily: "system-ui, -apple-system, sans-serif",
      },
    });

    if (parentId) {
      // Find the parent's accent color to keep the connecting pipeline unified
      const parentAccent =
        VIBRANT_PALETTE[(depth - 1) % VIBRANT_PALETTE.length];

      edges.push({
        id: `${parentId}-${id}`,
        source: parentId,
        target: id,
        type: "smoothstep",
        animated: false, // Flat design favors static precision over glowing animations
        style: {
          stroke: parentAccent, // Colored lines keep the data flow highly visible
          strokeWidth: 3, // Slightly thicker line to make the color pop
        },
      });
    }

    if (node.children) {
      for (const child of node.children) {
        dfs(child, id, depth + 1);
      }
    }
  }

  dfs(tree);

  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));

  // LAYOUT ENGINE TUNING: Perfectly uniform grid spacing
  graph.setGraph({
    rankdir: "TB",
    ranksep: 45,
    nodesep: 35,
  });

  nodes.forEach((node) => {
    graph.setNode(node.id, {
      width: NODE_SIZE,
      height: NODE_SIZE,
    });
  });

  edges.forEach((edge) => {
    graph.setEdge(edge.source, edge.target);
  });

  dagre.layout(graph);

  nodes.forEach((node) => {
    const pos = graph.node(node.id);
    node.position = {
      x: pos.x - NODE_SIZE / 2,
      y: pos.y - NODE_SIZE / 2,
    };
  });

  return { nodes, edges };
}
