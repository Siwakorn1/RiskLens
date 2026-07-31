/**
 * แกนคำนวณ "คะแนนความมั่นใจ" (0-100)
 *
 * ไฟล์นี้ตั้งใจให้เป็น pure logic ล้วน — ไม่แตะ fs/network
 * เพื่อให้ทั้งฝั่ง server (ตอนประเมินจริง) และฝั่ง browser (หน้าจำลองผลในหน้าตั้งค่า)
 * ใช้สูตรเดียวกันเป๊ะ ๆ ไม่มีทางคำนวณไม่ตรงกัน
 *
 * แนวคิด: คะแนนรวม = ผลรวมของ 3 องค์ประกอบ ที่แต่ละตัวให้คะแนน 0-100 แล้วถ่วงน้ำหนักด้วย %
 *
 *   คะแนนรวม = (นน.1 × คะแนนความใกล้เคียง + นน.2 × คะแนนระยะห่าง + นน.3 × คะแนนความครบถ้วน) ÷ 100
 *
 * จากนั้นเอาคะแนนรวมไปเทียบ "ช่วงคะแนน" (bands) ที่ผู้ใช้ตั้งเองได้ ว่าตกระดับความแม่นยำไหน
 */

/** ---------- ชนิดข้อมูลของการตั้งค่า ---------- */

export type BandColor = "emerald" | "sky" | "amber" | "rose" | "violet" | "slate";

export interface ConfidenceBand {
  /** ชื่อระดับ เช่น "แน่นอน" */
  label: string;
  /** คะแนนขั้นต่ำของระดับนี้ (ระดับล่างสุดควรเป็น 0) */
  min: number;
  color: BandColor;
  /** สิ่งที่ควรทำเมื่อผลตกระดับนี้ */
  action: string;
}

export interface ConfidenceConfig {
  /** น้ำหนักของแต่ละองค์ประกอบ หน่วยเป็น % (ควรรวมกันได้ 100) */
  weights: {
    similarity: number;
    margin: number;
    completeness: number;
  };
  /** ช่วงค่า similarity ที่ใช้จริง: floor → 0 คะแนน, ceil → 100 คะแนน */
  similarity: { floor: number; ceil: number };
  /** margin: ระยะห่างเท่าไหร่ถือว่าชัดเจนเต็ม 100 + การหักคะแนนเมื่อมีตัวเลือกสูสี */
  margin: { full: number; tieBand: number; tiePenalty: number };
  /** ความครบถ้วนของ input: ผสมระหว่างการนับความยาวข้อความ กับความเห็นของ AI */
  completeness: { fieldWeight: number; llmWeight: number; minChars: number };
  /** ช่วงคะแนน → ระดับความแม่นยำ (เรียงจากคะแนนสูงลงต่ำ) */
  bands: ConfidenceBand[];
  /** คะแนนต่ำกว่านี้ = ติดธง "ต้องตรวจ" */
  reviewBelow: number;
}

export const DEFAULT_CONFIDENCE: ConfidenceConfig = {
  weights: { similarity: 50, margin: 20, completeness: 30 },
  // floor/ceil/full มาจาก npm run calibrate กับข้อมูลจริง 41 เคส (similarity 0.693-0.853, margin 0.000-0.090)
  // floor 0.55 แบบเดิมทำให้ไม่มีเคสไหนได้ต่ำกว่า 55 คะแนน = ครึ่งล่างของสเกลไม่ถูกใช้เลย
  // 0.70 เป็นจุดที่แยกเคสที่ค้นถูกออกจากค้นผิดได้ดี (gap 11.1 เทียบกับ 6.9 ที่ floor 0.65)
  // โดยยังไม่บีบให้เคสคะแนนต่ำกลายเป็นศูนย์เท่ากันหมดจนแยกกันไม่ออก
  similarity: { floor: 0.70, ceil: 0.82 },
  margin: { full: 0.05, tieBand: 0.02, tiePenalty: 8 },
  completeness: { fieldWeight: 50, llmWeight: 50, minChars: 25 },
  bands: [
    { label: "แน่นอน", min: 80, color: "emerald", action: "ใช้ได้ทันที" },
    { label: "ค่อนข้างแน่ใจ", min: 65, color: "sky", action: "ใช้ได้ ควรสุ่มตรวจ" },
    { label: "ไม่แน่ใจ", min: 45, color: "amber", action: "ควรให้เจ้าหน้าที่ตรวจสอบ" },
    { label: "คลุมเครือ", min: 0, color: "rose", action: "ต้องให้เจ้าหน้าที่ตัดสิน" },
  ],
  reviewBelow: 65,
};

