import { Suspense, type ReactNode } from "react";
import { RequireLogin } from "@/features/auth/require-login";
import { SiteHeader } from "@/components/site-header";

export default function ShowLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<main className="grid min-h-dvh place-items-center text-sm text-muted">Login is required.</main>}>
      <RequireLogin>
        <SiteHeader />
        {children}
      </RequireLogin>
    </Suspense>
  );
}
