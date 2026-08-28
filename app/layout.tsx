import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Marketing Pulse — 코드프레소 콘텐츠 운영",
  description: "콘텐츠 8단계를 시스템이 돌리고, 사람은 승인과 방향만 결정합니다.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <header className="border-b border-[var(--line)] bg-[var(--surface)]">
          <div className="mx-auto flex max-w-[1180px] items-center justify-between px-6 py-3">
            <div className="flex items-baseline gap-3">
              <span className="text-[15px] font-semibold tracking-tight">Marketing Pulse</span>
              <span className="text-[13px] text-[var(--muted)]">코드프레소 콘텐츠 운영</span>
            </div>
            <nav className="flex gap-5 text-[13px] text-[var(--muted)]">
              <a className="hover:text-[var(--ink)]" href="/">대시보드</a>
              <a className="hover:text-[var(--ink)]" href="/compare">생성 비교</a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-[1180px] px-6 py-6">{children}</main>
      </body>
    </html>
  );
}
