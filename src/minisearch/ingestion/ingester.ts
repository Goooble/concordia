import fs from "fs";
import path from "path";

type Document = {
  id: string;
  title: string;
  content: string;
};

const docs: Document[] = [];

// Target corpus size for development

let totalWords = 0;

function walk(dir: string) {
  const entries = fs.readdirSync(dir, {
    withFileTypes: true,
  });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    // Recurse into subdirectories
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    // Only process markdown files
    if (!entry.name.endsWith(".md")) {
      continue;
    }

    const content = fs.readFileSync(fullPath, "utf8");

    const wordCount = content.trim().split(/\s+/).length;

    totalWords += wordCount;

    docs.push({
      id: fullPath,
      title: path.basename(entry.name, ".md"),
      content,
    });
  }
}

// Clone:
// git clone https://github.com/obsidianmd/obsidian-help.git
walk("../obsidian-help/en");

fs.writeFileSync(
  "./src/minisearch/ingestion/documents.json",
  JSON.stringify(docs, null, 2),
);

console.log(`Documents indexed: ${docs.length}`);
console.log(`Total words: ${totalWords}`);
console.log("Wrote documents.json");
