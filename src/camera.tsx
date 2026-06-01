import { useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import type { Node } from "@xyflow/react";
function CameraController({
  highlightedNodes,
  nodes,
}: {
  highlightedNodes: number[];
  nodes: Node[];
}) {
  const reactFlow = useReactFlow();

  useEffect(() => {
    const current = highlightedNodes[highlightedNodes.length - 1];

    if (!current) return;

    const node = nodes.find((n) => n.id === current.toString());

    if (!node) return;

    reactFlow.setCenter(node.position.x, node.position.y, {
      zoom: 1.5,
      duration: 500,
    });
  }, [highlightedNodes, nodes, reactFlow]);

  return null;
}

export default CameraController;
