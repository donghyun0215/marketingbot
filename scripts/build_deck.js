/**
 * 발표 덱 — 3분 구성 (데모 영상 2분 제외).
 *
 * 테마: 코드프레소 브랜드 블루(#1a61ea)를 지배색으로 쓴다. 고객사 앞에서 하는 발표이므로
 * 우리 색이 아니라 그들의 색을 쓰는 편이 맞다.
 * 모티프: 좌상단의 작은 상태 점 — 사람이 판단하는 지점을 뜻하며, 제품 UI의 파란 점과 같다.
 */
const pptxgen = require("pptxgenjs");

const BLUE = "1A61EA";
const INK = "0B1220";
const MUTED = "6E7A8A";
const LINE = "E6E9EF";
const CANVAS = "F5F6F8";
const RED = "C43D3D";
const GREEN = "1E8E63";
const WHITE = "FFFFFF";

const H = "Calibri";
const B = "Calibri";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.3 x 7.5
pres.author = "Marketing Pulse";
pres.title = "Marketing Pulse — 코드프레소 콘텐츠 운영";

const W = 13.3;
const M = 0.85; // 좌우 여백

/** 모든 본문 슬라이드가 같은 자리에 제목을 놓는다 */
function titled(slide, kicker, title, sub) {
  slide.addText(kicker, {
    x: M, y: 0.42, w: 8, h: 0.26, isTextBox: true, margin: 0,
    fontFace: B, fontSize: 11, color: BLUE, bold: true, charSpacing: 2,
  });
  slide.addText(title, {
    x: M, y: 0.72, w: W - M * 2, h: 0.62, isTextBox: true, margin: 0,
    fontFace: H, fontSize: 30, bold: true, color: INK,
  });
  if (sub) {
    slide.addText(sub, {
      x: M, y: 1.36, w: W - M * 2 - 0.4, h: 0.4, isTextBox: true, margin: 0,
      fontFace: B, fontSize: 14, color: MUTED,
    });
  }
}

function card(slide, { x, y, w, h, fill = WHITE, line = LINE }) {
  slide.addShape(pres.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.08,
    fill: { color: fill }, line: { color: line, width: 1 },
  });
}

/* ─────────── 1. 표지 ─────────── */
{
  const s = pres.addSlide();
  s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: W, h: 7.5, fill: { color: INK }, line: { width: 0 } });
  s.addText("ZERO100 한인 AI BUILDERTHON · 문제 02 오토메이션", {
    x: M, y: 2.35, w: 10, h: 0.3, isTextBox: true, margin: 0,
    fontFace: B, fontSize: 12, color: "8FA3C4", bold: true, charSpacing: 2,
  });
  s.addText("Marketing Pulse", {
    x: M, y: 2.78, w: 11, h: 1.0, isTextBox: true, margin: 0,
    fontFace: H, fontSize: 54, bold: true, color: WHITE,
  });
  s.addText("콘텐츠 여덟 단계를 시스템이 돌리고, 사람은 두 번만 판단합니다", {
    x: M, y: 3.85, w: 11, h: 0.45, isTextBox: true, margin: 0,
    fontFace: B, fontSize: 18, color: "C7D4EA",
  });
  s.addShape(pres.ShapeType.rect, { x: M, y: 4.62, w: 1.1, h: 0.035, fill: { color: BLUE }, line: { width: 0 } });
  s.addText("코드프레소 마케팅 콘텐츠 운영 · 실데이터 6개월 기반", {
    x: M, y: 4.85, w: 10, h: 0.3, isTextBox: true, margin: 0,
    fontFace: B, fontSize: 12.5, color: "8FA3C4",
  });
  s.addNotes("30초. 인사 후 바로 문제로 넘어갑니다.");
}

