/**
 * Voice Score — 초안이 코드프레소 문체에 얼마나 가까운지 0~100으로 채점한다.
 *
 * 왜 필요한가: 브리프의 합격 기준은 "마케터가 쓴 것과 구분되지 않을 것"이다.
 * "좋아 보인다"는 주장은 증거가 아니므로, 축별 점수와 근거를 항상 함께 낸다.
 *
 * 네 축은 서로 다른 실패 유형을 잡는다.
 *  - lexicon:     주제어만 맞고 어휘 습관이 다른 글 (범용 LLM의 전형)
 *  - rhythm:      한 문장이 길게 늘어지거나 지나치게 토막난 글
 *  - terminology: 제품·브랜드 표기가 흔들리는 글 (브리프가 지적한 실제 문제)
 *  - structure:   근거 수치 없이 형용사로 채운 글
 */

import { GenericBaseline, genericScore } from "./generic";
import { TOPIC_KEYWORDS } from "./keywords";
import {
  VoiceProfile,
  splitSentences,
  endingOf,
  TERMINOLOGY,
} from "./profile";

export type VoiceScore = {
  total: number;
  axes: { lexicon: number; rhythm: number; terminology: number; structure: number; generic: number };
  notes: string[];
};

/**
 * 어휘 축의 비중을 낮춘 이유: 같은 주제를 주면 범용 LLM도 어휘가 우연히 겹쳐
 * 쉽게 포화된다. 즉 변별력이 낮다. 반대로 범용성 축은 브랜드 문체와 범용 문체를
 * 직접 가르므로 비중을 높게 둔다.
 */
const WEIGHTS = { lexicon: 0.2, rhythm: 0.2, terminology: 0.15, structure: 0.15, generic: 0.3 };

/** 프로파일 특징어가 초안에 얼마나 재현됐는가. */
function lexiconScore(text: string, p: VoiceProfile, notes: string[]) {
  const top = p.lexicon.slice(0, 40);
  const hit = top.filter((w) => text.includes(w));
  const ratio = hit.length / Math.max(top.length, 1);
  // 완전 일치는 표절에 가깝다. 30% 부근을 만점으로 두고 넘치면 감점하지 않되 상한을 둔다.
  const score = Math.min(100, (ratio / 0.3) * 100);
  notes.push(`특징어 ${hit.length}/${top.length} 재현 (${Math.round(ratio * 100)}%)`);
  return score;
}

