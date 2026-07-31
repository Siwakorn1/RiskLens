import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import { assessRows, unionColumns, type Row } from "../src/lib/csv/batch";

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
  fs.writeFileSync(OUT, "﻿" + Papa.unparse(result, { columns: unionColumns(result) }));
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
    // "ผ่านเกณฑ์" = ไม่ติดธงต้องตรวจ (เกณฑ์คะแนนตั้งได้เองในหน้าตั้งค่า จึงไม่อิงชื่อระดับ)
    if (!(r["Status"] ?? "").includes("ต้องตรวจ")) { confTotal++; if (okL1) l1hitConf++; }
  });

  const n = result.length;
  console.log(`\n═══ ความแม่น (เทียบเฉลย 30 แถว) ═══`);
  console.log(`หมวดใหญ่ (Level 1) ตรง : ${l1hit}/${n} = ${(100*l1hit/n).toFixed(0)}%`);
  console.log(`RF เจาะจง (Level 3) ตรง : ${rfhit}/${n} = ${(100*rfhit/n).toFixed(0)}%`);
  console.log(`\nแยกตามระดับความมั่นใจ:`);
  for (const [band, s] of Object.entries(byBand)) {
    console.log(`  ${band}: ${s.n} แถว | L1 ตรง ${s.l1}/${s.n} | RF ตรง ${s.rf}/${s.n}`);
  }
  if (confTotal) {
    console.log(`\nเฉพาะแถวที่ผ่านเกณฑ์คะแนน (ไม่ติดธงต้องตรวจ): ${confTotal}/${n} แถว | L1 ตรง ${l1hitConf}/${confTotal} = ${(100*l1hitConf/confTotal).toFixed(0)}%`);
  }
  const scores = result.map((r) => Number(r["Confidence Score"] ?? 0)).filter((s) => s > 0);
  if (scores.length) {
    console.log(`คะแนนความมั่นใจเฉลี่ย: ${(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)} (ต่ำสุด ${Math.min(...scores).toFixed(1)} · สูงสุด ${Math.max(...scores).toFixed(1)})`);
  }
}
main();
