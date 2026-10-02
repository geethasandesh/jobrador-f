"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { Logo } from "@/components/logo";
import { signOut, useAuthReady, useSession } from "@/lib/session";

const links = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/saved", label: "Saved" },
  { href: "/dashboard/visits", label: "Visits" },
  { href: "/map", label: "Map" },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const ready = useAuthReady();
  const session = useSession();
  const leaving = useRef(false);

  useEffect(() => {
    if (ready && !session && !leaving.current) router.replace("/login");
  }, [ready, session, router]);

  async function logout() {
    leaving.current = true;
    await signOut();
    router.replace("/");
  }

  if (!ready || !session) {
    return <main className="grid min-h-dvh place-items-center text-sm text-muted">Opening your dashboard…</main>;
  }

  return (
    <div className="flex min-h-dvh bg-white">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line px-4 py-5 md:flex">
        <Logo />
        <nav className="mt-8 flex flex-1 flex-col gap-1 text-sm font-medium">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-xl px-3 py-2 ${active ? "bg-zinc-100 text-ink" : "text-muted hover:bg-zinc-50 hover:text-ink"}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-line pt-4">
          <p className="truncate px-3 text-xs text-muted">{session.email}</p>
          <button
            type="button"
            onClick={logout}
            className="mt-2 w-full rounded-full px-3 py-2 text-left text-sm font-medium hover:bg-zinc-50"
          >
            Log out
          </button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line px-4 py-3 md:hidden">
          <Logo compact />
          <button type="button" onClick={logout} className="text-sm font-medium">
            Log out
          </button>
        </header>
        <nav className="flex gap-2 overflow-x-auto border-b border-line px-4 py-2 md:hidden">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="shrink-0 rounded-full bg-zinc-100 px-3 py-1.5 text-sm">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
