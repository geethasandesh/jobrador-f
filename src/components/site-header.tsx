"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { useClientReady, useRoute } from "@/lib/local-lists";
import { signOut, useAuthReady, useSession } from "@/lib/session";

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const ready = useClientReady();
  const stops = useRoute().length;
  const visitCount = ready ? stops : 0;
  const authReady = useAuthReady();
  const session = useSession();
  const signedIn = authReady && Boolean(session);
  if (pathname === "/map") return null;

  function destination(path: string) {
    if (signedIn) return path;
    return `/login?next=${encodeURIComponent(path)}`;
  }

  const onHome = pathname === "/";

  return (
    <header className={`sticky top-0 z-[900] ${onHome ? "bg-transparent" : "bg-white"}`}>
      <div className="mx-auto flex h-[72px] w-full max-w-6xl items-center justify-between gap-4 px-5">
        <Logo />
        <nav className="flex items-center gap-1 text-sm font-medium text-ink sm:gap-2">
          <Link href={destination("/map?panel=share")} className="inline-flex items-center gap-1.5 rounded-full px-2 py-2 hover:bg-zinc-50 sm:px-3">
            <PinIcon />
            <span className="hidden sm:inline">Share a tip</span>
            <span className="sm:hidden">Share</span>
          </Link>
          <Link href={destination("/map?panel=visits")} className="inline-flex items-center gap-1.5 rounded-full px-2 py-2 hover:bg-zinc-50 sm:px-3">
            <RouteIcon />
            <span className="hidden sm:inline">Visit list</span>
            <span className="sm:hidden">List</span>
            {visitCount > 0 ? <span className="text-muted">{visitCount}</span> : null}
          </Link>
          <Link href={destination("/map")} className="rounded-full px-2 py-2 hover:bg-zinc-50 sm:px-3">
            Open map
          </Link>
          {signedIn ? (
            <button
              type="button"
              onClick={() => {
                void signOut().then(() => router.push("/"));
              }}
              className="ml-1 inline-flex items-center rounded-full bg-ink px-4 py-2 text-white"
            >
              Log out
            </button>
          ) : (
            <Link href="/login" className="ml-1 inline-flex items-center rounded-full bg-ink px-4 py-2 text-white">
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

function PinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 1.5a4.2 4.2 0 0 0-4.2 4.2c0 3.1 4.2 8.8 4.2 8.8s4.2-5.7 4.2-8.8A4.2 4.2 0 0 0 8 1.5Z" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="8" cy="5.7" r="1.3" fill="currentColor" />
    </svg>
  );
}

function RouteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3 3.5h6.2a2.3 2.3 0 0 1 0 4.6H6.2a2.3 2.3 0 0 0 0 4.6H13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="3" cy="3.5" r="1.2" fill="currentColor" />
      <circle cx="13" cy="12.7" r="1.2" fill="currentColor" />
    </svg>
  );
}
