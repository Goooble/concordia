import documents10k from "./minisearch/ingestion/documents10k.json";
import documents from "./minisearch/ingestion/documents.json";
import documents2k from "./minisearch/ingestion/documents2k.json";
import documents5k from "./minisearch/ingestion/documents5k.json";
import test from "./minisearch/ingestion/test.json";

import { type Document } from "./types";
import { type TrieStep } from "./types";
import { type TrieHighlightType } from "./types";

import { useMemo, useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import { ReactFlow, Background, Controls } from "@xyflow/react";

import { Group, Panel, Separator } from "react-resizable-panels";

// import { main } from "./minisearch/trie/main";
import { buildFlowGraph } from "./flow";
import { SearchEngine } from "./minisearch/search/engine";
import CameraController from "./camera";
import { getSnippets } from "./utils/getSnippets";
import HighlightedText from "./utils/HighlightedText";

function Searchpage() {
  const engine = useMemo(() => {
    const e = new SearchEngine();

    e.addAll(test);

    return e;
  }, []);

  //trie

  const [query, setQuery] = useState("");
  const [highlights, setHighlights] = useState<Map<number, TrieHighlightType>>(
    new Map(),
  );
  const [results, setResults] = useState<Document[]>([]); //invIndex
  const [operator, setOperator] = useState<"AND" | "OR">("OR");
  const [visualize, setVisualize] = useState(Boolean(true));
  const [camera, setCamera] = useState(Boolean(true));
  const [animate, setAnimate] = useState(Boolean(false));
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [fuzzyMode, setFuzzyMode] = useState<boolean>(false);
  const [maxDistance, setMaxDistance] = useState<number>(1);

  // NEW: Layout Spacing States
  const [ranksep, setRanksep] = useState(45); // Vertical gaps
  const [nodesep, setNodesep] = useState(15); // Horizontal gaps

  const [currentNode, setCurrentNode] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState<TrieStep | null>(null);
  const [isRadix, setIsRadix] = useState(true);
  //use suggestions to show possible completions of the current query based on the trie contents
  let tree;
  if (isRadix) {
    tree = engine.radix;
  } else {
    tree = engine.trie;
  }
  const baseGraph = useMemo(() => {
    if (!visualize) {
      return {
        nodes: [],
        edges: [],
      };
    }

    return buildFlowGraph(tree.toJSON(), { ranksep, nodesep });
  }, [visualize, tree, ranksep, nodesep]); // Rebuild graph if visualization toggled or tree changes or layout parameters change

  const nodes = useMemo(() => {
    return baseGraph.nodes.map((node) => {
      const state = highlights.get(Number(node.id));
      const nodeData: any = node.data ?? {};
      const isWordNode = Boolean(nodeData.isWord);

      // Default fallback state (Clean and quiet)
      let backgroundColor = "#ffffff";
      let color = "#0f172a";
      let fontWeight = "700";
      if (Number(node.id) == currentNode) {
        return {
          ...node,
          style: {
            ...node.style,
            backgroundColor: "#000000",
            color: "#ffffff",
            fontWeight,

            transition: "all 200ms ease",
            // Remove the border entirely or make it match the background
            border: `2px solid ${backgroundColor === "#ffffff" ? "#e2e8f0" : backgroundColor}`,
          },
        };
      }
      if (state === "prefix") {
        backgroundColor = "#6366f1"; // Vibrant Indigo (existing prefix color)
        color = "#ffffff";
      }

      if (state === "visited") {
        backgroundColor = "#3b82f6"; // Blue
        color = "#ffffff";
      }

      if (state === "found") {
        backgroundColor = "#10b981"; // Green
        color = "#ffffff";
      }

      if (state === "pruned") {
        backgroundColor = "#ef4444"; // Red
        color = "#ffffff";
      }

      // If the node represents the end of a word and is not currently highlighted,
      // tint the label with a distinct accent and slightly increase weight.
      if (!state && isWordNode) {
        color = "#7c3aed"; // Word accent (purple)
        fontWeight = "800";
      }

      return {
        ...node,
        style: {
          ...node.style,
          backgroundColor,
          color,
          fontWeight,
          // Remove the border entirely or make it match the background
          border: `2px solid ${backgroundColor === "#ffffff" ? "#e2e8f0" : backgroundColor}`,
        },
      };
    });
  }, [highlights, baseGraph.nodes]); // Included highlights in the dependency array

  const animationId = useRef(0);
  async function animateSteps(steps: TrieStep[]) {
    const id = ++animationId.current; //cancelling aniamtion
    const map = new Map<number, TrieHighlightType>();

    for (const step of steps) {
      if (id !== animationId.current) {
        return;
      }
      setCurrentNode(step.nodeId);
      setCurrentStep(step);

      map.set(step.nodeId, step.type as TrieHighlightType);
      setHighlights(new Map(map));

      await sleep(50);
    }

    setCurrentNode(null);
    setCurrentStep(null);
  }

  // Apply steps[0..currentStepIndex-1] to compute highlights and current step/node
  function applyStepsToHighlights(index: number) {
    const map = new Map<number, TrieHighlightType>();
    for (let i = 0; i < index && i < steps.length; i++) {
      const step = steps[i];
      map.set(step.nodeId, step.type as TrieHighlightType);
    }
    setHighlights(map);

    if (index > 0 && steps.length >= 1) {
      const cur = steps[Math.min(index - 1, steps.length - 1)];
      setCurrentNode(cur.nodeId);
      setCurrentStep(cur);
    } else {
      setCurrentNode(null);
      setCurrentStep(null);
    }
  }

  // When index or steps change, recompute highlights
  useEffect(() => {
    applyStepsToHighlights(currentStepIndex);
  }, [currentStepIndex, steps]);

  // Playback loop: advance while playing, respecting playbackSpeed
  useEffect(() => {
    if (!isPlaying) return;
    if (currentStepIndex >= steps.length) {
      setIsPlaying(false);
      return;
    }

    const BASE_DELAY = 200; // ms at 1x
    const delay = Math.max(10, Math.floor(BASE_DELAY / playbackSpeed));

    const timer = setTimeout(() => {
      setCurrentStepIndex((i) => Math.min(i + 1, steps.length));
    }, delay);

    return () => clearTimeout(timer);
  }, [isPlaying, currentStepIndex, playbackSpeed, steps.length]);
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
          <div className="flex flex-col gap-4 mb-6 pb-4 border-b border-slate-100">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-extrabold tracking-tight bg-linear-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                MiniSearch
              </h2>
            </div>

            {/* Toggles Grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <label className="flex items-center justify-between cursor-pointer select-none group">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 group-hover:text-slate-700 transition-colors">
                  Visualize
                </span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={visualize === true}
                    onChange={() => setVisualize(!visualize)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-0.5 after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 shadow-inner"></div>
                </div>
              </label>

              <label className="flex items-center justify-between cursor-pointer select-none group">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 group-hover:text-slate-700 transition-colors">
                  Camera
                </span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={camera === true}
                    onChange={() => setCamera(!camera)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-0.5 after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 shadow-inner"></div>
                </div>
              </label>

              <label className="flex items-center justify-between cursor-pointer select-none group">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 group-hover:text-slate-700 transition-colors">
                  Animation
                </span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={animate === true}
                    onChange={() => setAnimate(!animate)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-0.5 after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 shadow-inner"></div>
                </div>
              </label>

              <label className="flex items-center justify-between cursor-pointer select-none group">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 group-hover:text-slate-700 transition-colors">
                  Radix
                </span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={isRadix === true}
                    onChange={() => setIsRadix(!isRadix)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-0.5 after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 shadow-inner"></div>
                </div>
              </label>

              <label className="flex items-center justify-between cursor-pointer select-none group">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 group-hover:text-slate-700 transition-colors">
                  Fuzzy
                </span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={fuzzyMode === true}
                    onChange={() => setFuzzyMode(!fuzzyMode)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-0.5 after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 shadow-inner"></div>
                </div>
              </label>
            </div>

            {/* Playback Controls */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  title="Reset"
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentStepIndex(0);
                  }}
                  className="px-2 py-1 bg-slate-100 rounded hover:bg-slate-200"
                >
                  ⏮
                </button>

                <button
                  title="Step Back"
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentStepIndex((i) => Math.max(0, i - 1));
                  }}
                  className="px-2 py-1 bg-slate-100 rounded hover:bg-slate-200"
                >
                  ◀
                </button>

                <button
                  title={isPlaying ? "Pause" : "Play"}
                  onClick={() => {
                    if (isPlaying) setIsPlaying(false);
                    else {
                      // if at end, jump to start
                      if (currentStepIndex >= steps.length) setCurrentStepIndex(0);
                      setIsPlaying(true);
                    }
                  }}
                  className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  {isPlaying ? "⏸" : "▶"}
                </button>

                <button
                  title="Step Forward"
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentStepIndex((i) => Math.min(steps.length, i + 1));
                  }}
                  className="px-2 py-1 bg-slate-100 rounded hover:bg-slate-200"
                >
                  ▶
                </button>

                <button
                  title="Jump to End"
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentStepIndex(steps.length);
                  }}
                  className="px-2 py-1 bg-slate-100 rounded hover:bg-slate-200"
                >
                  ⏭
                </button>

                <div className="ml-3 flex items-center gap-2 text-sm text-slate-500">
                  <span>Speed:</span>
                  <select
                    value={playbackSpeed}
                    onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                    className="text-sm rounded border border-slate-200 bg-white px-2 py-0.5"
                  >
                    <option value={0.25}>0.25x</option>
                    <option value={0.5}>0.5x</option>
                    <option value={1}>1x</option>
                    <option value={2}>2x</option>
                    <option value={4}>4x</option>
                  </select>
                </div>
              </div>

              {/* Timeline Slider */}
              <div className="mt-3">
                <input
                  type="range"
                  min={0}
                  max={steps.length}
                  value={currentStepIndex}
                  onChange={(e) => {
                    setIsPlaying(false);
                    setCurrentStepIndex(Number(e.target.value));
                  }}
                  className="w-full"
                />
                <div className="text-xs text-slate-400 mt-1">Step {currentStepIndex} / {steps.length}</div>
              </div>
            </div>

            {/* Sliders for Graph Layout Gaps */}
            {visualize && (
              <div className="mt-2 space-y-4 pt-4 border-t border-slate-100">
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <span>Vertical Gap</span>
                    <span className="text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded font-mono">
                      {ranksep}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="180"
                    value={ranksep}
                    onChange={(e) => setRanksep(Number(e.target.value))}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-100 accent-indigo-600 hover:bg-slate-200 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <span>Horizontal Gap</span>
                    <span className="text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded font-mono">
                      {nodesep}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="150"
                    value={nodesep}
                    onChange={(e) => setNodesep(Number(e.target.value))}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-100 accent-indigo-600 hover:bg-slate-200 transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <span>Fuzzy Max Dist</span>
                    <span className="text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded font-mono">
                      {maxDistance}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="3"
                    value={maxDistance}
                    onChange={(e) => setMaxDistance(Number(e.target.value))}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-100 accent-indigo-600 hover:bg-slate-200 transition-colors"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Search Input Container */}
          <div className="relative group shrink-0">
            <input
              value={query}
              placeholder="Search..."
              onChange={async (e) => {
                const value = e.target.value;
                setQuery(value);

                const words = value.toLowerCase().split(/\s+/).filter(Boolean);
                const previewMap = new Map<number, TrieHighlightType>();
                const allSteps: TrieStep[] = [];
                let triesuggest = "";

                for (const word of words) {
                  // suggestions (did-you-mean) use fuzzySearch quick API when available
                  setSuggestions(
                    (tree as any).fuzzySearch
                      ? (tree as any).fuzzySearch(word, maxDistance).filter((w: string) => w.length > 1)
                      : [],
                  );

                  triesuggest += " " + tree.prefixSearch(word).join(" ");

                  // build steps from appropriate generator
                  if (fuzzyMode && (tree as any).fuzzySearchSteps) {
                    for (const step of (tree as any).fuzzySearchSteps(word, maxDistance) as Generator<TrieStep>) {
                      allSteps.push(step);
                      if (!animate) previewMap.set(step.nodeId, step.type as TrieHighlightType);
                    }
                  } else {
                    for (const step of tree.prefixSearchSteps(word)) {
                      allSteps.push(step);
                      if (!animate) previewMap.set(step.nodeId, step.type as TrieHighlightType);
                    }
                  }
                }

                setHighlights(previewMap);
                setSteps(allSteps);
                setCurrentStepIndex(0);
                if (animate && allSteps.length > 0) setIsPlaying(true);

                setResults(engine.search(triesuggest, operator));
              }}
              className="w-full h-12 px-4 rounded-xl text-slate-900 placeholder-slate-400 bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-200 shadow-inner"
            />
            <div className="flex gap-4 mt-2 text-sm font-semibold text-slate-600">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  checked={operator === "AND"}
                  onChange={() => setOperator("AND")}
                  className="accent-indigo-600"
                />
                AND
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  checked={operator === "OR"}
                  onChange={() => setOperator("OR")}
                  className="accent-indigo-600"
                />
                OR
              </label>
            </div>
          </div>

          {/* UPDATED: "Did you mean?" Inline Tag Configuration */}
          {query.trim() !== "" && suggestions.length > 0 && (
            <div className="mt-5 flex flex-col shrink-0">
              <h3 className="mb-2 text-[11px] font-bold tracking-widest text-slate-400 uppercase">
                Did you mean ({suggestions.length})
              </h3>

              {/* Row/Wrap containment layout handles long structures like tag lists elegantly */}
              <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                {suggestions.map((word, idx) => (
                  <button
                    key={`${idx}`}
                    onClick={() => setQuery(word)}
                    className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors border border-transparent hover:border-indigo-200/60 cursor-pointer max-w-[180px] truncate"
                  >
                    {word}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results List */}
          <div className="mt-6 flex-1 flex flex-col min-h-0">
            <h3 className="mb-3 text-[11px] font-bold tracking-widest text-slate-400 uppercase shrink-0">
              Results ({results.length})
            </h3>

            <div className="space-y-3 overflow-y-auto pr-1 flex-1 custom-scrollbar pb-4">
              {results.map((doc) => {
                const snippets = getSnippets(doc.content, query);

                return (
                  <Link
                    key={doc.id}
                    to={`/docs/${encodeURIComponent(doc.id)}`}
                    className="block rounded-xl border border-slate-100 bg-white p-4 transition duration-200 hover:border-indigo-400 hover:bg-slate-50/50 hover:shadow-xs group"
                  >
                    <h3 className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {doc.title}
                    </h3>

                    {snippets.map((snippet, idx) => (
                      <p
                        key={idx}
                        className="mt-1.5 text-xs text-slate-500 leading-relaxed max-h-24 overflow-hidden text-ellipsis"
                      >
                        <HighlightedText text={snippet} query={query} />
                      </p>
                    ))}
                  </Link>
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
                  {camera && (
                    <CameraController
                      highlightedNodes={[...highlights.keys()]}
                      nodes={nodes}
                    />
                  )}
                  {/* Current step info panel */}
                  {currentStep && (
                    <div className="absolute left-4 bottom-4 bg-white border border-slate-200 rounded-lg p-3 shadow-lg text-xs text-slate-700">
                      <div className="font-semibold mb-1">Current Step</div>
                      <div className="flex gap-2">
                        <div className="text-slate-500">node:</div>
                        <div>{currentStep.nodeId}</div>
                      </div>
                      <div className="flex gap-2">
                        <div className="text-slate-500">type:</div>
                        <div>{currentStep.type}</div>
                      </div>
                      <div className="flex gap-2">
                        <div className="text-slate-500">distance:</div>
                        <div>{currentStep.distance ?? "-"}</div>
                      </div>
                      <div className="mt-2 text-[11px] text-slate-500">
                        DP Row:{" "}
                        {currentStep.dpRow ? currentStep.dpRow.join(", ") : "-"}
                      </div>
                    </div>
                  )}
                </ReactFlow>
              </div>
            </Panel>
          </>
        )}
      </Group>
    </div>
  );
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export default Searchpage;
