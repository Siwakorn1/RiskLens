import fs from "node:fs";
import path from "node:path";
import { llm } from "../src/lib/llm";

interface CatalogEntry {
  level1: string;
  level2_code: string;
  level2: string;
  rf_code: string;
  name: string;
}
interface IndexEntry extends CatalogEntry {
  embedding: number[];
}

const DATA = path.join(process.cwd(), "data");

// ข้อความที่เอาไป embed: ใส่หมวดใหญ่/หมวดหลัก/ชื่อความเสี่ยง ให้เวกเตอร์จับบริบทได้ครบ
function embedText(e: CatalogEntry): string {
  return `${e.level1} / ${e.level2} / ${e.name}`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// --- ตัวคุมอัตรา: Gemini ฟรี embed ได้ ~100 req/นาที (แต่ละรายการ = 1 req) ---
const RPM = 90; // เผื่อไว้ใต้ 100
let windowStart = Date.now();
let used = 0;

async function throttle(n: number) {
  if (used + n > RPM) {
    const wait = Math.max(0, 60000 - (Date.now() - windowStart)) + 2000;
    console.log(`  ⏳ ใกล้ชนโควตา รอ ${Math.round(wait / 1000)}s...`);
    await sleep(wait);
    windowStart = Date.now();
    used = 0;
  }
  used += n;
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  for (;;) {
    try {
      await throttle(texts.length);
      return await llm.embed(texts);
    } catch (e) {
      const msg = String(e instanceof Error ? e.message : e);
      if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
        const m = msg.match(/retry in ([\d.]+)s/i) ?? msg.match(/"retryDelay":"(\d+)s"/);
        const wait = (m ? parseFloat(m[1]) : 45) * 1000 + 3000;
        console.log(`  ⏳ โดน rate limit รอ ${Math.round(wait / 1000)}s แล้วลองใหม่...`);
        await sleep(wait);
        windowStart = Date.now();
        used = 0;
        continue;
      }
      throw e;
    }
  }
}

async function main() {
  const catalog: CatalogEntry[] = JSON.parse(
    fs.readFileSync(path.join(DATA, "catalog.json"), "utf-8")
  );
  console.log(`กำลัง embed catalog ${catalog.length} รายการ...`);

  const out: IndexEntry[] = [];
  const BATCH = 10;
  for (let i = 0; i < catalog.length; i += BATCH) {
    const batch = catalog.slice(i, i + BATCH);
    const vectors = await embedBatch(batch.map(embedText));
    batch.forEach((e, j) => out.push({ ...e, embedding: vectors[j] }));
    console.log(`  ${Math.min(i + BATCH, catalog.length)}/${catalog.length}`);
  }

  fs.writeFileSync(path.join(DATA, "index.json"), JSON.stringify(out));
  console.log(`✅ เขียน index.json แล้ว (${out.length} รายการ, มิติ=${out[0].embedding.length})`);
}

main();
