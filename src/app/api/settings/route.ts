import { getSettings, saveSettings, keyFor, DEFAULT_MODEL, PROVIDERS, PROVIDER_LABEL, type Provider, type Settings } from "@/lib/llm/settings";
import { getUsage, DAILY_LIMIT } from "@/lib/llm/usage";

export async function GET() {
  const s = getSettings();
  // คืนแค่สถานะว่ามี key หรือยัง (boolean) ไม่ส่งค่า key จริงออกไปที่เบราว์เซอร์
  const keyStatus = Object.fromEntries(PROVIDERS.map((p) => [p, !!keyFor(p)]));
  return Response.json({
    provider: s.provider, model: s.model, keyStatus,
    providers: PROVIDERS, labels: PROVIDER_LABEL, defaultModels: DEFAULT_MODEL,
    usage: getUsage().counts, dailyLimit: DAILY_LIMIT,
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const patch: Partial<Settings> = {};
  if (body.provider && PROVIDERS.includes(body.provider)) patch.provider = body.provider as Provider;
  if (typeof body.model === "string") patch.model = body.model;
  if (body.keyProvider && PROVIDERS.includes(body.keyProvider) && typeof body.key === "string" && body.key.trim()) {
    patch.keys = { [body.keyProvider as Provider]: body.key.trim() };
  }
  const s = saveSettings(patch);
  return Response.json({ ok: true, provider: s.provider, model: s.model });
}
