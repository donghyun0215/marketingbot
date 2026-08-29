/**
 * 초안 생성 — Baseline과 Voice Engine을 같은 모델로 각각 한 번씩 돌린다.
 *
 * 대조 설계: 두 결과의 차이가 "모델의 성능"이 아니라 "우리 파이프라인"에서
 * 왔다는 걸 보이려면 모델을 고정해야 한다. 바뀌는 건 셋뿐이다.
 *   1) 코퍼스에서 추출한 문체 지시
 *   2) 반려 이력에서 학습된 제약 (learned_constraints)
 *   3) 실제 성과 데이터에서 온 근거
 */

import { generate, modelName } from "../llm";
import { VoiceProfile, profileToInstructions } from "./profile";
import { scoreVoice, VoiceScore } from "./score";

export type GenerateInput = {
  topic: string;
  channel?: "blog" | "linkedin";
  /** 이 주제를 고른 근거 — 성과 데이터에서 온 사실만 넣는다 */
  evidence?: string[];
  /** 반려 이력에서 학습된 규칙 */
  constraints?: string[];
};

export type DraftResult = {
  model: string;
  baseline: { body: string; score: VoiceScore };
  voiced: { body: string; score: VoiceScore };
};

/** 대조군: 아무 회사나 쓸 법한 요청. 일반 사용자가 ChatGPT에 넣는 그 프롬프트. */
export function baselinePrompt(input: GenerateInput): string {
  return `${input.topic}에 대한 블로그 글을 한국어로 작성해줘.`;
}

/** 실험군: 코퍼스·성과·학습된 제약을 모두 주입한 프롬프트. */
export function voicedPrompt(input: GenerateInput, profile: VoiceProfile): string {
  const sections = [
    `주제: ${input.topic}`,
    ``,
    `[문체 규칙]`,
    profileToInstructions(profile),
  ];

  if (input.evidence?.length) {
    sections.push(
      ``,
      `[근거 — 아래 사실만 인용한다. 여기 없는 수치는 지어내지 않는다.`,
      ` 수치는 글 전체에서 2~3회만 쓴다. 숫자를 나열하지 말고 문장 안에 녹인다.]`,
      ...input.evidence.map((e) => `- ${e}`)
    );
  }

  if (input.constraints?.length) {
    sections.push(
      ``,
      `[지난 반려에서 학습한 규칙 — 반드시 지킨다]`,
      ...input.constraints.map((c) => `- ${c}`)
    );
  }

  sections.push(
    ``,
    `[주제 키워드 — 회사 이름을 반복하는 대신 이 말들로 본문을 채운다]`,
    `실제 검색 유입어 기준. 자연스럽게 들어갈 것만 쓰고 억지로 넣지 않는다.`,
    `자사명 언급은 1,500자 기준 2~3회면 충분하다. 그 이상은 광고문처럼 읽힌다.`,
    ``,
    `[금지]`,
    `- 고객사 실명, 가격, 계약 조건은 쓰지 않는다.`,
    `- 근거 없는 최상급 표현("최고의", "혁신적인")을 쓰지 않는다.`,
    `- 어느 회사에나 해당되는 일반론으로 채우지 않는다. 코드프레소만 할 수 있는 이야기를 쓴다.`,
    ``,
    `[분량 — 반드시 지킨다]`,
    `공백 포함 1,400자 이상 1,800자 이하. 소제목 2~3개로 나눠 충분히 전개한다.`,
    `짧게 요약하지 말고, 각 소제목마다 사례나 설명을 3~4문장씩 붙인다.`,
    ``,
    `본문만 출력한다. 머리말이나 설명은 붙이지 않는다.`
  );

  return sections.join("\n");
}

const SYSTEM = "당신은 코드프레소의 B2B 마케팅 콘텐츠를 쓰는 담당자입니다.";

/** 초안 하나만 생성한다. 승인 흐름은 이것만 필요하다. */
export async function generateVoiced(
  input: GenerateInput,
  profile: VoiceProfile
): Promise<{ body: string; model: string }> {
  // 호출은 한 번만 한다.
  // 분량이 모자라면 다시 요청하는 루프가 있었는데, 생성 1회가 16초 안팎이라
  // 두 번이면 서버리스 실행 상한(60초)을 넘겨 함수가 강제 종료됐다.
  // 분량은 프롬프트에서 요구하고, 부족하면 사람이 반려하면 된다 — 그게 승인 게이트가
  // 있는 이유다. 재시도로 시간을 쓰는 것보다 낫다.
  const voiced = await generate({
    system: SYSTEM,
    prompt: voicedPrompt(input, profile),
    maxTokens: 6000,
  });
  return { body: voiced, model: modelName() };
}

/** 대조군만 생성한다. 발표용 비교 자료를 만들 때 별도로 호출한다. */
export async function generateBaseline(input: GenerateInput): Promise<string> {
  return generate({ prompt: baselinePrompt(input), maxTokens: 6000 });
}

export async function generateDraft(
  input: GenerateInput,
  profile: VoiceProfile
): Promise<DraftResult> {
  // 순차 호출: 무료 티어의 분당 요청 제한을 피한다.
  const baseline = await generate({ prompt: baselinePrompt(input), maxTokens: 6000 });
  // 분량 미달은 수치 밀도를 왜곡시켜 채점을 망친다. 한 번 더 요청한다.
  let voiced = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    voiced = await generate({
      system: SYSTEM,
      prompt:
        voicedPrompt(input, profile) +
        (attempt > 0 ? `\n\n직전 시도가 너무 짧았다. 반드시 1,400자 이상으로 쓴다.` : ""),
      maxTokens: 6000,
    });
    if (voiced.length >= 1200) break;
  }

  return {
    model: modelName(),
    baseline: { body: baseline, score: scoreVoice(baseline, profile) },
    voiced: { body: voiced, score: scoreVoice(voiced, profile) },
  };
}
