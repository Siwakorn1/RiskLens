"use client";

import { useState } from "react";
import Link from "next/link";
import { BAND_BAR, BAND_DOT, BAND_TEXT, missingFields, type BandColor, type ComponentScore } from "@/lib/rag/confidence";

interface Assessment {
  rfCode: string | null; level1: string | null; level2: string | null; level3Name: string | null;
  classificationReason: string; likelihood: number; likelihoodReason: string;
  impactScore: number; impactDimension: string; impactReason: string;
  zone: string; managementColor: string; managementAction: string;
  confidenceScore: number; confidence: string; confidenceColor: BandColor; confidenceAction: string;
  confidenceComponents: ComponentScore[]; sufficiencyScore: number | null; sufficiencyReason: string;
  needsReview: boolean; status: string; topSimilarity: number; margin: number; tieCount: number;
}

const ZONE_DOT: Record<string, string> = {
  "สูงมาก": "bg-red-500", "สูง": "bg-orange-500", "ปานกลาง": "bg-amber-400", "ต่ำ": "bg-emerald-500", "ต่ำมาก": "bg-emerald-400",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-white/10 py-4 last:border-0">
      <div className="mb-1 text-base font-bold text-white">{label}</div>
      <div className="text-[15px] leading-relaxed text-slate-300">{children}</div>
    </div>
  );
}

