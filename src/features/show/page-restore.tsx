"use client";

import { useEffect } from "react";

// The back/forward cache can restore a frozen copy of a page from before a
// logout or account switch. Reload it so the login check runs again.
export function PageRestore() {
  useEffect(() => {
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  return null;
}
