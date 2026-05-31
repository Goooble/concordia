import "./App.css";
import "@xyflow/react/dist/style.css";
import test from "./minisearch/ingestion/test.json";
import documents from "./minisearch/ingestion/documents.json";
import { type Document } from "./types";

import { useMemo, useState } from "react";
import { MiniMap, ReactFlow } from "@xyflow/react";

import { main } from "./minisearch/trie/main";
import { trieToFlow } from "./flow";
import { SearchEngine } from "./minisearch/search/engine";

function App() {
  const engine = useMemo(() => {
    const e = new SearchEngine();

    e.addAll(documents);

    return e;
  }, []);

  //trie
  const { trie } = useMemo(() => main(), []);

  const [query, setQuery] = useState("");
  const [highlightedNodes, setHighlightedNodes] = useState<number[]>([]);
  const [found, setFound] = useState<boolean | null>(null);
  const [results, setResults] = useState<Document[]>([]); //invIndex
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
            setResults(engine.search(value));
          }}
        />
        <div>
          {results.map((doc) => (
            <div key={doc.id}>
              <h3>{doc.title}</h3>

              <p>{doc.content.slice(0, 150)}</p>
            </div>
          ))}
        </div>
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
