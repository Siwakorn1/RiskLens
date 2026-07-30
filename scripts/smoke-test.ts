import { llm } from "../src/lib/llm";

async function main() {
  const [vec] = await llm.embed(["hello world"]);
  console.log(`Embedding OK — vector has ${vec.length} dimensions`);

// llm.embed(...) คืน array ของเวกเตอร์ (เพราะส่งได้หลายข้อความ) แต่เราส่งไปแค่อันเดียว
// const [vec] = คือ "destructuring" = แกะเอาสมาชิกตัวแรกของ array มาใส่ตัวแปร vec เลย (เขียนสั้นกว่า const vec = result[0])
// vec.length = ความยาวของเวกเตอร์ ควรได้ 768 เพราะโมเดล nomic-embed-text ผลิตเวกเตอร์ 768 มิติเสมอ — ถ้าเห็นเลขนี้ = การ embed ทำงานถูกต้องจริง

  process.stdout.write("Chat: "); //ทำไมใช้ process.stdout.write แทน console.log? เพราะ console.log ขึ้นบรรทัดใหม่ทุกครั้ง — ถ้าใช้ คำตอบจะกระจายบรรทัดละคำ แต่ write พิมพ์ต่อท้ายเรื่อย ๆ เลยเห็นเป็นประโยคที่ค่อย ๆ งอกออกมา (เอฟเฟกต์แบบ ChatGPT ในเวอร์ชัน terminal)
  for await (const token of llm.chatStream("You are terse.", "Say hi in 5 words")) {
    process.stdout.write(token);
  }
  console.log("\nAll good ✅");
}

main();
