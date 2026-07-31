/**
 * วัดค่าดิบที่เกิดขึ้นจริง เพื่อใช้ตั้งเกณฑ์ในหน้า /settings/confidence
 *
 * สคริปต์นี้เรียกเฉพาะ embedding (ไม่เรียก generate) จึงกินโควตาน้อยและรันซ้ำได้บ่อย
 * ผลที่ได้บอกว่า ค่า similarity และ margin ที่ระบบเจอจริงอยู่ในช่วงไหน
 * แล้วเสนอค่า floor / ceil / margin ที่ทำให้คะแนนกระจายตัวเต็มช่วง 0-100
 *
 * รันด้วย: npm run calibrate
 */
import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import { retrieve } from "../src/lib/rag/retrieve";
import { computeConfidence, DEFAULT_CONFIDENCE, missingFields, type ConfidenceConfig } from "../src/lib/rag/confidence";

interface EvalCase {
  scenario: string; rootCause: string; impact: string;
  expectedRf: string; source: string;
}

/** ชุดทดสอบที่ออกแบบเอง */
function fromEvalSet(): EvalCase[] {
  const raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "eval-set.json"), "utf-8"));
  return raw.map((c: Record<string, string>) => ({
    scenario: c.scenario, rootCause: c.rootCause, impact: c.impact,
    expectedRf: c.expectedRf, source: "eval-set",
  }));
}

/**
 * ทะเบียนความเสี่ยงจริงที่มีเฉลยติดมาในคอลัมน์ Risk Level 3
 * ข้อมูลชุดนี้สะท้อนการเขียนจริงของผู้ใช้มากกว่าเคสที่ออกแบบเอง จึงเหมาะกับการตั้งเกณฑ์
 */
function fromRealFile(): EvalCase[] {
  const p = path.join(process.cwd(), "..", "source", "complete test file.csv");
  if (!fs.existsSync(p)) return [];
  const rows = Papa.parse<Record<string, string>>(fs.readFileSync(p, "utf-8").replace(/^﻿/, ""), {
    header: true, skipEmptyLines: true,
  }).data;
  return rows
    .map((r) => ({
      scenario: (r["Scenario"] ?? "").trim(),
      rootCause: (r["Root Cause"] ?? "").trim(),
      impact: (r["Impact"] ?? "").trim(),
      expectedRf: (r["Risk Level 3"] ?? "").match(/RF\d+/)?.[0] ?? "",
      source: "ไฟล์จริง",
    }))
    // ใช้เฉพาะแถวที่กรอกครบและมีเฉลย — ตรงกับกติกาที่ระบบไม่ประเมินแถวที่ข้อมูลไม่ครบ
    .filter((c) => c.expectedRf && missingFields(c).length === 0);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const pct = (arr: number[], p: number) => arr.slice().sort((a, b) => a - b)[Math.min(arr.length - 1, Math.floor((arr.length - 1) * p))];

function readConfig(): ConfidenceConfig {
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "confidence.json"), "utf-8"));
  } catch {
    return DEFAULT_CONFIDENCE;
  }
}

