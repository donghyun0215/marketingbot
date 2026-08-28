import { NextRequest, NextResponse } from "next/server";
import { approve, reject, publish } from "@/lib/approval";
import { answerCallback, askRejectionReason, sendMessage, callRaw, esc } from "@/lib/telegram";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * 텔레그램 버튼·답장 처리.
 *
 * 보안: 텔레그램은 웹훅 등록 시 지정한 secret_token을 매 요청 헤더에 실어 보낸다.
 * 이걸 확인하지 않으면 URL을 아는 누구나 콘텐츠를 승인할 수 있다.
 */
function authorized(req: NextRequest) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected) return false;
  return req.headers.get("x-telegram-bot-api-secret-token") === expected;
}

/** 승인 권한이 있는 사람만. 브리프상 컨펌 주체는 경영진이다. */
function allowed(userId?: number) {
  const list = (process.env.TELEGRAM_ALLOWED_USER_IDS ?? process.env.TELEGRAM_CHAT_ID ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return !!userId && list.includes(String(userId));
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const update = await req.json();

  try {
    // 1) 승인 / 반려 버튼
    if (update.callback_query) {
      const cq = update.callback_query;
      const [action, idRaw] = String(cq.data ?? "").split(":");
      const contentId = Number(idRaw);
      const actor = `telegram:${cq.from?.id}`;

      if (!allowed(cq.from?.id)) {
        await answerCallback(cq.id, "승인 권한이 없습니다.");
        return NextResponse.json({ ok: true });
      }

      if (action === "approve") {
        await approve(contentId, actor);
        await answerCallback(cq.id, "승인했습니다.");
        // 승인 다음 행동을 바로 제시한다. 발행까지 폰에서 끝난다.
        await callRaw("sendMessage", {
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: `✅ *\\#${contentId} 승인 완료*\n발행하면 추적 링크가 생성되고, 이 글에서 온 문의는 자동으로 귀속됩니다\\.`,
          parse_mode: "MarkdownV2",
          reply_markup: { inline_keyboard: [[{ text: "🚀 발행", callback_data: `publish:${contentId}` }]] },
        });
      } else if (action === "publish") {
        const p = await publish(contentId, actor);
        await answerCallback(cq.id, "발행했습니다.");
        const link = `${req.nextUrl.origin}/r/${p.tracking_id}`;
        await sendMessage(
          `🚀 *\\#${contentId} 발행 완료*\n추적 링크: ${esc(link)}\n이 링크를 거친 문의는 이 글에 귀속됩니다\\.`
        );
      } else if (action === "reject") {
        // 사유를 받아야 반려가 완료된다. 사유 없는 반려는 만들지 않는다.
        await answerCallback(cq.id, "반려 사유를 입력해 주세요.");
        await askRejectionReason(contentId);
      } else if (action === "full") {
        const { data } = await supabaseAdmin()
          .from("contents")
          .select("body")
          .eq("id", contentId)
          .single();
        await answerCallback(cq.id, "전문을 보냅니다.");
        await sendMessage(`_${esc((data?.body ?? "").slice(0, 3500))}_`);
      }
      return NextResponse.json({ ok: true });
    }

    // 2) 반려 사유 답장
    const msg = update.message;
    const replyTo = msg?.reply_to_message?.text as string | undefined;
    if (msg?.text && replyTo?.includes("반려 사유")) {
      const m = replyTo.match(/#(\d+)/);
      if (m && allowed(msg.from?.id)) {
        const contentId = Number(m[1]);
        await reject(contentId, `telegram:${msg.from?.id}`, msg.text);
        await sendMessage(
          `❌ *\\#${contentId} 반려* — 다음 규칙으로 학습했습니다\\.\n_${esc(msg.text)}_`
        );
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    // 실패해도 200을 준다. 에러를 반환하면 텔레그램이 같은 업데이트를 계속 재전송한다.
    const detail = e instanceof Error ? e.message : String(e);
    await sendMessage(`⚠️ 처리 실패: ${esc(detail.slice(0, 200))}`).catch(() => {});
    return NextResponse.json({ ok: true });
  }
}
