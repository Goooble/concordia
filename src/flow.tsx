import * as d3Hierarchy from "d3-hierarchy";
import { flextree } from "d3-flextree";
import { type Edge, type Node } from "@xyflow/react";

const NODE_HEIGHT = 44;
const VIBRANT_PALETTE = ["#6366f1", "#06b6d4", "#f97316", "#10b981"];

function getNodeWidth(label: string) {
  const CHAR_WIDTH = 9;
  const PADDING = 32;
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
    const accentColor = VIBRANT_PALETTE[depth % VIBRANT_PALETTE.length];
    const width = getNodeWidth(node.label);

    nodes.push({
      id,
      position: { x: 0, y: 0 },
      data: { label: node.label },
      style: {
        width: width,
        height: NODE_HEIGHT,
        borderRadius: "12px",
        backgroundColor: "#ffffff",
        border: `3px solid ${accentColor}`,
        color: "#0f172a",
        fontSize: "13px",
        fontWeight: "700",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "none",
        padding: 0,
        fontFamily: "system-ui, -apple-system, sans-serif",
      },
    });

    if (parentId) {
      const parentAccent =
        VIBRANT_PALETTE[(depth - 1) % VIBRANT_PALETTE.length];
      edges.push({
        id: `${parentId}-${id}`,
        source: parentId,
        target: id,
        type: "smoothstep",
        animated: false,
        style: {
          stroke: parentAccent,
          strokeWidth: 3,
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

  if (nodes.length === 0) {
    return { nodes, edges };
  }

  // 1. Build standard D3 hierarchy
  const d3Root = d3Hierarchy
    .stratify<any>()
    .id((d) => d.id)
    .parentId((d) => {
      const edge = edges.find((e) => e.target === d.id);
      return edge ? edge.source : undefined;
    })(nodes);

  // 2. Initialize the flex layout engine
  const flexLayout = flextree();

  // 3. Set the dynamic size of each node bounding box
  // [Total Width allocated for layout tracking, Total Height allocated for tracking]
  flexLayout.nodeSize((d3Node: any) => {
    const originalNode = nodes.find((n) => n.id === d3Node.id);
    const nodeWidth = Number(originalNode?.style?.width) || 60;

    // We add nodesep directly onto the width allocation so nodes never crash sideways
    return [nodeWidth + config.nodesep, NODE_HEIGHT + config.ranksep];
  });

  // 4. Calculate optimal tight layout positions
  flexLayout(d3Root);

  // 5. Update native @xyflow/react nodes coordinates
  nodes.forEach((node) => {
    const d3Node = d3Root.descendants().find((d) => d.id === node.id);
    if (d3Node) {
      const nodeWidth = Number(node.style?.width) || 60;

      node.position = {
        // d3 Node coordinates represent the true horizontal node center point
        x: d3Node.x - nodeWidth / 2,
        y: d3Node.y,
      };
    }
  });

  return { nodes, edges };
}