/* ─────────── 2. 문제 ─────────── */
{
  const s = pres.addSlide();
  s.background = { color: CANVAS };
  titled(s, "문제 정의", "리드가 목표인데, 리드의 출처를 모릅니다");

  const stats = [
    { v: "6", u: "/ 10건", k: "유입 콘텐츠를 알 수 없는 진성 문의", c: RED },
    { v: "1~4", u: "일", k: "경영진 컨펌 소요 · 발행 타이밍 상실", c: INK },
    { v: "2", u: "시간", k: "매주 성과 취합, 취합 후 폐기", c: INK },
  ];
  stats.forEach((st, i) => {
    const x = M + i * 4.0;
    card(s, { x, y: 2.05, w: 3.6, h: 1.75 });
    s.addText([{ text: st.v, options: { fontSize: 46, bold: true, color: st.c } },
               { text: " " + st.u, options: { fontSize: 16, color: MUTED } }], {
      x: x + 0.32, y: 2.35, w: 3.0, h: 0.75, isTextBox: true, margin: 0, fontFace: H,
    });
    s.addText(st.k, {
      x: x + 0.32, y: 3.12, w: 3.0, h: 0.5, isTextBox: true, margin: 0,
      fontFace: B, fontSize: 12.5, color: MUTED,
    });
  });

  card(s, { x: M, y: 4.15, w: W - M * 2, h: 1.55, fill: WHITE });
  s.addText("병목을 다시 정의했습니다", {
    x: M + 0.4, y: 4.42, w: 11, h: 0.32, isTextBox: true, margin: 0,
    fontFace: H, fontSize: 16, bold: true, color: INK,
  });
  s.addText(
    "컨펌이 나흘 걸리는 이유는 결재가 느려서가 아니라 매번 글 전체를 읽어야 하기 때문이고,\n" +
      "성과가 쌓이지 않는 이유는 데이터가 없어서가 아니라 되돌아오는 경로가 없기 때문입니다.",
    { x: M + 0.4, y: 4.82, w: 11.2, h: 0.8, isTextBox: true, margin: 0,
      fontFace: B, fontSize: 14, color: "38445A", lineSpacing: 22 }
  );
  s.addText("출처 · 코드프레소 제공 6개월 실데이터(2026.02~08) 및 출제 브리프", {
    x: M, y: 6.0, w: 11, h: 0.25, isTextBox: true, margin: 0, fontFace: B, fontSize: 10.5, color: MUTED,
  });
  s.addNotes("40초. 세 숫자만 읽고 병목 재정의 문장으로 넘어갑니다. 이 문장이 발표 전체의 축입니다.");
}

/* ─────────── 3. 구조 ─────────── */
{
  const s = pres.addSlide();
  s.background = { color: CANVAS };
  titled(s, "설계", "사람은 두 번만 판단합니다", "나머지 구간은 손이 가지 않습니다");

  const steps = [
    { t: "분석", d: "실데이터 이상치", human: false },
    { t: "주제 추천", d: "근거 포함", human: false },
    { t: "채택", d: "사람", human: true },
    { t: "생성", d: "문체·규칙·근거", human: false },
    { t: "검사", d: "위험 지점 표시", human: false },
    { t: "승인", d: "사람", human: true },
    { t: "발행", d: "추적 링크", human: false },
  ];
  const cw = 1.62, gap = 0.13;
  steps.forEach((st, i) => {
    const x = M + i * (cw + gap);
    card(s, { x, y: 2.15, w: cw, h: 1.32, fill: st.human ? BLUE : WHITE, line: st.human ? BLUE : LINE });
    if (st.human) {
      s.addShape(pres.ShapeType.ellipse, { x: x + 0.18, y: 2.36, w: 0.13, h: 0.13, fill: { color: WHITE }, line: { width: 0 } });
    }
    s.addText(st.t, {
      x: x + 0.18, y: st.human ? 2.58 : 2.42, w: cw - 0.3, h: 0.32, isTextBox: true, margin: 0,
      fontFace: H, fontSize: 14.5, bold: true, color: st.human ? WHITE : INK,
    });
    s.addText(st.d, {
      x: x + 0.18, y: st.human ? 2.9 : 2.76, w: cw - 0.3, h: 0.4, isTextBox: true, margin: 0,
      fontFace: B, fontSize: 11, color: st.human ? "D6E2FA" : MUTED,
    });
  });

  const loops = [
    ["반려 사유 → 다음 생성 규칙", "요약하지 않고 원문 그대로 남깁니다"],
    ["승인한 글 → 문체 코퍼스", "쓸수록 목소리가 정확해집니다"],
    ["추적 링크 → 문의 귀속", "어느 글이 문의를 만들었는지 남습니다"],
    ["추천 → 성과 추적", "제안이 실제로 통했는지 확인합니다"],
  ];
  s.addText("네 개의 되먹임", {
    x: M, y: 3.85, w: 6, h: 0.3, isTextBox: true, margin: 0,
    fontFace: H, fontSize: 15, bold: true, color: INK,
  });
  loops.forEach((l, i) => {
    const x = M + (i % 2) * 5.9;
    const y = 4.3 + Math.floor(i / 2) * 0.92;
    card(s, { x, y, w: 5.6, h: 0.76 });
    s.addText(l[0], {
      x: x + 0.28, y: y + 0.12, w: 5.0, h: 0.26, isTextBox: true, margin: 0,
      fontFace: H, fontSize: 13, bold: true, color: BLUE,
    });
    s.addText(l[1], {
      x: x + 0.28, y: y + 0.4, w: 5.0, h: 0.26, isTextBox: true, margin: 0,
      fontFace: B, fontSize: 11.5, color: MUTED,
    });
  });
  s.addNotes("35초. 파란 칸 두 개가 사람이 판단하는 지점이라고 짚고, 되먹임 네 개는 이름만 읽습니다.");
}

