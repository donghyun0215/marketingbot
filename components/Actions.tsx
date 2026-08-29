"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type State = "idle" | "working" | "done" | "error";

/** 주제 채택 버튼. 누르면 생성부터 승인 요청까지 한 번에 진행된다. */
export function AdoptButton({ suggestionId }: { suggestionId: number }) {
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function run() {
    setState("working");
    setMessage("");
    try {
      const res = await fetch("/api/topics/adopt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestionId }),
      });
      // 서버가 시간 초과로 종료되면 JSON이 아니라 HTML이 온다. 그대로 파싱하면
      // "Unexpected token" 같은 원인과 무관한 오류가 사용자에게 보인다.
      const raw = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(
          res.status === 504 || raw.startsWith("An error")
            ? "생성이 시간 안에 끝나지 않았습니다. 잠시 후 다시 시도해 주세요."
            : `서버 오류 (${res.status})`
        );
      }
      if (!res.ok) throw new Error(data.error ?? "생성에 실패했습니다");
      setState("done");
      setMessage(
        `Voice ${data.voiceScore} (대조군 ${data.baselineScore}) · 확인 ${data.reviewPoints}곳 · 텔레그램으로 승인 요청을 보냈습니다`
      );
      router.refresh();
    } catch (e) {
      setState("error");
      setMessage(e instanceof Error ? e.message : "생성에 실패했습니다");
    }
  }

  return (
    <div>
      <div className="flex gap-1.5">
        <button
          onClick={run}
          disabled={state === "working" || state === "done"}
          className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-[12px] font-medium shadow-[var(--shadow-1)] hover:bg-[var(--surface-2)] disabled:opacity-45"
        >
          {state === "working" ? "초안 생성 중…" : state === "done" ? "승인 요청 보냄" : "채택하고 초안 생성"}
        </button>
        <button
          disabled={state === "working"}
          className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-[12px] text-[var(--muted)] hover:bg-[var(--surface-2)]"
        >
          보류
        </button>
      </div>
      {message && (
        <p
          className={`mt-1.5 text-[11.5px] leading-snug ${
            state === "error" ? "text-[var(--risk)]" : "text-[var(--muted)]"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}

/** 웹에서의 승인·반려. 텔레그램이 안 될 때를 위한 두 번째 경로다. */
export function DecideButtons({ contentId }: { contentId: number }) {
  const [state, setState] = useState<State>("idle");
  const router = useRouter();

  async function decide(action: "approve" | "reject") {
    let reason = "";
    if (action === "reject") {
      // 사유 없는 반려는 만들지 않는다. 텔레그램과 같은 규칙이다.
      reason = window.prompt("반려 사유를 적어주세요. 이 문장이 다음 생성 규칙이 됩니다.") ?? "";
      if (!reason.trim()) return;
    }
    setState("working");
    try {
      const res = await fetch("/api/contents/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId, action, reason }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setState("done");
      router.refresh();
    } catch {
      setState("error");
    }
  }

  return (
    <div className="flex shrink-0 gap-1.5">
      <button
        onClick={() => decide("approve")}
        disabled={state === "working" || state === "done"}
        className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-[12px] font-medium shadow-[var(--shadow-1)] hover:bg-[var(--surface-2)] disabled:opacity-45"
      >
        승인
      </button>
      <button
        onClick={() => decide("reject")}
        disabled={state === "working" || state === "done"}
        className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-[12px] font-medium shadow-[var(--shadow-1)] hover:bg-[var(--surface-2)] disabled:opacity-45"
      >
        반려
      </button>
    </div>
  );
}
