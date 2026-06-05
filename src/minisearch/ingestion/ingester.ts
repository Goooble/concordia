import fs from "fs";
import path from "path";

type Document = {
  id: string;
  title: string;
  content: string;
};

// 1. Anchor the path to this script's folder, then climb up to the 'data' folder
const DATA_PATH = path.resolve(import.meta.dirname, "../../../data");

// 2. Do the same for the output file so it writes to the right place too!
const OUTPUT_PATH = path.resolve(import.meta.dirname, "./documents.json");

const docs: Document[] = [];

// Target corpus size for development
const MAX_WORDS = 1000000000000;

let totalWords = 0;

function walk(dir: string): boolean {
  const entries = fs.readdirSync(dir, {
    withFileTypes: true,
  });

  for (const entry of entries) {
    if (totalWords >= MAX_WORDS) {
      return true;
    }

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (walk(fullPath)) {
        return true;
      }
      continue;
    }

    if (!entry.name.endsWith(".md")) {
      continue;
    }

    const content = fs.readFileSync(fullPath, "utf8");

    const words = content.trim().split(/\s+/);

    const remaining = MAX_WORDS - totalWords;

    // Take only the portion that fits
    const selectedWords = words.slice(0, remaining);

    docs.push({
      id: fullPath,
      title: path.basename(entry.name, ".md"),
      content: selectedWords.join(" "),
    });

    totalWords += selectedWords.length;

    if (totalWords >= MAX_WORDS) {
      return true;
    }
  }

  return false;
}

// Clone:
// git clone https://github.com/obsidianmd/obsidian-help.git
walk(DATA_PATH);

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(docs, null, 2));

console.log(`Documents indexed: ${docs.length}`);
console.log(`Total words: ${totalWords}`);
console.log("Wrote documents.json");
