import { getConfidenceConfig, saveConfidenceConfig, resetConfidenceConfig } from "@/lib/rag/confidence-store";
import { DEFAULT_CONFIDENCE } from "@/lib/rag/confidence";

// เกณฑ์การให้คะแนนความมั่นใจ — อ่าน/บันทึกจากหน้า /settings/confidence
export async function GET() {
  return Response.json({ config: getConfidenceConfig(), defaults: DEFAULT_CONFIDENCE });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return new Response("ข้อมูลไม่ถูกต้อง", { status: 400 });
  const config = body.reset ? resetConfidenceConfig() : saveConfidenceConfig(body.config ?? body);
  return Response.json({ ok: true, config });
}
