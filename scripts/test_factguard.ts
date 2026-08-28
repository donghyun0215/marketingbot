/** Fact-Guard 검증: 놓치면 안 되는 것을 잡는가, 멀쩡한 글을 막지는 않는가. */
import { factGuard, summarize } from "../lib/fact-guard";

const URL = process.env.SUPABASE_URL!, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const get = async (q: string) =>
  (await fetch(`${URL}/rest/v1/${q}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })).json();

const RISKY = `
이번에 삼성화재와 계약을 체결했습니다. 임원 70명 대상 AI 역량 평가를 1인당 150,000원에 제공하며,
계약 기간은 2년입니다. 도입 기업의 생산성이 40% 향상되었습니다. (대외비)
`.trim();

async function main() {
  console.log("【위험 문서】");
  const r = factGuard(RISKY);
  console.log(`  ${summarize(r)} / 차단: ${r.blocked}`);
  r.flags.forEach((f) => console.log(`   [${f.severity}] ${f.category}: "${f.matched}" — ${f.message}`));

  console.log("\n【실제 발행된 자사 글 46편 — 과잉 차단 여부】");
  const posts = (await get("voice_corpus?select=title,body")) as any[];
  const ko = posts.filter((p) => /[가-힣]/.test(p.title));
  const results = ko.map((p) => factGuard(p.body));
  const blocked = results.filter((r) => r.blocked).length;
  const avgPoints = Math.round(results.reduce((a, r) => a + r.reviewPoints, 0) / results.length);
  console.log(`  차단 판정 ${blocked}/${ko.length}편, 편당 확인 지점 평균 ${avgPoints}곳`);
  const worst = ko
    .map((p, i) => ({ title: p.title, n: results[i].reviewPoints }))
    .sort((a, b) => b.n - a.n)[0];
  console.log(`  최다: ${worst.n}곳 — ${worst.title.slice(0, 40)}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
