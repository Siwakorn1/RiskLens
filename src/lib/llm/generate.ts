import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { getSettings, keyFor, type Provider } from "./settings";
import { bumpUsage } from "./usage";

// provider ที่ใช้ API แบบ OpenAI-compatible (Typhoon/Groq/Cerebras)
const BASE_URL: Partial<Record<Provider, string>> = {
  typhoon: "https://api.opentyphoon.ai/v1",
  groq: "https://api.groq.com/openai/v1",
};

// สร้างคำตอบเป็น JSON โดยเลือก provider/model ตาม settings ปัจจุบัน
export async function generateJSON(system: string, user: string): Promise<string> {
  const s = getSettings();
  bumpUsage(s.provider);
  if (s.provider === "gemini") {
    const ai = new GoogleGenAI({ apiKey: keyFor("gemini") });
    const res = await ai.models.generateContent({
      model: s.model,
      contents: user,
      config: { systemInstruction: system, responseMimeType: "application/json" },
    });
    return res.text ?? "";
  }
  const client = new OpenAI({ apiKey: keyFor(s.provider), baseURL: BASE_URL[s.provider] });
  const res = await client.chat.completions.create({
    model: s.model,
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
  });
  return res.choices[0]?.message?.content ?? "";
}

export async function* chatStream(system: string, user: string): AsyncIterable<string> {
  const s = getSettings();
  if (s.provider === "gemini") {
    const ai = new GoogleGenAI({ apiKey: keyFor("gemini") });
    const stream = await ai.models.generateContentStream({
      model: s.model, contents: user, config: { systemInstruction: system },
    });
    for await (const c of stream) if (c.text) yield c.text;
    return;
  }
  const client = new OpenAI({ apiKey: keyFor(s.provider), baseURL: BASE_URL[s.provider] });
  const stream = await client.chat.completions.create({
    model: s.model, stream: true,
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
  });
  for await (const chunk of stream) {
    const t = chunk.choices[0]?.delta?.content;
    if (t) yield t;
  }
}
