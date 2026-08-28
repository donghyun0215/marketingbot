/**
 * LLM 제공자 추상화.
 *
 * 이 프로젝트는 무료 API로 돌아가야 한다. 그래서 특정 벤더에 묶이지 않게
 * 얇은 어댑터를 두고, 환경변수로 갈아끼운다.
 *
 * 지원:
 *   LLM_PROVIDER=gemini     GEMINI_API_KEY     (무료 티어, 기본값)
 *   LLM_PROVIDER=groq       GROQ_API_KEY       (무료 티어)
 *   LLM_PROVIDER=anthropic  ANTHROPIC_API_KEY  (유료 — 나중에 품질 비교용)
 *
 * Baseline 비교에서 중요한 점: 대조군과 실험군은 같은 모델을 쓴다.
 * 모델을 다르게 하면 차이가 우리 시스템 덕분인지 모델 덕분인지 알 수 없다.
 * 우리가 증명하려는 건 "파이프라인의 효과"지 "모델의 우열"이 아니다.
 */

export type LlmProvider = "gemini" | "groq" | "anthropic";

export type GenerateArgs = {
  system?: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
};

function provider(): LlmProvider {
  return (process.env.LLM_PROVIDER as LlmProvider) ?? "gemini";
}

/** 지금 설정된 모델 이름. 화면에 표시해 재현 가능성을 남긴다. */
export function modelName(): string {
  switch (provider()) {
    case "gemini":
      return process.env.GEMINI_MODEL ?? "gemini-3.6-flash";
    case "groq":
      return process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
    case "anthropic":
      return process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
  }
}

async function callGemini(a: GenerateArgs): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY missing");
  const model = modelName();
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: a.system ? { parts: [{ text: a.system }] } : undefined,
        contents: [{ role: "user", parts: [{ text: a.prompt }] }],
        generationConfig: {
          maxOutputTokens: a.maxTokens ?? 16384,
          temperature: a.temperature ?? 0.7,
          // thinking 토큰은 maxOutputTokens 예산을 함께 소비한다(usageMetadata의
          // thoughtsTokenCount로 확인). 예산이 빠듯하면 본문이 몇 백 자로 잘리거나
          // 사고 과정이 그대로 출력된다 — 둘 다 실제로 겪었다. 그래서 넉넉히 준다.
          thinkingConfig: { includeThoughts: false },
        },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .filter((p: any) => !p.thought)          // 사고 블록은 본문이 아니다
    .map((p: any) => p.text ?? "")
    .join("");
  if (!text) throw new Error("Gemini returned empty content");
  return text;
}

/**
 * 사용 가능한 모델을 런타임에 확인한다.
 * 제공자들이 모델을 예고 없이 폐기하고(gemini-2.0-flash, llama-3.3-70b 둘 다 겪음),
 * 그러면 발표 당일에 404로 죽는다. 하드코딩된 이름 하나에 의존하지 않는다.
 */
let groqModelCache: string | null = null;
async function resolveGroqModel(key: string): Promise<string> {
  if (groqModelCache) return groqModelCache;
  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    });
    const data = await res.json();
    const ids: string[] = (data?.data ?? []).map((m: any) => m.id);

    // 설정된 모델명은 "존재할 때만" 신뢰한다.
    // 환경변수를 무조건 따르면 오타나 폐기된 이름 하나로 서비스가 죽는다.
    // 실제로 겪은 두 경우: llama-3.3-70b-versatile 폐기, 그리고 복사 중 앞글자가
    // 잘린 penai/gpt-oss-120b. 둘 다 404였고 원인은 제공자가 아니라 설정이었다.
    const pinned = process.env.GROQ_MODEL?.trim();
    if (pinned && ids.includes(pinned)) {
      groqModelCache = pinned;
      return groqModelCache;
    }
    // 한국어 실측 결과 순서. qwen 계열은 본문에 중국어가 섞여 나와 제외한다.
    // (테스트: "Integration 비용과 시간을预估 할 수 있습니다")
    const rank = [/gpt-oss-120b/i, /gpt-oss/i, /llama.*70b/i, /llama/i, /compound(?!-mini)/i];
    const usable = ids.filter((i) => !/whisper|guard|tts|embed|orpheus|qwen|allam/i.test(i));
    groqModelCache =
      rank.map((re) => usable.find((i) => re.test(i))).find(Boolean) ?? usable[0] ?? "openai/gpt-oss-120b";
  } catch {
    groqModelCache = "openai/gpt-oss-120b";
  }
  return groqModelCache;
}

async function callGroq(a: GenerateArgs): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY missing");
  const model = await resolveGroqModel(key);
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [
        ...(a.system ? [{ role: "system", content: a.system }] : []),
        { role: "user", content: a.prompt },
      ],
      max_tokens: a.maxTokens ?? 2048,
      temperature: a.temperature ?? 0.7,
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

async function callAnthropic(a: GenerateArgs): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY missing");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: modelName(),
      max_tokens: a.maxTokens ?? 2048,
      temperature: a.temperature ?? 0.7,
      system: a.system,
      messages: [{ role: "user", content: a.prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return (data?.content ?? []).map((c: any) => c.text ?? "").join("");
}

/**
 * 재시도.
 * 무료 티어는 분당 요청 한도가 빡빡하다. 한 번 채택할 때 생성이 두 번 일어나므로
 * 429가 흔하게 발생하고, 1~2초 백오프로는 부족하다(실제로 겪음).
 * 429는 시간이 지나면 반드시 풀리는 오류이므로 길게, 여러 번 기다린다.
 */
export async function generate(a: GenerateArgs, retries = 4): Promise<string> {
  const fn =
    provider() === "gemini" ? callGemini : provider() === "groq" ? callGroq : callAnthropic;
  let lastError: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn(a);
    } catch (e) {
      lastError = e;
      const msg = String(e);
      // 일일 한도는 기다려도 풀리지 않는다. 재시도하면 함수 타임아웃만 부르고,
      // 그러면 서버가 HTML 에러를 반환해 화면에는 JSON 파싱 오류로 보인다(실제로 겪음).
      // 분당 한도와 구분해서, 일일 한도면 즉시 포기하고 원인을 그대로 알린다.
      const perDay = /PerDay|per day|daily/i.test(msg);
      if (perDay) throw new Error("DAILY_QUOTA_EXCEEDED");
      const rateLimited = /429|quota|rate/i.test(msg);
      const retriable = rateLimited || /5\d\d/.test(msg);
      if (!retriable || i === retries) break;
      // 분당 한도는 초 단위로 풀린다.
      const waitMs = rateLimited ? 8000 * (i + 1) : 1500 * (i + 1);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  throw lastError;
}