/** 문장 길이 평균과 편차가 코퍼스 분포 안에 있는가. */
function rhythmScore(text: string, p: VoiceProfile, notes: string[]) {
  const sents = splitSentences(text);
  if (!sents.length) return 0;
  const lens = sents.map((s) => s.length);
  const m = lens.reduce((a, b) => a + b, 0) / lens.length;
  const sd = Math.sqrt(lens.reduce((a, l) => a + (l - m) ** 2, 0) / lens.length);

  // 평균이 코퍼스 표준편차 1개 이내면 만점, 3개를 넘으면 0점.
  const z = Math.abs(m - p.sentence.mean) / Math.max(p.sentence.sd, 1);
  const meanScore = Math.max(0, 100 - Math.max(0, z - 1) * 50);

  // 편차가 지나치게 작으면 기계적으로 균일한 글이다.
  const sdRatio = sd / Math.max(p.sentence.sd, 1);
  const sdScore = sdRatio < 0.5 ? 40 : Math.min(100, 100 - Math.abs(1 - sdRatio) * 40);

  // 종결 어미 분포 일치
  const counts: Record<string, number> = {};
  let n = 0;
  for (const s of sents) {
    const e = endingOf(s);
    if (!e) continue;
    counts[e] = (counts[e] ?? 0) + 1;
    n++;
  }
  let diff = 0;
  const keys = new Set([...Object.keys(p.endings), ...Object.keys(counts)]);
  for (const k of keys) {
    diff += Math.abs((p.endings[k] ?? 0) - (n ? (counts[k] ?? 0) / n : 0));
  }
  const endingScore = Math.max(0, 100 - (diff / 2) * 100);

  /**
   * 어미 일관성 — 분포만으로는 잡히지 않는 결함.
   * 합니다체와 해요체를 문장마다 번갈아 써도 전체 분포는 코퍼스와 일치한다.
   * 즉 "분포는 맞는데 읽으면 어색한" 글이 통과한다. 실제로 통과했다.
   * 사람이 블라인드 테스트에서 AI 글을 골라낸 근거가 바로 이 어색함이었다.
   * 실측: 실제 글의 인접 문장 문체 전환률 중앙값 10.4%, p75 22.0%.
   *      우리 생성물은 78.9%였다.
   */
  const seq: string[] = [];
  for (const s2 of sents) {
    const e = endingOf(s2);
    if (e === "합니다체" || e === "해요체") seq.push(e);
  }
  let switches = 0;
  for (let i = 1; i < seq.length; i++) if (seq[i] !== seq[i - 1]) switches++;
  const switchRate = seq.length > 2 ? (switches / (seq.length - 1)) * 100 : 0;
  // 상한만 두고 하한은 두지 않는다.
  // 실측: 46편 중 12편(26%)이 전환률 2% 미만이다. 한 문체로 끝까지 가는 것도
  // 실제 코드프레소의 스타일이므로, 0%를 결함으로 처리하면 사람이 쓴 글을 깎게 된다.
  // 문제는 "섞느냐"가 아니라 "아무 데서나 바뀌느냐"이며, 후자만 감점한다.
  // (섞을 자리를 고르는 판단은 채점기가 아니라 프롬프트와 사람 승인이 맡는다)
  const coherenceScore = Math.max(0, Math.min(100, 100 - Math.max(0, switchRate - 22) * 1.6));

  notes.push(
    `문장 평균 ${m.toFixed(1)}자 (코퍼스 ${p.sentence.mean}자), 어미 분포 차이 ${(diff / 2 * 100).toFixed(0)}%, 문체 전환률 ${switchRate.toFixed(0)}% (자사 평균 10%)`
  );
  return meanScore * 0.25 + sdScore * 0.15 + endingScore * 0.25 + coherenceScore * 0.35;
}

/** 고유 용어 표기가 정확한가. 흔들리면 감점. */
function terminologyScore(text: string, notes: string[]) {
  const wrong: string[] = [];
  const variants: [RegExp, string][] = [
    [/코드 프레소|코드프래소|CodePresso(?!\w)/g, "코드프레소"],
    [/AI역량진단|AI 역량진단/g, "AI 역량 진단"],
    [/에이아이 전환|AI전환/g, "AI 전환"],
    // 대소문자 무시로 검사하면 올바른 표기까지 잡힌다. 잘못된 변형만 정확히 지정한다.
    [/Skill\s+Certify|skillcertify|SKILLCERTIFY/g, "SkillCertify"],
    [/Dev\s+Talk|devtalk|DEVTALK|DevTalk/g, "Devtalk"],
  ];
  for (const [re, correct] of variants) {
    const m = text.match(re);
    if (m) wrong.push(`${m[0]} → ${correct}`);
  }
  const used = TERMINOLOGY.filter((t) => text.includes(t));
  let score = 100 - wrong.length * 25;
  if (used.length === 0) {
    score -= 20;
    notes.push("자사 고유 용어가 한 번도 등장하지 않음");
  }
  if (wrong.length) notes.push(`표기 불일치: ${wrong.join(", ")}`);
  else notes.push(`용어 표기 정확 (${used.length}개 사용)`);
  return Math.max(0, Math.min(100, score));
}

