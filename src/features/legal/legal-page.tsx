import type { ReactNode } from "react";
import Link from "next/link";
import { LegalLinks } from "@/features/legal/legal-links";

export function LegalPage({
  title,
  lede,
  children,
}: {
  title: string;
  lede: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-[calc(100dvh-72px)] bg-transparent text-ink">
      <article className="mx-auto w-full max-w-2xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-[-0.03em]">{title}</h1>
        <p className="mt-4 text-sm leading-relaxed text-[#5e5e5e]">{lede}</p>
        <div className="mt-8 space-y-8 text-[1.02rem] leading-relaxed text-[#2c2c2c]">{children}</div>
        <div className="mt-12 flex flex-wrap items-center gap-x-2 gap-y-2">
          <LegalLinks />
          <span className="text-[#3a3a3a]">·</span>
          <Link href="/" className="text-[0.95rem] underline decoration-ink/40 underline-offset-[3px]">
            jobrador
          </Link>
        </div>
      </article>
    </main>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold tracking-[-0.02em] text-ink">{title}</h2>
      {children}
    </section>
  );
}
