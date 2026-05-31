export class InvertedIndex {
  private index = new Map<string, Set<string>>();

  add(term: string, docId: string) {
    if (!this.index.has(term)) {
      this.index.set(term, new Set());
    }

    this.index.get(term)!.add(docId);
  }

  get(term: string): Set<string> {
    return this.index.get(term) ?? new Set();
  }
}
