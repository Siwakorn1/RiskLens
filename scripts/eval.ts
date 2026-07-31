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
  const scored: { score: number; ok: boolean }[] = []; // เก็บคะแนนดิบไว้ทำตารางช่วงคะแนน

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
    scored.push({ score: r.confidenceScore, ok: okRf });

    console.log(`${okRf ? "🟢" : okL1 ? "🟡" : "🔴"} คาดหวัง ${c.expectedRf} | ได้ ${r.rfCode}  [${r.confidenceScore.toFixed(1)} คะแนน · ${r.confidence}]`);
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
  console.log(`\nแยกตามระดับความมั่นใจ (ตามช่วงคะแนนที่ตั้งไว้ปัจจุบัน):`);
  for (const [band, s] of Object.entries(byBand)) {
    console.log(`  ${band}: ${s.n} เคส | RF ตรง ${s.rf}/${s.n} = ${(100 * s.rf / s.n).toFixed(0)}%`);
  }

  // ตารางช่วงคะแนนละ 10 — ใช้ดูว่าควรตั้ง threshold ไว้ตรงไหน
  console.log(`\nความแม่นแยกตามช่วงคะแนน (ช่วงละ 10 คะแนน):`);
  for (let lo = 90; lo >= 0; lo -= 10) {
    const inBucket = scored.filter((s) => s.score >= lo && s.score < lo + 10);
    if (!inBucket.length) continue;
    const hit = inBucket.filter((s) => s.ok).length;
    const bar = "█".repeat(Math.round((10 * hit) / inBucket.length));
    console.log(`  ${String(lo).padStart(3)}-${lo + 9}: ${String(inBucket.length).padStart(3)} เคส | RF ตรง ${hit}/${inBucket.length} = ${String(Math.round((100 * hit) / inBucket.length)).padStart(3)}% ${bar}`);
  }

  // ถ้าตัดที่คะแนนนี้ จะได้ความแม่นเท่าไหร่ และเหลือให้คนตรวจกี่เคส
  console.log(`\nถ้าตั้ง threshold "ต้องตรวจ" ไว้ที่คะแนนต่าง ๆ:`);
  for (const t of [50, 55, 60, 65, 70, 75, 80]) {
    const pass = scored.filter((s) => s.score >= t);
    if (!pass.length) { console.log(`  ${t} คะแนน: ไม่มีเคสไหนผ่านเกณฑ์นี้`); continue; }
    const hit = pass.filter((s) => s.ok).length;
    console.log(
      `  ${t} คะแนน: ปล่อยผ่าน ${pass.length}/${n} เคส (${Math.round((100 * pass.length) / n)}%) ` +
      `| ในกลุ่มที่ผ่าน RF ตรง ${Math.round((100 * hit) / pass.length)}% | ส่งให้คนตรวจ ${n - pass.length} เคส`
    );
  }
}
main();