/* ─────────── 4. 승인 시간 ─────────── */
{
  const s = pres.addSlide();
  s.background = { color: CANVAS };
  titled(s, "승인 게이트", "컨펌을 없애지 않고, 읽을 양을 줄였습니다");

  card(s, { x: M, y: 2.15, w: 5.5, h: 2.5 });
  s.addText("이전", { x: M + 0.35, y: 2.42, w: 3, h: 0.28, isTextBox: true, margin: 0, fontFace: B, fontSize: 12, color: MUTED });
  s.addText([{ text: "1,500", options: { fontSize: 42, bold: true, color: INK } },
             { text: "자 전부", options: { fontSize: 15, color: MUTED } }], {
    x: M + 0.35, y: 2.76, w: 4.6, h: 0.7, isTextBox: true, margin: 0, fontFace: H });
  s.addText("사고가 나는 항목이 어디에 있는지 알 수 없으니\n처음부터 끝까지 읽어야 했습니다.", {
    x: M + 0.35, y: 3.55, w: 4.7, h: 0.8, isTextBox: true, margin: 0,
    fontFace: B, fontSize: 13, color: "38445A", lineSpacing: 20 });

  card(s, { x: M + 5.95, y: 2.15, w: 5.5, h: 2.5, line: BLUE });
  s.addText("지금", { x: M + 6.3, y: 2.42, w: 3, h: 0.28, isTextBox: true, margin: 0, fontFace: B, fontSize: 12, color: BLUE });
  s.addText([{ text: "3", options: { fontSize: 42, bold: true, color: BLUE } },
             { text: "곳만 확인", options: { fontSize: 15, color: MUTED } }], {
    x: M + 6.3, y: 2.76, w: 4.6, h: 0.7, isTextBox: true, margin: 0, fontFace: H });
  s.addText("고객사명·가격·계약조건·출처 없는 수치를\n표시해 그 지점만 보면 됩니다.", {
    x: M + 6.3, y: 3.55, w: 4.7, h: 0.8, isTextBox: true, margin: 0,
    fontFace: B, fontSize: 13, color: "38445A", lineSpacing: 20 });

  card(s, { x: M, y: 4.95, w: W - M * 2, h: 1.15 });
  s.addText("고객사명은 차단하지 않고 확인 대상으로만 올립니다", {
    x: M + 0.4, y: 5.15, w: 11, h: 0.3, isTextBox: true, margin: 0,
    fontFace: H, fontSize: 14.5, bold: true, color: INK });
  s.addText("사례 콘텐츠에는 고객사명이 정당하게 등장합니다. 써도 되는지는 사람이 판단할 문제입니다. — 실제 발행글 46편 검증에서 잘못된 차단 0건", {
    x: M + 0.4, y: 5.5, w: 10.8, h: 0.4, isTextBox: true, margin: 0,
    fontFace: B, fontSize: 12.5, color: MUTED });
  s.addNotes("30초. 버튼이 빨라서가 아니라 읽을 양이 줄어서 빨라졌다는 점을 강조합니다.");
}

