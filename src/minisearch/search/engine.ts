import { InvertedIndex } from "./invIndex";
import { tokenize } from "../ingestion/tokenizer";
import { Trie } from "../trie/trie";
import { type Document } from "../../types";
import { Radix } from "../trie/radix";
export class SearchEngine {
  private docs = new Map<string, Document>();
  private index = new InvertedIndex();
  radix = new Radix();
  trie = new Trie();

  /**
   * Add a document to the search engine.
   *
   * Example:
   *
   * {
   *   id: "1",
   *   title: "Dual Array Trie",
   *   content: "Compact trie structure..."
   * }
   */
  add(doc: Document): void {
    // Store the full document
    this.docs.set(doc.id, doc);

    // Tokenize title + content
    const tokens = tokenize(`${doc.title} ${doc.content}`);
    const uniqueTokens = new Set(tokens);

    // Add every token to the inverted index
    for (const token of uniqueTokens) {
      this.index.add(token, doc.id);
      this.trie.insert(token);
      this.radix.insert(token);
    }
  }

  /**
   * Add many documents at once.
   */
  addAll(docs: Document[]): void {
    for (const doc of docs) {
      this.add(doc);
    }
    console.log(this.index);
  }

  /**
   * Search for documents containing ALL query terms.
   *
   * Query:
   *   "dual trie"
   *
   * Tokens:
   *   ["dual", "trie"]
   *
   * Posting Lists:
   *   dual -> {1, 2}
   *   trie -> {1, 4}
   *
   * Result:
   *   {1}
   */

  search(query: string, operator: "AND" | "OR" = "AND"): Document[] {
    const tokens = tokenize(query);

    if (tokens.length === 0) {
      return [];
    }

    const postingLists = tokens.map((token) => this.index.get(token));

    const matchingIds =
      operator === "AND"
        ? this.intersect(postingLists)
        : this.union(postingLists);

    return [...matchingIds]
      .map((id) => this.docs.get(id))
      .filter((doc): doc is Document => doc !== undefined);
  }
  /**
   * Set intersection.
   *
   * Finds documents that appear
   * in every posting list.
   */
  private intersect(sets: Set<string>[]): Set<string> {
    if (sets.length === 0) {
      return new Set();
    }

    const result = new Set(sets[0]);

    for (let i = 1; i < sets.length; i++) {
      for (const id of result) {
        if (!sets[i].has(id)) {
          result.delete(id);
        }
      }
    }

    return result;
  }
  private union(sets: Set<string>[]): Set<string> {
    const result = new Set<string>();

    for (const set of sets) {
      for (const id of set) {
        result.add(id);
      }
    }

    return result;
  }
  /**
   * Useful for debugging.
   */
  getDocument(id: string) {
    return this.docs.get(id);
  }

  /**
   * Useful for debugging.
   */
  documentCount(): number {
    return this.docs.size;
  }
}
