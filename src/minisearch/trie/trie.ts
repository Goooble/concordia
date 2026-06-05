import { type TrieJSON } from "../../types";
import { type TrieStep } from "../../types";

export class TrieNode {
  id: number; //useful for react later
  children = new Map<string, TrieNode>();
  isWord = false;

  constructor(id: number) {
    this.id = id;
  }
}
export class Trie {
  root: TrieNode;
  private nextId = 1;
  // trie has root property
  constructor() {
    //initialize trie.root to 0 ID
    this.root = new TrieNode(0);
  }
  private nodeToJSON(node: TrieNode, label: string): TrieJSON {
    return {
      id: node.id,
      label,
      isWord: node.isWord,

      children: [...node.children.entries()].map(([char, child]) =>
        this.nodeToJSON(child, char),
      ),
    };
  }

  toJSON(): TrieJSON {
    return this.nodeToJSON(this.root, "root");
  }
  //traverses through the trie to find teh word
  //supports both search and searchsteps(react)
  private traverse(
    word: string,
    onVisit?: (node: TrieNode) => void, //optional callback for react to log vistited nodes
  ): TrieNode | null {
    let node = this.root;

    onVisit?.(node); //callind the function and passing the current node

    for (const ch of word) {
      const next = node.children.get(ch);

      if (!next) {
        return null;
      }

      node = next;

      onVisit?.(node); //same as above
    }

    return node; //final node
  }

  search(word: string): boolean {
    const node = this.traverse(word);

    return node !== null && node.isWord; //true or false
  }

  *searchSteps(word: string): Generator<number> {
    const visited: number[] = [];

    this.traverse(word, (node) => {
      //callback
      visited.push(node.id);
    });

    for (const id of visited) {
      yield id;
    }
  }
  prefixSearch(prefix: string): string[] {
    const startNode = this.traverse(prefix);

    if (!startNode) {
      return [];
    }

    const results: string[] = [];

    const dfs = (node: TrieNode, currentWord: string) => {
      if (node.isWord) {
        results.push(currentWord);
      }

      for (const [ch, child] of node.children) {
        dfs(child, currentWord + ch);
      }
    };

    dfs(startNode, prefix);

    return results;
  }
  *prefixSearchSteps(prefix: string): Generator<TrieStep> {
    const prefixPath: TrieNode[] = [];

    const startNode = this.traverse(prefix, (node) => prefixPath.push(node));

    if (!startNode) {
      return;
    }

    for (const node of prefixPath) {
      yield {
        nodeId: node.id,
        type: "prefix",
      };
    }

    function* dfs(node: TrieNode): Generator<TrieStep> {
      yield {
        nodeId: node.id,
        type: node.isWord ? "found" : "visited",
      };

      for (const child of node.children.values()) {
        yield* dfs(child);
      }
    }

    // Skip startNode itself because it is already "prefix"
    for (const child of startNode.children.values()) {
      yield* dfs(child);
    }
  }

  insert(word: string): void {
    let node = this.root;

    for (const ch of word) {
      let next = node.children.get(ch);

      // Character does not exist yet
      if (!next) {
        next = new TrieNode(this.nextId++);
        node.children.set(ch, next);
      }

      node = next;
    }

    // Mark the final node as the end of a word
    node.isWord = true;
  }
  fuzzySearch(query: string, maxDistance = 2): string[] {
    const results: string[] = [];

    const qlen = query.length;
    const initialRow = Array.from({ length: qlen + 1 }, (_, i) => i);

    const updateRow = (prevRow: number[], ch: string): number[] => {
      const row: number[] = [prevRow[0] + 1];
      for (let i = 1; i <= qlen; i++) {
        const insertCost = row[i - 1] + 1;
        const deleteCost = prevRow[i] + 1;
        const replaceCost = prevRow[i - 1] + (query[i - 1] === ch ? 0 : 1);
        row[i] = Math.min(insertCost, deleteCost, replaceCost);
      }
      return row;
    };

    const dfs = (node: TrieNode, currentWord: string, prevRow: number[]) => {
      for (const [ch, child] of node.children) {
        const row = updateRow(prevRow, ch);

        const dist = row[qlen];
        if (child.isWord && dist <= maxDistance) {
          results.push(currentWord + ch);
        }

        if (Math.min(...row) <= maxDistance) {
          dfs(child, currentWord + ch, row);
        }
        // else prune
      }
    };

    dfs(this.root, "", initialRow);

    return results;
  }
  *fuzzySearchSteps(query: string, maxDistance = 2): Generator<TrieStep> {
    const qlen = query.length;
    const initialRow = Array.from({ length: qlen + 1 }, (_, i) => i);

    const updateRow = (prevRow: number[], ch: string): number[] => {
      const row: number[] = [prevRow[0] + 1];
      for (let i = 1; i <= qlen; i++) {
        const insertCost = row[i - 1] + 1;
        const deleteCost = prevRow[i] + 1;
        const replaceCost = prevRow[i - 1] + (query[i - 1] === ch ? 0 : 1);
        row[i] = Math.min(insertCost, deleteCost, replaceCost);
      }
      return row;
    };

    function* dfs(
      node: TrieNode,
      currentWord: string,
      prevRow: number[],
    ): Generator<TrieStep> {
      for (const [ch, child] of node.children) {
        const row = updateRow(prevRow, ch);

        // visited when we explore this child node
        yield {
          nodeId: child.id,
          type: "visited",
          dpRow: row.slice(),
          distance: row[qlen],
        };

        // found word
        if (child.isWord && row[qlen] <= maxDistance) {
          yield {
            nodeId: child.id,
            type: "found",
            distance: row[qlen],
            dpRow: row.slice(),
          };
        }

        // prune if minimum exceeds threshold
        if (Math.min(...row) > maxDistance) {
          yield { nodeId: child.id, type: "pruned", dpRow: row.slice() };
          continue;
        }

        yield* dfs(child, currentWord + ch, row);
      }
    }

    yield {
      nodeId: this.root.id,
      type: "visited",
      dpRow: initialRow.slice(),
      distance: initialRow[qlen],
    };

    yield* dfs(this.root, "", initialRow);
  }
}
