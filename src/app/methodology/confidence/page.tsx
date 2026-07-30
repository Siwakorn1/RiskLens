import Link from "next/link";

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

export default function ConfidenceDetail() {
  return (
    <div className="min-h-screen w-full text-slate-100">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0a1030]/60 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Link href="/methodology" className="text-[15px] text-slate-300 transition hover:text-white">กลับหน้าวิธีการประเมิน</Link>
          <span className="text-[15px] font-medium text-slate-200">การวัดความมั่นใจ</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="mb-6 text-4xl font-semibold leading-[1.08] tracking-tight text-white md:text-6xl">ค่าความมั่นใจมาจากไหน</h1>
        <p className="mb-16 text-xl leading-relaxed text-slate-400">
          หน้านี้อธิบายที่มาของตัวเลขที่ใช้ประเมินความมั่นใจ ได้แก่ ความใกล้เคียงและระยะห่าง เพื่อให้เข้าใจว่าระบบตัดสินอย่างไร
        </p>

        <Block title="1. การแปลงข้อความเป็นตัวเลข (Embedding)">
          <p>
            ก่อนอื่นระบบจะแปลงข้อความความเสี่ยงแต่ละรายการให้กลายเป็นชุดตัวเลข ที่เรียกว่าเวกเตอร์ ซึ่งเปรียบได้กับพิกัดบนแผนที่ของความหมาย
          </p>
          <p>
            ข้อความที่มีความหมายใกล้เคียงกันจะได้พิกัดที่อยู่ใกล้กัน แม้จะใช้คำไม่เหมือนกันก็ตาม เช่น คำว่า &ldquo;ระบบล่ม&rdquo; และ &ldquo;บริการหยุดชะงัก&rdquo; จะอยู่ใกล้กันเพราะสื่อความหมายคล้ายกัน
          </p>
        </Block>

        <Block title="2. ความใกล้เคียง (Similarity)">
          <p>
            เมื่อมีข้อความเข้ามาใหม่ ระบบจะวัดว่าพิกัดของข้อความนั้นอยู่ใกล้กับความเสี่ยงแต่ละรายการในฐานข้อมูลเพียงใด โดยได้ค่าเป็นตัวเลขระหว่างศูนย์ถึงหนึ่ง ยิ่งค่าสูงยิ่งใกล้เคียง
          </p>
          <Card>
            <div className="mb-2 font-semibold text-white">ทำไมช่วงที่ใช้จริงคือ 0.55 ถึง 0.83</div>
            <p className="text-slate-300">
              จากการวัดกับข้อมูลจริง พบว่าข้อความภาษาไทยทั่วไปมักได้ค่าความใกล้เคียงพื้นฐานราว 0.55 แม้จะไม่เกี่ยวข้องกันเลย ส่วนข้อความที่ตรงกับความเสี่ยงชัดเจนจะได้ค่าสูงสุดราว 0.83 ดังนั้นเราจึงใช้ช่วง 0.55 ถึง 0.83 เป็นกรอบในการตัดสิน ไม่ใช่ช่วงศูนย์ถึงหนึ่งเต็ม
            </p>
          </Card>
        </Block>

        <Block title="3. ระยะห่าง (Margin)">
          <p>
            ลำพังความใกล้เคียงอย่างเดียวยังไม่พอ เพราะบางครั้งมีความเสี่ยงหลายรายการที่ใกล้เคียงพอ ๆ กัน ระบบจึงดูระยะห่างระหว่างรายการอันดับหนึ่งกับอันดับสองด้วย
          </p>
          <p>
            หากอันดับหนึ่งทิ้งห่างอันดับสองมาก แปลว่าคำตอบชัดเจน แต่หากสูสีกัน แปลว่าข้อความกำกวม อาจจัดได้หลายหมวด ระบบจะลดระดับความมั่นใจลง
          </p>
        </Block>

        <Block title="4. ทำไมไม่ถามปัญญาประดิษฐ์โดยตรง">
          <p>
            แม้จะถามปัญญาประดิษฐ์ได้ว่ามั่นใจกี่เปอร์เซ็นต์ แต่งานวิจัยพบว่าโมเดลประเมินความมั่นใจของตัวเองได้ไม่ดี มักตอบตัวเลขเดิมแทบทุกครั้งโดยไม่สัมพันธ์กับความถูกต้องจริง
          </p>
          <p>
            เราจึงเลือกคำนวณความมั่นใจจากสัญญาณที่วัดได้จริง คือความใกล้เคียง ระยะห่าง และความครบถ้วนของข้อมูลนำเข้า แล้วจัดเป็นสี่ระดับ เพื่อให้ระดับความมั่นใจสะท้อนความเป็นจริง ตรวจสอบย้อนหลังได้
          </p>
        </Block>

        <div className="border-t border-white/10 pt-10">
          <Link href="/methodology" className="text-[15px] font-medium text-indigo-300 transition hover:text-indigo-200">กลับหน้าวิธีการประเมิน</Link>
        </div>
      </main>
    </div>
  );
}
