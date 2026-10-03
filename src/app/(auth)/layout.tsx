import type { ReactNode } from "react";
import { LegalLinks } from "@/features/legal/legal-links";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <div className="flex-1">{children}</div>
      <footer className="px-6 py-6 text-center">
        <LegalLinks />
      </footer>
    </div>
  );
}
