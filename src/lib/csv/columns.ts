export type Row = Record<string, string>;

/**
 * รวมชื่อคอลัมน์จากทุกแถว โดยคงลำดับที่พบครั้งแรกไว้
 *
 * จำเป็นตอน export เป็น CSV เพราะ Papa.unparse ยึดคอลัมน์จาก "แถวแรก" เท่านั้น
 * ถ้าแถวแรกเป็นแถวว่างหรือแถวที่กรอกไม่ครบ (ซึ่งไม่มีคอลัมน์ผลประเมิน)
 * คอลัมน์ผลประเมินของทั้งไฟล์จะหายไปเงียบ ๆ
 *
 * แยกไว้เป็นไฟล์ต่างหากเพราะหน้าเว็บฝั่ง browser ต้องใช้ด้วย
 * ส่วน batch.ts มี fs ติดมาทางอ้อม จึง import จากฝั่ง client ไม่ได้
 */
export function unionColumns(rows: Row[]): string[] {
  const seen = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) seen.add(k);
  return [...seen];
}
