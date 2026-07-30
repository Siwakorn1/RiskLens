"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Papa from "papaparse";
import * as XLSX from "xlsx";

type Row = Record<string, string>;

interface Assessment {
  rfCode: string | null;
  level1: string | null;
  level2: string | null;
  level3Name: string | null;
  classificationReason: string;
  likelihood: number;
  likelihoodReason: string;
  impactScore: number;
  impactDimension: string;
  impactReason: string;
  zone: string;
  managementColor: string;
  managementAction: string;
  confidence: string;
  confidenceScore: number;
  status: string;
  topSimilarity: number;
  margin: number;
}

const ZONE_DOT: Record<string, string> = {
  "สูงมาก": "bg-red-500", "สูง": "bg-orange-500", "ปานกลาง": "bg-amber-400",
  "ต่ำ": "bg-emerald-500", "ต่ำมาก": "bg-emerald-400",
};
const ZONE_FILL: Record<string, string> = {
  "สูงมาก": "bg-red-500 text-white", "สูง": "bg-orange-400 text-white",
  "ปานกลาง": "bg-amber-300 text-amber-950", "ต่ำ": "bg-emerald-300 text-emerald-950",
  "ต่ำมาก": "bg-emerald-200 text-emerald-950",
};
const CONF_DOT: Record<string, string> = {
  "แน่นอน": "bg-emerald-500", "ค่อนข้างแน่ใจ": "bg-sky-500",
  "ไม่แน่ใจ": "bg-amber-400", "คลุมเครือ": "bg-rose-500",
};
const ZONE_GRID: Record<number, string[]> = {
  5: ["สูงมาก", "สูงมาก", "สูงมาก", "สูงมาก", "สูงมาก"],
  4: ["ปานกลาง", "ปานกลาง", "สูง", "สูงมาก", "สูงมาก"],
  3: ["ปานกลาง", "ปานกลาง", "สูง", "สูง", "สูง"],
  2: ["ต่ำ", "ต่ำ", "ปานกลาง", "ปานกลาง", "สูง"],
  1: ["ต่ำ", "ต่ำ", "ปานกลาง", "ปานกลาง", "ปานกลาง"],
};

const CARD = "group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:border-[var(--brand)] hover:shadow-2xl hover:shadow-black/40";

function Glow() {
  return <div className="pointer-events-none absolute inset-0 bg-gradient-to-bl from-[var(--brand-soft)] to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />;
}

function Tag({ dot, text }: { dot: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[15px] text-slate-200">
      <span className={`h-2 w-2 rounded-full ${dot}`} />{text}
    </span>
  );
}

// เอฟเฟกต์ค่อย ๆ ลอยขึ้นเมื่อเลื่อนมาถึง (แบบ Apple)
function Reveal({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      setShown(e.isIntersecting); // เข้ามาในจอ = ลอยเข้า, ออกจากจอ = ลอยหายไป (สองทาง)
    }, { threshold: 0.25 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={`transition-all duration-700 ease-out ${shown ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}`}>
      {children}
    </div>
  );
}

// เดาว่าคอลัมน์ไหนคือ scenario/rootCause/impact จากชื่อหัวคอลัมน์
function detectCol(headers: string[], cands: string[]): string {
  const low = headers.map((h) => h.toLowerCase().trim());
  for (const c of cands) { const i = low.indexOf(c); if (i >= 0) return headers[i]; }
  return "";
}

