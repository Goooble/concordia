import { type TrieJSON } from "../../types";
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
}
