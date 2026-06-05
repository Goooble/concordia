export type TrieJSON = {
  id: number;
  label: string;
  isWord: boolean;
  children: TrieJSON[];
};
export type TrieHighlightType = "prefix" | "visited" | "found" | "pruned";

export type TrieStep = {
  nodeId: number;
  type: "visited" | "found" | "prefix" | "pruned";

  distance?: number;
  dpRow?: number[];
};

export interface TreeNodeProps {
  node: TrieJSON;
  highlightedNodes: number[];
}

export type TrieSearchResult = {
  query: string;
  found: boolean;
  visitedNodeIds: number[];
};

export type FlowNode = {
  id: string;
  position: {
    x: number;
    y: number;
  };
  data: {
    label: string;
  };
};

export type FlowEdge = {
  id: string;
  source: string;
  target: string;
};

export type Document = {
  id: string;
  title: string;
  content: string;
};
