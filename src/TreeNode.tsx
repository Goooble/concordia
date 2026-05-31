import { type TrieJSON } from "./types";
function TreeNode({
  node,
  highlightedNodes,
}: {
  node: TrieJSON;
  highlightedNodes: number[];
}) {
  const highlighted = highlightedNodes.includes(node.id);

  return (
    <li>
      <span
        style={{
          backgroundColor: highlighted ? "yellow" : "transparent",
        }}
      >
        {node.label}
      </span>

      {node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              highlightedNodes={highlightedNodes}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default TreeNode;
