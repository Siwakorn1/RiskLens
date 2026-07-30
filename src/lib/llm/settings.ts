import fs from "node:fs";
import path from "node:path";

export type Provider = "typhoon" | "groq" | "gemini";
export const PROVIDERS: Provider[] = ["typhoon", "groq", "gemini"];

export const PROVIDER_LABEL: Record<Provider, string> = {
  typhoon: "Typhoon (ไทย)", groq: "Groq", gemini: "Google Gemini",
};

export const DEFAULT_MODEL: Record<Provider, string> = {
  typhoon: "typhoon-v2.5-30b-a3b-instruct",
  groq: "llama-3.3-70b-versatile",
  gemini: "gemini-flash-latest",
};

const ENV_KEY: Record<Provider, string> = {
  typhoon: "TYPHOON_API_KEY", groq: "GROQ_API_KEY", gemini: "GEMINI_API_KEY",
};

export interface Settings {
  provider: Provider;
  model: string;
  keys: Partial<Record<Provider, string>>;
}

const FILE = path.join(process.cwd(), "data", "settings.json");

export function getSettings(): Settings {
  let file: Partial<Settings> = {};
  try { file = JSON.parse(fs.readFileSync(FILE, "utf-8")); } catch { /* ยังไม่เคยตั้งค่า ใช้ค่าเริ่มต้น */ }
  const provider = (file.provider as Provider) ?? "typhoon";
  return { provider, model: file.model || DEFAULT_MODEL[provider], keys: file.keys ?? {} };
}

export function saveSettings(patch: Partial<Settings>): Settings {
  const cur = getSettings();
  const next: Settings = {
    provider: patch.provider ?? cur.provider,
    model: patch.model ?? cur.model,
    keys: { ...cur.keys, ...(patch.keys ?? {}) },
  };
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(next, null, 2));
  return next;
}

// key ของ provider: ใช้ค่าที่ตั้งผ่านหน้าเว็บก่อน ถ้าไม่มีค่อยใช้จาก .env.local
export function keyFor(p: Provider): string {
  const s = getSettings();
  return s.keys[p] || process.env[ENV_KEY[p]] || "";
}
