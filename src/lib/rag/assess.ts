import { llm } from "../llm";
import { retrieve, type Retrieved } from "./retrieve";
import {
  zoneFor, managementFor, likelihoodRubricText, impactRubricText,
} from "./rubrics";

export interface AssessInput {
  scenario: string;
  rootCause: string;
  impact: string;
}

export interface Assessment {
  rfCode: string | null;
  level1: string | null;
  level2: string | null;
  level3Name: string | null;
  classificationReason: string;
  likelihood: number;
  likelihoodReason: string;
  impactScore: number;
  impactDimension: string;
  impactReason: string;
  zone: string;
  managementColor: string;
  managementAction: string;
  confidence: string;      // ระดับ: แน่นอน/ค่อนข้างแน่ใจ/ไม่แน่ใจ/คลุมเครือ
  confidenceScore: number; // เลขดิบ 0-100 ไว้เรียงลำดับ (ไม่โชว์ผู้ใช้)
  status: string;          // ✅ ปกติ / ⚠️ ต้องตรวจ
  topSimilarity: number;
  margin: number;
}

const SYSTEM = `คุณคือผู้ช่วยประเมินความเสี่ยงองค์กรของ NITMX ทำงานตามกรอบ ISO 31000
หน้าที่: จาก Scenario / Root Cause / Impact ที่ให้ ให้ทำ 3 อย่าง
1) เลือกความเสี่ยงย่อย (RF code) ที่ตรงที่สุด "จากรายการผู้สมัครที่ให้เท่านั้น" — ถ้าไม่มีตัวไหนตรงเลย ให้ rf_code = null
2) ให้คะแนน Likelihood 1-5 ตามเกณฑ์ที่ให้
3) ให้คะแนน Impact 1-5 ตามเกณฑ์ที่ให้ (พิจารณาทั้ง 5 ด้าน แล้วเอาด้านที่รุนแรงสุดเป็นตัวตัดสิน ระบุด้วยว่าด้านไหน)
บอกด้วยว่า input มีรายละเอียดพอจะประเมินได้ชัดเจนไหม (input_sufficient)
ตอบเป็นภาษาไทย และตอบเป็น JSON เท่านั้นตาม schema ที่กำหนด ห้ามมีข้อความอื่นนอก JSON`;

function buildUserPrompt(input: AssessInput, candidates: Retrieved[]): string {
  const cand = candidates
    .map((c, i) => `${i + 1}. ${c.rf_code} | ${c.level1} > ${c.level2} > ${c.name}`)
    .join("\n");
  return `## ข้อมูลความเสี่ยงที่ต้องประเมิน
Scenario: ${input.scenario}
Root Cause: ${input.rootCause}
Impact: ${input.impact}

## รายการความเสี่ยงย่อยผู้สมัคร (เลือก rf_code จากในนี้เท่านั้น)
${cand}

## เกณฑ์ Likelihood (โอกาสเกิด)
${likelihoodRubricText()}

## เกณฑ์ Impact (ผลกระทบ)
${impactRubricText()}

## รูปแบบคำตอบ (JSON เท่านั้น)
{
  "rf_code": "RFxxxx หรือ null",
  "classification_reason": "เหตุผลสั้น ๆ ว่าทำไมเลือก RF นี้",
  "likelihood": 1,
  "likelihood_reason": "อ้างอิงเกณฑ์",
  "impact": 1,
  "impact_dimension": "financial | reputation | operational | compliance | strategic",
  "impact_reason": "อ้างอิงเกณฑ์",
  "input_sufficient": true
}`;
}

function safeParse(raw: string): Record<string, unknown> {
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(cleaned);
}

function confidenceBand(top: number, margin: number, sufficient: boolean): string {
  const order = ["คลุมเครือ", "ไม่แน่ใจ", "ค่อนข้างแน่ใจ", "แน่นอน"];
  let band: string;
  if (top >= 0.78 && margin >= 0.05) band = "แน่นอน";
  else if (top >= 0.72 && margin >= 0.02) band = "ค่อนข้างแน่ใจ";
  else if (top < 0.65) band = "คลุมเครือ";
  else band = "ไม่แน่ใจ";
  if (!sufficient) band = order[Math.max(0, order.indexOf(band) - 1)]; // ข้อมูลไม่พอ ลด 1 ขั้น
  return band;
}

function rawScore(top: number, margin: number): number {
  const base = Math.max(0, Math.min(1, (top - 0.55) / 0.28)); // 0.55→0, 0.83→1
  const marginBoost = Math.min(1, margin / 0.08);
  return Math.round((0.7 * base + 0.3 * marginBoost) * 100);
}

export async function assess(input: AssessInput): Promise<Assessment> {
  const query = `${input.scenario} ${input.rootCause} ${input.impact}`.trim();
  const candidates = await retrieve(query, 5);
  const top = candidates[0]?.score ?? 0;
  const margin = (candidates[0]?.score ?? 0) - (candidates[1]?.score ?? 0);

  const raw = await llm.generateJSON(SYSTEM, buildUserPrompt(input, candidates));
  const p = safeParse(raw);

  const rfCode = (p.rf_code as string) || null;
  const chosen = candidates.find((c) => c.rf_code === rfCode) ?? null;

  const likelihood = Number(p.likelihood) || 1;
  const impactScore = Number(p.impact) || 1;
  const zone = zoneFor(likelihood, impactScore);
  const mgmt = managementFor(zone);

  const sufficient = p.input_sufficient !== false;
  const confidence = confidenceBand(top, margin, sufficient);
  const status = ["แน่นอน", "ค่อนข้างแน่ใจ"].includes(confidence) ? "✅ ปกติ" : "⚠️ ต้องตรวจ";

  return {
    rfCode,
    level1: chosen?.level1 ?? null,
    level2: chosen?.level2 ?? null,
    level3Name: chosen?.name ?? null,
    classificationReason: String(p.classification_reason ?? ""),
    likelihood,
    likelihoodReason: String(p.likelihood_reason ?? ""),
    impactScore,
    impactDimension: String(p.impact_dimension ?? ""),
    impactReason: String(p.impact_reason ?? ""),
    zone,
    managementColor: mgmt.color,
    managementAction: mgmt.action,
    confidence,
    confidenceScore: rawScore(top, margin),
    status,
    topSimilarity: Number(top.toFixed(3)),
    margin: Number(margin.toFixed(3)),
  };
}