/* ─────────── 5. 데모 ─────────── */
{
  const s = pres.addSlide();
  s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: W, h: 7.5, fill: { color: INK }, line: { width: 0 } });
  s.addText("데모", {
    x: M, y: 2.9, w: 8, h: 0.35, isTextBox: true, margin: 0,
    fontFace: B, fontSize: 12, color: BLUE, bold: true, charSpacing: 2 });
  s.addText("주제 추천에서 문의 귀속까지, 한 바퀴", {
    x: M, y: 3.3, w: 11, h: 0.7, isTextBox: true, margin: 0,
    fontFace: H, fontSize: 34, bold: true, color: WHITE });
  s.addText("실제 데이터, 실제 발송, 실제 귀속 — 2분", {
    x: M, y: 4.1, w: 10, h: 0.35, isTextBox: true, margin: 0,
    fontFace: B, fontSize: 16, color: "8FA3C4" });
  s.addNotes("영상 재생 2분. 재생 전 '지금 보시는 숫자는 전부 제공받은 실데이터입니다' 한마디만 합니다.");
}

/* ─────────── 6. Baseline — 실제 결과물을 직접 읽힌다 ─────────── */
{
  const s = pres.addSlide();
  s.background = { color: CANVAS };
  titled(s, "BASELINE 비교", "같은 모델에 같은 주제를 넣었습니다",
    "gemini-3.6-flash · 주제: \"인재 채용 전략\"을 찾는 실무자를 위한 실행 가이드 · 바뀐 것은 문체·학습된 규칙·실데이터 근거뿐입니다");

  // 왼쪽 — 일반 프롬프트
  card(s, { x: M, y: 2.05, w: 5.6, h: 3.55 });
  s.addText([
    { text: "일반 프롬프트", options: { fontSize: 13, bold: true, color: INK } },
    { text: "   주제만 전달", options: { fontSize: 11.5, color: MUTED } },
  ], { x: M + 0.3, y: 2.24, w: 5.0, h: 0.28, isTextBox: true, margin: 0, fontFace: B });

  s.addText(
    "# 인재 채용 전략을 찾는 실무자를 위한 실행 가이드\n\n" +
    "인재 확보는 기업 성장의 핵심이지만, \u201C좋은 사람을 어떻게 찾고, 어떻게 유지할까?\u201D 라는 질문에 대한 답은 늘 복잡합니다. 이번 포스트에서는 **실무자가 바로 적용할 수 있는 구체적인 채용 전략**을 단계별로 정리했습니다.\n\n" +
    "## 1\uFE0F\u20E3 채용 목표와 KPI 정의하기\n\n" +
    "| 단계 | 핵심 질문 | 구체적인 산출물 |\n" +
    "| 1-1 | 우리 조직이 채용해야 할 인재는 누구인가? | 포지션 정의서 |\n\n" +
    "> Tip: KPI는 SMART 원칙에 맞춰 설정하면 …",
    { x: M + 0.3, y: 2.62, w: 5.0, h: 2.8, isTextBox: true, margin: 0,
      fontFace: B, fontSize: 10.5, color: "5A6675", lineSpacing: 15 }
  );

  // 오른쪽 — Voice Engine
  card(s, { x: M + 5.95, y: 2.05, w: 5.6, h: 3.55, line: BLUE });
  s.addText([
    { text: "Voice Engine", options: { fontSize: 13, bold: true, color: BLUE } },
    { text: "   문체 · 규칙 · 근거 주입", options: { fontSize: 11.5, color: MUTED } },
  ], { x: M + 6.25, y: 2.24, w: 5.0, h: 0.28, isTextBox: true, margin: 0, fontFace: B });

  s.addText(
    "IT 기업 A사는 검증되지 않은 이력서만 보고 개발자를 채용했다가 조기 퇴사 문제를 겪었습니다. 실무에 필요한 실제 기술 역량을 입사 전에 파악하기 어려웠기 때문입니다.\n\n" +
    "최근 포털에서 인재 채용 전략 관련 검색 노출 221회가 발생했으나 평균순위 20.6위로 실질적인 해결책을 찾지 못한 채용 담당자가 많습니다.\n\n" +
    "### 서류 검증을 넘어선 실제 역량 중심의 평가 설계\n" +
    "코드프레소의 SkillCertify는 지원자가 실제 개발 환경에서 코드를 작성하고 문제를 해결하는 과정을 다각도로 평가합니다. …",
    { x: M + 6.25, y: 2.62, w: 5.0, h: 2.8, isTextBox: true, margin: 0,
      fontFace: B, fontSize: 10.5, color: INK, lineSpacing: 15 }
  );

  // 아래 대조 라벨 — 판단 근거를 문장이 아니라 사실로 제시한다
  const facts = [
    ["도입부", "일반론과 목차", "고객사 사례"],
    ["수치", "없음", "검색 노출 221회 · 20.6위"],
    ["회사 이름", "0회", "3회 · SkillCertify 언급"],
    ["분량", "5,188자", "1,196자"],
  ];
  facts.forEach((f, i) => {
    const x = M + i * 2.95;
    card(s, { x, y: 5.78, w: 2.75, h: 0.92 });
    s.addText(f[0], { x: x + 0.22, y: 5.9, w: 2.4, h: 0.24, isTextBox: true, margin: 0,
      fontFace: B, fontSize: 10.5, color: MUTED });
    s.addText([
      { text: f[1], options: { color: "9AA5B4" } },
      { text: "   →   ", options: { color: "C3CAD6" } },
      { text: f[2], options: { color: BLUE, bold: true } },
    ], { x: x + 0.22, y: 6.18, w: 2.4, h: 0.42, isTextBox: true, margin: 0, fontFace: B, fontSize: 11 });
  });

  s.addNotes("45초. 두 글을 소리 내어 비교하지 말고, 왼쪽 첫 문장과 오른쪽 첫 문장만 읽습니다. 아래 네 칸이 근거입니다.");
}

