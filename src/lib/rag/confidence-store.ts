import fs from "node:fs";
import path from "node:path";
import { DEFAULT_CONFIDENCE, normalizeConfig, type ConfidenceConfig } from "./confidence";

// เก็บเกณฑ์ที่ผู้ใช้ตั้งไว้ในไฟล์เดียว แยกจาก settings.json (คนละเรื่องกัน: อันนั้นคือ provider/key)
const FILE = path.join(process.cwd(), "data", "confidence.json");

/** อ่านเกณฑ์ปัจจุบัน — ยังไม่เคยตั้งค่า = ใช้ค่าเริ่มต้น */
export function getConfidenceConfig(): ConfidenceConfig {
  try {
    return normalizeConfig(JSON.parse(fs.readFileSync(FILE, "utf-8")));
  } catch {
    return DEFAULT_CONFIDENCE;
  }
}

/** บันทึกเกณฑ์ทั้งชุด (หน้าเว็บส่งมาทั้งก้อน) — normalize ก่อนเสมอ กันค่าที่ผิดช่วง */
export function saveConfidenceConfig(input: unknown): ConfidenceConfig {
  const next = normalizeConfig(input);
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(next, null, 2));
  } catch (err) {
    console.warn("Unable to save confidence config (read-only environment):", err);
  }
  return next;
}

/** คืนค่าเริ่มต้น (ปุ่ม "รีเซ็ตเป็นค่าเริ่มต้น" ในหน้าตั้งค่า) */
export function resetConfidenceConfig(): ConfidenceConfig {
  return saveConfidenceConfig(DEFAULT_CONFIDENCE);
}