export default function AssessOne() {
  const [scenario, setScenario] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [impact, setImpact] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Assessment | null>(null);
  const [err, setErr] = useState("");

  // ต้องกรอกครบทั้งสามช่องถึงจะประเมินได้ — ขาดช่องใดช่องหนึ่ง คะแนนที่ได้จะไม่น่าเชื่อถือ
  const missing = missingFields({ scenario, rootCause, impact });

  async function run() {
    if (missing.length) return;
    setBusy(true); setErr(""); setResult(null);
    try {
      const res = await fetch("/api/assess", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenario, rootCause, impact }) });
      if (!res.ok) throw new Error(await res.text());
      setResult(await res.json());
    } catch (e) { setErr(e instanceof Error ? e.message : "เกิดข้อผิดพลาด"); }
    setBusy(false);
  }

  const field = "w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-[15px] text-white outline-none transition focus:border-[var(--brand)]";

  return (
    <div className="min-h-screen w-full text-slate-100">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0a1030]/60 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-[15px] text-slate-300 transition hover:text-white">กลับหน้าหลัก</Link>
          <span className="text-[15px] font-medium text-slate-200">ประเมินทีละรายการ</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">ประเมินความเสี่ยงรายการเดียว</h1>
        <p className="mt-4 text-lg text-slate-400">กรอกสถานการณ์ สาเหตุ และผลกระทบ แล้วให้ระบบประเมินทันที</p>

        <div className="mt-10 space-y-4">
          <div><div className="mb-2 text-[15px] font-semibold text-white">สถานการณ์ (Scenario)</div><textarea value={scenario} onChange={(e) => setScenario(e.target.value)} rows={2} className={field} /></div>
          <div><div className="mb-2 text-[15px] font-semibold text-white">สาเหตุ (Root Cause)</div><textarea value={rootCause} onChange={(e) => setRootCause(e.target.value)} rows={2} className={field} /></div>
          <div><div className="mb-2 text-[15px] font-semibold text-white">ผลกระทบ (Impact)</div><textarea value={impact} onChange={(e) => setImpact(e.target.value)} rows={2} className={field} /></div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button onClick={run} disabled={busy || missing.length > 0}
            className="rounded-full bg-white px-8 py-3.5 text-base font-semibold text-[#0b1233] transition hover:bg-slate-200 disabled:opacity-40">
            {busy ? "กำลังประเมิน..." : "ประเมิน"}
          </button>
          {missing.length > 0 && (
            <span className="text-[15px] text-amber-400">
              ต้องกรอกให้ครบทั้งสามช่องก่อน ยังขาด{missing.join(" ")}
            </span>
          )}
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-500">
          ระบบไม่ประเมินรายการที่กรอกไม่ครบ เพราะคะแนนความมั่นใจคิดจากทั้งความตรงของหมวดและความครบของข้อมูล
          หากขาดช่องใดไป คะแนนที่ได้จะสูงเกินความเป็นจริง
        </p>

        {err && <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-[15px] text-rose-300">{err}</div>}

        {result && (
          <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.05] p-8 backdrop-blur-sm">
            <div className="mb-6 flex flex-wrap items-center gap-4">
              <span className="text-2xl font-bold text-white">{result.rfCode ?? "ไม่พบหมวด"}</span>
              <span className="inline-flex items-center gap-2 text-[15px] text-slate-200"><span className={`h-2.5 w-2.5 rounded-full ${ZONE_DOT[result.zone] ?? "bg-white/30"}`} />โซน {result.zone}</span>
              <span className="inline-flex items-center gap-2 text-[15px] text-slate-200"><span className={`h-2.5 w-2.5 rounded-full ${BAND_DOT[result.confidenceColor] ?? "bg-white/30"}`} />{result.confidence}</span>
              <span className="text-[15px] text-slate-400">{result.status}</span>
            </div>
            <Row label="หมวดความเสี่ยง">{result.level1}, {result.level2}, {result.level3Name}</Row>
            <Row label="เหตุผลการจัดหมวด">{result.classificationReason}</Row>
            <Row label={`โอกาสเกิด ระดับ ${result.likelihood}`}>{result.likelihoodReason}</Row>
            <Row label={`ผลกระทบ ระดับ ${result.impactScore} ด้าน ${result.impactDimension}`}>{result.impactReason}</Row>
            <Row label="แนวทางจัดการ">{result.managementAction}</Row>

            {/* คะแนนความมั่นใจ พร้อมที่มาของทุกคะแนน — ตรวจย้อนหลังได้ว่าเลขนี้มาจากไหน */}
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-6">
              <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
                <span className={`text-6xl font-bold tabular-nums ${BAND_TEXT[result.confidenceColor] ?? "text-white"}`}>
                  {result.confidenceScore.toFixed(1)}
                </span>
                <span className="text-lg text-slate-400">จาก 100 คะแนน</span>
                <span className="ml-auto text-[15px] text-slate-300">{result.confidence} · {result.confidenceAction}</span>
              </div>

              <div className="mt-7 space-y-5">
                {result.confidenceComponents.map((c) => (
                  <div key={c.key}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[15px]">
                      <span className="font-semibold text-white">{c.label}</span>
                      <span className="tabular-nums text-slate-300">
                        {c.score.toFixed(1)} × {c.weight.toFixed(0)}% = <span className="font-semibold text-white">{c.points.toFixed(1)}</span>
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div className={`h-full rounded-full ${BAND_BAR[result.confidenceColor] ?? "bg-white/40"}`} style={{ width: `${c.score}%` }} />
                    </div>
                    <div className="mt-1.5 text-sm leading-relaxed text-slate-500">{c.detail}</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 border-t border-white/10 pt-4 text-[15px] text-slate-300">
                รวม {result.confidenceComponents.map((c) => c.points.toFixed(1)).join(" + ")} ={" "}
                <span className="font-semibold text-white">{result.confidenceScore.toFixed(1)} คะแนน</span>
                {result.tieCount > 0 && <span className="text-slate-500"> · มีความเสี่ยงอื่นที่คะแนนสูสี {result.tieCount} รายการ</span>}
              </div>
              {result.sufficiencyReason && (
                <div className="mt-3 text-sm leading-relaxed text-slate-500">AI ให้เหตุผลเรื่องความครบถ้วน: {result.sufficiencyReason}</div>
              )}
              <Link href="/settings/confidence" className="mt-4 inline-block text-sm font-medium text-indigo-300 transition hover:text-indigo-200">
                ปรับน้ำหนักและช่วงคะแนน
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