/**
 * 근거와 주제 장악력이 들어 있는가.
 *
 * 1차 설계: 자사 언급 횟수가 많을수록 좋다고 봤다 → 틀렸다.
 * 실측: 실제 코드프레소 글 46편의 브랜드 언급 밀도는 중앙값 1.09/1,000자,
 * p75가 2.04다. 반면 우리 생성물은 4.43이었다. 즉 우리 쪽이 오히려 과하다.
 * 실제 글은 회사 이름을 반복하는 대신 주제 키워드로 본문을 채운다
 * (상위 검색어 60개 중 실제 글은 중앙값 6개 포함, 우리 생성물은 5개).
 *
 * 그래서 이 축은 세 가지를 본다.
 *   - 브랜드: 있으면 되고, 과하면 감점 (실측 분포를 상한으로)
 *   - 제품·고유 용어: 자사만 쓸 수 있는 명사
 *   - 주제 키워드: 실제 검색 수요어를 본문이 다루고 있는가
 */
function structureScore(text: string, p: VoiceProfile, notes: string[]) {
  const scale = Math.max(text.length / 1500, 0.6);
  const per1k = (n: number) => (n / Math.max(text.length, 1)) * 1000;

  const brandCount = (text.match(/코드프레소/g) ?? []).length;
  const brandDensity = per1k(brandCount);
  // 실측 분포: 중앙값 1.09 / p75 2.04. 없으면 0점, 적정이면 만점, 과하면 감점.
  const brandScore =
    brandCount === 0 ? 0 : brandDensity <= 2.04 ? 100 : Math.max(40, 100 - (brandDensity - 2.04) * 20);

  const productHits = TERMINOLOGY.filter((t) => t !== "코드프레소" && text.includes(t)).length;
  const productScore = Math.min(100, (productHits / Math.max(2 * scale, 1)) * 100);

  const evidenceHits = (text.match(/\d+(\.\d+)?\s*(%|명|건|배|개|년|개월|시간|팀|곳|회|위)/g) ?? []).length;
  const evidenceScore = Math.min(100, (evidenceHits / Math.max(2 * scale, 1)) * 100);

  // 주제 키워드 장악력. 실제 검색 수요어를 본문이 다루는가 (실제 글 중앙값 6개)
  const kwHits = TOPIC_KEYWORDS.filter((k) => text.includes(k)).length;
  const kwScore = Math.min(100, (kwHits / Math.max(5 * scale, 1)) * 100);

  notes.push(
    `자사 언급 ${brandCount}회(${brandDensity.toFixed(1)}/1k, 자사 평균 1.1) · 고유 용어 ${productHits}종 · 주제 키워드 ${kwHits}개 · 근거 수치 ${evidenceHits}회`
  );
  return brandScore * 0.2 + productScore * 0.25 + kwScore * 0.3 + evidenceScore * 0.25;
}

export function scoreVoice(
  text: string,
  profile: VoiceProfile,
  genericBaseline?: GenericBaseline
): VoiceScore {
  const notes: string[] = [];
  const base = genericBaseline ?? { markersPer1k: 0.3 };
  const axes = {
    lexicon: Math.round(lexiconScore(text, profile, notes)),
    rhythm: Math.round(rhythmScore(text, profile, notes)),
    terminology: Math.round(terminologyScore(text, notes)),
    structure: Math.round(structureScore(text, profile, notes)),
    generic: Math.round(genericScore(text, base, notes)),
  };
  const total = Math.round(
    axes.lexicon * WEIGHTS.lexicon +
      axes.rhythm * WEIGHTS.rhythm +
      axes.terminology * WEIGHTS.terminology +
      axes.structure * WEIGHTS.structure +
      axes.generic * WEIGHTS.generic
  );
  return { total, axes, notes };
}

/**
 * 승인 큐 진입 기준.
 * 임의로 정하지 않고 실제 코드프레소 한국어 글 46편의 분포에서 도출했다.
 *   최소 64 / p10 70 / 중앙값 80 / p90 87 / 최대 90
 * p10을 택한 이유: 자사 글의 90%가 통과하는 선. 이보다 높이면 사람이 쓴 진짜 글도
 * 우리 게이트에서 반려되므로, 기준으로서 성립하지 않는다.
 * (검증: scripts/calibrate_threshold.ts)
 */
export const APPROVAL_THRESHOLD = 70;
