/**
 * Voice Score 검증: 채점기가 실제로 "코드프레소다움"을 구분하는지 확인한다.
 * 큐레이션 글(정답) vs 비큐레이션 글 vs 범용 마케팅 문체 샘플을 같은 기준으로 채점한다.
 */
import { buildProfile, profileToInstructions, CorpusDoc } from "../lib/voice/profile";
import { scoreVoice } from "../lib/voice/score";

const URL = process.env.SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function get(q: string): Promise<any[]> {
  const r = await fetch(`${URL}/rest/v1/${q}`, { headers: H });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}

// 범용 LLM이 흔히 뱉는 "어느 회사에나 어울리는" 글 — 대조군
const GENERIC = `
디지털 전환의 시대가 도래하면서 많은 기업들이 변화의 필요성을 느끼고 있습니다.
인공지능 기술은 이제 선택이 아닌 필수가 되었으며, 이를 어떻게 활용하느냐가 기업의 미래를 좌우합니다.
성공적인 도입을 위해서는 명확한 전략과 체계적인 접근이 무엇보다 중요합니다.
조직 구성원 모두가 변화에 동참할 수 있도록 충분한 소통과 교육이 이루어져야 합니다.
결론적으로, 지속 가능한 성장을 위해서는 혁신적인 사고와 유연한 조직 문화가 뒷받침되어야 할 것입니다.
`.trim();

async function main() {
  const curated = (await get("voice_corpus?select=title,body&source=eq.curated")) as CorpusDoc[];
  const others = (await get("voice_corpus?select=title,body&source=eq.scraped&limit=40")) as CorpusDoc[];
  console.log(`큐레이션 ${curated.length}편으로 프로파일 생성\n`);

  // 홀드아웃 검증: 8편 중 1편을 빼고 프로파일을 만든 뒤, 뺀 글을 채점한다.
  console.log("── 홀드아웃 (자기 자신을 학습하지 않은 상태로 채점) ──");
  const holdout: number[] = [];
  for (let i = 0; i < curated.length; i++) {
    const train = curated.filter((_, j) => j !== i);
    const s = scoreVoice(curated[i].body, buildProfile(train));
    holdout.push(s.total);
    console.log(`  ${s.total.toString().padStart(3)}점  ${curated[i].title.slice(0, 40)}`);
  }
  const avg = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
  console.log(`  평균 ${avg(holdout)}점\n`);

  const profile = buildProfile(curated);

  const korean = others.filter((d) => /[가-힣]/.test(d.title));
  const english = others.filter((d) => !/[가-힣]/.test(d.title));
  const kScores = korean.map((d) => scoreVoice(d.body, profile).total);
  const eScores = english.map((d) => scoreVoice(d.body, profile).total);
  console.log(`── 대조군 ──`);
  console.log(`  비큐레이션 한글 글 ${korean.length}편 평균: ${avg(kScores)}점`);
  if (eScores.length) console.log(`  영문 글 ${english.length}편 평균: ${avg(eScores)}점`);

  const g = scoreVoice(GENERIC, profile);
  console.log(`  범용 마케팅 문체 샘플: ${g.total}점`);
  console.log(`    축별: ${JSON.stringify(g.axes)}`);
  g.notes.forEach((n) => console.log(`    - ${n}`));

  console.log(`\n── 생성 프롬프트에 주입될 문체 지시 ──\n${profileToInstructions(profile)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
