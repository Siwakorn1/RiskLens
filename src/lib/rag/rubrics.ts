import fs from "node:fs";
import path from "node:path";

const DATA = path.join(process.cwd(), "data");
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(DATA, f), "utf-8"));

interface Likelihood { level: number; frequency: string; probability: string; description: string; }
interface Impact { level: number; dimensions: Record<string, string>; description: string; }
interface Matrix { zones: Record<string, Record<string, string>>; }
interface Management { zone_color: string; risk_level: string; acceptance: string; action: string; }

const likelihood: Likelihood[] = read("likelihood.json");
const impact: Impact[] = read("impact.json");
const matrix: Matrix = read("matrix.json");
const management: Management[] = read("management.json");

const DIM_LABEL: Record<string, string> = {
  financial: "การเงิน", reputation: "ชื่อเสียง", operational: "ปฏิบัติการ",
  compliance: "กฎระเบียบ", strategic: "กลยุทธ์",
};

/** เปิดตาราง matrix: (likelihood, impact 1..5) -> โซนความเสี่ยง (lookup ตรง ๆ ไม่ใช้ AI) */
export function zoneFor(likelihoodLevel: number, impactLevel: number): string {
  return matrix.zones[String(impactLevel)]?.[String(likelihoodLevel)] ?? "ไม่ทราบ";
}

/** เปิดตารางแนวทางจัดการจากโซน (ต่ำมากใช้เกณฑ์เดียวกับต่ำ) */
export function managementFor(zone: string): { color: string; action: string } {
  const map: Record<string, string> = {
    "สูงมาก": "ระดับความเสี่ยงสูงมาก", "สูง": "ระดับความเสี่ยงสูง",
    "ปานกลาง": "ระดับความเสี่ยงปานกลาง", "ต่ำ": "ระดับความเสี่ยงต่ำ",
    "ต่ำมาก": "ระดับความเสี่ยงต่ำ",
  };
  const target = map[zone];
  const m = management.find((x) => x.risk_level === target);
  return { color: m?.zone_color ?? "", action: m?.action ?? "" };
}

/** ข้อความเกณฑ์ Likelihood สำหรับใส่ใน prompt */
export function likelihoodRubricText(): string {
  return likelihood
    .map((l) => `ระดับ ${l.level}: ${l.frequency} | ความน่าจะเป็น ${l.probability} (${l.description})`)
    .join("\n");
}

/** ข้อความเกณฑ์ Impact แบบกระชับ (ลด token — ใส่คำอธิบายระดับ + ด้านการเงินเป็นตัวยึด) */
export function impactRubricText(): string {
  return impact
    .map((im) => `ระดับ ${im.level}: ${im.description} · ${DIM_LABEL.financial}: ${im.dimensions.financial}`)
    .join("\n");
}
/** ชื่อ 5 ด้านของ Impact (ให้โมเดลรู้ว่าเลือก dimension อะไรได้บ้าง) */
export const IMPACT_DIMENSIONS = Object.values(DIM_LABEL).join(", ");
