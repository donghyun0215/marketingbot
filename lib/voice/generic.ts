/**
 * 범용성(genericness) 축 — 다섯 번째 축.
 *
 * 왜 필요한가: 앞의 네 축은 "코드프레소 문체에 가까운가"를 잰다. 그런데 범용 LLM 글은
 * 같은 주제만 주면 어휘·문장 길이가 우연히 비슷해져 네 축을 통과한다.
 * 코드프레소 담당자가 지적한 실제 문제는 다른 데 있었다.
 * "어느 회사 블로그에 갖다 놔도 어색하지 않은 글이 나오더라고요."
 * 이 축은 그 '어느 회사에나 어울림'을 만드는 표지를 센다.
 *
 * 조작 방지 설계: 표지의 절대 개수로 감점하지 않는다. 실제 코드프레소 글에서
 * 각 표지가 얼마나 나오는지를 먼저 재고, 그 수준을 '초과'한 만큼만 감점한다.
 * 코드프레소도 "최근"이라는 말을 쓴다. 문제는 빈도지 존재가 아니다.
 */

export type GenericBaseline = { markersPer1k: number };

/** 범용 LLM 글의 표지. 각각 실제 출력에서 관찰한 것만 넣었다. */
const MARKERS: RegExp[] = [
  // 메타 서문: 글을 쓰는 대신 '글을 썼다'고 보고하는 문장. 발행물에 있으면 결함이다.
  /\[\s*(블로그|포스팅|블로그\s*포스팅|원고|초안)[^\]]{0,20}\]/g,
  /(블로그|포스팅|원고|글)(을|를)?\s*(작성했습니다|작성하였습니다|준비했습니다)/g,
  /^(다음은|아래는|이상은)[^\n]{0,60}(입니다|드립니다|였습니다)/gm,
  /(가독성|스타일)[^\n]{0,30}(작성되었습니다|가공)/g,
  /바로\s*게시할\s*수\s*있도록/g,
  /안녕하세요[,!][^\n]{0,30}(여러분|담당자|리더)/g,
  /가장\s*(뜨거운|핫한)\s*(키워드|화두|이슈)/g,
  /단연\s/g,
  /시대가\s*도래/g,
  /(선택이\s*아닌\s*필수|필수가\s*되었)/g,
  /무엇보다\s*중요/g,
  /결론적으로/g,
  /여러분[!,]/g,
  /(최고의|혁신적인|획기적인|놀라운)\s/g, // 근거 없는 최상급
  /지속\s*가능한\s*성장/g,
  /핵심\s*키워드/g,
];

/**
 * 강조표기(볼드)는 축에서 제외했다.
 * 초안 검증 중 스크래핑한 코퍼스에 볼드가 0회로 나와 "코드프레소는 볼드를 안 쓴다"고
 * 오판할 뻔했다. 원본 HTML을 다시 확인하니 실제로는 평균 9.73회/1,000자를 쓴다
 * (0회는 HTML 태그를 벗겨낸 스크래퍼의 부산물이었다).
 * 볼드로 감점했다면 우리 결과만 유리해지는 가짜 지표가 됐을 것이다.
 */

function per1k(count: number, len: number) {
  return (count / Math.max(len, 1)) * 1000;
}

function measure(text: string) {
  const markers = MARKERS.reduce((n, re) => n + (text.match(re) ?? []).length, 0);
  return { markersPer1k: per1k(markers, text.length) };
}

/** 실제 코퍼스에서 표지 빈도의 기준선을 구한다. 이 값이 '허용 수준'이 된다. */
export function buildGenericBaseline(bodies: string[]): GenericBaseline {
  const ms = bodies.map((b) => measure(b));
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(xs.length, 1);
  // 평균이 아니라 상위 75퍼센타일을 허용선으로 둔다. 자사 글 대부분이 통과해야 한다.
  const p75 = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b);
    return s[Math.floor((s.length - 1) * 0.75)] ?? 0;
  };
  return {
    markersPer1k: Math.max(p75(ms.map((m) => m.markersPer1k)), avg(ms.map((m) => m.markersPer1k))),
  };
}

export function genericScore(
  text: string,
  base: GenericBaseline,
  notes: string[]
): number {
  const m = measure(text);
  // 기준선 이하면 감점 없음. 초과분에만 비례 감점한다.
  const over = (v: number, b: number) => Math.max(0, v - Math.max(b, 0.3));
  const penalty = over(m.markersPer1k, base.markersPer1k) * 60;
  const score = Math.max(0, Math.min(100, 100 - penalty));
  notes.push(
    `범용 표지 ${m.markersPer1k.toFixed(2)}/1k (자사 허용선 ${base.markersPer1k.toFixed(2)})`
  );
  return score;
}
