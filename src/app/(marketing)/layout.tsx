import { Suspense, type ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { PublicGate } from "@/features/marketing/public-gate";
import { CloudShader } from "@/components/ui/cloud-shader";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-dvh">
      <CloudShader className="pointer-events-none inset-0 z-0 !fixed !h-lvh !min-h-0" />
      <div className="relative z-10">
        <Suspense fallback={null}>
          <PublicGate />
        </Suspense>
        <SiteHeader kind="public" />
        {children}
      </div>
    </div>
  );
}
