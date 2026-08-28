/** 텔레그램 승인 게이트 실전송 테스트: 위험 지점이 표시된 승인 요청이 폰에 도착하는지. */
import { factGuard } from "../lib/fact-guard";
import { buildProfile, CorpusDoc } from "../lib/voice/profile";
import { buildGenericBaseline } from "../lib/voice/generic";
import { scoreVoice } from "../lib/voice/score";
import { sendApprovalRequest } from "../lib/telegram";
import * as fs from "fs";

const URL = process.env.SUPABASE_URL!, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const get = async (q: string) => (await fetch(`${URL}/rest/v1/${q}`, { headers: H })).json();

async function main() {
  const curated = (await get("voice_corpus?select=title,body&source=eq.curated")) as CorpusDoc[];
  const profile = buildProfile(curated);
  const base = buildGenericBaseline(curated.map((d) => d.body));

  const draft = JSON.parse(fs.readFileSync("data/last_draft.json", "utf8"));
  // 확인 지점이 실제로 표시되는지 보려면 위험 문장이 하나는 있어야 한다
  const body =
    draft.voiced.body +
    "\n\n지난달 삼성화재 임원 교육을 1인당 150,000원에 진행했고, 만족도가 40% 개선됐습니다.";

  const guard = factGuard(body);
  const voice = scoreVoice(body, profile, base);

  // 실제 콘텐츠 레코드를 만들어 승인 대기 상태로 둔다
  const created = await (
    await fetch(`${URL}/rest/v1/contents`, {
      method: "POST",
      headers: { ...H, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify([
        {
          title: "AI 역량 평가를 도입하려는 기업이 가장 먼저 확인해야 할 것",
          body,
          channel: "blog",
          state: "pending_approval",
          voice_score: voice.total,
          voice_breakdown: voice.axes,
          fact_flags: guard.flags,
        },
      ]),
    })
  ).json();
  const contentId = created[0].id;

  await sendApprovalRequest({
    contentId,
    title: created[0].title,
    body,
    channel: "블로그",
    voice,
    guard,
    rationale: "문의 10건 중 6건이 출처 불명 — 귀속 가능한 주제로 선정",
  });
  console.log(`전송 완료. content #${contentId}, Voice ${voice.total}, 확인지점 ${guard.reviewPoints}곳, 차단 ${guard.blocked}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
