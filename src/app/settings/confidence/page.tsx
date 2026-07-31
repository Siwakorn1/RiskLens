"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BAND_COLORS, BAND_BAR, BAND_DOT, BAND_TEXT, DEFAULT_CONFIDENCE,
  computeConfidence, effectiveWeights, normalizeConfig,
  type BandColor, type ConfidenceConfig,
} from "@/lib/rag/confidence";

const CARD = "rounded-2xl border border-white/10 bg-white/[0.05] p-7 backdrop-blur-sm";
const INPUT = "w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-[15px] text-white tabular-nums outline-none focus:border-[var(--brand)]";

function Section({ n, title, hint, children }: { n: string; title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="mb-16">
      <div className="mb-2 flex items-baseline gap-4">
        <span className="text-2xl font-extrabold tabular-nums text-indigo-400">{n}</span>
        <h2 className="text-2xl font-semibold tracking-tight text-white">{title}</h2>
      </div>
      <p className="mb-6 max-w-3xl text-[15px] leading-relaxed text-slate-400">{hint}</p>
      {children}
    </section>
  );
}

/**
 * ช่องตัวเลข + แถบเลื่อน ใช้ซ้ำทั้งหน้า
 *
 * dense = ใช้ในคอลัมน์แคบ (เช่นสามช่องเรียงกัน) บังคับให้หัวข้ออยู่บรรทัดเดียวเสมอ
 * ไม่งั้นป้ายที่ยาวกว่าจะตัดบรรทัดเป็นสองแถว ทำให้แถบเลื่อนของแต่ละช่องอยู่คนละระดับ
 */
function NumField({ label, value, onChange, min, max, step, suffix, hint, dense }: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step: number; suffix?: string; hint?: string; dense?: boolean;
}) {
  const size = dense ? "text-sm" : "text-[15px]";
  return (
    <div>
      <div className={`mb-1.5 flex items-baseline justify-between ${dense ? "gap-2" : "gap-3"}`}>
        <span className={`font-semibold text-white ${size} ${dense ? "min-w-0 truncate" : ""}`} title={dense ? label : undefined}>{label}</span>
        <span className={`shrink-0 whitespace-nowrap tabular-nums text-slate-300 ${size}`}>{value}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--brand)]" />
      <input type="number" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))} className={`${INPUT} mt-2`} />
      {hint && <div className="mt-1.5 text-sm leading-relaxed text-slate-500">{hint}</div>}
    </div>
  );
}

