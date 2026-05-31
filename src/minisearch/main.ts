import { Trie } from "./trie";

export function main() {
  const trie = new Trie();

  trie.insert("cat");
  trie.insert("car");
  trie.insert("cart");

  console.log(trie.search("cat"));
  console.log(trie.search("cab"));
  console.log(JSON.stringify(trie.toJSON(), null, 2));
  return { trie };
}

main();
