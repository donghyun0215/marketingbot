/** 승인 임계값을 임의로 정하지 않고 실제 코드프레소 글의 분포에서 도출한다. */
import { buildProfile, CorpusDoc } from "../lib/voice/profile";
import { scoreVoice } from "../lib/voice/score";
const URL = process.env.SUPABASE_URL!, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const get = async (q: string) => (await fetch(`${URL}/rest/v1/${q}`, { headers: H })).json();

const main = async () => {
  const all = (await get("voice_corpus?select=title,body")) as CorpusDoc[];
  const curated = (await get("voice_corpus?select=title,body&source=eq.curated")) as CorpusDoc[];
  const profile = buildProfile(curated);
  const ko = all.filter((d) => /[가-힣]/.test(d.title));
  const scores = ko.map((d) => scoreVoice(d.body, profile).total).sort((a, b) => a - b);
  const q = (p: number) => scores[Math.floor((scores.length - 1) * p)];
  console.log(`한국어 코드프레소 글 ${scores.length}편 Voice Score 분포`);
  console.log(`  최소 ${scores[0]} / p10 ${q(0.1)} / 중앙값 ${q(0.5)} / p90 ${q(0.9)} / 최대 ${scores[scores.length - 1]}`);
  console.log(`  → p10(${q(0.1)})을 승인 임계값 후보로 제안: 실제 자사 글 90%가 통과하는 선`);
};
main();
