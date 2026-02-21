import { createReadStream, existsSync } from "fs";
import { createInterface } from "readline";
import { join } from "path";
import { getContentDb } from "./store/client";
import { insertQuotes } from "./store/content";
import type { QuoteDoc } from "./store/types";

const QUOTES = "quotes";

function resolveJsonlPath(): string | null {
  const cwd = process.cwd();
  const candidates = [
    join(cwd, "english_quotes", "quotes.jsonl"),
    join(cwd, "..", "english_quotes", "quotes.jsonl"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

async function loadDocsFromJsonl(path: string): Promise<QuoteDoc[]> {
  const rl = createInterface({
    input: createReadStream(path),
    crlfDelay: Infinity,
  });
  const docs: QuoteDoc[] = [];
  const now = new Date();
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const row = JSON.parse(trimmed) as { quote?: string; author?: string };
      const text = typeof row.quote === "string" ? row.quote : "";
      if (!text) continue;
      docs.push({
        id: crypto.randomUUID(),
        author:
          typeof row.author === "string" && row.author.length > 0
            ? row.author.trim()
            : null,
        text,
        createdBy: null,
        createdAt: now,
        updatedAt: now,
      });
    } catch {
      // skip invalid lines
    }
  }
  return docs;
}

export async function runSeedIfEmpty(): Promise<void> {
  const db = await getContentDb();
  const count = await db.collection(QUOTES).countDocuments();
  if (count > 0) {
    console.log("Seed: quotes collection already has data, skipping.");
    return;
  }
  const path = resolveJsonlPath();
  if (!path) {
    const cwd = process.cwd();
    console.log(
      `Seed: no quotes.jsonl found (cwd: ${cwd}). Tried english_quotes/quotes.jsonl and ../english_quotes/quotes.jsonl. Skipping.`
    );
    return;
  }
  const docs = await loadDocsFromJsonl(path);
  if (docs.length === 0) {
    console.log("Seed: file found but 0 valid quotes. Run 'git lfs pull' if quotes.jsonl is in Git LFS.");
    return;
  }
  await insertQuotes(docs);
  console.log(`Seeded ${docs.length} quotes.`);
}
