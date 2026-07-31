import Link from "next/link";
import { BAND_DOT, effectiveWeights } from "@/lib/rag/confidence";
import { getConfidenceConfig } from "@/lib/rag/confidence-store";

// อ่านเกณฑ์ตอนเปิดหน้าเสมอ ไม่ใช่ตอน build — ผู้ใช้ปรับเกณฑ์แล้วต้องเห็นผลทันที
export const dynamic = "force-dynamic";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] p-7 backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:border-[var(--brand)] hover:shadow-2xl hover:shadow-black/40 ${className}`}>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-bl from-[var(--brand-soft)] to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      <div className="relative">{children}</div>
    </div>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-28">
      <div className="mb-10 flex items-baseline gap-5 border-b border-white/10 pb-5">
        <span className="bg-gradient-to-b from-white to-indigo-400 bg-clip-text text-4xl font-extrabold tabular-nums text-transparent md:text-5xl">{n}</span>
        <h2 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">{title}</h2>
      </div>
      {children}
    </section>
  );
}

const PIPELINE = [
  { t: "รับข้อมูลนำเข้า", d: "สถานการณ์ สาเหตุ และผลกระทบ ในรูปแบบข้อความภาษาไทย รายการที่กรอกไม่ครบทั้งสามช่องจะไม่ถูกประเมิน" },
  { t: "การค้นหา (RAG)", d: "แปลงข้อมูลนำเข้าเป็นเวกเตอร์ และค้นหาความเสี่ยงย่อยที่ใกล้เคียงที่สุดห้าอันดับ จากบัญชีความเสี่ยงทั้งหมด 107 รายการ" },
  { t: "การวิเคราะห์ด้วย AI", d: "เลือกหมวดความเสี่ยง และให้คะแนนโอกาสเกิดและผลกระทบตามเกณฑ์ของ NITMX" },
  { t: "การเปิดตาราง (Lookup)", d: "นำคะแนนโอกาสเกิดและผลกระทบมาเปิดตาราง เพื่อระบุโซนความเสี่ยงและแนวทางจัดการ" },
  { t: "การคำนวณความมั่นใจ", d: "ให้คะแนนสัญญาณสามประการ ถ่วงน้ำหนักตามที่ตั้งไว้ แล้วรวมเป็นคะแนนเดียวในช่วงศูนย์ถึงหนึ่งร้อย" },
  { t: "ผลลัพธ์", d: "ประกอบด้วยหมวดความเสี่ยง คะแนน โซนความเสี่ยง แนวทางจัดการ คะแนนความมั่นใจพร้อมที่มา และสถานะ" },
];

export default function Methodology() {
  const cfg = getConfidenceConfig();
  const w = effectiveWeights(cfg);

  return (
    <div className="min-h-screen w-full text-slate-100">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0a1030]/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 md:px-12">
          <Link href="/" className="text-[15px] text-slate-300 transition hover:text-white">กลับหน้าหลัก</Link>
          <span className="text-[15px] font-medium text-slate-200">วิธีการประเมิน</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-28 md:px-12">
        <div className="mb-32 max-w-4xl">
          <h1 className="text-5xl font-semibold leading-[1.03] tracking-tight text-white md:text-8xl">ระบบประเมิน<br />ความเสี่ยงทำงานอย่างไร</h1>
          <p className="mt-10 max-w-2xl text-xl leading-relaxed text-slate-300">
            เอกสารนี้อธิบายหลักการที่ปัญญาประดิษฐ์ใช้ในการจัดหมวดและให้คะแนนความเสี่ยง รวมถึงวิธีวัดระดับความมั่นใจของแต่ละผลการประเมิน ให้เป็นตัวเลขที่มีความหมายและตรวจสอบย้อนหลังได้
          </p>
        </div>

        <Section n="01" title="ขั้นตอนการประเมิน">
          <div className="divide-y divide-white/10">
            {PIPELINE.map((s, i) => (
              <div key={i} className="flex items-start gap-7 py-7 first:pt-0 last:pb-0">
                <div className="w-20 shrink-0 bg-gradient-to-b from-white to-indigo-400 bg-clip-text text-7xl font-extrabold leading-none tabular-nums text-transparent md:text-8xl">{i + 1}</div>
                <div className="pt-2">
                  <div className="text-xl font-semibold text-white md:text-2xl">{s.t}</div>
                  <div className="mt-2 text-[15px] leading-relaxed text-slate-400">{s.d}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section n="02" title="การเลือกใช้ปัญญาประดิษฐ์และกฎตายตัว">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <div className="mb-3 text-base font-semibold text-white">ส่วนที่ใช้ AI และ RAG</div>
              <ul className="space-y-2 text-[15px] leading-relaxed text-slate-300"><li>การจัดหมวดความเสี่ยง โดยตีความภาษาเพื่อระบุรหัสความเสี่ยง</li><li>การให้คะแนนโอกาสเกิดและผลกระทบ</li></ul>
            </Card>
            <Card>
              <div className="mb-3 text-base font-semibold text-white">ส่วนที่ใช้โค้ด (กฎตายตัว)</div>
              <ul className="space-y-2 text-[15px] leading-relaxed text-slate-300"><li>การเปิดตารางความเสี่ยงเพื่อระบุโซน ซึ่งแม่นยำเต็มร้อยเปอร์เซ็นต์</li><li>การกำหนดแนวทางจัดการตามโซนสี</li></ul>
            </Card>
          </div>
        </Section>

        <Section n="03" title="การวัดความมั่นใจ">
          <p className="mb-8 max-w-3xl text-lg leading-relaxed text-slate-300">
            ระบบไม่ตัดสินความมั่นใจเป็นระดับตายตัว แต่ให้คะแนนเป็นตัวเลขศูนย์ถึงหนึ่งร้อย
            โดยรวมจากสามองค์ประกอบที่วัดได้จริง แต่ละองค์ประกอบให้คะแนนเต็มร้อยของตัวเอง แล้วถ่วงน้ำหนักตามสัดส่วนที่ผู้ดูแลกำหนด
          </p>

          <Card className="mb-6">
            <div className="mb-3 text-base font-semibold text-white">สูตรที่ใช้อยู่ในขณะนี้</div>
            <div className="overflow-x-auto rounded-xl bg-black/30 px-5 py-4">
              <div className="whitespace-nowrap text-[15px] leading-relaxed tabular-nums text-slate-200 md:text-base">
                คะแนนรวม = ({w.similarity.toFixed(0)}% × ความใกล้เคียง) + ({w.margin.toFixed(0)}% × ระยะห่าง) + ({w.completeness.toFixed(0)}% × ความครบถ้วน)
              </div>
            </div>
          </Card>

          <div className="mb-6 grid gap-4 md:grid-cols-3">
            {[
              ["ความใกล้เคียง", `วัดว่าข้อมูลนำเข้าใกล้เคียงกับความเสี่ยงในบัญชีเพียงใด ค่าดิบ ${cfg.similarity.floor} คิดเป็นศูนย์คะแนน และ ${cfg.similarity.ceil} คิดเป็นเต็มร้อย`, `น้ำหนัก ${w.similarity.toFixed(0)}%`],
              ["ระยะห่าง", `ระยะห่างระหว่างอันดับหนึ่งกับอันดับสอง ห่างถึง ${cfg.margin.full} ถือว่าชัดเจนเต็มร้อย และหักคะแนนอีกรายการละ ${cfg.margin.tiePenalty} เมื่อมีตัวเลือกอื่นสูสีในระยะ ${cfg.margin.tieBand}`, `น้ำหนัก ${w.margin.toFixed(0)}%`],
              ["ความครบถ้วนของข้อมูล", `ผสมระหว่างความยาวข้อความที่กรอกมา โดยถือว่า ${cfg.completeness.minChars} อักษรต่อช่องคือครบ กับความเห็นของปัญญาประดิษฐ์ว่าข้อมูลพอตัดสินหรือไม่`, `น้ำหนัก ${w.completeness.toFixed(0)}%`],
            ].map(([t, d, wt]) => (
              <Card key={t}>
                <div className="text-lg font-semibold text-white">{t}</div>
                <div className="mt-1 text-sm font-medium text-indigo-300">{wt}</div>
                <div className="mt-2 text-[15px] leading-relaxed text-slate-400">{d}</div>
              </Card>
            ))}
          </div>

          <Card className="!p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[15px]">
                <thead><tr className="border-b border-white/10 text-left text-sm font-medium text-slate-400">
                  <th className="px-7 py-4 font-medium">ระดับ</th><th className="px-7 py-4 font-medium">ช่วงคะแนน</th><th className="px-7 py-4 font-medium">การจัดการ</th></tr></thead>
                <tbody className="divide-y divide-white/5">
                  {cfg.bands.map((b, i) => (
                    <tr key={b.label}>
                      <td className="px-7 py-4"><span className="inline-flex items-center gap-2.5 whitespace-nowrap font-medium text-white"><span className={`h-2.5 w-2.5 rounded-full ${BAND_DOT[b.color]}`} />{b.label}</span></td>
                      <td className="px-7 py-4 whitespace-nowrap tabular-nums text-slate-400">{b.min} ถึง {i === 0 ? 100 : cfg.bands[i - 1].min}</td>
                      <td className="px-7 py-4 text-slate-300">{b.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <p className="mt-5 text-[15px] leading-relaxed text-slate-400">
            รายการที่ได้คะแนนต่ำกว่า {cfg.reviewBelow} จะถูกทำเครื่องหมายว่าต้องตรวจสอบ
            ทั้งน้ำหนักและช่วงคะแนนข้างต้นปรับได้เองในหน้าตั้งค่า เพราะเกณฑ์ที่เหมาะสมขึ้นอยู่กับว่าองค์กรยอมรับความเสี่ยงจากการปล่อยผ่านได้มากน้อยเพียงใด
          </p>
          <div className="mt-6 flex flex-wrap gap-6">
            <Link href="/methodology/confidence" className="text-[15px] font-medium text-indigo-300 transition hover:text-indigo-200">อ่านคำอธิบายค่าเหล่านี้โดยละเอียด</Link>
            <Link href="/settings/confidence" className="text-[15px] font-medium text-indigo-300 transition hover:text-indigo-200">ปรับน้ำหนักและช่วงคะแนน</Link>
          </div>
        </Section>

        <Section n="04" title="บทบาทของผู้ใช้และระบบ">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <div className="text-lg font-semibold text-white">ระบบช่วยประเมิน</div>
              <div className="mt-2 text-[15px] leading-relaxed text-slate-400">จัดหมวด ให้คะแนน และประเมินความเสี่ยงเบื้องต้นให้ครบทุกรายการอย่างรวดเร็วและสม่ำเสมอ</div>
            </Card>
            <Card>
              <div className="text-lg font-semibold text-white">ระบบแจ้งเตือน</div>
              <div className="mt-2 text-[15px] leading-relaxed text-slate-400">รายการที่ความมั่นใจต่ำจะถูกทำเครื่องหมายไว้ เพื่อให้เจ้าหน้าที่ตรวจสอบเป็นลำดับแรก</div>
            </Card>
            <Card>
              <div className="text-lg font-semibold text-white">เจ้าหน้าที่ตัดสิน</div>
              <div className="mt-2 text-[15px] leading-relaxed text-slate-400">ผู้เชี่ยวชาญพิจารณาและปรับผลได้เสมอ ทุกการแก้ไขช่วยให้ระบบแม่นยำยิ่งขึ้นในระยะยาว</div>
            </Card>
          </div>
        </Section>

        <Section n="05" title="ข้อจำกัดและแนวทางสู่การใช้งานจริง">
          <Card>
            <ul className="space-y-3 text-[15px] leading-relaxed text-slate-300">
              <li>ชุดทดสอบปัจจุบันใช้กรณีที่ออกแบบขึ้นเอง สำหรับการใช้งานจริงควรให้ผู้เชี่ยวชาญฝ่ายบริหารความเสี่ยงตรวจสอบเฉลย</li>
              <li>ปัจจุบันใช้ปัญญาประดิษฐ์แบบไม่มีค่าใช้จ่าย ซึ่งจำกัดจำนวนการเรียกต่อวัน หากใช้งานปริมาณมากควรเปิดใช้บริการแบบเสียค่าใช้จ่าย</li>
              <li>เมื่อเจ้าหน้าที่แก้ไขผลการประเมิน ควรจัดเก็บเป็นข้อมูลใหม่เพื่อปรับเทียบเกณฑ์ให้แม่นยำยิ่งขึ้น</li>
              <li>หากข้อมูลมีความอ่อนไหวสูง อาจจำเป็นต้องติดตั้งโมเดลภายในองค์กร</li>
            </ul>
          </Card>
        </Section>

        <div className="border-t border-white/10 pt-10 text-center">
          <Link href="/" className="inline-flex rounded-full bg-white px-7 py-3.5 text-base font-semibold text-[#0b1233] transition hover:bg-slate-200">เริ่มประเมินความเสี่ยง</Link>
        </div>
      </main>
    </div>
  );
}
