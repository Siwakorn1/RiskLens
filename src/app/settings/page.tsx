"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Info {
  provider: string;
  model: string;
  keyStatus: Record<string, boolean>;
  providers: string[];
  labels: Record<string, string>;
  defaultModels: Record<string, string>;
  usage: Record<string, number>;
  dailyLimit: Record<string, number>;
}

export default function Settings() {
  const [info, setInfo] = useState<Info | null>(null);
  const [provider, setProvider] = useState("typhoon");
  const [model, setModel] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [msg, setMsg] = useState("");
  const [saved, setSaved] = useState(false);

  async function load() {
    const res = await fetch("/api/settings");
    const d: Info = await res.json();
    setInfo(d); setProvider(d.provider); setModel(d.model);
  }
  useEffect(() => { load(); }, []);

  function pickProvider(p: string) {
    setProvider(p);
    setModel(info?.defaultModels[p] ?? "");
    setKeyInput(""); setMsg("");
  }

  async function saveConfig() {
    await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, model }) });
    setSaved(true); setMsg("บันทึกการตั้งค่าเรียบร้อยแล้ว");
    setTimeout(() => { setSaved(false); setMsg(""); }, 2500);
  }
  async function saveKey() {
    if (!keyInput.trim()) return;
    await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ keyProvider: provider, key: keyInput }) });
    setKeyInput(""); setMsg("บันทึก API key เรียบร้อยแล้ว"); load();
    setTimeout(() => setMsg(""), 2500);
  }

  if (!info) return <div className="p-12 text-slate-400">กำลังโหลด...</div>;

  return (
    <div className="min-h-screen w-full text-slate-100">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0a1030]/60 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-[15px] text-slate-300 transition hover:text-white">กลับหน้าหลัก</Link>
          <span className="text-[15px] font-medium text-slate-200">ตั้งค่า</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">ตั้งค่าโมเดล AI</h1>
        <p className="mt-4 text-lg text-slate-400">เลือกผู้ให้บริการและโมเดลที่ใช้ประเมิน รวมถึงจัดการ API key</p>

        {/* Provider */}
        <div className="mt-12">
          <div className="mb-4 text-lg font-bold text-white">ผู้ให้บริการ</div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {info.providers.map((p) => (
              <button key={p} onClick={() => pickProvider(p)}
                className={`rounded-2xl border p-4 text-left transition ${provider === p ? "border-[var(--brand)] bg-white/[0.08]" : "border-white/10 bg-white/[0.04] hover:border-white/25"}`}>
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-semibold text-white">{info.labels[p]}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${p === "typhoon" ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-slate-400"}`}>
                    {p === "typhoon" ? "หลัก" : "ทดลอง"}
                  </span>
                </div>
                <div className={`mt-1 text-xs ${info.keyStatus[p] ? "text-emerald-400" : "text-rose-400"}`}>
                  {info.keyStatus[p] ? "มี API key" : "ยังไม่มี key"}
                </div>
                {(() => {
                  const used = info.usage[p] ?? 0;
                  const limit = info.dailyLimit[p] ?? 0;
                  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
                  return (
                    <div className="mt-3">
                      <div className="mb-1 flex justify-between text-xs text-slate-400"><span>ใช้วันนี้</span><span>{used} / ~{limit}</span></div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div className={`h-full rounded-full ${pct >= 90 ? "bg-rose-500" : pct >= 60 ? "bg-amber-400" : "bg-[var(--brand)]"}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })()}
              </button>
            ))}
          </div>
        </div>

        {/* Model */}
        <div className="mt-10">
          <div className="mb-3 text-lg font-bold text-white">โมเดล</div>
          <input value={model} onChange={(e) => setModel(e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-[15px] text-white outline-none focus:border-[var(--brand)]" />
          <div className="mt-2 text-sm text-slate-500">ค่าเริ่มต้นของ {info.labels[provider]}: {info.defaultModels[provider]}</div>
        </div>

        <button onClick={saveConfig} className={`mt-8 rounded-full px-7 py-3 text-[15px] font-semibold transition-all duration-300 ${saved ? "btn-saved" : "bg-white text-[#0b1233] hover:bg-slate-200"}`}>
          {saved ? "บันทึกแล้ว" : "บันทึกการตั้งค่า"}
        </button>

        {/* API key */}
        <div className="mt-14 border-t border-white/10 pt-10">
          <div className="mb-2 text-lg font-bold text-white">API key ของ {info.labels[provider]}</div>
          <div className="mb-4 text-sm text-slate-400">
            สถานะปัจจุบัน: {info.keyStatus[provider] ? "ตั้งค่าไว้แล้ว" : "ยังไม่ได้ตั้งค่า"} · กรอกเพื่อเพิ่มหรือเปลี่ยน (ระบบไม่แสดง key เดิมเพื่อความปลอดภัย)
          </div>
          <div className="flex gap-3">
            <input type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} placeholder="วาง API key ที่นี่"
              className="flex-1 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-[15px] text-white outline-none focus:border-[var(--brand)]" />
            <button onClick={saveKey} disabled={!keyInput.trim()}
              className="rounded-full border border-white/25 px-6 py-3 text-[15px] text-slate-200 transition hover:bg-white/10 disabled:opacity-40">
              บันทึก key
            </button>
          </div>
        </div>

        {/* เกณฑ์คะแนนความมั่นใจ — แยกไปอีกหน้าเพราะมีทั้งน้ำหนัก ช่วงคะแนน และหน้าจำลองผล */}
        <div className="mt-14 border-t border-white/10 pt-10">
          <div className="mb-2 text-lg font-bold text-white">เกณฑ์คะแนนความมั่นใจ</div>
          <div className="mb-5 max-w-2xl text-sm leading-relaxed text-slate-400">
            ตั้งน้ำหนักของสามองค์ประกอบที่ใช้คิดคะแนน และกำหนดเองว่าคะแนนช่วงไหนคือความแม่นยำระดับใด
            พร้อมทดลองคำนวณดูผลก่อนบันทึก
          </div>
          <Link href="/settings/confidence"
            className="inline-flex rounded-full border border-white/25 px-6 py-3 text-[15px] text-slate-200 transition hover:bg-white/10">
            ตั้งค่าเกณฑ์คะแนน
          </Link>
        </div>

        {msg && <div className="mt-8 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-[15px] text-emerald-300">{msg}</div>}
      </main>
    </div>
  );
}
