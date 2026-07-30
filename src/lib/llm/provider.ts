// สัญญาที่ AI backend ทุกตัวต้องทำตาม
// ส่วนอื่นของแอปจะ import แค่ไฟล์นี้ ไม่ยุ่งกับ vendor ตรง ๆ

export interface LLMProvider {
  /** แปลงข้อความเป็นเวกเตอร์ — ได้ 1 เวกเตอร์ต่อ 1 ข้อความ */
  embed(texts: string[]): Promise<number[][]>;
  /*
    อ่านจากซ้ายไปขวา: ฟังก์ชันชื่อ embed / รับพารามิเตอร์ texts ชนิด string[] (array ของข้อความ) / คืนค่า Promise<number[][]>

    แกะชนิดข้อมูลตอบแทนกัน:

    number[] = array ของตัวเลข เช่น [0.12, -0.5, 0.88, ...] — นี่คือ เวกเตอร์ 1 ตัว
    number[][] = array ของ array ของตัวเลข — คือ หลายเวกเตอร์ (ส่งข้อความไป 3 อัน ได้เวกเตอร์กลับ 3 ตัว)
    Promise<...> = "ยังไม่ได้ค่าตอนนี้ แต่สัญญาว่าจะได้ในอนาคต" — จำเป็นเพราะการเรียก AI ใช้เวลา โปรแกรมจะได้ไม่ค้างรอ
  */

  /** สร้างคำตอบ ทยอยส่งออกมาทีละชิ้นสำหรับทำ streaming UI */
  chatStream(systemPrompt: string, userPrompt: string): AsyncIterable<string>;
  //คืน AsyncIterable<string> = "ชุดของ string ที่ทยอยมาทีละชิ้นตามเวลา" ต่างจาก Promise<string> ที่ได้คำตอบทีเดียวก้อนเดียว → เอาไปทำ UI แบบพิมพ์ทีละคำได้

  /** สร้างคำตอบเป็น JSON ล้วน (ไม่ stream) — ใช้ตอนประเมินความเสี่ยงที่ต้อง parse ผลเป็นโครงสร้าง */
  generateJSON(systemPrompt: string, userPrompt: string): Promise<string>;
}