/**
 * Fact-Guard — 승인 요청 전 자동 검사.
 *
 * 왜 있는가: 브리프에 명시된 사고 유형은 셋이다.
 *   "고객사명, 가격, 계약 조건이 잘못 나가면 사고이기 때문에 모든 콘텐츠는
 *    발행 전에 경영진 컨펌을 받습니다. 컨펌까지 하루에서 나흘."
 *
 * 승인이 1~4일 걸리는 진짜 이유는 결재 버튼이 느려서가 아니라, 경영진이
 * 글 전체를 처음부터 끝까지 읽어야 하기 때문이다. 이 검사기는 읽어야 할 양을
 * 줄인다. 위험 지점만 표시해 주면 확인은 몇 분이면 끝난다.
 *
 * 설계 원칙: 애매하면 통과시키지 않는다. 놓친 사고 1건의 비용이
 * 잘못된 경고 10건의 비용보다 훨씬 크다.
 */

export type Severity = "block" | "warn";

export type FactFlag = {
  severity: Severity;
  category: "client" | "price" | "contract" | "unverified" | "confidential";
  matched: string;
  /** 본문 내 위치 — UI에서 해당 부분만 펼쳐 보여준다 */
  index: number;
  message: string;
};

export type FactGuardResult = {
  flags: FactFlag[];
  blocked: boolean;
  /** 사람이 확인해야 할 지점 수 — 이 숫자가 승인 시간을 결정한다 */
  reviewPoints: number;
};

/**
 * 알려진 고객사·기관명. 실데이터의 인바운드 문의에 등장한 곳들이며,
 * 이 목록 자체가 대외비이므로 코드에는 패턴만 두고 값은 환경변수로 주입한다.
 * (기본값은 브리프에 공개된 업종 표현만 포함)
 */
function clientPatterns(): RegExp[] {
  const extra = (process.env.FACTGUARD_CLIENT_NAMES ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const base = [
    // 국내 대기업 계열 표기 — 실명 언급 자체를 검토 대상으로 올린다
    /[가-힣]{2,4}(전자|화학|중공업|건설|카드|생명|화재|증권|해양|조선|반도체|하이닉스|모비스)/g,
    /\b(SK|LG|GS|CJ|KT|POSCO|현대|삼성|한화|롯데)[가-힣A-Za-z]*/g,
  ];
  return [...base, ...extra.map((n) => new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"))];
}

const PRICE = [
  /\d[\d,]*\s*(원|만원|억원|달러|USD|KRW)/g,
  // "월 14일" 같은 날짜를 가격으로 오인하지 않도록 통화 단위를 반드시 요구한다.
  // (검증 중 실제 발행글 13건이 날짜 때문에 잘못 차단됐다)
  /(월|연간|건당|1인당)\s*\d[\d,]*\s*(원|만원|억원|달러)/g,
  /(단가|가격|비용|견적|응시료|수강료|할인율?)\s*(은|는|이|가)?\s*\d/g,
];

const CONTRACT = [
  /(계약\s*기간|계약\s*조건|납품\s*기한|위약금|독점\s*계약)/g,
  // MOU/NDA는 홍보성 언급(체결 소식)이 많아 차단이 아닌 확인 대상으로 분리한다

  /(무상|무료)\s*(제공|지원|라이선스)/g,
];

const CONTRACT_WARN = [/\b(MOU|NDA|SLA)\b/g];

const CONFIDENTIAL = [/(대외비|내부\s*자료|비공개|confidential)/gi];

/** 근거 없이 단정하는 수치. 출처가 붙어 있으면 통과시킨다. */
const NUMBER_CLAIM = /\d+(\.\d+)?\s*(%|퍼센트|배)/g;
const SOURCE_NEARBY = /(출처|기준|조사|보고서|자료|GSC|Search Console|LinkedIn|설문|according)/;

function scan(
  text: string,
  patterns: RegExp[],
  category: FactFlag["category"],
  severity: Severity,
  message: string,
  flags: FactFlag[]
) {
  for (const re of patterns) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      flags.push({ severity, category, matched: m[0], index: m.index, message });
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  }
}

export function factGuard(text: string): FactGuardResult {
  const flags: FactFlag[] = [];

  // 고객사명을 자동 차단하지 않는 이유: 코드프레소의 사례 콘텐츠에는 고객사명이
  // 정당하게 등장한다(동의를 받고 쓴 글). "이 이름을 써도 되는가"는 사람이 판단할
  // 문제이지 기계가 막을 문제가 아니다. 그래서 확인 지점으로만 올린다.
  scan(text, clientPatterns(), "client", "warn", "고객사·기업 실명입니다. 공개 동의를 확인하세요.", flags);
  scan(text, PRICE, "price", "block", "가격·비용 정보입니다. 발행 전 확인이 필요합니다.", flags);
  scan(text, CONTRACT, "contract", "block", "계약 조건 관련 표현입니다.", flags);
  scan(text, CONTRACT_WARN, "contract", "warn", "협약 언급입니다. 공개 가능한 내용인지 확인하세요.", flags);
  scan(text, CONFIDENTIAL, "confidential", "block", "대외비 표기가 본문에 남아 있습니다.", flags);

  // 수치 주장: 주변 120자 안에 출처 단서가 없으면 경고
  NUMBER_CLAIM.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = NUMBER_CLAIM.exec(text)) !== null) {
    const around = text.slice(Math.max(0, m.index - 120), m.index + 120);
    if (!SOURCE_NEARBY.test(around)) {
      flags.push({
        severity: "warn",
        category: "unverified",
        matched: m[0],
        index: m.index,
        message: "출처가 명시되지 않은 수치입니다.",
      });
    }
  }

  // 같은 문자열이 여러 번 걸리면 한 번만 확인하면 된다
  const seen = new Set<string>();
  const unique = flags.filter((f) => {
    const k = `${f.category}:${f.matched}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  unique.sort((a, b) => a.index - b.index);

  return {
    flags: unique,
    blocked: unique.some((f) => f.severity === "block"),
    reviewPoints: unique.length,
  };
}

/** 승인 요청 메시지에 붙일 요약. 경영진이 폰에서 읽는 문장이다. */
export function summarize(r: FactGuardResult): string {
  if (!r.flags.length) return "확인 필요 지점 없음";
  const byCat = new Map<string, number>();
  for (const f of r.flags) byCat.set(f.category, (byCat.get(f.category) ?? 0) + 1);
  const label: Record<string, string> = {
    client: "고객사명",
    price: "가격",
    contract: "계약조건",
    unverified: "출처 미상 수치",
    confidential: "대외비 표기",
  };
  const parts = [...byCat.entries()].map(([c, n]) => `${label[c] ?? c} ${n}`);
  return `확인 필요 ${r.flags.length}곳 — ${parts.join(", ")}`;
}
