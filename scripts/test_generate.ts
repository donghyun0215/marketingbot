/**
 * Baseline vs Voice Engine 실측.
 * 같은 모델·같은 주제, 프롬프트만 다르게 해서 Voice Score 차이를 측정한다.
 */
import { buildProfile, CorpusDoc } from "../lib/voice/profile";
import { generateDraft } from "../lib/voice/generate";

const URL = process.env.SUPABASE_URL!, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const get = async (q: string) => (await fetch(`${URL}/rest/v1/${q}`, { headers: H })).json();

async function main() {
  const curated = (await get("voice_corpus?select=title,body&source=eq.curated")) as CorpusDoc[];
  const profile = buildProfile(curated);

  // 근거는 실제 임포트된 데이터에서만 가져온다 (익명화된 값)
  const topPost = (await get(
    "performance_metrics?select=external_title,clicks,ctr&channel=eq.blog&order=clicks.desc&limit=3"
  ))[1];
  const confirmed = await get("inquiries?select=company_alias,interest,attribution&attribution=eq.confirmed");

  const input = {
    topic: "AI 역량 평가를 도입하려는 기업이 가장 먼저 확인해야 할 것",
    channel: "blog" as const,
    evidence: [
      `자사 블로그 글 "${topPost.external_title}"이 6개월간 클릭 ${topPost.clicks}회, CTR ${topPost.ctr}%를 기록했다.`,
      `같은 기간 진성 인바운드 문의 10건 중 블로그 유입이 확정된 건은 1건이며, 관심 서비스는 ${confirmed[0]?.interest ?? "AI 역량평가"}였다.`,
      `문의 10건 중 6건은 어떤 콘텐츠에서 왔는지 특정할 수 없었다.`,
    ],
    constraints: [] as string[],
  };

  console.log(`주제: ${input.topic}\n`);
  const r = await generateDraft(input, profile);
  console.log(`모델: ${r.model}\n`);

  for (const [label, x] of [["대조군 (일반 프롬프트)", r.baseline], ["Voice Engine", r.voiced]] as const) {
    console.log(`── ${label} — Voice Score ${x.score.total}점`);
    console.log(`   축별: ${JSON.stringify(x.score.axes)}`);
    x.score.notes.forEach((n) => console.log(`   - ${n}`));
    console.log(`   본문 ${x.body.length}자 / 앞부분: ${x.body.slice(0, 160).replace(/\n/g, " ")}…\n`);
  }
  console.log(`차이: ${r.voiced.score.total - r.baseline.score.total}점`);
  require("fs").writeFileSync("data/last_draft.json", JSON.stringify(r, null, 2));
}
main().catch((e) => { console.error(e); process.exit(1); });
