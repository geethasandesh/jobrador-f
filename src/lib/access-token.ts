import { getSupabase, isAuthConfigured } from "./supabase";

export async function accessToken(): Promise<string | null> {
  if (!isAuthConfigured()) return null;
  const { data } = await getSupabase().auth.getSession();
  return data.session?.access_token ?? null;
}
