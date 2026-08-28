import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { publish } from "@/lib/approval";
import { sendMessage, esc } from "@/lib/telegram";

export const dynamic = "force-dynamic";

/**
 * 예약분 발행. Vercel Cron이 매시 호출한다.
 *
 * 이 라우트가 브리프의 "발행 타이밍을 놓치는 일이 한 달에 몇 번씩"에 대한 답이다.
 * 승인이 끝나도 사람이 각 채널에 직접 올려야 했기 때문에 시점이 흘러갔다.
 * 이제는 아무도 챙기지 않아도 정해둔 시각에 나간다.
 */
export async function GET(req: NextRequest) {
  // Vercel Cron은 요청에 CRON_SECRET을 실어 보낸다. 외부 호출을 막는다.
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const db = supabaseAdmin();
  const { data: due } = await db
    .from("contents")
    .select("id, title")
    .eq("state", "scheduled")
    .lte("scheduled_for", new Date().toISOString());

  const results: { id: number; ok: boolean }[] = [];
  for (const c of due ?? []) {
    try {
      const p = await publish(c.id, "cron");
      results.push({ id: c.id, ok: true });
      await sendMessage(
        `🚀 *예약 발행 완료* \\#${c.id}\n_${esc(c.title)}_\n추적 링크: ${esc(
          `${req.nextUrl.origin}/r/${p.tracking_id}`
        )}`
      ).catch(() => {});
    } catch {
      results.push({ id: c.id, ok: false });
    }
  }
  return NextResponse.json({ ok: true, processed: results.length, results });
}
