import Link from "next/link";
import { BAND_BAR, BAND_DOT, BAND_TEXT, computeConfidence, effectiveWeights } from "@/lib/rag/confidence";
import { getConfidenceConfig } from "@/lib/rag/confidence-store";

// อ่านเกณฑ์ตอนเปิดหน้าเสมอ ไม่ใช่ตอน build — ตัวอย่างการคำนวณจะได้ตรงกับเกณฑ์ปัจจุบัน
export const dynamic = "force-dynamic";

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-7 backdrop-blur-sm">{children}</div>;
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-14">
      <h2 className="mb-5 text-2xl font-semibold tracking-tight text-white md:text-3xl">{title}</h2>
      <div className="space-y-4 text-[15px] leading-relaxed text-slate-300 md:text-base">{children}</div>
    </section>
  );
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl bg-black/30 px-5 py-4">
      <div className="whitespace-nowrap text-[15px] leading-relaxed tabular-nums text-slate-200 md:text-base">{children}</div>
    </div>
  );
}

export default function ConfidenceDetail() {
  const cfg = getConfidenceConfig();
  const w = effectiveWeights(cfg);

  // ตัวอย่างจริง คำนวณด้วยฟังก์ชันเดียวกับตอนประเมิน ตัวเลขจึงตรงกันเสมอ
  const exampleFields = {
    scenario: "ผู้ไม่หวังดีเจาะเข้าระบบเครือข่ายและปล่อยมัลแวร์เข้ารหัสไฟล์เรียกค่าไถ่",
    rootCause: "อุปกรณ์ป้องกันภัยคุกคามไม่ได้อัปเดตและขาดการเฝ้าระวัง",
    impact: "ระบบให้บริการหยุดชะงักและเสี่ยงสูญเสียข้อมูลสำคัญ",
  };
  const example = computeConfidence(
    { neighbors: [0.812, 0.744, 0.731, 0.702, 0.688], fields: exampleFields, llmSufficiency: 85 },
    cfg
  );

  return (
    <div className="min-h-screen w-full text-slate-100">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0a1030]/60 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Link href="/methodology" className="text-[15px] text-slate-300 transition hover:text-white">กลับหน้าวิธีการประเมิน</Link>
          <span className="text-[15px] font-medium text-slate-200">การวัดความมั่นใจ</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="mb-6 text-4xl font-semibold leading-[1.08] tracking-tight text-white md:text-6xl">คะแนนความมั่นใจคำนวณมาอย่างไร</h1>
        <p className="mb-16 text-xl leading-relaxed text-slate-400">
          ทุกผลการประเมินมาพร้อมคะแนนเดียวในช่วงศูนย์ถึงหนึ่งร้อย หน้านี้อธิบายว่าคะแนนนั้นประกอบขึ้นจากอะไร
          คิดด้วยสูตรใด และเหตุใดจึงเปิดให้ผู้ดูแลปรับเกณฑ์เองได้
        </p>

        <Block title="ภาพรวม">
          <p>
            คะแนนความมั่นใจไม่ได้มาจากการถามปัญญาประดิษฐ์ว่ามั่นใจเท่าไร แต่มาจากการวัดสัญญาณสามอย่างที่ตรวจสอบย้อนหลังได้
            แต่ละสัญญาณถูกแปลงเป็นคะแนนเต็มร้อยของตัวเอง จากนั้นถ่วงน้ำหนักแล้วรวมกัน
          </p>
          <Formula>
            คะแนนรวม = ({w.similarity.toFixed(0)}% × ความใกล้เคียง) + ({w.margin.toFixed(0)}% × ระยะห่าง) + ({w.completeness.toFixed(0)}% × ความครบถ้วน)
          </Formula>
          <p>
            การแยกเป็นองค์ประกอบทำให้อธิบายได้ว่าคะแนนที่ต่ำนั้นต่ำเพราะอะไร เช่นหาความเสี่ยงที่ตรงไม่เจอ
            หรือเจอหลายรายการที่พอ ๆ กัน หรือเพราะผู้กรอกเขียนข้อมูลมาสั้นเกินกว่าจะตัดสินได้
          </p>
        </Block>

        <Block title="1. การแปลงข้อความเป็นตัวเลข (Embedding)">
          <p>
            ก่อนอื่นระบบจะแปลงข้อความความเสี่ยงแต่ละรายการให้กลายเป็นชุดตัวเลข ที่เรียกว่าเวกเตอร์ ซึ่งเปรียบได้กับพิกัดบนแผนที่ของความหมาย
          </p>
          <p>
            ข้อความที่มีความหมายใกล้เคียงกันจะได้พิกัดที่อยู่ใกล้กัน แม้จะใช้คำไม่เหมือนกันก็ตาม เช่น คำว่า &ldquo;ระบบล่ม&rdquo; และ &ldquo;บริการหยุดชะงัก&rdquo; จะอยู่ใกล้กันเพราะสื่อความหมายคล้ายกัน
          </p>
        </Block>

        <Block title={`2. ความใกล้เคียง — น้ำหนัก ${w.similarity.toFixed(0)} เปอร์เซ็นต์`}>
          <p>
            เมื่อมีข้อความเข้ามาใหม่ ระบบจะวัดว่าพิกัดของข้อความนั้นอยู่ใกล้กับความเสี่ยงแต่ละรายการในบัญชีเพียงใด
            แล้วนำค่าของรายการอันดับหนึ่งมาแปลงเป็นคะแนน
          </p>
          <Formula>
            คะแนน = (ค่าที่วัดได้ − {cfg.similarity.floor}) ÷ ({cfg.similarity.ceil} − {cfg.similarity.floor}) × 100
          </Formula>
          <Card>
            <div className="mb-2 font-semibold text-white">ทำไมช่วงที่ใช้จริงคือ {cfg.similarity.floor} ถึง {cfg.similarity.ceil} ไม่ใช่ศูนย์ถึงหนึ่ง</div>
            <p className="text-slate-300">
              ค่าความใกล้เคียงของข้อความภาษาไทยไม่ได้กระจายตัวเต็มช่วงศูนย์ถึงหนึ่ง จากการวัดกับชุดทดสอบจริง
              ค่าที่เกิดขึ้นกระจุกอยู่ในช่วงแคบ ๆ ราว {cfg.similarity.floor} ถึง {cfg.similarity.ceil} เท่านั้น
              หากนำค่าดิบมาคิดเป็นเปอร์เซ็นต์ตรง ๆ ทุกรายการจะได้คะแนนสูงใกล้กันหมดจนแยกไม่ออกว่าอันไหนน่าเชื่อถือกว่ากัน
              ระบบจึงยืดเฉพาะช่วงที่เกิดขึ้นจริงออกให้เต็มร้อย เพื่อให้ความต่างเพียงเล็กน้อยของค่าดิบสะท้อนเป็นคะแนนที่แยกแยะได้
            </p>
          </Card>
          <p>
            ค่าที่ต่ำกว่าขอบล่างจะได้ศูนย์คะแนน และค่าที่สูงกว่าขอบบนจะได้เต็มร้อย ไม่มีคะแนนติดลบหรือเกินร้อย
          </p>
          <p>
            ขอบทั้งสองนี้ควรตั้งจากข้อมูลจริงขององค์กร ไม่ใช่เดาเอา คำสั่ง <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-sm">npm run calibrate</code> จะวัดให้ว่า
            ค่าที่ระบบเจอจริงอยู่ในช่วงใด แล้วเสนอขอบล่างและขอบบนที่ทำให้คะแนนกระจายตัวเต็มช่วง
          </p>
        </Block>

        <Block title={`3. ระยะห่าง — น้ำหนัก ${w.margin.toFixed(0)} เปอร์เซ็นต์`}>
          <p>
            ลำพังความใกล้เคียงอย่างเดียวยังไม่พอ เพราะบางครั้งมีความเสี่ยงหลายรายการที่ใกล้เคียงพอ ๆ กัน
            หากอันดับหนึ่งทิ้งห่างอันดับสองมาก แปลว่าคำตอบชัดเจน แต่หากสูสีกัน แปลว่าข้อความกำกวมและอาจจัดได้หลายหมวด
          </p>
          <Formula>
            คะแนน = (อันดับหนึ่ง − อันดับสอง) ÷ {cfg.margin.full} × 100 − (จำนวนรายการที่สูสี × {cfg.margin.tiePenalty})
          </Formula>
          <p>
            ส่วนที่หักออกคือบทลงโทษเมื่อกำกวมหลายทาง ระบบจะนับรายการตั้งแต่อันดับสามลงไปที่คะแนนยังห่างจากอันดับหนึ่งไม่เกิน {cfg.margin.tieBand}
            แล้วหักรายการละ {cfg.margin.tiePenalty} คะแนน เพราะกรณีที่มีตัวเลือกใกล้เคียงกันสามสี่รายการ
            ย่อมน่าเชื่อถือน้อยกว่ากรณีที่มีคู่แข่งเพียงรายการเดียว แม้ระยะห่างจากอันดับสองจะเท่ากันก็ตาม
            ที่ไม่นับอันดับสองด้วย เพราะอันดับสองถูกคิดไปแล้วในค่าระยะห่าง หากนับซ้ำจะเป็นการลงโทษสัญญาณเดียวกันสองรอบ
          </p>
        </Block>

        <Block title={`4. ความครบถ้วนของข้อมูล — น้ำหนัก ${w.completeness.toFixed(0)} เปอร์เซ็นต์`}>
          <p>
            สององค์ประกอบแรกวัดว่าระบบค้นเจออะไร แต่ไม่ได้บอกว่าโจทย์ที่ได้รับมานั้นดีพอหรือไม่
            หากผู้กรอกเขียนมาเพียงไม่กี่คำ ต่อให้ค้นเจอรายการที่ใกล้เคียงมาก ก็ไม่ควรมั่นใจเต็มที่
          </p>
          <p>องค์ประกอบนี้จึงผสมสองมุมมองเข้าด้วยกัน</p>
          <Card>
            <div className="mb-2 font-semibold text-white">ส่วนที่โค้ดวัดเอง (น้ำหนัก {cfg.completeness.fieldWeight})</div>
            <p className="text-slate-300">
              นับความยาวของแต่ละช่อง ได้แก่สถานการณ์ สาเหตุ และผลกระทบ ช่องที่ยาวถึง {cfg.completeness.minChars} อักษรได้เต็มร้อย
              สั้นกว่านั้นได้ตามสัดส่วน ช่องที่เว้นว่างได้ศูนย์ แล้วเฉลี่ยทั้งสามช่อง
            </p>
          </Card>
          <Card>
            <div className="mb-2 font-semibold text-white">ส่วนที่ปัญญาประดิษฐ์ประเมิน (น้ำหนัก {cfg.completeness.llmWeight})</div>
            <p className="text-slate-300">
              ในการประเมินแต่ละครั้ง ระบบให้โมเดลตอบกลับมาด้วยว่าข้อมูลที่ได้รับเพียงพอต่อการตัดสินแค่ไหน เป็นคะแนนศูนย์ถึงหนึ่งร้อยพร้อมเหตุผล
              ส่วนนี้จับสิ่งที่การนับตัวอักษรจับไม่ได้ เช่นข้อความยาวแต่วนไปมาไม่ได้ระบุสาเหตุที่แท้จริง
            </p>
          </Card>
          <Card>
            <div className="mb-2 font-semibold text-white">รายการที่กรอกไม่ครบสามช่อง ระบบจะไม่ประเมินให้</div>
            <p className="text-slate-300">
              คะแนนรวมเป็นการถ่วงน้ำหนัก ไม่ใช่การตัดสิทธิ์ องค์ประกอบที่ได้ศูนย์จึงไม่สามารถคว่ำคะแนนรวมได้
              รายการที่ขาดข้อมูลไปหนึ่งช่องจึงยังได้คะแนนรวมสูงได้ หากบังเอิญค้นเจอความเสี่ยงที่ตรงพอดี
              ซึ่งจะทำให้ตัวเลขที่แสดงสูงเกินความเป็นจริง ระบบจึงไม่ประเมินรายการเหล่านั้นตั้งแต่แรก
              และแจ้งว่าขาดช่องใด แทนการแสดงคะแนนที่เชื่อถือไม่ได้ ส่วนรายการที่กรอกครบจะประเมินตามปกติทุกรายการ
            </p>
          </Card>
          <p>
            การถามโมเดลเรื่องความครบถ้วนของข้อมูลนั้นต่างจากการถามว่ามั่นใจแค่ไหน เพราะเป็นการให้ประเมินสิ่งที่มองเห็นตรงหน้า
            ไม่ใช่ให้ประเมินความถูกต้องของคำตอบตัวเอง จึงยังใช้เป็นเพียงหนึ่งในสามองค์ประกอบ และถ่วงน้ำหนักไว้ไม่ให้ชี้ขาดผลลัพธ์
          </p>
        </Block>

        <Block title="5. ตัวอย่างการคำนวณจริง">
          <p>
            สมมุติกรณีเหตุการณ์มัลแวร์เรียกค่าไถ่ ระบบค้นเจอความเสี่ยงอันดับหนึ่งที่ค่าความใกล้เคียง 0.812
            อันดับสองที่ 0.744 และปัญญาประดิษฐ์ให้คะแนนความครบถ้วนของข้อมูลไว้ 85 คะแนน ผลลัพธ์ที่ได้เป็นดังนี้
          </p>
          <Card>
            <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
              <span className={`text-6xl font-bold tabular-nums ${BAND_TEXT[example.band.color]}`}>{example.score.toFixed(1)}</span>
              <span className="text-lg text-slate-400">จาก 100 คะแนน</span>
              <span className="ml-auto inline-flex items-center gap-2 text-[15px] text-slate-200">
                <span className={`h-2.5 w-2.5 rounded-full ${BAND_DOT[example.band.color]}`} />{example.band.label}
              </span>
            </div>
            <div className="mt-7 space-y-5">
              {example.components.map((c) => (
                <div key={c.key}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[15px]">
                    <span className="font-semibold text-white">{c.label}</span>
                    <span className="tabular-nums text-slate-300">
                      {c.score.toFixed(1)} × {c.weight.toFixed(0)}% = <span className="font-semibold text-white">{c.points.toFixed(1)}</span>
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div className={`h-full rounded-full ${BAND_BAR[example.band.color]}`} style={{ width: `${c.score}%` }} />
                  </div>
                  <div className="mt-1.5 text-sm leading-relaxed text-slate-500">{c.detail}</div>
                </div>
              ))}
            </div>
            <div className="mt-7 border-t border-white/10 pt-5 text-[15px] text-slate-300">
              รวม {example.components.map((c) => c.points.toFixed(1)).join(" + ")} ={" "}
              <span className="font-semibold text-white">{example.score.toFixed(1)} คะแนน</span> จึงจัดอยู่ในระดับ {example.band.label}
            </div>
          </Card>
          <p>
            ตัวเลขในตัวอย่างนี้คำนวณด้วยฟังก์ชันชุดเดียวกับที่ใช้ตอนประเมินจริง หากผู้ดูแลปรับน้ำหนักหรือช่วงคะแนน
            ตัวอย่างนี้จะเปลี่ยนตามทันที
          </p>
        </Block>

        <Block title="6. เหตุใดจึงให้ผู้ดูแลตั้งเกณฑ์เอง">
          <p>
            ระบบแสดงคะแนนเป็นตัวเลข แล้วให้ผู้ดูแลกำหนดเองว่าช่วงคะแนนใดคือความแม่นยำระดับใด
            เพราะเส้นแบ่งที่เหมาะสมไม่ใช่ข้อเท็จจริงทางเทคนิค แต่เป็นการตัดสินใจเชิงนโยบายว่าองค์กรยอมรับอะไรได้มากกว่ากัน
            ระหว่างการปล่อยผลที่อาจผิดให้ผ่าน กับภาระงานตรวจสอบที่เพิ่มขึ้น
          </p>
          <p>
            เกณฑ์ปัจจุบันจึงตั้งไว้ให้รายการที่ได้คะแนนต่ำกว่า {cfg.reviewBelow} ถูกส่งให้เจ้าหน้าที่ตรวจสอบ
            และปรับได้ตลอดเวลาโดยไม่ต้องแก้โค้ด
          </p>
          <Card>
            <div className="mb-3 font-semibold text-white">วิธีหาเกณฑ์ที่เหมาะกับข้อมูลจริง</div>
            <p className="text-slate-300">
              รันคำสั่งประเมินชุดทดสอบ ระบบจะรายงานความแม่นยำแยกตามช่วงคะแนน และแสดงว่าหากตั้งเส้นแบ่งไว้ที่คะแนนต่าง ๆ
              จะปล่อยผ่านกี่รายการ ในกลุ่มที่ปล่อยผ่านถูกต้องกี่เปอร์เซ็นต์ และเหลืองานให้เจ้าหน้าที่ตรวจเท่าใด
              แล้วเลือกจุดที่รับได้ทั้งสองด้าน
            </p>
            <div className="mt-4 overflow-x-auto rounded-xl bg-black/30 px-5 py-4">
              <code className="whitespace-nowrap font-mono text-[13px] text-slate-200 md:text-[15px]">npm run eval</code>
            </div>
          </Card>
        </Block>

        <Block title="7. ทำไมไม่ถามปัญญาประดิษฐ์ตรง ๆ ว่ามั่นใจกี่เปอร์เซ็นต์">
          <p>
            แม้จะถามได้ แต่งานวิจัยพบว่าโมเดลประเมินความมั่นใจของตัวเองได้ไม่ดี มักตอบตัวเลขเดิมแทบทุกครั้งโดยไม่สัมพันธ์กับความถูกต้องจริง
            และตัวเลขที่ได้ก็ตรวจย้อนหลังไม่ได้ว่ามาจากอะไร
          </p>
          <p>
            การคำนวณจากสัญญาณที่วัดได้จริงทำให้ทุกคะแนนอธิบายที่มาได้ครบทุกหลัก เมื่อเจ้าหน้าที่พบว่าผลใดผิด
            ก็ย้อนดูได้ว่าองค์ประกอบใดให้คะแนนสูงเกินจริง แล้วปรับน้ำหนักหรือช่วงคะแนนให้สะท้อนความเป็นจริงยิ่งขึ้น
          </p>
        </Block>

        <div className="flex flex-wrap gap-6 border-t border-white/10 pt-10">
          <Link href="/methodology" className="text-[15px] font-medium text-indigo-300 transition hover:text-indigo-200">กลับหน้าวิธีการประเมิน</Link>
          <Link href="/settings/confidence" className="text-[15px] font-medium text-indigo-300 transition hover:text-indigo-200">ปรับน้ำหนักและช่วงคะแนน</Link>
        </div>
      </main>
    </div>
  );
}
