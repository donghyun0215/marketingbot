/**
 * Voice Profile — 큐레이션된 코퍼스에서 코드프레소 문체의 지문을 추출한다.
 *
 * 여기서 나오는 값은 두 곳에 쓰인다.
 *  1) 생성: 프롬프트에 주입되는 문체 지시
 *  2) 채점: Voice Score의 기준선 (lib/voice/score.ts)
 *
 * LLM을 쓰지 않는다. 결정적(deterministic)이어야 채점이 재현 가능하고,
 * 심사장에서 "그 점수 어떻게 나온 건가요"에 답할 수 있다.
 */

export type CorpusDoc = { title: string; body: string };

export type VoiceProfile = {
  docCount: number;
  /** 문장 길이(자) 분포 */
  sentence: { mean: number; sd: number; p25: number; p75: number };
  /** 문단당 문장 수 */
  paragraph: { meanSentences: number };
  /** 코퍼스 특징어: 일반 한국어 대비 이 브랜드가 유난히 자주 쓰는 표현 */
  lexicon: string[];
  /** 표기가 흔들리면 안 되는 고유 용어 */
  terminology: string[];
  /** 문장 종결 어미 분포 — 존댓말/평서체 비율이 톤의 핵심 */
  endings: Record<string, number>;
  /** 1인칭 복수(우리/코드프레소는) 등장 밀도 — 1,000자당 */
  firstPersonDensity: number;
  /** 숫자·수치 인용 밀도 — 1,000자당. 코드프레소는 사례·수치 기반 서술이 많다 */
  evidenceDensity: number;
};

/** 코드프레소가 표기를 통일해야 하는 고유명사·제품명 */
export const TERMINOLOGY = [
  "코드프레소",
  "AI 역량 진단",
  "AI 역량 평가",
  "AX",
  "AI 전환",
  "SkillCertify",
  "SkillMonitor",
  "AI Fluent",
  "Devtalk",
];

const SENTENCE_SPLIT = /(?<=[.!?？！。])\s+|\n+/;

export function splitSentences(text: string): string[] {
  return text
    .split(SENTENCE_SPLIT)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}

/** 한국어 문장 종결 어미를 뭉뚱그려 분류한다. */
export function endingOf(sentence: string): string | null {
  const s = sentence.replace(/["'”’)\]】]+$/, "").trim();
  if (/(습니다|입니다|합니다|됩니다|ㅂ니다)[.!?]?$/.test(s)) return "합니다체";
  if (/(요)[.!?]?$/.test(s)) return "해요체";
  if (/(다)[.!?]?$/.test(s)) return "한다체";
  if (/[?？]$/.test(s)) return "의문형";
  if (/(죠|네요|군요)[.!?]?$/.test(s)) return "구어체";
  return null;
}

function mean(xs: number[]) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function quantile(sorted: number[], q: number) {
  if (!sorted.length) return 0;
  const i = (sorted.length - 1) * q;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

/** 조사·접속사 등 어느 글에나 나오는 말은 특징어가 될 수 없다. */
const STOPWORDS = new Set([
  "그리고", "하지만", "그러나", "그래서", "또한", "이것", "그것", "저것", "합니다", "입니다",
  "있습니다", "없습니다", "때문에", "위해", "통해", "대한", "대해", "가장", "매우", "정말",
  "우리는", "우리가", "저희는", "있는", "하는", "되는", "같은", "많은", "이런", "그런",
]);

function tokens(text: string): string[] {
  return (text.match(/[가-힣]{2,}|[A-Za-z]{3,}/g) ?? [])
    .map((t) => t.toLowerCase())
    .filter((t) => !STOPWORDS.has(t));
}

export function buildProfile(docs: CorpusDoc[]): VoiceProfile {
  const bodies = docs.map((d) => d.body);
  const all = bodies.join("\n\n");

  const sentences = bodies.flatMap(splitSentences);
  const lens = sentences.map((s) => s.length).sort((a, b) => a - b);
  const m = mean(lens);
  const sd = Math.sqrt(mean(lens.map((l) => (l - m) ** 2)));

  const paragraphs = all.split(/\n+/).filter((p) => p.trim().length > 30);
  const paraSentences = paragraphs.map((p) => splitSentences(p).length);

  const endings: Record<string, number> = {};
  let counted = 0;
  for (const s of sentences) {
    const e = endingOf(s);
    if (!e) continue;
    endings[e] = (endings[e] ?? 0) + 1;
    counted++;
  }
  for (const k of Object.keys(endings)) {
    endings[k] = +(endings[k] / counted).toFixed(3);
  }

  // 특징어: 여러 글에 걸쳐 반복 등장하는 표현만 채택 (한 글의 주제어 배제)
  const docFreq = new Map<string, number>();
  const totalFreq = new Map<string, number>();
  for (const b of bodies) {
    const seen = new Set<string>();
    for (const t of tokens(b)) {
      totalFreq.set(t, (totalFreq.get(t) ?? 0) + 1);
      if (!seen.has(t)) {
        seen.add(t);
        docFreq.set(t, (docFreq.get(t) ?? 0) + 1);
      }
    }
  }
  const minDocs = Math.max(2, Math.ceil(docs.length * 0.4));
  const lexicon = [...totalFreq.entries()]
    .filter(([t]) => (docFreq.get(t) ?? 0) >= minDocs)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 60)
    .map(([t]) => t);

  const per1k = (count: number) => +((count / all.length) * 1000).toFixed(2);
  const firstPerson = (all.match(/우리|저희|코드프레소는|코드프레소가/g) ?? []).length;
  const evidence = (all.match(/\d+(\.\d+)?\s*(%|명|건·|건|배|개|년|개월|시간|팀|곳)/g) ?? []).length;

  return {
    docCount: docs.length,
    sentence: {
      mean: +m.toFixed(1),
      sd: +sd.toFixed(1),
      p25: +quantile(lens, 0.25).toFixed(1),
      p75: +quantile(lens, 0.75).toFixed(1),
    },
    paragraph: { meanSentences: +mean(paraSentences).toFixed(2) },
    lexicon,
    terminology: TERMINOLOGY,
    endings,
    firstPersonDensity: per1k(firstPerson),
    evidenceDensity: per1k(evidence),
  };
}

/** 생성 프롬프트에 넣을 사람이 읽을 수 있는 문체 지시문. */
export function profileToInstructions(p: VoiceProfile): string {
  const topEndings = Object.entries(p.endings)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([k, v]) => `${k} ${Math.round(v * 100)}%`)
    .join(", ");
  return [
    `문장 길이는 평균 ${p.sentence.mean}자, 대부분 ${p.sentence.p25}~${p.sentence.p75}자 사이에 둔다.`,
    `문단은 평균 ${p.paragraph.meanSentences}문장으로 끊는다.`,
    `종결 어미 비율: ${topEndings}.`,
    `1,000자당 자사 지칭(우리/코드프레소)을 약 ${p.firstPersonDensity}회 쓴다.`,
    `1,000자당 수치·사례를 약 ${p.evidenceDensity}회 인용한다. 근거 없는 형용사보다 숫자를 쓴다.`,
    `고유 용어는 다음 표기를 정확히 지킨다: ${p.terminology.join(", ")}.`,
    `자주 쓰는 표현: ${p.lexicon.slice(0, 25).join(", ")}.`,
  ].join("\n");
}
