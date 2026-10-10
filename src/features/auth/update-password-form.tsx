"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Logo } from "@/components/logo";
import { PasswordInput } from "@/components/password-input";
import { updatePassword } from "@/lib/session";
import { getSupabase, isAuthConfigured } from "@/lib/supabase";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!isAuthConfigured()) return;
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN")) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Use a password of at least 8 characters.");
      return;
    }
    setPending(true);
    try {
      await updatePassword(password);
      router.push("/map");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update the password.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-16">
      <Logo />
      <h1 className="mt-10 text-4xl font-black tracking-tight">New password</h1>
      <p className="mt-2 text-sm text-muted">This updates the Supabase sign-in only. It does not change the job listings.</p>
      {ready ? (
        <form onSubmit={submit} className="mt-8 space-y-3">
          <label className="block text-sm font-medium" htmlFor="password">
            Password
            <PasswordInput
              id="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1"
              required
            />
          </label>
          {error ? <p className="text-sm text-[#e11d48]">{error}</p> : null}
          <button type="submit" disabled={pending} className="mt-2 w-full rounded-full bg-ink py-3 text-sm font-semibold text-white disabled:opacity-60">
            {pending ? "Saving…" : "Save password"}
          </button>
        </form>
      ) : (
        <p className="mt-8 text-sm text-muted">Open the reset link from your email on this page.</p>
      )}
      <Link href="/login" className="mt-4 text-sm font-medium">
        Back to login
      </Link>
    </main>
  );
}
