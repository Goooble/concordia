import fs from "fs";
import path from "path";

type Document = {
  id: string;
  title: string;
  content: string;
};

const words = fs
  .readFileSync(path.resolve(import.meta.dirname, "./words.txt"), "utf8")
  .split(/\r?\n/)
  .map((w) => w.trim())
  .filter(Boolean);

const docs: Document[] = words.map((word) => ({
  id: `/dictionary/${word}.txt`,
  title: word,
  content: word,
}));

fs.writeFileSync(
  path.resolve(import.meta.dirname, "./dictionary.json"),
  JSON.stringify(docs, null, 2),
);

console.log(`Generated ${docs.length} documents`);
