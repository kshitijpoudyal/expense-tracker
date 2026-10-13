import { supabase } from '@/lib/supabase';

// The server functions are deployed with the website. The browser reaches them on its own origin;
// the Android app needs the full address.
const BASE = process.env.EXPO_PUBLIC_API_URL ?? (process.env.EXPO_OS === 'web' ? '' : 'https://expense.kshitijstudio.com');

/** Calls one of the signed-in server functions under /api. */
export async function api<T>(path: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data } = await supabase!.auth.getSession();
  const response = await fetch(`${BASE}/api/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${data.session?.access_token ?? ''}` },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) throw new Error(json?.error ?? `Request failed (${response.status}).`);
  return json as T;
}
