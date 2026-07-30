import fs from "node:fs";
import path from "node:path";
import { llm } from "../llm";

export interface IndexEntry {
  level1: string;
  level2_code: string;
  level2: string;
  rf_code: string;
  name: string;
  embedding: number[];
}

export interface Retrieved {
  rf_code: string;
  level1: string;
  level2: string;
  name: string;
  score: number;
}

let cache: IndexEntry[] | null = null;
function loadIndex(): IndexEntry[] {
  if (!cache) {
    const p = path.join(process.cwd(), "data", "index.json");
    cache = JSON.parse(fs.readFileSync(p, "utf-8"));
  }
  return cache!;
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** ค้นความเสี่ยงย่อย (RF) ที่ใกล้ input มากที่สุด top-K พร้อมคะแนน similarity */
export async function retrieve(query: string, topK = 8): Promise<Retrieved[]> {
  const [qv] = await llm.embed([query]);
  return loadIndex()
    .map((e) => ({
      rf_code: e.rf_code,
      level1: e.level1,
      level2: e.level2,
      name: e.name,
      score: cosine(qv, e.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
