import { assess, type AssessInput } from "../src/lib/rag/assess";

const cases: AssessInput[] = [
  {
    scenario: "ความเสี่ยงจากโครงการพัฒนาระบบ (New Project) ไม่สามารถส่งมอบได้ตามแผนงานหรือมีการขยายระยะเวลาดำเนินโครงการ",
    rootCause: "เนื่องจาก Requirement และการออกแบบระบบในระดับ High-Level ยังไม่มีความชัดเจนหรือครบถ้วนตั้งแต่ระยะเริ่มต้น (Process)",
    impact: "ส่งผลกระทบต่อระยะเวลาโครงการ การบริหารทรัพยากร ประสิทธิภาพในการดำเนินงาน และแผนงานโครงการอื่นที่เกี่ยวข้อง",
  },
  {
    scenario: "ระบบให้บริการโอนเงินถูกโจมตีทางไซเบอร์ทำให้บริการหยุดชะงัก",
    rootCause: "ช่องโหว่ของระบบไม่ได้รับการอัพเดท patch อย่างสม่ำเสมอ",
    impact: "ลูกค้าไม่สามารถทำธุรกรรมได้ กระทบชื่อเสียงและความเชื่อมั่น",
  },
];

async function main() {
  for (const c of cases) {
    const r = await assess(c);
    console.log("\n" + "═".repeat(70));
    console.log("Scenario:", c.scenario.slice(0, 60) + "...");
    console.log("─".repeat(70));
    console.log(`จัดหมวด : ${r.rfCode ?? "(ไม่พบ)"}  ${r.level3Name ?? ""}`);
    console.log(`          ${r.level1} > ${r.level2}`);
    console.log(`          เหตุผล: ${r.classificationReason}`);
    console.log(`Likelihood: ${r.likelihood}  (${r.likelihoodReason})`);
    console.log(`Impact    : ${r.impactScore} [ด้าน ${r.impactDimension}]  (${r.impactReason})`);
    console.log(`โซนความเสี่ยง: ${r.zone}  ${r.managementColor}`);
    console.log(`แนวทางจัดการ : ${r.managementAction.slice(0, 60)}...`);
    console.log(`Confidence: ${r.confidence}  ${r.status}   (score=${r.confidenceScore}, top=${r.topSimilarity}, margin=${r.margin})`);
  }
}
main();
