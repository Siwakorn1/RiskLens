import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import { assessRows, type Row } from "../src/lib/csv/batch";

const IN = path.join(process.cwd(), "..", "source", "complete test file.csv");
const OUT = path.join(process.cwd(), "..", "source", "complete test file.OUTPUT.csv");

const rfOf = (s: string) => (s.match(/RF\d+/)?.[0] ?? "").replace(/^\*/, "");

async function main() {
  const raw = fs.readFileSync(IN, "utf-8").replace(/^﻿/, "");
  const parsed = Papa.parse<Row>(raw, { header: true, skipEmptyLines: true });
  const rows = parsed.data;
  console.log(`อ่าน ${rows.length} แถว กำลังประเมิน...`);

  // เก็บเฉลยเดิมไว้เทียบ (ก่อนถูกเขียนทับ)
  const truth = rows.map((r) => ({
    l1: (r["Risk Level 1"] ?? "").trim(),
    rf: rfOf(r["Risk Level 3"] ?? ""),
  }));

  const result = await assessRows(rows, undefined, (d, t) => {
    if (d % 5 === 0 || d === t) console.log(`  ${d}/${t}`);
  });

  // เขียน output (ใส่ BOM ให้ Excel อ่านไทยไม่เพี้ยน)
  fs.writeFileSync(OUT, "﻿" + Papa.unparse(result));
  console.log(`\n✅ เขียนผลลง ${path.basename(OUT)}`);

  // ===== EVAL =====
  let l1hit = 0, rfhit = 0, l1hitConf = 0, confTotal = 0;
  const byBand: Record<string, { n: number; l1: number; rf: number }> = {};
  result.forEach((r, i) => {
    const myL1 = (r["Risk Level 1"] ?? "").trim();
    const myRf = rfOf(r["Risk Level 3"] ?? "");
    const okL1 = myL1 === truth[i].l1;
    const okRf = myRf === truth[i].rf;
    if (okL1) l1hit++;
    if (okRf) rfhit++;
    const band = r["Confidence"] ?? "-";
    byBand[band] ??= { n: 0, l1: 0, rf: 0 };
    byBand[band].n++;
    if (okL1) byBand[band].l1++;
    if (okRf) byBand[band].rf++;
    if (["แน่นอน", "ค่อนข้างแน่ใจ"].includes(band)) { confTotal++; if (okL1) l1hitConf++; }
  });

  const n = result.length;
  console.log(`\n═══ ความแม่น (เทียบเฉลย 30 แถว) ═══`);
  console.log(`หมวดใหญ่ (Level 1) ตรง : ${l1hit}/${n} = ${(100*l1hit/n).toFixed(0)}%`);
  console.log(`RF เจาะจง (Level 3) ตรง : ${rfhit}/${n} = ${(100*rfhit/n).toFixed(0)}%`);
  console.log(`\nแยกตามระดับ confidence:`);
  for (const [band, s] of Object.entries(byBand)) {
    console.log(`  ${band}: ${s.n} แถว | L1 ตรง ${s.l1}/${s.n} | RF ตรง ${s.rf}/${s.n}`);
  }
}
main();
