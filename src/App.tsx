import "./App.css";
import "@xyflow/react/dist/style.css";

import { useMemo, useState } from "react";
import { ReactFlow } from "@xyflow/react";

import { main } from "./minisearch/main";
import { trieToFlow } from "./flow";

function App() {
  const { trie } = useMemo(() => main(), []);

  const [query, setQuery] = useState("");
  const [highlightedNodes, setHighlightedNodes] = useState<number[]>([]);
  const [found, setFound] = useState<boolean | null>(null);

  const tree = useMemo(() => trie.toJSON(), [trie]);

  const { nodes, edges } = useMemo(
    () => trieToFlow(tree, highlightedNodes),
    [tree, highlightedNodes],
  );

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "1rem",
          borderBottom: "1px solid #ccc",
        }}
      >
        <input
          value={query}
          placeholder="Search word..."
          onChange={(e) => {
            const value = e.target.value;

            setQuery(value);

            const visited = [...trie.searchSteps(value)];

            setHighlightedNodes(visited);
            setFound(trie.search(value));
          }}
        />

        {query.length > 0 && (
          <span style={{ marginLeft: "1rem" }}>
            {found ? "Found" : "Not Found"}
          </span>
        )}
      </div>

      <div
        style={{
          flex: 1,
        }}
      >
        <ReactFlow nodes={nodes} edges={edges} fitView />
      </div>
    </div>
  );
}

export default App;
