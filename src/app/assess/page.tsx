"use client";

import { useState } from "react";
import Link from "next/link";

interface Assessment {
  rfCode: string | null; level1: string | null; level2: string | null; level3Name: string | null;
  classificationReason: string; likelihood: number; likelihoodReason: string;
  impactScore: number; impactDimension: string; impactReason: string;
  zone: string; managementColor: string; managementAction: string;
  confidence: string; status: string; topSimilarity: number; margin: number;
}

const ZONE_DOT: Record<string, string> = {
  "สูงมาก": "bg-red-500", "สูง": "bg-orange-500", "ปานกลาง": "bg-amber-400", "ต่ำ": "bg-emerald-500", "ต่ำมาก": "bg-emerald-400",
};
const CONF_DOT: Record<string, string> = {
  "แน่นอน": "bg-emerald-500", "ค่อนข้างแน่ใจ": "bg-sky-500", "ไม่แน่ใจ": "bg-amber-400", "คลุมเครือ": "bg-rose-500",
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

  async function run() {
    if (!scenario && !rootCause && !impact) return;
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

        <button onClick={run} disabled={busy} className="mt-6 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-[#0b1233] transition hover:bg-slate-200 disabled:opacity-50">
          {busy ? "กำลังประเมิน..." : "ประเมิน"}
        </button>

        {err && <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-[15px] text-rose-300">{err}</div>}

        {result && (
          <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.05] p-8 backdrop-blur-sm">
            <div className="mb-6 flex flex-wrap items-center gap-4">
              <span className="text-2xl font-bold text-white">{result.rfCode ?? "ไม่พบหมวด"}</span>
              <span className="inline-flex items-center gap-2 text-[15px] text-slate-200"><span className={`h-2.5 w-2.5 rounded-full ${ZONE_DOT[result.zone] ?? "bg-white/30"}`} />โซน {result.zone}</span>
              <span className="inline-flex items-center gap-2 text-[15px] text-slate-200"><span className={`h-2.5 w-2.5 rounded-full ${CONF_DOT[result.confidence] ?? "bg-white/30"}`} />{result.confidence}</span>
              <span className="text-[15px] text-slate-400">{result.status}</span>
            </div>
            <Row label="หมวดความเสี่ยง">{result.level1}, {result.level2}, {result.level3Name}</Row>
            <Row label="เหตุผลการจัดหมวด">{result.classificationReason}</Row>
            <Row label={`โอกาสเกิด ระดับ ${result.likelihood}`}>{result.likelihoodReason}</Row>
            <Row label={`ผลกระทบ ระดับ ${result.impactScore} ด้าน ${result.impactDimension}`}>{result.impactReason}</Row>
            <Row label="แนวทางจัดการ">{result.managementAction}</Row>
          </div>
        )}
      </main>
    </div>
  );
}
