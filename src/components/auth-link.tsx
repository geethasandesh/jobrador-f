"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useAuthReady, useSession } from "@/lib/session";

export function AuthLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const ready = useAuthReady();
  const session = useSession();
  const destination = ready && session ? href : `/login?next=${encodeURIComponent(href)}`;

  return (
    <Link href={destination} className={className}>
      {children}
    </Link>
  );
}
