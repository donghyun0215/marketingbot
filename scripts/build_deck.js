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

/* ─────────── 6. Baseline ─────────── */
{
  const s = pres.addSlide();
  s.background = { color: CANVAS };
  titled(s, "BASELINE 비교", "왜 그냥 범용 LLM을 쓰지 않는가",
    "같은 모델(gemini-3.6-flash), 같은 주제. 바뀐 것은 문체·학습된 규칙·실데이터 근거 셋뿐입니다");

  card(s, { x: M, y: 2.25, w: 5.5, h: 1.5 });
  s.addText("일반 프롬프트", { x: M + 0.35, y: 2.48, w: 4, h: 0.28, isTextBox: true, margin: 0, fontFace: B, fontSize: 12.5, color: MUTED });
  s.addText([{ text: "83", options: { fontSize: 34, bold: true, color: INK } },
             { text: "점 · 5,188자 · 자사 언급 0회", options: { fontSize: 13.5, color: MUTED } }], {
    x: M + 0.35, y: 2.85, w: 5.0, h: 0.6, isTextBox: true, margin: 0, fontFace: H });

  card(s, { x: M + 5.95, y: 2.25, w: 5.5, h: 1.5, line: BLUE });
  s.addText("Voice Engine", { x: M + 6.3, y: 2.48, w: 4, h: 0.28, isTextBox: true, margin: 0, fontFace: B, fontSize: 12.5, color: BLUE });
  s.addText([{ text: "96", options: { fontSize: 34, bold: true, color: BLUE } },
             { text: "점 · 1,196자 · 자사 언급 3회", options: { fontSize: 13.5, color: MUTED } }], {
    x: M + 6.3, y: 2.85, w: 5.0, h: 0.6, isTextBox: true, margin: 0, fontFace: H });

  s.addChart(
    pres.ChartType.bar,
    [
      { name: "일반 프롬프트", labels: ["어휘 재현", "문장 리듬", "용어 표기", "자사 근거", "범용 표지 없음"], values: [100, 67, 80, 53, 100] },
      { name: "Voice Engine", labels: ["어휘 재현", "문장 리듬", "용어 표기", "자사 근거", "범용 표지 없음"], values: [100, 80, 100, 98, 100] },
    ],
    {
      x: M, y: 3.95, w: 7.4, h: 2.75,
      barDir: "bar", barGrouping: "clustered",
      chartColors: ["B9C2D0", BLUE],
      showValue: true, dataLabelPosition: "outEnd", dataLabelFontSize: 10, dataLabelColor: INK,
      catAxisLabelColor: MUTED, catAxisLabelFontSize: 11,
      valAxisLabelColor: MUTED, valAxisLabelFontSize: 10, valAxisMaxVal: 110,
      valGridLine: { color: LINE, size: 1 }, catGridLine: { style: "none" },
      showLegend: true, legendPos: "t", legendFontSize: 11, legendColor: MUTED,
    }
  );

  card(s, { x: M + 7.7, y: 3.95, w: 3.75, h: 2.75 });
  s.addText("점수는 어디서 왔는가", {
    x: M + 8.0, y: 4.18, w: 3.2, h: 0.3, isTextBox: true, margin: 0,
    fontFace: H, fontSize: 14, bold: true, color: INK });
  s.addText(
    "코드프레소가 실제 발행한 글 46편에서 역산한 기준입니다. 문장 평균 46.9자, 어미 전환률 10.4%, 브랜드 언급 1.09회/1,000자 모두 그 46편의 실측값입니다.\n\n" +
      "기준을 고칠 때마다 46편을 다시 채점해 중앙값 92점이 유지되어야 채택합니다. 네 차례 폐기·수정했고 기록이 남아 있습니다.",
    { x: M + 8.0, y: 4.55, w: 3.2, h: 2.0, isTextBox: true, margin: 0,
      fontFace: B, fontSize: 11, color: "38445A", lineSpacing: 16 }
  );
  s.addNotes("45초. 자사 근거 53 대 98만 짚습니다. 점수 출처 질문이 나오기 전에 오른쪽 카드로 먼저 답합니다.");
}

/* ─────────── 7. 무엇이 다른가 ─────────── */
{
  const s = pres.addSlide();
  s.background = { color: CANVAS };
  titled(s, "차이", "범용 LLM은 사람이 기억해서 써야 하는 도구입니다");

  const rows = [
    ["근거", "회사의 실적과 사례를 모르니 일반론으로 채웁니다", "자사 성과 데이터에서 인용합니다"],
    ["기억", "어제 지적받은 내용을 기억하지 못합니다", "반려 사유가 규칙으로 남아 다음 생성에 적용됩니다"],
    ["시작", "사람이 열어야 시작됩니다", "데이터를 보고 먼저 제안하고 사람을 부릅니다"],
  ];
  s.addText("범용 LLM", { x: M + 1.7, y: 2.2, w: 4.5, h: 0.28, isTextBox: true, margin: 0, fontFace: B, fontSize: 12, color: MUTED, bold: true });
  s.addText("Marketing Pulse", { x: M + 6.85, y: 2.2, w: 4.5, h: 0.28, isTextBox: true, margin: 0, fontFace: B, fontSize: 12, color: BLUE, bold: true });
  rows.forEach((r, i) => {
    const y = 2.6 + i * 1.12;
    s.addText(r[0], { x: M, y: y + 0.28, w: 1.5, h: 0.3, isTextBox: true, margin: 0, fontFace: H, fontSize: 15, bold: true, color: INK });
    card(s, { x: M + 1.6, y, w: 4.9, h: 0.94 });
    s.addText(r[1], { x: M + 1.9, y: y + 0.2, w: 4.4, h: 0.6, isTextBox: true, margin: 0, fontFace: B, fontSize: 12.5, color: MUTED });
    card(s, { x: M + 6.75, y, w: 4.9, h: 0.94, line: BLUE });
    s.addText(r[2], { x: M + 7.05, y: y + 0.2, w: 4.4, h: 0.6, isTextBox: true, margin: 0, fontFace: B, fontSize: 12.5, color: INK });
  });
  s.addText("이 시스템은 사람 대신 기억하는 구조입니다.", {
    x: M, y: 6.15, w: 11, h: 0.4, isTextBox: true, margin: 0,
    fontFace: H, fontSize: 17, bold: true, color: BLUE });
  s.addNotes("25초. 마지막 문장을 천천히 읽고 다음 장으로 넘어갑니다.");
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
  titled(s, "범위", "한 일과 하지 않은 일");

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
