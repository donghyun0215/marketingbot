/**
 * 새 축 채택 조건 검증.
 * 조건: 실제 코드프레소 글 46편이 새 채점기에서도 여전히 높은 점수를 받아야 한다.
 * 통과하지 못하면 이 축은 "우리에게 유리하게 만든 지표"이므로 폐기한다.
 */
import { buildProfile, CorpusDoc } from "../lib/voice/profile";
import { scoreVoice } from "../lib/voice/score";
import { buildGenericBaseline } from "../lib/voice/generic";
import * as fs from "fs";

const URL = process.env.SUPABASE_URL!, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const get = async (q: string) => (await fetch(`${URL}/rest/v1/${q}`, { headers: H })).json();
const avg = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / Math.max(xs.length, 1));
const pct = (xs: number[], p: number) => [...xs].sort((a, b) => a - b)[Math.floor((xs.length - 1) * p)];

async function main() {
  const all = (await get("voice_corpus?select=title,body")) as CorpusDoc[];
  const curated = (await get("voice_corpus?select=title,body&source=eq.curated")) as CorpusDoc[];
  const profile = buildProfile(curated);
  const base = buildGenericBaseline(curated.map((d) => d.body));
  console.log(`자사 글 기준선: 범용표지 ${base.markersPer1k.toFixed(2)}/1k\n`);

  const ko = all.filter((d) => /[가-힣]/.test(d.title));
  const scores = ko.map((d) => scoreVoice(d.body, profile, base).total);
  console.log(`【채택 조건】 실제 코드프레소 한국어 글 ${ko.length}편`);
  console.log(`  최소 ${Math.min(...scores)} / p10 ${pct(scores, 0.1)} / 중앙값 ${pct(scores, 0.5)} / 평균 ${avg(scores)} / 최대 ${Math.max(...scores)}`);
  const genericAxis = ko.map((d) => scoreVoice(d.body, profile, base).axes.generic);
  console.log(`  범용성 축만: 평균 ${avg(genericAxis)}, 최소 ${Math.min(...genericAxis)}`);

  if (fs.existsSync("data/last_draft.json")) {
    const d = JSON.parse(fs.readFileSync("data/last_draft.json", "utf8"));
    console.log(`\n【변별력】 동일 주제·동일 모델`);
    for (const [label, x] of [["대조군", d.baseline], ["Voice Engine", d.voiced]] as const) {
      const s = scoreVoice(x.body, profile, base);
      console.log(`  ${label.padEnd(13)} 총점 ${s.total}  축별 ${JSON.stringify(s.axes)}`);
      console.log(`     ${s.notes[s.notes.length - 1]}`);
    }
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
