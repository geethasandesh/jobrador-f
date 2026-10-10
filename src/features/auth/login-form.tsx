"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Logo } from "@/components/logo";
import { PasswordInput } from "@/components/password-input";
import { hasSeenGuide } from "@/lib/guide";
import { appDestination } from "@/lib/routes";
import { signIn, signUp, useAuthReady, useSession } from "@/lib/session";
import { getSupabase, isAuthConfigured } from "@/lib/supabase";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authReady = useAuthReady();
  const session = useSession();
  const [mode, setMode] = useState<"login" | "create">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const configured = isAuthConfigured();

  useEffect(() => {
    if (!authReady || !session) return;
    router.replace(appDestination(searchParams.get("next"), !hasSeenGuide(session.id)));
  }, [authReady, router, searchParams, session]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!configured) {
      setError("Add the Supabase anon key in jobrador-f/.env.local, then restart the site.");
      return;
    }
    if (!email.includes("@") || password.length < 8) {
      setError("Use an email address and a password of at least 8 characters.");
      return;
    }
    setPending(true);
    try {
      if (mode === "create") {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
      const { data } = await getSupabase().auth.getSession();
      const userId = data.session?.user.id;
      router.push(appDestination(searchParams.get("next"), Boolean(userId && !hasSeenGuide(userId))));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Login failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-16">
      <Logo />
      <h1 className="mt-10 text-4xl font-black tracking-tight">{mode === "create" ? "Create account" : "Login"}</h1>
      <p className="mt-2 text-sm text-muted">
        {mode === "create"
          ? "This creates a sign-in with Supabase. Your email and password are not stored with the jobs."
          : "Sign in with Supabase. The account stays separate from the job listings."}
      </p>
      <form onSubmit={submit} className="mt-8 space-y-3">
        <label className="block text-sm font-medium" htmlFor="email">
          Email
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="field mt-1"
            required
          />
        </label>
        <label className="block text-sm font-medium" htmlFor="password">
          Password
          <PasswordInput
            id="password"
            autoComplete={mode === "create" ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1"
            required
          />
        </label>
        {mode === "login" ? (
          <Link href="/login/forgot" className="inline-flex text-sm font-medium">
            Forgot password?
          </Link>
        ) : null}
        {error ? <p className="text-sm text-[#e11d48]">{error}</p> : null}
        <button type="submit" disabled={pending} className="mt-2 w-full rounded-full bg-ink py-3 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Please wait…" : mode === "create" ? "Create account" : "Login"}
        </button>
      </form>
      <button
        type="button"
        className="mt-4 text-sm font-medium"
        onClick={() => {
          setMode(mode === "login" ? "create" : "login");
          setError(null);
        }}
      >
        {mode === "login" ? "Create an account" : "Already have an account? Login"}
      </button>
    </main>
  );
}
