import type { Provider } from "./settings";

// โควตา generate ฟรีต่อวัน (โดยประมาณ — ใช้เป็นตัวเทียบคร่าว ๆ เท่านั้น)
export const DAILY_LIMIT: Record<Provider, number> = {
  typhoon: 500,
  groq: 1000,
  gemini: 20,
};

// นับจำนวนครั้งที่เรียก generate ต่อ provider ต่อวัน (เก็บในหน่วยความจำของเซิร์ฟเวอร์)
let date = new Date().toISOString().slice(0, 10);
let counts: Partial<Record<Provider, number>> = {};

function rollover() {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== date) { date = today; counts = {}; }
}

export function bumpUsage(p: Provider) {
  rollover();
  counts[p] = (counts[p] ?? 0) + 1;
}

export function getUsage(): { date: string; counts: Partial<Record<Provider, number>> } {
  rollover();
  return { date, counts: { ...counts } };
}
