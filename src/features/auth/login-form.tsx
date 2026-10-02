"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Logo } from "@/components/logo";
import { signIn, signUp } from "@/lib/session";
import { isAuthConfigured } from "@/lib/supabase";

function afterLogin(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/login")) return "/map";
  return next;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"login" | "create">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const configured = isAuthConfigured();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
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
        const signedIn = await signUp(email, password);
        if (!signedIn) {
          setNotice("Account created in Supabase. Confirm the email, then log in.");
          setMode("login");
          return;
        }
      } else {
        await signIn(email, password);
      }
      router.push(afterLogin(searchParams.get("next")));
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
        {mode === "create" ? "This creates your account in Supabase." : "Sign in with your Supabase account."}
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
          <input
            id="password"
            type="password"
            autoComplete={mode === "create" ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="field mt-1"
            required
          />
        </label>
        {mode === "login" ? (
          <Link href="/login/forgot" className="inline-flex text-sm font-medium">
            Forgot password?
          </Link>
        ) : null}
        {error ? <p className="text-sm text-[#e11d48]">{error}</p> : null}
        {notice ? <p className="text-sm text-muted">{notice}</p> : null}
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
          setNotice(null);
        }}
      >
        {mode === "login" ? "Create an account" : "Already have an account? Login"}
      </button>
    </main>
  );
}
