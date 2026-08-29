import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Marketing Pulse — 코드프레소",
  description: "콘텐츠 여덟 단계를 시스템이 돌리고, 사람은 방향과 승인만 결정합니다.",
};

const NAV = [
  { href: "/", label: "현황" },
  { href: "/compare", label: "생성 비교" },
  { href: "/log", label: "판단 로그" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body>
        <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[rgba(255,255,255,0.82)] backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between px-6">
            <a href="/" className="flex items-baseline gap-2.5">
              <span className="text-[14.5px] font-semibold tracking-[-0.02em]">Marketing Pulse</span>
              <span className="text-[12.5px] text-[var(--muted)]">코드프레소</span>
            </a>
            <nav className="flex gap-1">
              {NAV.map((n) => (
                <a
                  key={n.href}
                  href={n.href}
                  className="rounded-md px-2.5 py-1.5 text-[13px] text-[var(--muted)] transition-colors hover:bg-[var(--line-2)] hover:text-[var(--ink)]"
                >
                  {n.label}
                </a>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-[1120px] px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
