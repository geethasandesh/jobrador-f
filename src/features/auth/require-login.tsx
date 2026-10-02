"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuthReady, useSession } from "@/lib/session";

export function RequireLogin({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ready = useAuthReady();
  const session = useSession();

  useEffect(() => {
    if (!ready || session) return;
    const query = searchParams.toString();
    const next = query ? `${pathname}?${query}` : pathname;
    router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [ready, session, router, pathname, searchParams]);

  if (!ready || !session) {
    return <main className="grid min-h-dvh place-items-center text-sm text-muted">Login is required.</main>;
  }

  return children;
}
