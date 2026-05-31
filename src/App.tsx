import "./App.css";
import { main } from "./minisearch/main";
import TreeNode from "./TreeNode";
import { useState } from "react";

function App() {
  const [query, setQuery] = useState("");
  const [highlightedNodes, setHighlightedNodes] = useState<number[]>([]);
  const [found, setFound] = useState<boolean | null>(null);
  const { trie } = main();

  return (
    <>
      <input
        value={query}
        onChange={(e) => {
          const value = e.target.value;

          setQuery(value);

          const visited = [...trie.searchSteps(value)];

          setHighlightedNodes(visited);
          setFound(trie.search(value));
        }}
      />
      <TreeNode node={trie.toJSON()} highlightedNodes={highlightedNodes} />
    </>
  );
}

export default App;