/* ─────────── 7. 점수 채택 기준 ─────────── */
{
  const s = pres.addSlide();
  s.background = { color: CANVAS };
  titled(s, "검증", "점수 채택 기준",
    "이 점수는 저희가 정한 이상적인 글이 아니라, 코드프레소가 실제 발행한 글 46편에서 역산한 기준입니다");

  const basis = [
    ["문장 평균 길이", "46.9자"],
    ["어미 전환률 중앙값", "10.4%"],
    ["브랜드 언급", "1.09회 / 1,000자"],
    ["수치 인용", "1.26회 / 1,000자"],
  ];
  s.addText("기준값은 전부 그 46편의 실측값입니다", {
    x: M, y: 2.15, w: 6, h: 0.3, isTextBox: true, margin: 0,
    fontFace: H, fontSize: 14, bold: true, color: INK });
  basis.forEach((b, i) => {
    const y = 2.58 + i * 0.72;
    card(s, { x: M, y, w: 5.6, h: 0.6 });
    s.addText(b[0], { x: M + 0.28, y: y + 0.16, w: 3.4, h: 0.28, isTextBox: true, margin: 0,
      fontFace: B, fontSize: 12.5, color: MUTED });
    s.addText(b[1], { x: M + 3.6, y: y + 0.14, w: 1.8, h: 0.3, isTextBox: true, margin: 0,
      fontFace: H, fontSize: 13.5, bold: true, color: INK, align: "right" });
  });

  card(s, { x: M + 5.95, y: 2.58, w: 5.6, h: 2.02, line: BLUE });
  s.addText("기준을 고칠 때마다 통과해야 하는 관문", {
    x: M + 6.25, y: 2.8, w: 5.0, h: 0.3, isTextBox: true, margin: 0,
    fontFace: H, fontSize: 14, bold: true, color: BLUE });
  s.addText(
    "수정한 채점 기준으로 그 46편을 다시 채점해 중앙값 92점이 유지되어야 채택하고, 그러지 못하면 폐기합니다.\n\n" +
    "실제로 네 차례 폐기하거나 고쳤습니다. 저희 결과에 유리하도록 맞춘 지표가 아니라, 고객사의 글로 검증한 지표라는 뜻입니다.",
    { x: M + 6.25, y: 3.2, w: 5.0, h: 1.3, isTextBox: true, margin: 0,
      fontFace: B, fontSize: 12, color: "38445A", lineSpacing: 17 });

  card(s, { x: M + 5.95, y: 4.78, w: 5.6, h: 1.6 });
  s.addText("폐기한 지표의 예", {
    x: M + 6.25, y: 4.96, w: 5.0, h: 0.28, isTextBox: true, margin: 0,
    fontFace: H, fontSize: 13, bold: true, color: INK });
  s.addText(
    "\u201C자사 글은 굵은 글씨를 쓰지 않는다\u201D는 신호로 30점 차이를 만들었지만, 원본을 다시 확인하니 실제로는 1,000자당 9.73회 사용하고 있었습니다. 저희 수집 과정이 만든 착시였고, 그 신호는 폐기했습니다.",
    { x: M + 6.25, y: 5.3, w: 5.0, h: 1.0, isTextBox: true, margin: 0,
      fontFace: B, fontSize: 11.5, color: MUTED, lineSpacing: 16 });

  s.addNotes("35초. 왼쪽은 훑고, 오른쪽 상단 관문만 또박또박 말합니다. 폐기 사례는 시간이 없으면 생략하고 질문 때 씁니다.");
}

