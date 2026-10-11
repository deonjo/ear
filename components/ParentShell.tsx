"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useParentGate } from "./ParentGate";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/parent/", label: "Dashboard" },
  { href: "/parent/history/", label: "History" },
  { href: "/parent/settings/", label: "Settings" },
  { href: "/how-it-works/", label: "How it works" },
];

function normalize(path: string) {
  return path.endsWith("/") ? path : `${path}/`;
}

/** Frame for every grown-up screen: header, navigation, readable width. */
export function ParentShell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  const pathname = normalize(usePathname() ?? "/");
  const { unlocked, lock } = useParentGate();
  return (
    <div className="min-h-dvh pb-16" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <header className="z-20 border-b border-line bg-bg/90 backdrop-blur sm:sticky sm:top-0">
        <div className={`mx-auto flex items-center gap-3 py-3 pl-4 ${wide ? "max-w-6xl" : "max-w-4xl"}`}>
          <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold">
            <svg viewBox="0 0 100 100" className="h-7 w-7" aria-hidden="true">
              <rect x={19} y={8} width={6} height={87} rx={3} fill="#5B4636" />
              <circle cx={22} cy={8} r={5} fill="#E0A526" />
              <path d="M25 12 L92 38 L25 64 Z" fill="#D62839" />
            </svg>
            Chord Flags
          </Link>
          <nav aria-label="Main" className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto whitespace-nowrap pr-4 text-sm sm:justify-end">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-full px-3 py-1.5 ${active ? "bg-ink text-bg" : "text-muted hover:bg-surface-2 hover:text-ink"}`}
                >
                  {item.label}
                </Link>
              );
            })}
            {unlocked && (
              <button type="button" onClick={lock} className="rounded-full px-3 py-1.5 text-muted hover:bg-surface-2 hover:text-ink">
                Lock
              </button>
            )}
          </nav>
        </div>
      </header>
      <main className={`mx-auto px-4 pt-6 ${wide ? "max-w-6xl" : "max-w-4xl"}`}>{children}</main>
    </div>
  );
}

export function Card({ title, children, className = "", action }: { title?: string; children: React.ReactNode; className?: string; action?: React.ReactNode }) {
  return (
    <section className={`rounded-2xl border border-line bg-surface p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
