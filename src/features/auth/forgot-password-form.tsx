"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Logo } from "@/components/logo";
import { ApiError, requestPasswordEmail } from "@/lib/api/client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!email.includes("@")) {
      setError("Use the email on the account.");
      return;
    }
    setPending(true);
    try {
      await requestPasswordEmail(email);
      setSent(true);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not send the reset email.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-16">
      <Logo />
      <h1 className="mt-10 text-4xl font-black tracking-tight">Forgot password</h1>
      <p className="mt-2 text-sm text-muted">
        We email a reset link from the project inbox. The job listings are not part of this.
      </p>
      {sent ? (
        <p className="mt-8 text-sm">If that email has an account, the reset link is on its way.</p>
      ) : (
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
          {error ? <p className="text-sm text-[#e11d48]">{error}</p> : null}
          <button type="submit" disabled={pending} className="mt-2 w-full rounded-full bg-ink py-3 text-sm font-semibold text-white disabled:opacity-60">
            {pending ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
      <Link href="/login" className="mt-4 text-sm font-medium">
        Back to login
      </Link>
      <Link href="/report-a-bug" className="mt-3 text-sm font-medium">
        Report a bug
      </Link>
    </main>
  );
}
