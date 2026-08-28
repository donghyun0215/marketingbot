import { NextRequest, NextResponse } from "next/server";
import { approve, reject } from "@/lib/approval";
import { sendMessage, esc } from "@/lib/telegram";

export const dynamic = "force-dynamic";

/** 웹 대시보드에서의 승인·반려. 텔레그램 장애 시의 두 번째 경로. */
export async function POST(req: NextRequest) {
  try {
    const { contentId, action, reason } = await req.json();
    if (action === "approve") {
      await approve(Number(contentId), "web");
      await sendMessage(`✅ *\\#${contentId} 승인* — 웹 대시보드에서 처리되었습니다\\.`).catch(() => {});
    } else if (action === "reject") {
      await reject(Number(contentId), "web", String(reason ?? ""));
      await sendMessage(
        `❌ *\\#${contentId} 반려* — 다음 규칙으로 학습했습니다\\.\n_${esc(String(reason))}_`
      ).catch(() => {});
    } else {
      return NextResponse.json({ error: "알 수 없는 동작입니다" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
