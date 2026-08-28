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

import {
  VoiceProfile,
  splitSentences,
  endingOf,
  TERMINOLOGY,
} from "./profile";

export type VoiceScore = {
  total: number;
  axes: { lexicon: number; rhythm: number; terminology: number; structure: number };
  notes: string[];
};

const WEIGHTS = { lexicon: 0.3, rhythm: 0.25, terminology: 0.2, structure: 0.25 };

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

  notes.push(
    `문장 평균 ${m.toFixed(1)}자 (코퍼스 ${p.sentence.mean}자), 어미 분포 차이 ${(diff / 2 * 100).toFixed(0)}%`
  );
  return meanScore * 0.4 + sdScore * 0.2 + endingScore * 0.4;
}

/** 고유 용어 표기가 정확한가. 흔들리면 감점. */
function terminologyScore(text: string, notes: string[]) {
  const wrong: string[] = [];
  const variants: [RegExp, string][] = [
    [/코드 프레소|코드프래소|CodePresso(?!\w)/g, "코드프레소"],
    [/AI역량진단|AI 역량진단/g, "AI 역량 진단"],
    [/에이아이 전환|AI전환/g, "AI 전환"],
    [/Skill Certify|skillcertify/gi, "SkillCertify"],
    [/Dev Talk|devtalk(?!\w)/gi, "Devtalk"],
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

/** 수치·사례 밀도와 자사 지칭 밀도가 코퍼스와 비슷한가. */
function structureScore(text: string, p: VoiceProfile, notes: string[]) {
  const per1k = (c: number) => (c / Math.max(text.length, 1)) * 1000;
  const evidence = per1k((text.match(/\d+(\.\d+)?\s*(%|명|건|배|개|년|개월|시간|팀|곳)/g) ?? []).length);
  const firstPerson = per1k((text.match(/우리|저희|코드프레소는|코드프레소가/g) ?? []).length);

  const ratio = (a: number, b: number) => (b === 0 ? (a === 0 ? 1 : 0) : Math.min(a / b, b / a || 0));
  const evScore = Math.min(100, ratio(evidence, p.evidenceDensity) * 100);
  const fpScore = Math.min(100, ratio(firstPerson, p.firstPersonDensity) * 100);

  notes.push(
    `수치 인용 ${evidence.toFixed(2)}/1k (코퍼스 ${p.evidenceDensity}), 자사 지칭 ${firstPerson.toFixed(2)}/1k (코퍼스 ${p.firstPersonDensity})`
  );
  return evScore * 0.6 + fpScore * 0.4;
}

export function scoreVoice(text: string, profile: VoiceProfile): VoiceScore {
  const notes: string[] = [];
  const axes = {
    lexicon: Math.round(lexiconScore(text, profile, notes)),
    rhythm: Math.round(rhythmScore(text, profile, notes)),
    terminology: Math.round(terminologyScore(text, notes)),
    structure: Math.round(structureScore(text, profile, notes)),
  };
  const total = Math.round(
    axes.lexicon * WEIGHTS.lexicon +
      axes.rhythm * WEIGHTS.rhythm +
      axes.terminology * WEIGHTS.terminology +
      axes.structure * WEIGHTS.structure
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