export default function Home() {
  const [rows, setRows] = useState<Row[]>([]);
  const [results, setResults] = useState<(Assessment | null)[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [fileName, setFileName] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [cols, setCols] = useState({ scenario: "", rootCause: "", impact: "" });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "review" | "high">("all");

  const stats = useMemo(() => {
    const d = results.filter(Boolean) as Assessment[];
    const review = d.filter((a) => a.status.includes("ต้องตรวจ")).length;
    const high = d.filter((a) => a.zone === "สูง" || a.zone === "สูงมาก").length;
    const confident = d.filter((a) => a.confidence === "แน่นอน" || a.confidence === "ค่อนข้างแน่ใจ").length;
    const grid: Record<string, number> = {};
    d.forEach((a) => { grid[`${a.impactScore}-${a.likelihood}`] = (grid[`${a.impactScore}-${a.likelihood}`] ?? 0) + 1; });
    return { total: d.length, review, high, confident, grid };
  }, [results]);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const load = (data: Row[]) => {
      const clean = data.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, String(v ?? "")]))) as Row[];
      const hdrs = clean.length ? Object.keys(clean[0]) : [];
      setHeaders(hdrs);
      setCols({
        scenario: detectCol(hdrs, ["scenario", "สถานการณ์"]),
        rootCause: detectCol(hdrs, ["root cause", "rootcause", "สาเหตุ"]),
        impact: detectCol(hdrs, ["impact", "ผลกระทบ"]),
      });
      setRows(clean); setResults([]); setDone(0); setExpanded(null); setSearch(""); setFilter("all");
    };
    if (/\.(xlsx|xls)$/i.test(file.name)) {
      const wb = XLSX.read(await file.arrayBuffer());
      load(XLSX.utils.sheet_to_json<Row>(wb.Sheets[wb.SheetNames[0]], { defval: "" }));
    } else {
      Papa.parse<Row>(file, { header: true, skipEmptyLines: true, complete: (res) => load(res.data) });
    }
    e.target.value = "";
  }

  async function assessAll() {
    setBusy(true); setDone(0);
    const out: (Assessment | null)[] = new Array(rows.length).fill(null);
    setResults([...out]);
    let completed = 0, next = 0;
    const CONCURRENCY = 12; // ประเมินพร้อมกันมากขึ้น = เร็วขึ้น (server retry กันชนโควตาอยู่แล้ว)
    const worker = async () => {
      while (next < rows.length) {
        const i = next++;
        const r = rows[i];
        const input = { scenario: r[cols.scenario] ?? "", rootCause: r[cols.rootCause] ?? "", impact: r[cols.impact] ?? "" };
        try {
          const res = await fetch("/api/assess", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
          out[i] = res.ok ? await res.json() : null;
        } catch { out[i] = null; }
        completed++; setResults([...out]); setDone(completed);
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, rows.length) }, worker));
    setBusy(false);
  }

  // รวมคอลัมน์เดิม + ผลประเมิน ไว้ใช้ทั้ง export CSV และ Excel
  function buildMerged(): Row[] {
    return rows.map((r, i) => {
      const a = results[i];
      if (!a) return r;
      return { ...r, "Risk Level 1": a.level1 ?? "", "Risk Level 2": a.level2 ?? "",
        "Risk Level 3": a.rfCode ? `${a.rfCode} ${a.level3Name ?? ""}` : "", Remark: a.classificationReason,
        Likelihood: String(a.likelihood), "Impact Score": String(a.impactScore), "Risk Zone": a.zone,
        Management: a.managementAction, Confidence: a.confidence, Status: a.status };
    });
  }
  const outName = () => fileName.replace(/\.(csv|xlsx|xls)$/i, "") + ".assessed";

  function downloadCsv() {
    const blob = new Blob(["﻿" + Papa.unparse(buildMerged())], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = outName() + ".csv"; link.click();
  }

  function downloadXlsx() {
    const merged = buildMerged();
    const ws = XLSX.utils.json_to_sheet(merged);
    // ตั้งความกว้างคอลัมน์ตามความยาวเนื้อหา (กันเซลล์เบียด) จำกัดไม่เกิน 55
    const keys = Object.keys(merged[0] ?? {});
    ws["!cols"] = keys.map((k) => {
      const maxLen = merged.reduce((m, row) => Math.max(m, String(row[k] ?? "").length), k.length);
      return { wch: Math.min(Math.max(maxLen + 2, 12), 55) };
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "RiskLens");
    XLSX.writeFile(wb, outName() + ".xlsx");
  }

  const allDone = rows.length > 0 && done === rows.length && !busy;
  const pct = rows.length ? Math.round((done / rows.length) * 100) : 0;

  // รายการที่จะแสดง หลังกรอง + ค้นหา
  const visible = rows.map((_, i) => i).filter((i) => {
    const r = rows[i], a = results[i];
    if (search) {
      const s = search.toLowerCase();
      if (!(r[cols.scenario] ?? "").toLowerCase().includes(s) && !(a?.rfCode ?? "").toLowerCase().includes(s)) return false;
    }
    if (filter === "review") return !!a && a.status.includes("ต้องตรวจ");
    if (filter === "high") return !!a && (a.zone === "สูง" || a.zone === "สูงมาก");
    return true;
  });

  return (
    <div className="min-h-screen w-full text-slate-100">
      {/* Nav */}
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0a1030]/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-12">
          <Image src="/brand/itmx-logo-white.png" alt="National ITMX" width={405} height={143} className="h-7 w-auto" priority />

          <nav className="flex items-center gap-6 text-[15px] text-slate-300">
            <Link href="/assess" className="transition hover:text-white">ประเมินทีละรายการ</Link>
            <Link href="/methodology" className="transition hover:text-white">วิธีการประเมิน</Link>
            <Link href="/settings" className="transition hover:text-white">ตั้งค่า</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 md:px-12">
        {rows.length === 0 ? (
          /* ---------- Landing ---------- */
          <div>
            <section className="flex min-h-[80vh] flex-col items-center justify-center text-center">
              <Image src="/brand/risklens-logo.png" alt="RiskLens" width={1044} height={262} className="h-24 w-auto md:h-44" priority />
              <p className="mt-10 max-w-2xl text-xl font-medium leading-relaxed text-slate-200 md:text-2xl">
                ประเมินความเสี่ยงให้เหลือเพียงคลิกเดียว<br />อัปโหลดไฟล์ แล้วให้ AI จัดหมวด ให้คะแนน และประเมินความมั่นใจ
              </p>
              <div className="mt-12 flex items-center gap-8">
                <label htmlFor="file" className="cursor-pointer rounded-full bg-white px-9 py-4 text-base font-semibold text-[#0b1233] transition hover:bg-slate-200">
                  อัปโหลดไฟล์
                </label>
                <input id="file" type="file" accept=".csv,.xlsx,.xls" onChange={onUpload} className="hidden" />
                <Link href="/assess" className="rounded-full border border-white/25 bg-white/5 px-9 py-4 text-base font-medium text-white backdrop-blur-sm transition hover:bg-white/10">ประเมินทีละรายการ</Link>
              </div>
              <div className="mt-7 text-sm text-slate-400">รองรับ CSV และ Excel</div>
            </section>

            <section className="space-y-44 py-32 text-center">
              <Reveal>
                <h2 className="mx-auto max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight text-white md:text-7xl">
                  ทุกความเสี่ยง<br />จัดหมวดอัตโนมัติ
                </h2>
                <p className="mx-auto mt-8 max-w-lg text-lg text-slate-300 md:text-xl">
                  ระบบวิเคราะห์สถานการณ์ สาเหตุ และผลกระทบ แล้วจัดหมวดตามกรอบความเสี่ยงของ NITMX พร้อมคะแนนและโซนความเสี่ยง
                </p>
              </Reveal>
              <Reveal>
                <h2 className="mx-auto max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight text-white md:text-7xl">
                  ความมั่นใจ<br />ที่ตรวจสอบได้
                </h2>
                <p className="mx-auto mt-8 max-w-lg text-lg text-slate-300 md:text-xl">
                  ผลการประเมินทุกรายการมีระดับความมั่นใจที่คำนวณจากสัญญาณจริง หากระบบไม่แน่ใจ จะแจ้งเตือนให้เจ้าหน้าที่ตรวจสอบ
                </p>
              </Reveal>
              <Reveal>
                <h2 className="mx-auto max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight text-white md:text-7xl">
                  จาก Excel<br />สู่ผลประเมิน ในคลิกเดียว
                </h2>
                <p className="mx-auto mt-8 max-w-lg text-lg text-slate-300 md:text-xl">
                  อัปโหลดทั้งไฟล์ ระบบประเมินทุกรายการพร้อมกัน แล้วส่งออกกลับเป็นไฟล์เดียวให้ทันที
                </p>
              </Reveal>
            </section>
          </div>
        ) : (
          /* ---------- Dashboard ---------- */
          <div className="py-14">
            <div className="mb-16 flex flex-wrap items-end justify-between gap-6">
              <div>
                <div className="text-4xl font-semibold tracking-tight text-white">{fileName}</div>
                <div className="mt-2 text-[15px] text-slate-400">{rows.length} รายการ{busy ? ` กำลังประเมิน ${done} จาก ${rows.length}` : allDone ? " ประเมินเสร็จแล้ว" : ""}</div>
              </div>
              <div className="flex items-center gap-3">
                <label htmlFor="file2" className="cursor-pointer rounded-full border border-white/25 px-5 py-2.5 text-[15px] text-slate-200 transition hover:bg-white/10">เปลี่ยนไฟล์</label>
                <input id="file2" type="file" accept=".csv,.xlsx,.xls" onChange={onUpload} className="hidden" />
                {allDone && <button onClick={downloadCsv} className="rounded-full bg-white px-5 py-2.5 text-[15px] font-semibold text-[#0b1233] transition hover:bg-slate-200">ดาวน์โหลด CSV</button>}
                {allDone && <button onClick={downloadXlsx} className="rounded-full border border-white/25 px-5 py-2.5 text-[15px] text-slate-200 transition hover:bg-white/10">Excel</button>}
                {!busy && done === 0 && <button onClick={assessAll} className="rounded-full bg-white px-6 py-2.5 text-[15px] font-semibold text-[#0b1233] transition hover:bg-slate-200">ประเมินทั้งหมด</button>}
              </div>
            </div>

            {/* จับคู่คอลัมน์ (เดาให้อัตโนมัติ ปรับเองได้) */}
            <div className="mb-10 flex flex-wrap items-center gap-3 text-[15px]">
              <span className="text-slate-400">คอลัมน์ที่ใช้</span>
              {([["scenario", "สถานการณ์"], ["rootCause", "สาเหตุ"], ["impact", "ผลกระทบ"]] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2">
                  <span className="text-slate-400">{label}</span>
                  <select value={cols[key]} onChange={(e) => setCols({ ...cols, [key]: e.target.value })}
                    className="rounded-lg border border-white/15 bg-[#0a1030] px-3 py-1.5 text-slate-100 outline-none focus:border-[var(--brand)]">
                    <option value="">— ไม่มี —</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </label>
              ))}
            </div>

            {busy && (
              <div className="mb-16 h-px w-full bg-white/10">
                <div className="h-px bg-[var(--brand)] transition-all duration-300" style={{ width: `${pct}%` }} />
              </div>
            )}

            {stats.total > 0 && (
              <div className="mb-16">
                <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
                  <Stat label="ประเมินแล้ว" value={`${stats.total}/${rows.length}`} tone="text-white" onClick={() => setFilter("all")} active={filter === "all"} />
                  <Stat label="ต้องตรวจสอบ" value={stats.review} tone="text-amber-400" onClick={() => setFilter("review")} active={filter === "review"} />
                  <Stat label="ความเสี่ยงสูง" value={stats.high} tone="text-red-400" onClick={() => setFilter("high")} active={filter === "high"} />
                  <Stat label="มั่นใจสูง" value={`${stats.total ? Math.round((stats.confident / stats.total) * 100) : 0}%`} tone="text-emerald-400" />
                </div>

                <div className={`mt-5 ${CARD} p-8 md:p-10`}>
                  <Glow />
                  <div className="relative">
                    <div className="mb-6 text-lg font-bold text-white">แผนที่ความเสี่ยง</div>
                    <div className="mx-auto grid max-w-xl grid-cols-5 gap-2">
                      {[5, 4, 3, 2, 1].map((imp) => [1, 2, 3, 4, 5].map((lik) => {
                        const zone = ZONE_GRID[imp][lik - 1];
                        const n = stats.grid[`${imp}-${lik}`] ?? 0;
                        return (
                          <div key={`${imp}-${lik}`} title={`ผลกระทบระดับ ${imp} โอกาสเกิดระดับ ${lik} คือ ${zone}${n ? ` จำนวน ${n} รายการ` : ""}`}
                            className={`flex aspect-square items-center justify-center rounded-xl text-lg font-semibold ${n ? ZONE_FILL[zone] : "bg-white/5 text-white/25"}`}>
                            {n || ""}
                          </div>
                        );
                      }))}
                    </div>
                    <div className="mx-auto mt-4 flex max-w-xl justify-between text-sm font-medium text-slate-400"><span>โอกาสเกิด</span><span>ผลกระทบ</span></div>
                  </div>
                </div>
              </div>
            )}

            {results.length > 0 && (
              <>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหาสถานการณ์หรือ RF"
                  className="rounded-full border border-white/15 bg-white/[0.04] px-5 py-2.5 text-[15px] text-white outline-none focus:border-[var(--brand)]" />
                {([["all", "ทั้งหมด"], ["review", "ต้องตรวจสอบ"], ["high", "ความเสี่ยงสูง"]] as const).map(([k, l]) => (
                  <button key={k} onClick={() => setFilter(k)}
                    className={`rounded-full border px-5 py-2.5 text-[15px] transition ${filter === k ? "border-[var(--brand)] bg-white/10 text-white" : "border-white/15 text-slate-300 hover:bg-white/5"}`}>{l}</button>
                ))}
                <span className="text-sm text-slate-500">แสดง {visible.length} จาก {rows.length} รายการ</span>
              </div>
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-sm">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10 text-left text-base font-bold text-slate-200">
                        <th className="px-8 py-5">#</th>
                        <th className="px-8 py-5">สถานการณ์</th>
                        <th className="px-8 py-5">RF</th>
                        <th className="px-8 py-5 text-center">โอกาสเกิด</th>
                        <th className="px-8 py-5 text-center">ผลกระทบ</th>
                        <th className="px-8 py-5">โซน</th>
                        <th className="px-8 py-5">ความมั่นใจ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-[15px]">
                      {visible.map((i) => {
                        const r = rows[i];
                        const a = results[i];
                        const open = expanded === i;
                        return (
                          <Fragment key={i}>
                            <tr onClick={() => a && setExpanded(open ? null : i)} className={`${a ? "cursor-pointer hover:bg-white/5" : ""} align-top transition`}>
                              <td className="px-8 py-5 text-slate-500 tabular-nums">{String(i + 1).padStart(2, "0")}</td>
                              <td className="max-w-sm px-8 py-5 text-slate-300">{(r[cols.scenario] ?? "").slice(0, 64) || "—"}</td>
                              <td className="px-8 py-5"><span className="font-mono text-[15px] font-medium text-white">{a?.rfCode ?? (busy ? "…" : "—")}</span></td>
                              <td className="px-8 py-5 text-center tabular-nums text-slate-200">{a?.likelihood ?? ""}</td>
                              <td className="px-8 py-5 text-center tabular-nums text-slate-200">{a?.impactScore ?? ""}</td>
                              <td className="px-8 py-5">{a && <Tag dot={ZONE_DOT[a.zone] ?? "bg-white/30"} text={a.zone} />}</td>
                              <td className="px-8 py-5">{a && <Tag dot={CONF_DOT[a.confidence] ?? "bg-white/30"} text={a.confidence} />}</td>
                            </tr>
                            {open && a && (
                              <tr className="bg-white/[0.03]">
                                <td></td>
                                <td colSpan={6} className="px-8 pb-8 pt-2">
                                  <div className="grid gap-x-12 gap-y-6 md:grid-cols-2">
                                    <Field label="หมวดความเสี่ยง" value={`${a.level1}, ${a.level2}, ${a.rfCode} ${a.level3Name ?? ""}`} />
                                    <Field label="เหตุผลการจัดหมวด" value={a.classificationReason} />
                                    <Field label={`โอกาสเกิด ระดับ ${a.likelihood}`} value={a.likelihoodReason} />
                                    <Field label={`ผลกระทบ ระดับ ${a.impactScore} ด้าน ${a.impactDimension}`} value={a.impactReason} />
                                    <Field label={`แนวทางจัดการ (${a.managementColor})`} value={a.managementAction} />
                                    <Field label="สัญญาณความมั่นใจ" value={`ความใกล้เคียง ${a.topSimilarity} ระยะห่าง ${a.margin}`} />
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value, tone, onClick, active }: { label: string; value: string | number; tone: string; onClick?: () => void; active?: boolean }) {
  return (
    <div onClick={onClick} className={`${CARD} p-8 ${onClick ? "cursor-pointer" : ""} ${active ? "!border-[var(--brand)]" : ""}`}>
      <Glow />
      <div className="relative">
        <div className="text-lg font-bold text-slate-200">{label}</div>
        <div className={`mt-3 text-5xl font-bold tracking-tight tabular-nums ${tone}`}>{value}</div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1.5 text-[15px] font-bold text-white">{label}</div>
      <div className="text-[15px] leading-relaxed text-slate-300">{value || "—"}</div>
    </div>
  );
}
