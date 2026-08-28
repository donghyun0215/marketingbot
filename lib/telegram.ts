/**
 * Telegram 승인 게이트.
 *
 * 브리프의 병목: "모든 콘텐츠는 발행 전에 경영진 컨펌을 받습니다. 컨펌까지 하루에서 나흘.
 * 이것 때문에 발행 타이밍을 놓치는 일이 한 달에 몇 번씩 생기지만, 컨펌을 뺄 수도 없습니다."
 *
 * 컨펌을 없애지 않는다. 컨펌에 드는 시간을 줄인다.
 * 경영진이 폰에서 보는 것은 글 전체가 아니라 Fact-Guard가 표시한 확인 지점뿐이다.
 */

import { FactGuardResult, summarize } from "./fact-guard";
import { VoiceScore } from "./voice/score";

const API = (method: string) =>
  `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`;

async function call(method: string, body: unknown) {
  const res = await fetch(API(method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram ${method}: ${JSON.stringify(data).slice(0, 200)}`);
  return data.result;
}

/** 텔레그램 MarkdownV2 예약문자 이스케이프. 빠뜨리면 전송 자체가 실패한다. */
function esc(s: string): string {
  return s.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, (c) => `\\${c}`);
}

export type ApprovalRequest = {
  contentId: number;
  title: string;
  body: string;
  channel: string;
  voice: VoiceScore;
  guard: FactGuardResult;
  /** 이 주제를 고른 근거 — 왜 이 글이 지금 나왔는지 */
  rationale?: string;
};

/** 확인이 필요한 지점만 앞뒤 문맥과 함께 잘라 보여준다. */
function excerpts(body: string, guard: FactGuardResult, limit = 4): string {
  if (!guard.flags.length) return "";
  return guard.flags
    .slice(0, limit)
    .map((f) => {
      const from = Math.max(0, f.index - 40);
      const to = Math.min(body.length, f.index + f.matched.length + 40);
      const icon = f.severity === "block" ? "🔴" : "🟡";
      const snippet = body.slice(from, to).replace(/\n/g, " ");
      return `${icon} ${esc(f.matched)}\n   _${esc(snippet)}_`;
    })
    .join("\n");
}

export async function sendApprovalRequest(req: ApprovalRequest) {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const preview = req.body.slice(0, 400).replace(/\n{2,}/g, "\n");

  const lines = [
    `*승인 요청* · ${esc(req.channel)}`,
    `*${esc(req.title)}*`,
    ``,
    `Voice Score *${req.voice.total}* · ${esc(summarize(req.guard))}`,
  ];
  if (req.rationale) lines.push(`선정 근거: ${esc(req.rationale)}`);
  const ex = excerpts(req.body, req.guard);
  if (ex) lines.push(``, `*확인 지점*`, ex);
  lines.push(``, `*본문 앞부분*`, `_${esc(preview)}…_`);

  return call("sendMessage", {
    chat_id: chatId,
    text: lines.join("\n"),
    parse_mode: "MarkdownV2",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ 승인", callback_data: `approve:${req.contentId}` },
          { text: "❌ 반려", callback_data: `reject:${req.contentId}` },
        ],
        [{ text: "📄 전문 보기", callback_data: `full:${req.contentId}` }],
      ],
    },
  });
}

export async function answerCallback(callbackQueryId: string, text: string) {
  return call("answerCallbackQuery", { callback_query_id: callbackQueryId, text });
}

export async function sendMessage(text: string, markdown = true) {
  return call("sendMessage", {
    chat_id: process.env.TELEGRAM_CHAT_ID,
    text: markdown ? text : esc(text),
    parse_mode: "MarkdownV2",
  });
}

/** 반려 사유를 물을 때 쓰는 강제 응답 프롬프트. 사유 없는 반려를 만들지 않는다. */
export async function askRejectionReason(contentId: number) {
  return call("sendMessage", {
    chat_id: process.env.TELEGRAM_CHAT_ID,
    text: esc(`반려 사유를 적어주세요. (#${contentId})\n이 사유는 다음 생성부터 규칙으로 반영됩니다.`),
    parse_mode: "MarkdownV2",
    reply_markup: { force_reply: true, input_field_placeholder: "예: 고객사 사례를 앞에 배치할 것" },
  });
}

/** 임의 파라미터로 메시지를 보낼 때 (버튼 포함 등) */
export async function callRaw(method: string, body: unknown) {
  return call(method, body);
}

export { esc };
