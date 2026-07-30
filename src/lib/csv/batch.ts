import { assess, type Assessment } from "../rag/assess";

export type Row = Record<string, string>;

/** ชื่อคอลัมน์ที่ใช้เป็น input (ปรับได้ตามไฟล์ที่อัปมา) */
export interface ColumnMap {
  scenario: string;
  rootCause: string;
  impact: string;
}

export const DEFAULT_COLUMNS: ColumnMap = {
  scenario: "Scenario",
  rootCause: "Root Cause",
  impact: "Impact",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ประเมิน 1 เคส พร้อม retry อัตโนมัติเมื่อ error ชั่วคราว:
// 429 = ชนโควตา, 503/500 = โมเดลโหลดสูง/เซิร์ฟเวอร์สะดุด (ลองใหม่ได้)
export async function assessWithRetry(input: Parameters<typeof assess>[0]): Promise<Assessment> {
  const MAX = 3; // ลองไม่กี่ครั้งแล้วยอมแพ้ (กันค้างนานเมื่อ provider โดนจำกัดโควตา เช่น Groq/Gemini free)
  for (let attempt = 1; ; attempt++) {
    try {
      return await assess(input);
    } catch (e) {
      const msg = String(e instanceof Error ? e.message : e);
      const is429 = msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED");
      const isTransient = msg.includes("503") || msg.includes("UNAVAILABLE") ||
        msg.includes("500") || msg.includes("INTERNAL");
      if ((is429 || isTransient) && attempt < MAX) {
        // รอไม่เกิน 12 วิ/ครั้ง — ไม่รอตามที่ provider บอก (บางทีบอกเป็นนาที จะได้ไม่ค้าง)
        await sleep(Math.min(12000, 4000 * attempt));
        continue;
      }
      throw e;
    }
  }
}

/** เติมคอลัมน์ผลประเมินลงในแถวเดิม (คงคอลัมน์อื่นไว้ครบ) */
function fill(row: Row, r: Assessment): Row {
  return {
    ...row,
    "Risk Level 1": r.level1 ?? "",
    "Risk Level 2": r.level2 ?? "",
    "Risk Level 3": r.rfCode ? `${r.rfCode} ${r.level3Name ?? ""}` : "",
    Remark: r.classificationReason,
    Likelihood: String(r.likelihood),
    "Impact Score": String(r.impactScore),
    "Risk Zone": r.zone,
    Management: r.managementAction,
    Confidence: r.confidence,
    Status: r.status,
    _confidence_score: String(r.confidenceScore),
  };
}

/** ประเมินทุกแถวใน CSV — ข้ามแถวที่ input ว่าง, รายงานความคืบหน้าได้ */
export async function assessRows(
  rows: Row[],
  cols: ColumnMap = DEFAULT_COLUMNS,
  onProgress?: (done: number, total: number) => void
): Promise<Row[]> {
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const input = {
      scenario: (row[cols.scenario] ?? "").trim(),
      rootCause: (row[cols.rootCause] ?? "").trim(),
      impact: (row[cols.impact] ?? "").trim(),
    };
    if (!input.scenario && !input.rootCause && !input.impact) {
      out.push(row); // แถวว่าง ข้ามไป
    } else {
      out.push(fill(row, await assessWithRetry(input)));
      await sleep(400); // เว้นจังหวะเล็กน้อยกัน rate limit
    }
    onProgress?.(i + 1, rows.length);
  }
  return out;
}
