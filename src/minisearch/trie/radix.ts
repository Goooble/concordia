import { type TrieJSON } from "../../types";
import { type TrieStep } from "../../types";

class RadixNode {
  id: number;
  edge: string; // label on the edge from parent to this node
  children: RadixNode[] = [];
  isWord = false;

  constructor(id: number, edge = "") {
    this.id = id;
    this.edge = edge;
  }
}

export class Radix {
  root: RadixNode;
  private nextId = 1;

  constructor() {
    this.root = new RadixNode(0, "");
  }

  private nodeToJSON(node: RadixNode, label: string): TrieJSON {
    return {
      id: node.id,
      label,
      isWord: node.isWord,
      children: node.children.map((child) =>
        this.nodeToJSON(child, child.edge),
      ),
    };
  }

  toJSON(): TrieJSON {
    return this.nodeToJSON(this.root, "root");
  }

  // longest common prefix
  private lcp(a: string, b: string): string {
    const len = Math.min(a.length, b.length);
    let i = 0;
    while (i < len && a[i] === b[i]) i++;
    return a.slice(0, i);
  }

  // Traverse for search-like operations. Calls onVisit for every node considered.
  private traverse(
    word: string,
    onVisit?: (node: RadixNode) => void,
  ): {
    node: RadixNode;
    parentPrefix: string;
    inside?: boolean;
    child?: RadixNode;
    commonLen?: number;
  } | null {
    let node = this.root;
    let remainder = word;
    let parentPrefix = "";

    onVisit?.(node);

    while (remainder.length > 0) {
      // find child whose edge starts with the same first character
      const child = node.children.find((c) => c.edge[0] === remainder[0]);
      if (!child) return null;

      const common = this.lcp(remainder, child.edge);
      const commonLen = common.length;

      // if no common prefix -> not found
      if (commonLen === 0) return null;

      // visit child (we inspected it)
      onVisit?.(child);

      if (commonLen === child.edge.length) {
        // child edge completely matched
        parentPrefix += child.edge;
        remainder = remainder.slice(commonLen);
        node = child;
        continue;
      }

      // child edge longer than remainder: we ended inside the child's edge
      if (commonLen === remainder.length) {
        // we matched the remainder but are inside child's edge
        return { node: child, parentPrefix, inside: true, child, commonLen };
      }

      // partial match that doesn't consume either fully -> no match
      return null;
    }

    // remainder consumed exactly at node boundary
    return { node, parentPrefix };
  }

  search(word: string): boolean {
    const res = this.traverse(word);
    if (!res) return false;

    // if inside an edge -> cannot be a word
    if (res.inside) return false;

    return res.node.isWord;
  }

  *searchSteps(word: string): Generator<number> {
    const visited: number[] = [];

    this.traverse(word, (node) => visited.push(node.id));

    for (const id of visited) yield id;
  }

  prefixSearch(prefix: string): string[] {
    // find starting point
    const start = this.traverse(prefix);
    if (!start) return [];

    const results: string[] = [];

    const dfs = (node: RadixNode, currentWord: string) => {
      if (node.isWord) results.push(currentWord);
      for (const child of node.children) {
        dfs(child, currentWord + child.edge);
      }
    };

    if (start.inside && start.child && typeof start.commonLen === "number") {
      // prefix ended inside an edge: we must include the remainder of that edge
      const remainderOfEdge = start.child.edge.slice(start.commonLen);
      const base = start.parentPrefix + prefix.slice(start.parentPrefix.length); // effectively prefix
      // Start DFS from the child but seed currentWord with base + remainderOfEdge
      dfs(start.child, base + remainderOfEdge);
    } else {
      // prefix matched node boundary; start from that node with base equal to prefix
      dfs(start.node, prefix);
    }

    return results;
  }

  *prefixSearchSteps(prefix: string): Generator<TrieStep> {
    const prefixPath: RadixNode[] = [];

    const start = this.traverse(prefix, (node) => prefixPath.push(node));
    if (!start) return;

    for (const node of prefixPath) {
      yield { nodeId: node.id, type: "prefix" };
    }

    function* dfs(node: RadixNode): Generator<TrieStep> {
      yield { nodeId: node.id, type: node.isWord ? "found" : "visited" };
      for (const child of node.children) yield* dfs(child);
    }

    if (start.inside && start.child && typeof start.commonLen === "number") {
      // start from the child (we already yielded it as part of prefixPath)
      yield* dfs(start.child);
      return;
    }

    for (const child of start.node.children) yield* dfs(child);
  }

  insert(word: string): void {
    let node = this.root;
    let remainder = word;

    while (remainder.length > 0) {
      const child = node.children.find((c) => c.edge[0] === remainder[0]);

      if (!child) {
        const newNode = new RadixNode(this.nextId++, remainder);
        newNode.isWord = true;
        node.children.push(newNode);
        return;
      }

      const common = this.lcp(remainder, child.edge);
      const commonLen = common.length;

      if (commonLen === child.edge.length) {
        // fully matched child edge; descend
        remainder = remainder.slice(commonLen);
        node = child;
        continue;
      }

      if (commonLen === 0) {
        // shouldn't happen because we matched first char, but handle defensively
        const newNode = new RadixNode(this.nextId++, remainder);
        newNode.isWord = true;
        node.children.push(newNode);
        return;
      }

      // need to split child at common prefix
      const splitNode = new RadixNode(this.nextId++, common);

      // adjust existing child edge
      child.edge = child.edge.slice(commonLen);

      // move child under splitNode
      splitNode.children.push(child);

      // replace child in node.children with splitNode
      const idx = node.children.indexOf(child);
      if (idx >= 0) node.children[idx] = splitNode;

      // if remainder exactly equals common -> splitNode is a word
      const remainderAfter = remainder.slice(commonLen);
      if (remainderAfter.length === 0) {
        splitNode.isWord = true;
        return;
      }

      // otherwise add new child for the remainder
      const newNode = new RadixNode(this.nextId++, remainderAfter);
      newNode.isWord = true;
      splitNode.children.push(newNode);
      return;
    }

    // remainder empty -> mark node as word
    node.isWord = true;
  }
  private updateRow(prevRow: number[], ch: string, query: string): number[] {
    const row = [prevRow[0] + 1];

    for (let i = 1; i <= query.length; i++) {
      const insertCost = row[i - 1] + 1;
      const deleteCost = prevRow[i] + 1;
      const replaceCost = prevRow[i - 1] + (query[i - 1] === ch ? 0 : 1);

      row[i] = Math.min(insertCost, deleteCost, replaceCost);
    }

    return row;
  }
  fuzzySearch(query: string, maxDistance = 2): string[] {
    const results: string[] = [];

    const initialRow = Array.from({ length: query.length + 1 }, (_, i) => i);

    const dfs = (node: RadixNode, currentWord: string, row: number[]) => {
      let currentRow = row;

      // Process entire edge
      for (const ch of node.edge) {
        currentRow = this.updateRow(currentRow, ch, query);
      }

      // Word found
      if (node.isWord && currentRow[query.length] <= maxDistance) {
        results.push(currentWord);
      }

      // Prune branch
      if (Math.min(...currentRow) > maxDistance) {
        return;
      }

      for (const child of node.children) {
        dfs(child, currentWord + child.edge, currentRow);
      }
    };

    for (const child of this.root.children) {
      dfs(child, child.edge, initialRow);
    }

    return results;
    console.log("Fuzzy search results for", query, ":", results);
  }
}