export default function ConfidenceSettings() {
  const [cfg, setCfg] = useState<ConfidenceConfig | null>(null);
  const [saved, setSaved] = useState(false);
  const [msg, setMsg] = useState("");

  // ค่าสมมุติสำหรับหน้าจำลองผล
  const [simTop, setSimTop] = useState(0.78);
  const [simSecond, setSimSecond] = useState(0.71);
  const [simThird, setSimThird] = useState(0.68);
  const [simLen, setSimLen] = useState({ scenario: 60, rootCause: 40, impact: 35 });
  const [simLlm, setSimLlm] = useState(80);

  useEffect(() => {
    fetch("/api/confidence").then((r) => r.json()).then((d) => setCfg(normalizeConfig(d.config)));
  }, []);

  const weights = cfg ? effectiveWeights(cfg) : null;
  const weightSum = cfg ? cfg.weights.similarity + cfg.weights.margin + cfg.weights.completeness : 0;

  const sim = useMemo(() => {
    if (!cfg) return null;
    const text = (n: number) => "ก".repeat(Math.max(0, Math.round(n)));
    return computeConfidence(
      {
        neighbors: [simTop, Math.min(simSecond, simTop), Math.min(simThird, simSecond, simTop)],
        fields: { scenario: text(simLen.scenario), rootCause: text(simLen.rootCause), impact: text(simLen.impact) },
        llmSufficiency: simLlm,
      },
      cfg
    );
  }, [cfg, simTop, simSecond, simThird, simLen, simLlm]);

  function patch(p: Partial<ConfidenceConfig>) { setCfg((c) => (c ? { ...c, ...p } : c)); }

  async function save() {
    if (!cfg) return;
    const res = await fetch("/api/confidence", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config: cfg }),
    });
    const d = await res.json();
    setCfg(normalizeConfig(d.config));
    setSaved(true); setMsg("บันทึกเกณฑ์เรียบร้อยแล้ว การประเมินครั้งถัดไปจะใช้เกณฑ์นี้");
    setTimeout(() => { setSaved(false); setMsg(""); }, 3000);
  }

  async function reset() {
    const res = await fetch("/api/confidence", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reset: true }),
    });
    const d = await res.json();
    setCfg(normalizeConfig(d.config));
    setMsg("คืนค่าเริ่มต้นแล้ว");
    setTimeout(() => setMsg(""), 3000);
  }

  if (!cfg || !sim || !weights) return <div className="p-12 text-slate-400">กำลังโหลด...</div>;

  return (
    <div className="min-h-screen w-full text-slate-100">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0a1030]/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link href="/settings" className="text-[15px] text-slate-300 transition hover:text-white">กลับหน้าตั้งค่า</Link>
          <span className="text-[15px] font-medium text-slate-200">เกณฑ์คะแนนความมั่นใจ</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">เกณฑ์คะแนนความมั่นใจ</h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-400">
          ระบบให้คะแนนความมั่นใจเป็นตัวเลข 0 ถึง 100 โดยรวมจากสามองค์ประกอบตามน้ำหนักที่ตั้งไว้ที่นี่
          จากนั้นแปลงคะแนนเป็นระดับความแม่นยำตามช่วงคะแนนที่ท่านกำหนดเอง
        </p>

        {/* สูตรรวม */}
        <div className={`${CARD} mt-10`}>
          <div className="mb-3 text-base font-semibold text-white">สูตรที่ใช้</div>
          <div className="rounded-xl bg-black/30 px-5 py-4 text-[15px] leading-relaxed tabular-nums text-slate-200 md:text-base">
            คะแนนรวม = ({cfg.weights.similarity}% × ความใกล้เคียง) + ({cfg.weights.margin}% × ระยะห่าง) + ({cfg.weights.completeness}% × ความครบถ้วน)
          </div>
          <div className={`mt-3 text-sm ${weightSum === 100 ? "text-slate-500" : "text-amber-400"}`}>
            {weightSum === 100
              ? "น้ำหนักรวมกันได้ 100% พอดี"
              : `น้ำหนักรวมกันได้ ${weightSum}% ระบบจะเกลี่ยเป็นสัดส่วน 100% ให้อัตโนมัติ (${weights.similarity.toFixed(1)} / ${weights.margin.toFixed(1)} / ${weights.completeness.toFixed(1)})`}
          </div>
        </div>

        <div className="mt-16">
          <Section n="01" title="น้ำหนักของแต่ละองค์ประกอบ"
            hint="กำหนดว่าคะแนนรวมมาจากอะไรกี่เปอร์เซ็นต์ ถ้าเชื่อถือการค้นหาเป็นหลัก ให้เพิ่มน้ำหนักความใกล้เคียง ถ้าอยากลงโทษข้อมูลนำเข้าที่เขียนมาสั้น ๆ ให้เพิ่มน้ำหนักความครบถ้วน">
            <div className="grid gap-6 md:grid-cols-3">
              <div className={CARD}>
                <NumField label="ความใกล้เคียง" suffix="%" min={0} max={100} step={5}
                  value={cfg.weights.similarity}
                  onChange={(v) => patch({ weights: { ...cfg.weights, similarity: v } })}
                  hint="ข้อมูลนำเข้าตรงกับความเสี่ยงในบัญชีมากแค่ไหน" />
              </div>
              <div className={CARD}>
                <NumField label="ระยะห่าง" suffix="%" min={0} max={100} step={5}
                  value={cfg.weights.margin}
                  onChange={(v) => patch({ weights: { ...cfg.weights, margin: v } })}
                  hint="อันดับหนึ่งทิ้งห่างอันดับสองชัดเจนแค่ไหน" />
              </div>
              <div className={CARD}>
                <NumField label="ความครบถ้วนของข้อมูล" suffix="%" min={0} max={100} step={5}
                  value={cfg.weights.completeness}
                  onChange={(v) => patch({ weights: { ...cfg.weights, completeness: v } })}
                  hint="ข้อมูลนำเข้ามีรายละเอียดพอให้ตัดสินหรือไม่" />
              </div>
            </div>
          </Section>

          <Section n="02" title="การแปลงค่าดิบเป็นคะแนน"
            hint="ค่าที่วัดได้จริงไม่ได้อยู่ในช่วง 0 ถึง 1 เต็ม ๆ ส่วนนี้จึงกำหนดว่าค่าดิบเท่าไหร่ควรได้ศูนย์คะแนน และเท่าไหร่ควรได้เต็มร้อย">
            <div className="grid gap-6 md:grid-cols-2">
              <div className={`${CARD} space-y-6`}>
                <div className="text-lg font-bold text-white">ความใกล้เคียง</div>
                <NumField label="ค่าที่ถือว่าได้ศูนย์คะแนน" min={0.3} max={0.8} step={0.01}
                  value={cfg.similarity.floor}
                  onChange={(v) => patch({ similarity: { ...cfg.similarity, floor: v } })}
                  hint="ต่ำกว่านี้ถือว่าค้นไม่เจอรายการที่ตรง · ตั้งสูงเกินจริงจะทำให้เคสปกติได้ศูนย์กันหมด" />
                <NumField label="ค่าที่ถือว่าได้เต็มร้อย" min={0.6} max={1} step={0.01}
                  value={cfg.similarity.ceil}
                  onChange={(v) => patch({ similarity: { ...cfg.similarity, ceil: v } })}
                  hint="ตั้งสูงเกินค่าที่เกิดขึ้นจริงจะทำให้ไม่มีเคสไหนได้คะแนนเต็ม · รัน npm run calibrate เพื่อดูค่าจริง" />
              </div>

              <div className={`${CARD} space-y-6`}>
                <div className="text-lg font-bold text-white">ระยะห่าง</div>
                <NumField label="ระยะห่างที่ถือว่าชัดเจนเต็มร้อย" min={0.01} max={0.3} step={0.005}
                  value={cfg.margin.full}
                  onChange={(v) => patch({ margin: { ...cfg.margin, full: v } })}
                  hint="อันดับหนึ่งนำอันดับสองเท่านี้ ถือว่าไม่กำกวมแล้ว" />
                <NumField label="ช่วงที่ถือว่าสูสี" min={0} max={0.1} step={0.005}
                  value={cfg.margin.tieBand}
                  onChange={(v) => patch({ margin: { ...cfg.margin, tieBand: v } })}
                  hint="รายการอันดับสามลงไปที่คะแนนห่างจากอันดับหนึ่งไม่เกินนี้ นับว่าสูสี (อันดับสองคิดในค่าระยะห่างแล้ว)" />
                <NumField label="หักคะแนนต่อหนึ่งรายการที่สูสี" suffix=" คะแนน" min={0} max={40} step={1}
                  value={cfg.margin.tiePenalty}
                  onChange={(v) => patch({ margin: { ...cfg.margin, tiePenalty: v } })}
                  hint="ยิ่งมีความเสี่ยงหลายรายการที่ใกล้เคียงพอกัน ยิ่งควรลดความมั่นใจ" />
              </div>

              <div className={`${CARD} space-y-6 md:col-span-2`}>
                <div className="text-lg font-bold text-white">ความครบถ้วนของข้อมูล</div>
                <p className="text-[15px] leading-relaxed text-slate-400">
                  องค์ประกอบนี้ผสมสองอย่างเข้าด้วยกัน คือความยาวของข้อความที่กรอกมา ซึ่งวัดด้วยโค้ดตรงไปตรงมา
                  และความเห็นของปัญญาประดิษฐ์ว่าข้อมูลพอจะตัดสินได้หรือไม่
                </p>
                <div className="grid gap-6 md:grid-cols-3">
                  <NumField label="น้ำหนักความยาวข้อความ" suffix="%" min={0} max={100} step={5}
                    value={cfg.completeness.fieldWeight}
                    onChange={(v) => patch({ completeness: { ...cfg.completeness, fieldWeight: v } })} />
                  <NumField label="น้ำหนักความเห็นของ AI" suffix="%" min={0} max={100} step={5}
                    value={cfg.completeness.llmWeight}
                    onChange={(v) => patch({ completeness: { ...cfg.completeness, llmWeight: v } })} />
                  <NumField label="ความยาวที่ถือว่าเต็ม" suffix=" อักษร" min={5} max={200} step={5}
                    value={cfg.completeness.minChars}
                    onChange={(v) => patch({ completeness: { ...cfg.completeness, minChars: v } })}
                    hint="แต่ละช่องที่ยาวถึงเกณฑ์นี้ได้เต็มร้อย สั้นกว่านั้นได้ตามสัดส่วน ช่องว่างได้ศูนย์" />
                </div>
              </div>
            </div>
          </Section>

          <Section n="03" title="ช่วงคะแนนและระดับความแม่นยำ"
            hint="กำหนดเองว่าคะแนนเท่าไหร่ถึงเท่าไหร่ คือความแม่นยำระดับไหน ระดับล่างสุดจะเริ่มที่ศูนย์เสมอ">
            <div className={`${CARD} !p-0 overflow-hidden`}>
              <table className="w-full text-[15px]">
                <thead>
                  <tr className="border-b border-white/10 text-left text-sm font-medium text-slate-400">
                    <th className="px-6 py-4 font-medium">ชื่อระดับ</th>
                    <th className="px-6 py-4 font-medium">ช่วงคะแนน</th>
                    <th className="px-6 py-4 font-medium">สี</th>
                    <th className="px-6 py-4 font-medium">การจัดการ</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {cfg.bands.map((b, i) => {
                    const upper = i === 0 ? 100 : cfg.bands[i - 1].min;
                    const isLast = i === cfg.bands.length - 1;
                    const update = (p: Partial<typeof b>) =>
                      patch({ bands: cfg.bands.map((x, j) => (j === i ? { ...x, ...p } : x)) });
                    return (
                      <tr key={i}>
                        <td className="px-6 py-4">
                          <input value={b.label} onChange={(e) => update({ label: e.target.value })} className={INPUT} />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <input type="number" min={0} max={100} value={b.min} disabled={isLast}
                              onChange={(e) => update({ min: Number(e.target.value) })}
                              className={`${INPUT} w-20 disabled:opacity-50`} />
                            <span className="text-slate-400">ถึง {upper}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-1.5">
                            {BAND_COLORS.map((c) => (
                              <button key={c} onClick={() => update({ color: c })} title={c}
                                className={`h-6 w-6 rounded-full ${BAND_DOT[c]} transition ${b.color === c ? "ring-2 ring-white ring-offset-2 ring-offset-[#0a1030]" : "opacity-50 hover:opacity-100"}`} />
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <input value={b.action} onChange={(e) => update({ action: e.target.value })} className={INPUT} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          {cfg.bands.length > 2 && (
                            <button onClick={() => patch({ bands: cfg.bands.filter((_, j) => j !== i) })}
                              className="text-sm text-slate-500 transition hover:text-rose-400">ลบ</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {cfg.bands.length < 6 && (
              <button
                onClick={() => {
                  const lowest = cfg.bands[cfg.bands.length - 1];
                  const next = [...cfg.bands.slice(0, -1),
                    { ...lowest, min: Math.round(lowest.min + (cfg.bands[cfg.bands.length - 2].min - lowest.min) / 2) },
                    { label: "ระดับใหม่", min: 0, color: BAND_COLORS[cfg.bands.length % BAND_COLORS.length] as BandColor, action: "" }];
                  patch({ bands: next });
                }}
                className="mt-4 rounded-full border border-white/25 px-5 py-2.5 text-[15px] text-slate-200 transition hover:bg-white/10">
                เพิ่มระดับ
              </button>
            )}

            <div className={`${CARD} mt-6`}>
              <NumField label="คะแนนต่ำกว่านี้ให้ติดธงว่าต้องตรวจสอบ" suffix=" คะแนน" min={0} max={100} step={1}
                value={cfg.reviewBelow} onChange={(v) => patch({ reviewBelow: v })}
                hint="รายการที่ได้คะแนนต่ำกว่าเกณฑ์นี้จะขึ้นสถานะต้องตรวจ และถูกนับในการ์ดสรุปหน้าแรก" />
            </div>
          </Section>

          <Section n="04" title="ทดลองคำนวณ"
            hint="ลองปรับค่าสมมุติดูว่าเกณฑ์ที่ตั้งไว้ให้คะแนนออกมาเท่าไหร่ ตัวเลขที่เห็นคำนวณด้วยสูตรเดียวกับตอนประเมินจริง">
            <div className="grid gap-6 md:grid-cols-2">
              <div className={`${CARD} space-y-6`}>
                <NumField label="ความใกล้เคียงอันดับหนึ่ง" min={0.3} max={1} step={0.005} value={simTop} onChange={setSimTop} />
                <NumField label="ความใกล้เคียงอันดับสอง" min={0.3} max={1} step={0.005} value={simSecond} onChange={setSimSecond} />
                <NumField label="ความใกล้เคียงอันดับสาม" min={0.3} max={1} step={0.005} value={simThird} onChange={setSimThird} />
                <div>
                  <div className="mb-2 text-[15px] font-semibold text-white">ความยาวข้อความที่กรอก (อักษร)</div>
                  <div className="grid grid-cols-3 items-start gap-4">
                    <NumField dense label="สถานการณ์" min={0} max={150} step={5}
                      value={simLen.scenario} onChange={(v) => setSimLen({ ...simLen, scenario: v })} />
                    <NumField dense label="สาเหตุ" min={0} max={150} step={5}
                      value={simLen.rootCause} onChange={(v) => setSimLen({ ...simLen, rootCause: v })} />
                    <NumField dense label="ผลกระทบ" min={0} max={150} step={5}
                      value={simLen.impact} onChange={(v) => setSimLen({ ...simLen, impact: v })} />
                  </div>
                </div>
                <NumField label="คะแนนความเพียงพอที่ AI ให้" min={0} max={100} step={5} value={simLlm} onChange={setSimLlm} />
              </div>

              <div className={CARD}>
                <div className="flex items-baseline gap-4">
                  <span className={`text-7xl font-bold tabular-nums ${BAND_TEXT[sim.band.color]}`}>{sim.score.toFixed(1)}</span>
                  <div>
                    <div className="inline-flex items-center gap-2 text-lg font-semibold text-white">
                      <span className={`h-2.5 w-2.5 rounded-full ${BAND_DOT[sim.band.color]}`} />{sim.band.label}
                    </div>
                    <div className="mt-1 text-[15px] text-slate-400">{sim.band.action}</div>
                  </div>
                </div>
                <div className={`mt-5 inline-flex items-center gap-2.5 rounded-full border px-5 py-2.5 text-base font-semibold ${
                  sim.needsReview
                    ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
                    : "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"}`}>
                  <span className={`h-2 w-2 rounded-full ${sim.needsReview ? "bg-amber-400" : "bg-emerald-400"}`} />
                  {sim.needsReview
                    ? `ต่ำกว่าเกณฑ์ ${cfg.reviewBelow} คะแนน ต้องตรวจ`
                    : `ผ่านเกณฑ์ ${cfg.reviewBelow} คะแนน`}
                </div>

                <div className="mt-8 space-y-5">
                  {sim.components.map((c) => (
                    <div key={c.key}>
                      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[15px]">
                        <span className="font-semibold text-white">{c.label}</span>
                        <span className="tabular-nums text-slate-300">
                          {c.score.toFixed(1)} × {c.weight.toFixed(0)}% = <span className="font-semibold text-white">{c.points.toFixed(1)}</span>
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                        <div className={`h-full rounded-full ${BAND_BAR[sim.band.color]}`} style={{ width: `${c.score}%` }} />
                      </div>
                      <div className="mt-1.5 text-sm leading-relaxed text-slate-500">{c.detail}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-7 border-t border-white/10 pt-5 text-[15px] text-slate-300">
                  รวม {sim.components.map((c) => c.points.toFixed(1)).join(" + ")} = <span className="font-semibold text-white">{sim.score.toFixed(1)} คะแนน</span>
                </div>
              </div>
            </div>
          </Section>
        </div>

        <div className="flex flex-wrap items-center gap-4 border-t border-white/10 pt-10">
          <button onClick={save}
            className={`rounded-full px-7 py-3 text-[15px] font-semibold transition-all duration-300 ${saved ? "btn-saved" : "bg-white text-[#0b1233] hover:bg-slate-200"}`}>
            {saved ? "บันทึกแล้ว" : "บันทึกเกณฑ์"}
          </button>
          <button onClick={reset}
            className="rounded-full border border-white/25 px-6 py-3 text-[15px] text-slate-200 transition hover:bg-white/10">
            คืนค่าเริ่มต้น
          </button>
          <Link href="/methodology/confidence" className="text-[15px] font-medium text-indigo-300 transition hover:text-indigo-200">
            อ่านที่มาของแต่ละองค์ประกอบ
          </Link>
          <span className="text-sm text-slate-500">
            ค่าเริ่มต้นของระบบ: {DEFAULT_CONFIDENCE.weights.similarity} / {DEFAULT_CONFIDENCE.weights.margin} / {DEFAULT_CONFIDENCE.weights.completeness}
          </span>
        </div>

        {msg && <div className="mt-8 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-[15px] text-emerald-300">{msg}</div>}
      </main>
    </div>
  );
}
