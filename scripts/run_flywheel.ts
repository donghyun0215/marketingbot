/** 플라이휠 실행: 실데이터 분석 → 인사이트 → 주제 추천 → 텔레그램 브리핑 */
import { analyze, suggestTopics, persistSuggestions } from "../lib/flywheel/analyze";
import { sendMessage, esc } from "../lib/telegram";

const DRY = process.argv.includes("--dry");

async function main() {
  const insights = await analyze();
  console.log("【인사이트】");
  for (const i of insights) {
    console.log(`  ▸ ${i.headline}`);
    i.evidence.forEach((e) => console.log(`     - ${e}`));
  }

  const suggestions = await suggestTopics(3);
  console.log("\n【다음 주제 추천】");
  suggestions.forEach((s, n) => {
    console.log(`  ${n + 1}. ${s.topic}`);
    console.log(`     근거: ${s.rationale}`);
  });

  if (DRY) return;

  const saved = await persistSuggestions(suggestions);
  console.log(`\n추천 ${saved.length}건 저장 (id: ${saved.map((s: any) => s.id).join(", ")})`);

  const lines = [
    `*마케팅 데일리 브리핑*`,
    ``,
    ...insights.slice(0, 3).flatMap((i) => [
      `▸ ${esc(i.headline)}`,
      ...i.evidence.slice(0, 2).map((e) => `   _${esc(e)}_`),
    ]),
    ``,
    `*다음 주제 후보*`,
    ...saved.map((s: any, n: number) => `${n + 1}\\. ${esc(s.topic)}\n   _${esc(s.rationale)}_`),
  ];
  await sendMessage(lines.join("\n"));
  console.log("텔레그램 브리핑 전송 완료");
}
main().catch((e) => { console.error(e); process.exit(1); });
