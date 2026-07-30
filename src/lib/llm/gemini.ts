import { GoogleGenAI } from "@google/genai";
import type { LLMProvider } from "./provider";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL ?? "text-embedding-004";
const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL ?? "gemini-2.5-flash";

export const geminiProvider: LLMProvider = {
  async embed(texts) {
    const res = await ai.models.embedContent({
      model: EMBED_MODEL,
      contents: texts,
    });
    // Gemini คืน embeddings เป็น array ของ object ที่มี .values (เวกเตอร์)
    return (res.embeddings ?? []).map((e) => e.values ?? []);
  },

  async *chatStream(systemPrompt, userPrompt) {
    const stream = await ai.models.generateContentStream({
      model: CHAT_MODEL,
      contents: userPrompt,
      config: { systemInstruction: systemPrompt },
    });
    for await (const chunk of stream) {
      if (chunk.text) yield chunk.text;
    }
  },

  async generateJSON(systemPrompt, userPrompt) {
    const res = await ai.models.generateContent({
      model: CHAT_MODEL,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json", // บังคับให้ Gemini ตอบเป็น JSON ที่ parse ได้
      },
    });
    return res.text ?? "";
  },
};