export const BAND_COLORS: BandColor[] = ["emerald", "sky", "amber", "rose", "violet", "slate"];

/** คลาสสีของ Tailwind (เขียนเป็นสตริงเต็มเพื่อให้ Tailwind มองเห็นตอน build) */
export const BAND_DOT: Record<BandColor, string> = {
  emerald: "bg-emerald-500", sky: "bg-sky-500", amber: "bg-amber-400",
  rose: "bg-rose-500", violet: "bg-violet-500", slate: "bg-slate-400",
};
export const BAND_TEXT: Record<BandColor, string> = {
  emerald: "text-emerald-400", sky: "text-sky-400", amber: "text-amber-400",
  rose: "text-rose-400", violet: "text-violet-400", slate: "text-slate-300",
};
export const BAND_BAR: Record<BandColor, string> = {
  emerald: "bg-emerald-500", sky: "bg-sky-500", amber: "bg-amber-400",
  rose: "bg-rose-500", violet: "bg-violet-500", slate: "bg-slate-400",
};

/** ---------- ชนิดข้อมูลของสัญญาณและผลลัพธ์ ---------- */

export interface ConfidenceSignals {
  /** คะแนน similarity ของผู้สมัครทุกตัว เรียงจากมากไปน้อย (ตัวแรกคืออันดับ 1) */
  neighbors: number[];
  fields: { scenario: string; rootCause: string; impact: string };
  /** ความเห็นของ AI ว่า input พอประเมินไหม 0-100 (null = โมเดลไม่ได้ตอบ) */
  llmSufficiency: number | null;
}

export type ComponentKey = "similarity" | "margin" | "completeness";

export interface ComponentScore {
  key: ComponentKey;
  label: string;
  /** ค่าดิบที่วัดได้ แสดงเป็นข้อความ เช่น "0.812" */
  raw: string;
  /** คะแนนขององค์ประกอบนี้ 0-100 */
  score: number;
  /** น้ำหนักที่ใช้จริง (% หลัง normalize) */
  weight: number;
  /** คะแนนที่ส่งเข้าคะแนนรวม = score × weight ÷ 100 */
  points: number;
  /** สูตรที่ใช้จริงพร้อมตัวเลข — เอาไว้โชว์ให้ผู้ใช้ตรวจย้อนหลังได้ */
  detail: string;
}

export interface ConfidenceResult {
  score: number;
  band: ConfidenceBand;
  needsReview: boolean;
  components: ComponentScore[];
  topSimilarity: number;
  margin: number;
  /** จำนวนผู้สมัครอันดับรองที่คะแนนสูสีกับอันดับ 1 */
  tieCount: number;
}

/** ---------- ความครบของช่องกรอก ---------- */

/**
 * ระบบจะไม่ประเมินรายการที่กรอกไม่ครบทั้งสามช่อง
 * เพราะคะแนนแบบถ่วงน้ำหนักไม่มีการ veto — ข้อมูลที่ขาดไปหนึ่งช่องยังได้คะแนนรวมสูงได้
 * ถ้าองค์ประกอบอื่นดี ซึ่งทำให้ตัวเลขที่แสดงหลอกตาผู้ใช้
 */
export const REQUIRED_FIELDS = [
  { key: "scenario", label: "สถานการณ์" },
  { key: "rootCause", label: "สาเหตุ" },
  { key: "impact", label: "ผลกระทบ" },
] as const;

/** คืนชื่อช่องที่ยังว่างอยู่ (ว่างหมด = คืนครบทั้งสาม) */
export function missingFields(input: { scenario?: string; rootCause?: string; impact?: string }): string[] {
  return REQUIRED_FIELDS.filter((f) => !(input[f.key] ?? "").trim()).map((f) => f.label);
}

/** แถวที่ไม่มีข้อมูลเลยสักช่อง = แถวว่าง ไม่ใช่แถวที่กรอกไม่ครบ (เช่นบรรทัดคั่นใน Excel) */
export function isBlankInput(input: { scenario?: string; rootCause?: string; impact?: string }): boolean {
  return missingFields(input).length === REQUIRED_FIELDS.length;
}

/** ---------- ตัวช่วยเล็ก ๆ ---------- */

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const r1 = (x: number) => Math.round(x * 10) / 10;
const r3 = (x: number) => Math.round(x * 1000) / 1000;
const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

