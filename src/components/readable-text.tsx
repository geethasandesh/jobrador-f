"use client";

import { useState } from "react";

export function ReadableText({ text }: { text: string }) {
  const [english, setEnglish] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function translate() {
    if (english) {
      setEnglish(null);
      setError(null);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/translate?q=${encodeURIComponent(text)}`);
      const body = (await response.json()) as { text?: string; error?: string };
      if (!response.ok || !body.text) {
        setError(body.error ?? "Could not translate that.");
        return;
      }
      setEnglish(body.text);
    } catch {
      setError("Could not translate that.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-3">
      <p className="text-sm leading-6">{english ?? text}</p>
      <button type="button" onClick={() => void translate()} disabled={pending} className="mt-2 text-sm font-semibold">
        {pending ? "Translating…" : english ? "Show original" : "Translate"}
      </button>
      {english ? <p className="mt-1 text-xs text-muted">Automatic translation.</p> : null}
      {error ? <p className="mt-1 text-xs text-place">{error}</p> : null}
    </div>
  );
}
