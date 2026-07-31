import { llm } from "../llm";
import { retrieve, type Retrieved } from "./retrieve";
import {
  zoneFor, managementFor, likelihoodRubricText, impactRubricText,
} from "./rubrics";
import { computeConfidence, type BandColor, type ComponentScore } from "./confidence";
import { getConfidenceConfig } from "./confidence-store";

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
  confidenceScore: number;             // คะแนนรวม 0-100 (ตัวหลักที่โชว์ผู้ใช้)
  confidence: string;                  // ชื่อระดับตามช่วงคะแนนที่ผู้ใช้ตั้งไว้
  confidenceColor: BandColor;
  confidenceAction: string;            // สิ่งที่ควรทำเมื่อได้ระดับนี้
  confidenceComponents: ComponentScore[]; // คะแนนย่อยรายองค์ประกอบ + สูตรที่ใช้
  sufficiencyScore: number | null;     // AI ให้ความครบถ้วนของ input กี่คะแนน
  sufficiencyReason: string;
  needsReview: boolean;
  status: string;                      // ✅ ปกติ / ⚠️ ต้องตรวจ
  topSimilarity: number;
  margin: number;
  tieCount: number;
}

const SYSTEM = `คุณคือผู้ช่วยประเมินความเสี่ยงองค์กรของ NITMX ทำงานตามกรอบ ISO 31000
หน้าที่: จาก Scenario / Root Cause / Impact ที่ให้ ให้ทำ 3 อย่าง
1) เลือกความเสี่ยงย่อย (RF code) ที่ตรงที่สุด "จากรายการผู้สมัครที่ให้เท่านั้น" — ถ้าไม่มีตัวไหนตรงเลย ให้ rf_code = null
2) ให้คะแนน Likelihood 1-5 ตามเกณฑ์ที่ให้
3) ให้คะแนน Impact 1-5 ตามเกณฑ์ที่ให้ (พิจารณาทั้ง 5 ด้าน แล้วเอาด้านที่รุนแรงสุดเป็นตัวตัดสิน ระบุด้วยว่าด้านไหน)
บอกด้วยว่า input มีรายละเอียดพอจะประเมินได้ชัดเจนแค่ไหน เป็นคะแนน 0-100 (input_sufficiency)
  0-30 = แทบไม่มีข้อมูล เดาล้วน · 31-60 = พอเดาได้แต่ขาดรายละเอียดสำคัญ
  61-85 = ข้อมูลพอประเมินได้ · 86-100 = ข้อมูลครบทั้งสถานการณ์ สาเหตุ และผลกระทบ
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
  "input_sufficiency": 75,
  "input_sufficiency_reason": "บอกสั้น ๆ ว่าข้อมูลส่วนไหนขาด หรือครบดีแล้ว"
}`;
}

function safeParse(raw: string): Record<string, unknown> {
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(cleaned);
}

/**
 * แปลงคำตอบเรื่องความเพียงพอของ input ให้เป็นคะแนน 0-100
 * รองรับทั้งฟิลด์ใหม่ (ตัวเลข) และฟิลด์เดิม (boolean) เผื่อโมเดลตอบตามรูปแบบเก่า
 */
function sufficiencyOf(p: Record<string, unknown>): number | null {
  const n = Number(p.input_sufficiency);
  if (Number.isFinite(n)) return Math.max(0, Math.min(100, n));
  if (typeof p.input_sufficient === "boolean") return p.input_sufficient ? 90 : 40;
  return null; // โมเดลไม่ตอบ — ปล่อยให้ตัวคำนวณใช้เฉพาะสัญญาณที่วัดเองได้
}

export async function assess(input: AssessInput): Promise<Assessment> {
  const query = `${input.scenario} ${input.rootCause} ${input.impact}`.trim();
  const candidates = await retrieve(query, 5);

  const raw = await llm.generateJSON(SYSTEM, buildUserPrompt(input, candidates));
  const p = safeParse(raw);

  const rfCode = (p.rf_code as string) || null;
  const chosen = candidates.find((c) => c.rf_code === rfCode) ?? null;

  const likelihood = Number(p.likelihood) || 1;
  const impactScore = Number(p.impact) || 1;
  const zone = zoneFor(likelihood, impactScore);
  const mgmt = managementFor(zone);

  // คะแนนความมั่นใจ: คำนวณจากสัญญาณที่วัดได้จริง ตามเกณฑ์/น้ำหนักที่ผู้ใช้ตั้งไว้
  const sufficiency = sufficiencyOf(p);
  const conf = computeConfidence(
    {
      neighbors: candidates.map((c) => c.score),
      fields: input,
      llmSufficiency: sufficiency,
    },
    getConfidenceConfig()
  );

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
    confidenceScore: conf.score,
    confidence: conf.band.label,
    confidenceColor: conf.band.color,
    confidenceAction: conf.band.action,
    confidenceComponents: conf.components,
    sufficiencyScore: sufficiency,
    sufficiencyReason: String(p.input_sufficiency_reason ?? ""),
    needsReview: conf.needsReview,
    status: conf.needsReview ? "⚠️ ต้องตรวจ" : "✅ ปกติ",
    topSimilarity: conf.topSimilarity,
    margin: conf.margin,
    tieCount: conf.tieCount,
  };
}
