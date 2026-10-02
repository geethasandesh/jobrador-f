import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { CloudShader } from "@/components/ui/cloud-shader";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-dvh">
      <CloudShader className="pointer-events-none inset-0 z-0 !fixed !h-dvh !min-h-0" />
      <div className="relative z-10">
        <SiteHeader />
        {children}
      </div>
    </div>
  );
}
