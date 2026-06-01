import "./App.css";
import "@xyflow/react/dist/style.css";
import documents from "./minisearch/ingestion/documents.json";
import test from "./minisearch/ingestion/test.json";
import { type Document } from "./types";

import { use, useMemo, useState } from "react";
import { ReactFlow, Background, Controls } from "@xyflow/react";

import { Group, Panel, Separator } from "react-resizable-panels";

// import { main } from "./minisearch/trie/main";
import { buildFlowGraph } from "./flow";
import { SearchEngine } from "./minisearch/search/engine";
import CameraController from "./camera";
import { getSnippets } from "./utils/getSnippets";
import HighlightedText from "./utils/HighlightedText";

function App() {
  const engine = useMemo(() => {
    const e = new SearchEngine();

    e.addAll(test);

    return e;
  }, []);

  //trie

  const [query, setQuery] = useState("");
  const [highlightedNodes, setHighlightedNodes] = useState<number[]>([]);
  const [found, setFound] = useState<boolean | null>(null);
  const [results, setResults] = useState<Document[]>([]); //invIndex
  const [operator, setOperator] = useState<"AND" | "OR">("AND");
  const [visualize, setVisualize] = useState(Boolean(false));
  const [suggestions, setSuggestions] = useState<string[]>([]); //trie suggestions for current query

  const baseGraph = useMemo(() => {
    if (!visualize) {
      return {
        nodes: [],
        edges: [],
      };
    }

    return buildFlowGraph(engine.trie.toJSON());
  }, [engine.trie, visualize]);
  const highlightedSet = useMemo(
    () => new Set(highlightedNodes),
    [highlightedNodes],
  );
  const nodes = useMemo(() => {
    return baseGraph.nodes.map((node) => ({
      ...node,

      style: {
        ...node.style,

        border: highlightedSet.has(Number(node.id))
          ? "3px solid orange"
          : "1px solid gray",
      },
    }));
  }, [highlightedSet, baseGraph.nodes]);

  return (
    <div className="h-screen w-screen bg-slate-50 text-slate-800 overflow-hidden font-sans">
      <Group orientation="horizontal">
        {/* Left Sidebar Panel */}
        <Panel
          defaultSize="25%"
          minSize="15%"
          maxSize="45%"
          className="overflow-y-auto border-r border-slate-200 bg-white p-6 shadow-xl flex flex-col"
        >
          {/* title */}
          <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
            <h2 className="text-2xl font-extrabold tracking-tight bg-linear-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              MiniSearch
            </h2>

            <label className="flex items-center gap-3 cursor-pointer select-none group">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 group-hover:text-slate-700 transition-colors">
                Visualize
              </span>

              {/* Sexy Custom Switch Toggle Container */}
              <div className="relative">
                <input
                  type="checkbox"
                  checked={visualize === true}
                  onChange={() => setVisualize(!visualize)}
                  className="sr-only peer" // Hides the default ugly checkbox completely
                />

                {/* Switch Background track */}
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-0.5 after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 shadow-inner"></div>
              </div>
            </label>
          </div>
          {/* Search Input Container */}
          <div className="relative group shrink-0">
            <input
              value={query}
              placeholder="Search..."
              onChange={(e) => {
                const value = e.target.value;
                setQuery(value);
                setFound(engine.trie.search(value));
                const words = value.toLowerCase().split(/\s+/).filter(Boolean);
                let triesuggest = "";
                words.forEach((word) => {
                  triesuggest += " " + engine.trie.prefixSearch(word).join(" ");
                });
                setSuggestions(triesuggest.split(" "));
                //highlights
                const visited = [...engine.trie.searchSteps(value)];
                setHighlightedNodes(visited);
                console.log(triesuggest);
                setResults(engine.search(triesuggest, operator));
              }}
              className="w-full h-12 px-4 rounded-xl text-slate-900 placeholder-slate-400 bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-200 shadow-inner"
            />
            <div className="flex gap-4 mt-2">
              <label>
                <input
                  type="radio"
                  checked={operator === "AND"}
                  onChange={() => setOperator("AND")}
                />
                AND
              </label>

              <label>
                <input
                  type="radio"
                  checked={operator === "OR"}
                  onChange={() => setOperator("OR")}
                />
                OR
              </label>
            </div>
          </div>

          {/* Status Badge */}
          {query && (
            <div className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 w-fit">
              <div
                className={`w-2 h-2 rounded-full ${found ? "bg-emerald-500" : "bg-rose-500"}`}
              />
              <span
                className={`text-xs font-semibold ${found ? "text-emerald-600" : "text-rose-600"}`}
              >
                Trie Match: {found ? "Found" : "Not Found"}
              </span>
            </div>
          )}

          {/* Results List */}
          <div className="mt-8 flex-1 flex flex-col min-h-0">
            <h3 className="mb-4 text-xs font-bold tracking-widest text-slate-400 uppercase shrink-0">
              Results ({results.length})
            </h3>

            <div className="space-y-4 overflow-y-auto pr-1 flex-1 custom-scrollbar">
              {results.map((doc) => {
                const snippets = getSnippets(doc.content, query);

                return (
                  <div
                    key={doc.id}
                    className="cursor-pointer rounded-2xl border border-slate-100 bg-white p-5 transition duration-200 hover:border-indigo-400 hover:bg-slate-50/50 hover:shadow-md group"
                  >
                    <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {doc.title}
                    </h3>

                    {snippets.map((snippet, idx) => (
                      <p
                        key={idx}
                        className="mt-2 text-sm text-slate-500 leading-relaxed"
                      >
                        <HighlightedText text={snippet} query={query} />
                      </p>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>
        {visualize && (
          <>
            {/* Resizable Separator Widget */}
            <Separator className="w-2 bg-slate-100 cursor-col-resize flex items-center justify-center transition-colors duration-150 hover:bg-indigo-100 active:bg-indigo-200">
              <div className="w-0.5 h-8 bg-slate-300 rounded-full" />
            </Separator>

            {/* Right Flow Graph Panel */}
            <Panel className="relative bg-white">
              <div className="absolute inset-0 w-full h-full">
                <ReactFlow
                  nodes={nodes}
                  edges={baseGraph.edges}
                  onlyRenderVisibleElements
                  fitView
                >
                  <Background color="#cbd5e1" gap={20} size={1} />
                  <Controls className="bg-white! border! border-slate-200! rounded-lg! shadow-lg!" />
                  <CameraController
                    highlightedNodes={highlightedNodes}
                    nodes={nodes}
                  />
                </ReactFlow>
              </div>
            </Panel>
          </>
        )}
      </Group>
    </div>
  );
}
//move to different file later

export default App;