/* ─────────── 8. 믿을 수 있는 근거 ─────────── */
{
  const s = pres.addSlide();
  s.background = { color: CANVAS };
  titled(s, "신뢰", "결과를 믿을 수 있는 근거");

  const items = [
    ["승인 게이트", "사람의 결정 없이는 발행되지 않습니다. 반려에는 사유 입력이 필수입니다."],
    ["판단 로그", "모든 결정이 누가·언제·왜와 함께 남고, 사람의 결정과 시스템의 실행이 구분됩니다."],
    ["추적성", "추천 → 콘텐츠 → 발행 → 문의가 하나의 식별자로 이어집니다."],
    ["오류 대응", "텔레그램 장애 시 대시보드로 처리하고, 생성 실패 시 주제를 되돌리며, 실패도 로그에 남깁니다."],
  ];
  items.forEach((it, i) => {
    const x = M + (i % 2) * 5.9;
    const y = 1.95 + Math.floor(i / 2) * 1.6;
    card(s, { x, y, w: 5.6, h: 1.35 });
    s.addShape(pres.ShapeType.ellipse, { x: x + 0.3, y: y + 0.3, w: 0.34, h: 0.34, fill: { color: "E7EEFD" }, line: { width: 0 } });
    s.addText(String(i + 1), { x: x + 0.3, y: y + 0.34, w: 0.34, h: 0.26, isTextBox: true, margin: 0,
      fontFace: H, fontSize: 12, bold: true, color: BLUE, align: "center" });
    s.addText(it[0], { x: x + 0.78, y: y + 0.28, w: 4.5, h: 0.3, isTextBox: true, margin: 0,
      fontFace: H, fontSize: 14.5, bold: true, color: INK });
    s.addText(it[1], { x: x + 0.78, y: y + 0.62, w: 4.5, h: 0.6, isTextBox: true, margin: 0,
      fontFace: B, fontSize: 12, color: MUTED, lineSpacing: 17 });
  });

  card(s, { x: M, y: 5.35, w: W - M * 2, h: 1.05 });
  s.addText("정직하게 덧붙이면 — 생성물은 아직 블라인드 테스트를 통과하지 못합니다. 지적된 결함(문장마다 흔들리는 어미)을 지표로 만들어 전환률을 78.9%에서 0%로 낮췄습니다. 그래서 승인 게이트가 설계의 중심에 있습니다.", {
    x: M + 0.4, y: 5.58, w: 10.8, h: 0.7, isTextBox: true, margin: 0,
    fontFace: B, fontSize: 12.5, color: "38445A", lineSpacing: 18 });
  s.addNotes("30초. 마지막 문단을 스스로 말하는 것이 중요합니다. 질문으로 나오기 전에 먼저 꺼냅니다.");
}

