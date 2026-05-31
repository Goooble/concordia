export type TrieJSON = {
  id: number;
  label: string;
  isWord: boolean;
  children: TrieJSON[];
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
