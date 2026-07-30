import { assessWithRetry } from "@/lib/csv/batch";

// รับ input 1 เคส (scenario/rootCause/impact) แล้วคืนผลประเมินเป็น JSON
// ฝั่งเว็บจะเรียกทีละแถวเพื่อโชว์ความคืบหน้าแบบ real-time
export async function POST(req: Request) {
  const input = await req.json().catch(() => null);
  if (!input || (!input.scenario && !input.rootCause && !input.impact)) {
    return new Response("input ว่าง", { status: 400 });
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
