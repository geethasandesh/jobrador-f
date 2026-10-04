"use client";

import { useEffect } from "react";
import { adoptLibrary } from "@/lib/local-lists";
import { useAuthReady, useSession } from "@/lib/session";

export function LibrarySync() {
  const ready = useAuthReady();
  const session = useSession();

  useEffect(() => {
    if (!ready || !session) return;
    void adoptLibrary(session.id).catch(() => undefined);
  }, [ready, session]);

  return null;
}
