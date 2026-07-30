import Link from "next/link";

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

const BAND_ROWS = [
  { name: "แน่นอน", color: "bg-emerald-500", cond: "ความใกล้เคียงตั้งแต่ 0.78 และระยะห่างตั้งแต่ 0.05", action: "ใช้ได้ทันที" },
  { name: "ค่อนข้างแน่ใจ", color: "bg-sky-500", cond: "ความใกล้เคียงตั้งแต่ 0.72 และระยะห่างตั้งแต่ 0.02", action: "ใช้ได้ ควรสุ่มตรวจ" },
  { name: "ไม่แน่ใจ", color: "bg-amber-400", cond: "ความใกล้เคียงตั้งแต่ 0.65 หรือระยะห่างต่ำกว่า 0.02", action: "ควรให้เจ้าหน้าที่ตรวจสอบ" },
  { name: "คลุมเครือ", color: "bg-rose-500", cond: "ความใกล้เคียงต่ำกว่า 0.65", action: "ต้องให้เจ้าหน้าที่ตัดสิน" },
];

const PIPELINE = [
  { t: "รับข้อมูลนำเข้า", d: "สถานการณ์ สาเหตุ และผลกระทบ ในรูปแบบข้อความภาษาไทย" },
  { t: "การค้นหา (RAG)", d: "แปลงข้อมูลนำเข้าเป็นเวกเตอร์ และค้นหาความเสี่ยงย่อยที่ใกล้เคียงที่สุดห้าอันดับ จากบัญชีความเสี่ยงทั้งหมด 107 รายการ" },
  { t: "การวิเคราะห์ด้วย AI", d: "เลือกหมวดความเสี่ยง และให้คะแนนโอกาสเกิดและผลกระทบตามเกณฑ์ของ NITMX" },
  { t: "การเปิดตาราง (Lookup)", d: "นำคะแนนโอกาสเกิดและผลกระทบมาเปิดตาราง เพื่อระบุโซนความเสี่ยงและแนวทางจัดการ" },
  { t: "การคำนวณความมั่นใจ", d: "ประเมินจากสัญญาณสามประการ และจัดระดับความมั่นใจเป็นสี่ระดับ" },
  { t: "ผลลัพธ์", d: "ประกอบด้วยหมวดความเสี่ยง คะแนน โซนความเสี่ยง แนวทางจัดการ ระดับความมั่นใจ และสถานะ" },
];

export default function Methodology() {
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
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            {[["ความใกล้เคียง", "วัดว่าข้อมูลนำเข้าใกล้เคียงกับความเสี่ยงในฐานข้อมูลเพียงใด ด้วยค่าระหว่าง 0.55 ถึง 0.83"], ["ระยะห่าง", "ระยะห่างระหว่างอันดับที่หนึ่งกับอันดับที่สอง เป็นตัวบ่งชี้ความกำกวมของผลลัพธ์"], ["ความครบถ้วนของข้อมูล", "ข้อมูลนำเข้ามีรายละเอียดเพียงพอต่อการตัดสินหรือไม่"]].map(([t, d]) => (
              <Card key={t}><div className="text-lg font-semibold text-white">{t}</div><div className="mt-2 text-[15px] leading-relaxed text-slate-400">{d}</div></Card>
            ))}
          </div>
          <Card className="!p-0 overflow-hidden">
            <table className="w-full text-[15px]">
              <thead><tr className="border-b border-white/10 text-left text-sm font-medium text-slate-400">
                <th className="px-7 py-4 font-medium">ระดับ</th><th className="px-7 py-4 font-medium">เกณฑ์</th><th className="px-7 py-4 font-medium">การจัดการ</th></tr></thead>
              <tbody className="divide-y divide-white/5">
                {BAND_ROWS.map((b) => (
                  <tr key={b.name}>
                    <td className="px-7 py-4"><span className="inline-flex items-center gap-2.5 font-medium text-white"><span className={`h-2.5 w-2.5 rounded-full ${b.color}`} />{b.name}</span></td>
                    <td className="px-7 py-4 text-slate-400">{b.cond}</td>
                    <td className="px-7 py-4 text-slate-300">{b.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Link href="/methodology/confidence" className="mt-6 inline-block text-[15px] font-medium text-indigo-300 transition hover:text-indigo-200">อ่านคำอธิบายค่าเหล่านี้โดยละเอียด</Link>
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
