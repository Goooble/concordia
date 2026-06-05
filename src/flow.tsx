import dagre from "dagre";
import { type Edge, type Node } from "@xyflow/react";

const NODE_HEIGHT = 44;
// High-saturation minimalist colors (Electric Violet, Cyber Teal, Neon Tangerine, Acid Lime)
const VIBRANT_PALETTE = ["#6366f1", "#06b6d4", "#f97316", "#10b981"];

function getNodeWidth(label: string) {
  const CHAR_WIDTH = 9; // roughly 9px per character
  const PADDING = 32; // extra padding for text breathing room
  return Math.max(60, label.length * CHAR_WIDTH + PADDING);
}

interface GraphConfig {
  ranksep: number;
  nodesep: number;
}

export function buildFlowGraph(
  tree: any,
  config: GraphConfig = { ranksep: 45, nodesep: 35 },
) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  function dfs(node: any, parentId?: string, depth = 0) {
    const id = node.id.toString();

    // Assign a pure, flat vibrant accent color based on tree layer
    const accentColor = VIBRANT_PALETTE[depth % VIBRANT_PALETTE.length];
    const width = getNodeWidth(node.label);

    nodes.push({
      id,
      position: { x: 0, y: 0 },
      data: { label: node.label },
      // Minimalist Frame + Saturated Color Core
      style: {
        width: width, // FIX: Use the calculated dynamic width instead of static NODE_SIZE
        height: NODE_HEIGHT,
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

  // LAYOUT ENGINE TUNING: Controlled dynamically by your new App.tsx sliders
  graph.setGraph({
    rankdir: "TB",
    ranksep: config.ranksep,
    nodesep: config.nodesep,
  });

  // Pass exact calculated node dimensions down to Dagre engine
  nodes.forEach((node) => {
    graph.setNode(node.id, {
      width: Number(node.style?.width) || 60,
      height: NODE_HEIGHT,
    });
  });

  edges.forEach((edge) => {
    graph.setEdge(edge.source, edge.target);
  });

  dagre.layout(graph);

  // Re-map node coordinates based on Dagre calculation updates
  nodes.forEach((node) => {
    const pos = graph.node(node.id);
    const nodeWidth = Number(node.style?.width) || 60;

    node.position = {
      x: pos.x - nodeWidth / 2,
      y: pos.y - NODE_HEIGHT / 2,
    };
  });

  return { nodes, edges };
}
