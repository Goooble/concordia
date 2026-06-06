import { readFile } from "fs/promises";
import { resolve } from "path";

export type SearchDocument = {
  title: string;
  content: string;
  path: string;
};

const DOCUMENTS_PATH = resolve(
  process.cwd(),
  //   "src/minisearch/ingestion/documents.json",
  "src/minisearch/ingestion/dictionary.json",
);
// const DATASET_SIZES = [1000, 5000, 10000, 50000, 100000] as const;
const DATASET_SIZES = [1000, 5000, 10000, 50000, 100000] as const;

function createSeededRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}

export const supportedDatasetSizes = DATASET_SIZES;

export async function loadDocuments(): Promise<SearchDocument[]> {
  const raw = await readFile(DOCUMENTS_PATH, "utf8");
  return JSON.parse(raw) as SearchDocument[];
}

export async function getDatasetWords(size: number): Promise<string[]> {
  if (!DATASET_SIZES.includes(size as (typeof DATASET_SIZES)[number])) {
    throw new Error(
      `Unsupported dataset size ${size}. Supported sizes: ${DATASET_SIZES.join(", ")}`,
    );
  }

  const docs = await loadDocuments();
  const wordSet = new Set<string>();

  for (const doc of docs) {
    const text = `${doc.title} ${doc.content}`;
    for (const rawWord of tokenizeWords(text)) {
      if (wordSet.size >= size) break;
      wordSet.add(rawWord.toLowerCase());
    }
    if (wordSet.size >= size) break;
  }

  if (wordSet.size < size) {
    throw new Error(
      `Only ${wordSet.size} unique words were found in the corpus while requesting ${size}.`,
    );
  }

  return Array.from(wordSet).slice(0, size);
}

function tokenizeWords(text: string) {
  return text
    .split(/[^\p{L}0-9]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

export function generateExactQueries(words: string[], count: number) {
  const queries: string[] = [];
  const step = Math.max(1, Math.floor(words.length / count));
  for (let i = 0; i < count; i += 1) {
    queries.push(words[(i * step) % words.length]);
  }
  return queries;
}

export function generatePrefixQueries(words: string[], count: number) {
  const queries: string[] = [];
  const candidates = words.filter((word) => word.length > 2);
  const maxIndex = candidates.length - 1;
  const rng = createSeededRng(2468);

  for (let i = 0; i < count; i += 1) {
    const word = candidates[Math.floor(rng() * maxIndex)];
    const prefixLength = Math.min(word.length - 1, 2 + Math.floor(rng() * 4));
    queries.push(word.slice(0, prefixLength));
  }

  return queries;
}

export function generateTypoQueries(words: string[], count: number) {
  const queries: string[] = [];
  const candidates = words.filter((word) => word.length >= 4);
  const rng = createSeededRng(97531);

  for (let i = 0; i < count; i += 1) {
    const word = candidates[Math.floor(rng() * candidates.length)];
    queries.push(makeTypo(word, rng));
  }

  return queries;
}

export const MISSING_WORDS = [
  "zzzzzzzz",
  "notaword",
  "qwertyasdf",
  "asdfghjkl",
  "missingword",
];

export function getShortestWord(words: string[]) {
  return words.reduce((shortest, word) => {
    return word.length < shortest.length ? word : shortest;
  }, words[0]);
}

export function getLongestWord(words: string[]) {
  return words.reduce((longest, word) => {
    return word.length > longest.length ? word : longest;
  }, words[0]);
}

export function getRandomWord(words: string[]) {
  const index = Math.floor(Math.random() * words.length);
  return words[index];
}

function makeTypo(word: string, rng: () => number) {
  const choice = rng();
  const length = word.length;
  const index = Math.max(0, Math.min(length - 2, Math.floor(rng() * length)));

  if (choice < 0.33 && length > 1) {
    return word.slice(0, index) + word.slice(index + 1);
  }

  if (choice < 0.67 && length > 1) {
    const next = index + 1;
    return (
      word.slice(0, index) + word[next] + word[index] + word.slice(next + 1)
    );
  }

  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  const char = alphabet[Math.floor(rng() * alphabet.length)];
  return word.slice(0, index) + char + word.slice(index + 1);
}