/* ─────────── 9. 범위와 다음 ─────────── */
{
  const s = pres.addSlide();
  s.background = { color: CANVAS };
  titled(s, "SCOPE", "Functionalities & Limitations");

  const cov = [
    ["실제 구현", "아이디어 · 기획 · 원고 · 성과 취합 · 데이터 축적", GREEN, "E8F3EE"],
    ["부분 구현", "편집(이미지 제외) · 업로드(외부 채널은 큐까지)", "92580F", "FDF3E3"],
    ["설계만", "SNS 확산 — 채널별 포맷 변환", MUTED, "F0F2F6"],
  ];
  cov.forEach((c, i) => {
    const y = 2.2 + i * 1.05;
    card(s, { x: M, y, w: W - M * 2, h: 0.86 });
    s.addShape(pres.ShapeType.roundRect, { x: M + 0.32, y: y + 0.24, w: 1.5, h: 0.38, rectRadius: 0.06,
      fill: { color: c[3] }, line: { width: 0 } });
    s.addText(c[0], { x: M + 0.32, y: y + 0.3, w: 1.5, h: 0.26, isTextBox: true, margin: 0,
      fontFace: B, fontSize: 11.5, bold: true, color: c[2], align: "center" });
    s.addText(c[1], { x: M + 2.05, y: y + 0.28, w: 9.2, h: 0.32, isTextBox: true, margin: 0,
      fontFace: B, fontSize: 13.5, color: INK });
  });

  card(s, { x: M, y: 5.5, w: W - M * 2, h: 1.1, fill: WHITE, line: BLUE });
  s.addText("내일부터 쓰려면 필요한 것", {
    x: M + 0.4, y: 5.68, w: 5, h: 0.3, isTextBox: true, margin: 0,
    fontFace: H, fontSize: 14, bold: true, color: BLUE });
  s.addText("문의 폼에 유입 경로 파라미터 한 줄 · 승인자 계정 등록 · 링크드인 토큰 연결 — 스키마와 되먹임 구조는 그대로 갑니다.", {
    x: M + 0.4, y: 6.02, w: 10.8, h: 0.4, isTextBox: true, margin: 0,
    fontFace: B, fontSize: 12.5, color: "38445A" });
  s.addNotes("20초. 하지 않은 것을 먼저 말하고 도입 조건으로 닫습니다.");
}

/* ─────────── 10. 마무리 ─────────── */
{
  const s = pres.addSlide();
  s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: W, h: 7.5, fill: { color: INK }, line: { width: 0 } });
  s.addText("감사합니다", {
    x: M, y: 2.9, w: 11, h: 0.8, isTextBox: true, margin: 0,
    fontFace: H, fontSize: 40, bold: true, color: WHITE });
  s.addText("여덟 단계를 자동화한 것이 아니라, 판단이 쌓이는 회로를 만들었습니다.", {
    x: M, y: 3.85, w: 11, h: 0.45, isTextBox: true, margin: 0,
    fontFace: B, fontSize: 17, color: "C7D4EA" });
  s.addShape(pres.ShapeType.rect, { x: M, y: 4.6, w: 1.1, h: 0.035, fill: { color: BLUE }, line: { width: 0 } });
  s.addText("marketingbot.vercel.app", {
    x: M, y: 4.82, w: 8, h: 0.3, isTextBox: true, margin: 0,
    fontFace: B, fontSize: 13, color: "8FA3C4" });
  s.addNotes("Q&A로 넘어갑니다.");
}

pres.writeFile({ fileName: "/home/claude/marketingbot/aidlc-docs/deliverables/발표덱.pptx" }).then((f) =>
  console.log("saved:", f)
);
