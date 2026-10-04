"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Logo } from "@/components/logo";
import { ApiError, getAdminOverview, reviewReferral, type AdminOverview } from "@/lib/api/client";
import { signIn, signOut, useAuthReady, useSession } from "@/lib/session";
import { getSupabase, isAuthConfigured } from "@/lib/supabase";

type AdminData = {
  overview: AdminOverview;
  reviewing: string | null;
  review: (id: string, action: "approve" | "reject") => Promise<void>;
  reload: () => Promise<void>;
};

const AdminDataContext = createContext<AdminData | null>(null);

export function useAdminData() {
  const value = useContext(AdminDataContext);
  if (!value) throw new Error("Admin panels only render inside the admin shell.");
  return value;
}

export function AdminShell({ children }: { children: ReactNode }) {
  const authReady = useAuthReady();
  const session = useSession();
  const pathname = usePathname();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reviewing, setReviewing] = useState<string | null>(null);

  async function load() {
    setError(null);
    setLoading(true);
    try {
      setOverview(await getAdminOverview());
    } catch (caught) {
      setOverview(null);
      setError(caught instanceof ApiError ? caught.message : "The dashboard did not load.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authReady || !session) return;
    void load();
  }, [authReady, session]);

  async function review(id: string, action: "approve" | "reject") {
    setReviewing(id);
    setError(null);
    try {
      await reviewReferral(id, action);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "That review did not go through.");
    } finally {
      setReviewing(null);
    }
  }

  async function logout() {
    await signOut();
    setOverview(null);
  }

  if (!authReady) {
    return <p className="px-4 py-16 text-center text-sm text-muted">Checking login…</p>;
  }

  if (!session) return <AdminLogin />;

  const accounts = overview?.counts.users ?? 0;
  const pending = overview?.counts.referralsPending ?? 0;
  const bugs = overview?.counts.bugsOpen ?? 0;
  const closures = overview?.counts.closuresPending ?? 0;

  return (
    <div className="min-h-dvh bg-white md:flex">
      <aside className="shrink-0 border-b border-line bg-white md:sticky md:top-0 md:flex md:h-dvh md:w-64 md:flex-col md:border-b-0 md:border-r">
        <div className="flex h-14 items-center justify-between px-4 sm:h-[72px] md:px-5">
          <div className="flex items-center gap-2">
            <Logo href="/admin" />
            <span className="text-sm font-semibold text-[#e10600]">Beta</span>
          </div>
          <button type="button" onClick={() => void logout()} className="text-sm font-semibold md:hidden">
            Log out
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:px-3 md:pb-0">
          <SideLink href="/admin" label="Analytics" active={pathname === "/admin"} />
          <SideLink href="/admin/accounts" label="Accounts" active={pathname.startsWith("/admin/accounts")} count={accounts} />
          <SideLink href="/admin/places" label="Places" active={pathname.startsWith("/admin/places")} />
          <SideLink href="/admin/tips" label="Tips" active={pathname.startsWith("/admin/tips")} />
          <SideLink href="/admin/wall" label="Wall" active={pathname.startsWith("/admin/wall")} />
          <SideLink href="/admin/closures" label="Job closed" active={pathname.startsWith("/admin/closures")} count={closures} />
          <SideLink href="/admin/referrals" label="Referral reviews" active={pathname.startsWith("/admin/referrals")} count={pending} />
          <SideLink href="/admin/bugs" label="Bugs" active={pathname.startsWith("/admin/bugs")} count={bugs} />
        </nav>
        <div className="hidden p-3 md:block">
          <button type="button" onClick={() => void logout()} className="w-full rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white">
            Log out
          </button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        {error ? <p className="px-4 pt-6 text-sm text-[#e11d48] md:px-10">{error}</p> : null}
        {loading && !overview ? <p className="px-4 py-16 text-sm text-muted md:px-10">Loading the dashboard…</p> : null}
        {overview ? (
          <AdminDataContext.Provider value={{ overview, reviewing, review, reload: load }}>
            <div className="mx-auto w-full max-w-4xl px-4 py-8 md:px-10">{children}</div>
          </AdminDataContext.Provider>
        ) : null}
      </div>
    </div>
  );
}

function SideLink({ href, label, active, count = 0 }: { href: string; label: string; active: boolean; count?: number }) {
  return (
    <Link
      href={href}
      className={`flex shrink-0 items-center justify-between gap-3 rounded-full px-4 py-2.5 text-sm font-semibold ${active ? "bg-ink text-white" : "text-ink hover:bg-[#f6f6f6]"}`}
    >
      <span>{label}</span>
      {count > 0 ? (
        <span className={`rounded-full px-2 py-0.5 text-[11px] ${active ? "bg-white text-ink" : "bg-[#f3f3f3] text-ink"}`}>{count}</span>
      ) : null}
    </Link>
  );
}

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!isAuthConfigured()) {
      setError("Add the Supabase anon key in jobrador-f/.env.local, then restart the site.");
      return;
    }
    if (!email.includes("@") || password.length < 8) {
      setError("Use the admin email and password.");
      return;
    }
    setPending(true);
    try {
      await signIn(email, password);
      await getSupabase().auth.getSession();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Login failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="min-h-dvh bg-white">
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-2 px-4 sm:h-[72px]">
          <Logo href="/admin" />
          <span className="text-sm font-semibold text-[#e10600]">Beta</span>
          <span className="text-sm font-semibold text-muted">Admin</span>
        </div>
      </header>
      <form onSubmit={submit} className="mx-auto flex min-h-[70dvh] w-full max-w-md flex-col justify-center px-5">
        <h1 className="text-4xl font-black tracking-tight">Admin</h1>
        <p className="mt-2 text-sm text-muted">Sign in with the admin account.</p>
        <label className="mt-8 block text-sm font-medium" htmlFor="admin-email">
          Email
          <input id="admin-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className="field mt-1" required />
        </label>
        <label className="mt-3 block text-sm font-medium" htmlFor="admin-password">
          Password
          <input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="field mt-1" required />
        </label>
        {error ? <p className="mt-3 text-sm text-[#e11d48]">{error}</p> : null}
        <button type="submit" disabled={pending} className="mt-4 w-full rounded-full bg-ink py-3 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Please wait…" : "Log in"}
        </button>
      </form>
    </main>
  );
}
