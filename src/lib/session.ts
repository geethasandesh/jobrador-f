import { useSyncExternalStore } from "react";
import type { AuthError, Session as SupabaseSession } from "@supabase/supabase-js";
import { getSupabase, isAuthConfigured } from "./supabase";

export type Session = {
  id: string;
  email: string;
};

type AuthSnapshot = {
  ready: boolean;
  session: Session | null;
};

let snapshot: AuthSnapshot = { ready: false, session: null };
const listeners = new Set<() => void>();
let started = false;

function emit(next: AuthSnapshot) {
  if (next.ready === snapshot.ready && next.session?.id === snapshot.session?.id && next.session?.email === snapshot.session?.email) return;
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function toSession(session: SupabaseSession | null): Session | null {
  const id = session?.user.id;
  const email = session?.user.email;
  return id && email ? { id, email } : null;
}

function ensureAuth() {
  if (started || typeof window === "undefined") return;
  started = true;
  window.localStorage.removeItem("jobrador.session");
  if (!isAuthConfigured()) {
    emit({ ready: true, session: null });
    return;
  }
  const supabase = getSupabase();
  supabase.auth.getSession().then(({ data }) => {
    emit({ ready: true, session: toSession(data.session) });
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    emit({ ready: true, session: toSession(session) });
  });
}

function subscribe(onStoreChange: () => void) {
  ensureAuth();
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function useAuthReady() {
  return useSyncExternalStore(subscribe, () => snapshot.ready, () => false);
}

export function useSession(): Session | null {
  return useSyncExternalStore(subscribe, () => snapshot.session, () => null);
}

function message(error: AuthError) {
  return error.message;
}

export async function signIn(email: string, password: string) {
  const { error } = await getSupabase().auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw new Error(message(error));
}

export async function signUp(email: string, password: string) {
  const { data, error } = await getSupabase().auth.signUp({
    email: email.trim(),
    password,
    options: { emailRedirectTo: `${window.location.origin}/login` },
  });
  if (error) throw new Error(message(error));
  return Boolean(data.session);
}

export async function requestPasswordReset(email: string) {
  const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/login/update-password`,
  });
  if (error) throw new Error(message(error));
}

export async function updatePassword(password: string) {
  const { error } = await getSupabase().auth.updateUser({ password });
  if (error) throw new Error(message(error));
}

export async function accessToken(): Promise<string | null> {
  if (!isAuthConfigured()) return null;
  const { data } = await getSupabase().auth.getSession();
  return data.session?.access_token ?? null;
}

export async function signOut() {
  if (!isAuthConfigured()) return;
  const { error } = await getSupabase().auth.signOut();
  if (error) throw new Error(message(error));
}
