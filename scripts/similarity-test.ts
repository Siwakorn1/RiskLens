import fs from "node:fs";
import path from "node:path";
import { llm } from "../src/lib/llm";

interface IndexEntry {
  level1: string;
  level2: string;
  rf_code: string;
  name: string;
  embedding: number[];
}

const index: IndexEntry[] = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "data", "index.json"), "utf-8")
);

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function embedQuery(text: string): Promise<number[]> {
  for (;;) {
    try {
      return (await llm.embed([text]))[0];
    } catch (e) {
      const msg = String(e instanceof Error ? e.message : e);
      if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
        const m = msg.match(/retry in ([\d.]+)s/i);
        const wait = (m ? parseFloat(m[1]) : 45) * 1000 + 3000;
        console.log(`  ⏳ rate limit รอ ${Math.round(wait / 1000)}s...`);
        await sleep(wait);
        continue;
      }
      throw e;
    }
  }
}

const queries = [
  { label: "ชัดเจนมาก (โครงการล่าช้า)", text: "ความเสี่ยงจากโครงการพัฒนาระบบไม่สามารถส่งมอบได้ตามแผนงาน เนื่องจาก requirement ไม่ชัดเจน" },
  { label: "ชัดเจน (ไซเบอร์)", text: "ระบบถูกผู้ไม่หวังดีโจมตีทางไซเบอร์และมีข้อมูลส่วนบุคคลรั่วไหล" },
  { label: "ปานกลาง (สื่อความกว้าง)", text: "พนักงานทำงานผิดพลาดทำให้เกิดปัญหาในการให้บริการ" },
  { label: "คลุมเครือ (สั้น/กว้าง)", text: "มีปัญหาบางอย่างเกิดขึ้นในองค์กร" },
  { label: "นอกเรื่อง (ทดสอบ)", text: "วันนี้อากาศดีมาก อยากไปเที่ยวทะเล" },
];

async function main() {
  for (const q of queries) {
    const qv = await embedQuery(q.text);
    const ranked = index
      .map((e) => ({ e, score: cosine(qv, e.embedding) }))
      .sort((a, b) => b.score - a.score);
    console.log(`\n▌ [${q.label}]  "${q.text.slice(0, 50)}..."`);
    ranked.slice(0, 3).forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.score.toFixed(3)}  ${r.e.rf_code} ${r.e.name.slice(0, 40)}`);
    });
    const margin = ranked[0].score - ranked[1].score;
    console.log(`   → top=${ranked[0].score.toFixed(3)}  margin(ห่างอันดับ2)=${margin.toFixed(3)}`);
  }
}
main();
