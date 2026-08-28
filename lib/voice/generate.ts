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
      `[근거 — 아래 사실만 인용하고, 여기 없는 수치는 지어내지 않는다]`,
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
    `[금지]`,
    `- 고객사 실명, 가격, 계약 조건은 쓰지 않는다.`,
    `- 근거 없는 최상급 표현("최고의", "혁신적인")을 쓰지 않는다.`,
    `- 어느 회사에나 해당되는 일반론으로 채우지 않는다. 코드프레소만 할 수 있는 이야기를 쓴다.`,
    ``,
    `본문만 출력한다. 머리말이나 설명은 붙이지 않는다.`
  );

  return sections.join("\n");
}

const SYSTEM = "당신은 코드프레소의 B2B 마케팅 콘텐츠를 쓰는 담당자입니다.";

export async function generateDraft(
  input: GenerateInput,
  profile: VoiceProfile
): Promise<DraftResult> {
  // 순차 호출: 무료 티어의 분당 요청 제한을 피한다.
  const baseline = await generate({ prompt: baselinePrompt(input), maxTokens: 2048 });
  const voiced = await generate({
    system: SYSTEM,
    prompt: voicedPrompt(input, profile),
    maxTokens: 2048,
  });

  return {
    model: modelName(),
    baseline: { body: baseline, score: scoreVoice(baseline, profile) },
    voiced: { body: voiced, score: scoreVoice(voiced, profile) },
  };
}
