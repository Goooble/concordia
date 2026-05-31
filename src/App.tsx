import "./App.css";
import "@xyflow/react/dist/style.css";
import test from "./minisearch/ingestion/test.json";
import documents from "./minisearch/ingestion/documents.json";
import { type Document } from "./types";

import { useMemo, useState } from "react";
import { MiniMap, ReactFlow, Background, Controls } from "@xyflow/react";
import Markdown from "react-markdown";
import removeMarkdown from "remove-markdown";
import { Group, Panel, Separator } from "react-resizable-panels";

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
    <div className="h-screen w-screen bg-slate-50 text-slate-800 overflow-hidden font-sans">
      <Group orientation="horizontal">
        {/* Left Sidebar Panel */}
        <Panel
          defaultSize="25%"
          minSize="15%"
          maxSize="45%"
          className="overflow-y-auto border-r border-slate-200 bg-white p-6 shadow-xl flex flex-col"
        >
          <h2 className="mb-6 text-2xl font-bold tracking-tight text-slate-900">
            MiniSearch
          </h2>

          {/* Search Input Container */}
          <div className="relative group shrink-0">
            <input
              value={query}
              placeholder="Search..."
              onChange={(e) => {
                const value = e.target.value;
                setQuery(value);
                const visited = [...trie.searchSteps(value)];
                setHighlightedNodes(visited);
                setFound(trie.search(value));
                setResults(engine.search(value));
              }}
              className="w-full h-12 px-4 rounded-xl text-slate-900 placeholder-slate-400 bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-200 shadow-inner"
            />
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
                const snippet = getSnippet(removeMarkdown(doc.content), query);
                return (
                  <div
                    key={doc.id}
                    className="cursor-pointer rounded-2xl border border-slate-100 bg-white p-5 transition duration-200 hover:border-indigo-400 hover:bg-slate-50/50 hover:shadow-md group"
                  >
                    <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {doc.title}
                    </h3>
                    <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                      <HighlightedText text={snippet} query={query} />
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>

        {/* Resizable Separator Widget */}
        <Separator className="w-2 bg-slate-100 cursor-col-resize flex items-center justify-center transition-colors duration-150 hover:bg-indigo-100 active:bg-indigo-200">
          {/* Visual Grab Handle Accent line */}
          <div className="w-[2px] h-8 bg-slate-300 rounded-full" />
        </Separator>

        {/* Right Flow Graph Panel */}
        <Panel className="relative bg-white">
          <div className="absolute inset-0 w-full h-full">
            <ReactFlow nodes={nodes} edges={edges} fitView>
              {/* Light grid background pattern */}
              <Background color="#cbd5e1" gap={20} size={1} />
              <Controls className="!bg-white !border !border-slate-200 !rounded-lg !shadow-lg" />
            </ReactFlow>
          </div>
        </Panel>
      </Group>
    </div>
  );
}
//move to different file later
function getSnippet(text: string, query: string, contextLength = 200) {
  if (!query) {
    return text.slice(0, 100);
  }

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) {
    return text.slice(0, 100);
  }

  const start = Math.max(0, index - contextLength);

  const end = Math.min(text.length, index + query.length + contextLength);

  return (
    (start > 0 ? "..." : "") +
    text.slice(start, end) +
    (end < text.length ? "..." : "")
  );
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) {
    return <>{text}</>;
  }

  const regex = new RegExp(`(${query})`, "gi");

  const parts = text.split(regex);
  console.log(parts);
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <span
            key={i}
            className="rounded bg-red-100 px-1 font-semibold text-red-600"
          >
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}

export default App;
