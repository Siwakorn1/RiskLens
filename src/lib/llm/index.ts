import { geminiProvider } from "./gemini";
import { generateJSON, chatStream } from "./generate";
import type { LLMProvider } from "./provider";

// embed ใช้ Gemini เสมอ; generate เลือก provider/model ได้จากหน้า Settings (ดู ./generate + ./settings)
export const llm: LLMProvider = {
  embed: geminiProvider.embed,
  chatStream,
  generateJSON,
};
