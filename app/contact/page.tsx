"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

/**
 * 문의 폼 (데모용).
 * 실제로는 코드프레소 홈페이지 폼이 이 역할을 한다. 핵심은 ref를 함께 전송하는 것이며,
 * 그 한 줄이 "어느 글이 문의를 만들었는가"를 처음으로 답할 수 있게 한다.
 */
function Form() {
  const ref = useSearchParams().get("ref");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [alias, setAlias] = useState("");
  const [interest, setInterest] = useState("AI 역량 평가");

  async function submit() {
    setState("sending");
    await fetch("/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ref,
        companyAlias: alias || "제조 대기업 K",
        industryHint: "기업",
        inquiryType: "Demo",
        interest,
        note: "데모 문의",
      }),
    });
    setState("done");
  }

  if (state === "done") {
    return (
      <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5">
        <p className="text-[14px]">문의가 접수되었습니다.</p>
        <p className="mt-1.5 text-[12.5px] text-[var(--muted)]">
          {ref
            ? "이 문의는 유입된 콘텐츠에 귀속되었습니다. 대시보드에서 확인할 수 있습니다."
            : "추적 링크 없이 들어와 어느 콘텐츠에서 왔는지 알 수 없습니다."}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5">
      <h1 className="text-[16px] font-semibold">도입 문의</h1>
      <p className="mt-1 text-[12.5px] text-[var(--muted)]">
        {ref ? `유입 경로가 확인되었습니다 (${ref})` : "유입 경로 정보가 없습니다"}
      </p>
      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="text-[12px] text-[var(--muted)]">회사 (별칭으로 저장됩니다)</span>
          <input
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            placeholder="제조 대기업 K"
            className="mt-1 w-full rounded border border-[var(--line)] px-3 py-2 text-[13px]"
          />
        </label>
        <label className="block">
          <span className="text-[12px] text-[var(--muted)]">관심 서비스</span>
          <input
            value={interest}
            onChange={(e) => setInterest(e.target.value)}
            className="mt-1 w-full rounded border border-[var(--line)] px-3 py-2 text-[13px]"
          />
        </label>
        <button
          onClick={submit}
          disabled={state === "sending"}
          className="rounded bg-[var(--brand)] px-3.5 py-2 text-[13px] text-white disabled:opacity-50"
        >
          {state === "sending" ? "보내는 중…" : "문의 보내기"}
        </button>
      </div>
    </div>
  );
}

export default function Contact() {
  return (
    <div className="mx-auto max-w-[440px]">
      <Suspense fallback={null}>
        <Form />
      </Suspense>
    </div>
  );
}
