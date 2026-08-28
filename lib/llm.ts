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
      return process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
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
          maxOutputTokens: a.maxTokens ?? 2048,
          temperature: a.temperature ?? 0.7,
        },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("") ?? "";
  if (!text) throw new Error("Gemini returned empty content");
  return text;
}

async function callGroq(a: GenerateArgs): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY missing");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: modelName(),
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

/** 재시도: 무료 티어는 분당 요청 제한에 걸리기 쉬우므로 백오프를 둔다. */
export async function generate(a: GenerateArgs, retries = 2): Promise<string> {
  const fn =
    provider() === "gemini" ? callGemini : provider() === "groq" ? callGroq : callAnthropic;
  let lastError: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn(a);
    } catch (e) {
      lastError = e;
      const msg = String(e);
      const retriable = /429|5\d\d|rate/i.test(msg);
      if (!retriable || i === retries) break;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw lastError;
}
