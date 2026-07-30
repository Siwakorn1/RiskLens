import fs from "node:fs";
import path from "node:path";
import { assessWithRetry } from "../src/lib/csv/batch";

interface EvalCase {
  scenario: string;
  rootCause: string;
  impact: string;
  expectedRf: string;
  expectedL1: string;
}

async function main() {
  const cases: EvalCase[] = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data", "eval-set.json"), "utf-8")
  );
  console.log(`ประเมิน eval set ${cases.length} เคส (เฉลยที่ออกแบบเอง)...\n`);

  let l1hit = 0, rfhit = 0, evaluated = 0;
  const byBand: Record<string, { n: number; rf: number }> = {};

  for (const c of cases) {
    let r;
    try {
      r = await assessWithRetry(c);
    } catch (e) {
      const msg = String(e instanceof Error ? e.message : e);
      console.log(`⚠️ หยุด — เจอ error ที่ retry ไม่ได้ (น่าจะโควตาหมดวันนี้): ${msg.slice(0, 100)}`);
      break; // โควตารายวันหมด ทำต่อไปก็ fail ทั้งหมด เก็บผลที่ได้ไว้
    }
    evaluated++;
    const okL1 = r.level1 === c.expectedL1;
    const okRf = r.rfCode === c.expectedRf;
    if (okL1) l1hit++;
    if (okRf) rfhit++;
    byBand[r.confidence] ??= { n: 0, rf: 0 };
    byBand[r.confidence].n++;
    if (okRf) byBand[r.confidence].rf++;

    console.log(`${okRf ? "🟢" : okL1 ? "🟡" : "🔴"} คาดหวัง ${c.expectedRf} | ได้ ${r.rfCode}  [${r.confidence}]`);
    console.log(`   "${c.scenario.slice(0, 55)}..."`);
  }

  const n = evaluated;
  if (n === 0) {
    console.log(`\n(ยังไม่ได้ประเมินเคสไหนเลย — โควตา generate หมดวันนี้ ลองใหม่พรุ่งนี้หรือเปิด billing)`);
    return;
  }
  console.log(`\n═══ สรุป (เทียบเฉลยที่ออกแบบเอง ${n} เคส) ═══`);
  console.log(`หมวดใหญ่ (Level 1) ตรง : ${l1hit}/${n} = ${(100 * l1hit / n).toFixed(0)}%`);
  console.log(`RF เจาะจง ตรงเป๊ะ      : ${rfhit}/${n} = ${(100 * rfhit / n).toFixed(0)}%`);
  console.log(`\nแยกตาม confidence (ดูว่าระดับไหนแม่นแค่ไหน → ใช้ calibrate):`);
  for (const [band, s] of Object.entries(byBand)) {
    console.log(`  ${band}: ${s.n} เคส | RF ตรง ${s.rf}/${s.n}`);
  }
}
main();
