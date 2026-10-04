"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuthReady, useSession } from "@/lib/session";

export function PublicGate() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const authReady = useAuthReady();
  const session = useSession();

  useEffect(() => {
    if (!authReady || !session || pathname !== "/") return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("guide");
    const query = params.toString();
    router.replace(query ? `/map?${query}` : "/map");
  }, [authReady, pathname, router, searchParams, session]);

  return null;
}