/** เติมค่าที่ขาดด้วยค่าเริ่มต้น + กันค่าที่ใส่มาผิดช่วง (ใช้ทั้งตอนอ่านไฟล์และตอนบันทึก) */
export function normalizeConfig(input: unknown): ConfidenceConfig {
  const d = DEFAULT_CONFIDENCE;
  const c = (input ?? {}) as Partial<ConfidenceConfig>;

  const w = c.weights ?? d.weights;
  const sim = c.similarity ?? d.similarity;
  const mg = c.margin ?? d.margin;
  const cp = c.completeness ?? d.completeness;

  const floor = clamp(num(sim.floor, d.similarity.floor), 0, 0.99);
  const ceil = clamp(num(sim.ceil, d.similarity.ceil), floor + 0.01, 1);

  let bands = (Array.isArray(c.bands) && c.bands.length >= 2 ? c.bands : d.bands)
    .map((b, i) => ({
      label: String(b?.label ?? `ระดับ ${i + 1}`).slice(0, 40) || `ระดับ ${i + 1}`,
      min: clamp(num(b?.min, 0), 0, 100),
      color: BAND_COLORS.includes(b?.color as BandColor) ? (b.color as BandColor) : BAND_COLORS[i % BAND_COLORS.length],
      action: String(b?.action ?? ""),
    }))
    .sort((a, b) => b.min - a.min);
  bands[bands.length - 1].min = 0; // ระดับล่างสุดต้องรับทุกคะแนนที่เหลือ
  bands = bands.slice(0, 6);

  return {
    weights: {
      similarity: clamp(num(w.similarity, d.weights.similarity), 0, 100),
      margin: clamp(num(w.margin, d.weights.margin), 0, 100),
      completeness: clamp(num(w.completeness, d.weights.completeness), 0, 100),
    },
    similarity: { floor, ceil },
    margin: {
      full: clamp(num(mg.full, d.margin.full), 0.005, 0.5),
      tieBand: clamp(num(mg.tieBand, d.margin.tieBand), 0, 0.2),
      tiePenalty: clamp(num(mg.tiePenalty, d.margin.tiePenalty), 0, 50),
    },
    completeness: {
      fieldWeight: clamp(num(cp.fieldWeight, d.completeness.fieldWeight), 0, 100),
      llmWeight: clamp(num(cp.llmWeight, d.completeness.llmWeight), 0, 100),
      minChars: Math.round(clamp(num(cp.minChars, d.completeness.minChars), 1, 500)),
    },
    bands,
    reviewBelow: clamp(num(c.reviewBelow, d.reviewBelow), 0, 100),
  };
}

/** น้ำหนักที่ใช้จริง — ถ้าผู้ใช้ตั้งไม่ครบ 100 จะเกลี่ยให้เป็นสัดส่วน 100 อัตโนมัติ */
export function effectiveWeights(cfg: ConfidenceConfig) {
  const { similarity, margin, completeness } = cfg.weights;
  const sum = similarity + margin + completeness;
  // ตั้งเป็นศูนย์หมด = คะแนนไม่มีความหมาย ถอยไปใช้ค่าเริ่มต้นแทนการเดา
  if (sum <= 0) return { ...DEFAULT_CONFIDENCE.weights, sum: 0 };
  return {
    similarity: (similarity / sum) * 100,
    margin: (margin / sum) * 100,
    completeness: (completeness / sum) * 100,
    sum,
  };
}

/** ---------- องค์ประกอบที่ 1: ความใกล้เคียง ---------- */

export function similarityScore(top: number, cfg: ConfidenceConfig): number {
  const { floor, ceil } = cfg.similarity;
  return clamp01((top - floor) / (ceil - floor)) * 100;
}

/** ---------- องค์ประกอบที่ 2: ระยะห่าง (ชัดเจนแค่ไหนว่าเป็นตัวนี้ ไม่ใช่ตัวอื่น) ---------- */

export function marginScore(neighbors: number[], cfg: ConfidenceConfig) {
  const top = neighbors[0] ?? 0;
  const second = neighbors[1] ?? 0;
  const margin = Math.max(0, top - second);
  const base = clamp01(margin / cfg.margin.full) * 100;
  // นับเฉพาะอันดับ 3 ลงไปที่ยังสูสีกับอันดับ 1 — อันดับ 2 ถูกคิดไปแล้วในค่า margin ข้างบน
  // ถ้านับอันดับ 2 ด้วยจะเป็นการหักซ้ำสัญญาณเดิม
  const tieCount = neighbors.filter((s, i) => i >= 2 && top - s <= cfg.margin.tieBand).length;
  const score = Math.max(0, base - tieCount * cfg.margin.tiePenalty);
  return { score, base, margin, tieCount };
}

