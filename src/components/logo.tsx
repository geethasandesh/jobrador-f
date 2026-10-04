import Link from "next/link";

export function Logo({ compact = false, href = "/" }: { compact?: boolean; href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-ink">
      <span className="relative block h-7 w-7 shrink-0" aria-hidden>
        <span className="absolute left-0 top-0 h-[18px] w-[18px] rounded-full border-[2.5px] border-ink" />
        <span className="absolute bottom-0 right-0 h-[18px] w-[18px] rounded-full border-[2.5px] border-ink" />
      </span>
      {compact ? <span className="sr-only">jobrador</span> : <span>jobrador</span>}
    </Link>
  );
}
