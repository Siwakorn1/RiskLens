import { assessWithRetry } from "@/lib/csv/batch";
import { missingFields, isBlankInput } from "@/lib/rag/confidence";

// รับ input 1 เคส (scenario/rootCause/impact) แล้วคืนผลประเมินเป็น JSON
// ฝั่งเว็บจะเรียกทีละแถวเพื่อโชว์ความคืบหน้าแบบ real-time
export async function POST(req: Request) {
  const input = await req.json().catch(() => null);
  if (!input || isBlankInput(input)) {
    return new Response("input ว่าง", { status: 400 });
  }
  // กรอกไม่ครบสามช่อง = ไม่ประเมิน และไม่เรียก AI ให้เปลืองโควตา
  const missing = missingFields(input);
  if (missing.length) {
    return Response.json({ incomplete: true, missing }, { status: 422 });
  }
  try {
    const result = await assessWithRetry({
      scenario: input.scenario ?? "",
      rootCause: input.rootCause ?? "",
      impact: input.impact ?? "",
    });
    return Response.json(result);
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "assess failed", { status: 500 });
  }
}
