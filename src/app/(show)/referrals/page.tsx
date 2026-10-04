"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { setReferralOpen } from "@/lib/referral-panel";

export default function ReferralsPage() {
  const router = useRouter();
  useEffect(() => {
    setReferralOpen(true);
    router.replace("/map?referrals=1");
  }, [router]);
  return null;
}