/** ---------- องค์ประกอบที่ 3: ความครบถ้วนของข้อมูลนำเข้า ---------- */

export function fieldCoverage(fields: ConfidenceSignals["fields"], minChars: number) {
  const entries: { label: string; len: number; score: number }[] = (
    [["สถานการณ์", fields.scenario], ["สาเหตุ", fields.rootCause], ["ผลกระทบ", fields.impact]] as const
  ).map(([label, text]) => {
    const len = (text ?? "").trim().length;
    return { label, len, score: len === 0 ? 0 : clamp01(len / minChars) * 100 };
  });
  const score = entries.reduce((a, e) => a + e.score, 0) / entries.length;
  return { entries, score };
}

export function completenessScore(signals: ConfidenceSignals, cfg: ConfidenceConfig) {
  const cov = fieldCoverage(signals.fields, cfg.completeness.minChars);
  const llm = signals.llmSufficiency === null ? null : clamp(signals.llmSufficiency, 0, 100);

  // โมเดลไม่ได้ตอบ → ใช้เฉพาะการนับความยาวข้อความ (ไม่เดาแทนโมเดล)
  if (llm === null) return { score: cov.score, cov, llm, usedLlm: false };

  const fw = cfg.completeness.fieldWeight;
  const lw = cfg.completeness.llmWeight;
  const sum = fw + lw;
  const score = sum <= 0 ? cov.score : (fw * cov.score + lw * llm) / sum;
  return { score, cov, llm, usedLlm: true };
}

/** ---------- ประกอบร่าง ---------- */

export function bandFor(score: number, cfg: ConfidenceConfig): ConfidenceBand {
  return cfg.bands.find((b) => score >= b.min) ?? cfg.bands[cfg.bands.length - 1];
}

export function computeConfidence(signals: ConfidenceSignals, cfg: ConfidenceConfig): ConfidenceResult {
  const w = effectiveWeights(cfg);
  const top = signals.neighbors[0] ?? 0;

  const s1 = similarityScore(top, cfg);
  const m = marginScore(signals.neighbors, cfg);
  const c = completenessScore(signals, cfg);

  const components: ComponentScore[] = [
    {
      key: "similarity",
      label: "ความใกล้เคียง",
      raw: r3(top).toFixed(3),
      score: r1(s1),
      weight: r1(w.similarity),
      points: r1((s1 * w.similarity) / 100),
      detail: `(${r3(top).toFixed(3)} − ${cfg.similarity.floor}) ÷ (${cfg.similarity.ceil} − ${cfg.similarity.floor}) = ${r1(s1)} คะแนน`,
    },
    {
      key: "margin",
      label: "ระยะห่างจากอันดับสอง",
      raw: r3(m.margin).toFixed(3),
      score: r1(m.score),
      weight: r1(w.margin),
      points: r1((m.score * w.margin) / 100),
      detail:
        `${r3(m.margin).toFixed(3)} ÷ ${cfg.margin.full} = ${r1(m.base)} คะแนน` +
        (m.tieCount > 0 ? ` แล้วหัก ${m.tieCount} × ${cfg.margin.tiePenalty} เพราะมีตัวเลือกสูสี ${m.tieCount} รายการ = ${r1(m.score)} คะแนน` : ""),
    },
    {
      key: "completeness",
      label: "ความครบถ้วนของข้อมูล",
      raw: c.cov.entries.map((e) => `${e.label} ${e.len} อักษร`).join(" · "),
      score: r1(c.score),
      weight: r1(w.completeness),
      points: r1((c.score * w.completeness) / 100),
      detail: c.usedLlm
        ? `ความยาวข้อความได้ ${r1(c.cov.score)} (น้ำหนัก ${cfg.completeness.fieldWeight}) · AI ประเมินให้ ${r1(c.llm ?? 0)} (น้ำหนัก ${cfg.completeness.llmWeight}) รวมเป็น ${r1(c.score)} คะแนน`
        : `AI ไม่ได้ตอบความเพียงพอ จึงใช้เฉพาะความยาวข้อความ = ${r1(c.score)} คะแนน`,
    },
  ];

  const score = r1(components.reduce((a, x) => a + x.points, 0));
  const band = bandFor(score, cfg);

  return {
    score,
    band,
    needsReview: score < cfg.reviewBelow,
    components,
    topSimilarity: r3(top),
    margin: r3(m.margin),
    tieCount: m.tieCount,
  };
}