async function main() {
  const real = fromRealFile();
  const cases = [...real, ...fromEvalSet()];
  const cfg = readConfig();
  console.log(`วัดค่าดิบจาก ${cases.length} เคส — ไฟล์จริง ${real.length} เคส + ชุดที่ออกแบบเอง ${cases.length - real.length} เคส (ใช้เฉพาะ embedding)\n`);

  const tops: number[] = [];
  const margins: number[] = [];
  const hitTops: number[] = [];   // เฉพาะเคสที่อันดับ 1 ตรงเฉลย
  const missTops: number[] = [];  // เคสที่อันดับ 1 ไม่ตรงเฉลย
  const scores: { score: number; ok: boolean; margin: number }[] = [];
  // เก็บค่าดิบของทุกเคสไว้ ทำให้ลองเกณฑ์แบบอื่นได้โดยไม่ต้อง embed ใหม่
  const raw: { neighbors: number[]; ok: boolean; fields: EvalCase }[] = [];

  for (const c of cases) {
    const query = `${c.scenario} ${c.rootCause} ${c.impact}`.trim();
    let ranked;
    try {
      ranked = await retrieve(query, 5);
    } catch (e) {
      console.log(`⚠️ หยุด — embedding error: ${String(e instanceof Error ? e.message : e).slice(0, 90)}`);
      break;
    }
    const top = ranked[0]?.score ?? 0;
    const margin = top - (ranked[1]?.score ?? 0);
    const ok = ranked[0]?.rf_code === c.expectedRf;

    tops.push(top);
    margins.push(margin);
    (ok ? hitTops : missTops).push(top);

    // คะแนนจากการค้นหาล้วน (สมมุติว่า AI ให้ความครบถ้วน 85 เท่ากันทุกเคส เพื่อเทียบเฉพาะผลของการค้นหา)
    const conf = computeConfidence(
      { neighbors: ranked.map((r) => r.score), fields: c, llmSufficiency: 85 },
      cfg
    );
    scores.push({ score: conf.score, ok, margin });
    raw.push({ neighbors: ranked.map((r) => r.score), ok, fields: c });

    console.log(
      `${ok ? "🟢" : "🔴"} top=${top.toFixed(3)} margin=${margin.toFixed(3)} → ${conf.score.toFixed(1).padStart(5)} คะแนน [${conf.band.label}]` +
      `  คาดหวัง ${c.expectedRf} ได้ ${ranked[0]?.rf_code}  (${c.source})`
    );
    await sleep(300);
  }

  if (!tops.length) return console.log("\n(ไม่ได้ค่าเลย — embedding เรียกไม่สำเร็จ)");

  console.log(`\n═══ การกระจายของค่าดิบ (${tops.length} เคส) ═══`);
  console.log(`similarity อันดับ 1 : ต่ำสุด ${Math.min(...tops).toFixed(3)} · กลาง ${pct(tops, 0.5).toFixed(3)} · สูงสุด ${Math.max(...tops).toFixed(3)}`);
  console.log(`margin (1 ลบ 2)     : ต่ำสุด ${Math.min(...margins).toFixed(3)} · กลาง ${pct(margins, 0.5).toFixed(3)} · สูงสุด ${Math.max(...margins).toFixed(3)}`);
  // สัญญาณไหนแยกเคสที่ค้นถูกออกจากเคสที่ค้นผิดได้จริง — ใช้ตัดสินว่าควรให้น้ำหนักตัวไหนมาก
  console.log(`\n═══ พลังแยกแยะของแต่ละสัญญาณ (${hitTops.length} ถูก · ${missTops.length} ผิด) ═══`);
  const sep = (label: string, hit: number[], miss: number[], digits: number) => {
    if (!hit.length || !miss.length) return;
    const h = pct(hit, 0.5), m = pct(miss, 0.5);
    const verdict = Math.abs(h - m) < (digits === 3 ? 0.01 : 5) ? "แยกแทบไม่ได้" : h > m ? "แยกได้" : "⚠️ กลับทาง";
    console.log(`${label}: ค้นถูกกลาง ${h.toFixed(digits)} · ค้นผิดกลาง ${m.toFixed(digits)} · ต่างกัน ${(h - m).toFixed(digits)} → ${verdict}`);
  };
  sep("similarity ", hitTops, missTops, 3);
  sep("margin     ", scores.filter((s) => s.ok).map((s) => s.margin), scores.filter((s) => !s.ok).map((s) => s.margin), 3);
  sep("คะแนนรวม   ", scores.filter((s) => s.ok).map((s) => s.score), scores.filter((s) => !s.ok).map((s) => s.score), 1);

  console.log(`\n═══ ค่าที่แนะนำให้ตั้งในหน้า /settings/confidence ═══`);
  console.log(`ความใกล้เคียง ค่าที่ได้ศูนย์คะแนน : ${pct(tops, 0.05).toFixed(2)}  (ต่ำกว่านี้ถือว่าค้นไม่เจอ)`);
  console.log(`ความใกล้เคียง ค่าที่ได้เต็มร้อย   : ${pct(tops, 0.95).toFixed(2)}  (สูงกว่านี้เกิดขึ้นน้อยมาก)`);
  console.log(`ระยะห่างที่ถือว่าชัดเจนเต็มร้อย   : ${pct(margins, 0.8).toFixed(3)}`);
  console.log(`\nเกณฑ์ปัจจุบันตั้งไว้ที่ ${cfg.similarity.floor} ถึง ${cfg.similarity.ceil} และระยะห่าง ${cfg.margin.full}`);
  const wasted = Math.max(0, cfg.similarity.ceil - Math.max(...tops));
  if (wasted > 0.03) {
    console.log(`⚠️ ไม่มีเคสไหนแตะ ${cfg.similarity.ceil} เลย (สูงสุดที่เจอคือ ${Math.max(...tops).toFixed(3)})`);
    console.log(`   คะแนนความใกล้เคียงจึงไม่มีทางเต็มร้อย ควรลดค่าที่ได้เต็มร้อยลงมา ไม่งั้นทุกเคสจะดูมั่นใจต่ำกว่าความเป็นจริง`);
  }

  // ลองเกณฑ์หลายแบบกับค่าดิบชุดเดียวกัน แล้วดูว่าแบบไหนแยกเคสที่ค้นถูกออกจากค้นผิดได้ดีที่สุด
  // "แยกได้ดี" = คะแนนกลางของเคสที่ค้นถูก สูงกว่าคะแนนกลางของเคสที่ค้นผิดมากที่สุด
  console.log(`\n═══ ลองเกณฑ์แบบต่าง ๆ กับข้อมูลชุดเดียวกัน ═══`);
  const p05 = Number(pct(tops, 0.05).toFixed(2));
  const p95 = Number(pct(tops, 0.95).toFixed(2));
  const candidates: { name: string; cfg: ConfidenceConfig }[] = [
    { name: "เกณฑ์ปัจจุบัน", cfg },
    { name: "ตามที่สคริปต์แนะนำ", cfg: { ...cfg, similarity: { floor: p05, ceil: p95 }, margin: { ...cfg.margin, full: Number(pct(margins, 0.8).toFixed(3)) } } },
    { name: "ค่าเริ่มต้นของระบบ", cfg: DEFAULT_CONFIDENCE },
  ];
  for (const f of [0.65, 0.68, 0.70, 0.72]) {
    for (const mf of [0.03, 0.05]) {
      candidates.push({ name: `floor ${f} · margin ${mf}`, cfg: { ...cfg, similarity: { floor: f, ceil: p95 }, margin: { ...cfg.margin, full: mf } } });
    }
  }
  const tried = candidates.map(({ name, cfg: c }) => {
    const out = raw.map((r) => ({
      score: computeConfidence({ neighbors: r.neighbors, fields: r.fields, llmSufficiency: 85 }, c).score,
      ok: r.ok,
    }));
    const hit = out.filter((o) => o.ok).map((o) => o.score);
    const miss = out.filter((o) => !o.ok).map((o) => o.score);
    const all = out.map((o) => o.score);
    return {
      name,
      gap: pct(hit, 0.5) - pct(miss, 0.5),
      spread: Math.max(...all) - Math.min(...all),
      floor: c.similarity.floor, ceil: c.similarity.ceil, full: c.margin.full,
    };
  }).sort((a, b) => b.gap - a.gap);

  console.log(`(gap = คะแนนกลางของเคสที่ค้นถูก ลบ เคสที่ค้นผิด · ยิ่งมากยิ่งแยกดี | ช่วง = คะแนนสูงสุดลบต่ำสุด ยิ่งกว้างยิ่งละเอียด)`);
  for (const t of tried) {
    console.log(`  gap ${t.gap.toFixed(1).padStart(5)} · ช่วง ${t.spread.toFixed(1).padStart(5)} · floor ${t.floor} ceil ${t.ceil} margin ${t.full}  — ${t.name}`);
  }

  console.log(`\n═══ ถ้าตั้ง threshold "ต้องตรวจ" ไว้ที่คะแนนต่าง ๆ ═══`);
  console.log(`(ความถูกต้องนับจากอันดับ 1 ของการค้นหา ยังไม่ผ่านการเลือกของ AI)`);
  const n = scores.length;
  for (const t of [40, 45, 50, 55, 60, 65, 70, 75, 80]) {
    const pass = scores.filter((s) => s.score >= t);
    if (!pass.length) { console.log(`  ${t} คะแนน: ไม่มีเคสไหนผ่าน`); continue; }
    const hit = pass.filter((s) => s.ok).length;
    console.log(
      `  ${String(t).padStart(2)} คะแนน: ปล่อยผ่าน ${String(pass.length).padStart(2)}/${n} ` +
      `| ในกลุ่มที่ผ่านถูกต้อง ${String(Math.round((100 * hit) / pass.length)).padStart(3)}% ` +
      `| ส่งให้คนตรวจ ${n - pass.length} เคส`
    );
  }
}
main();
