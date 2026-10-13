import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

// Vercel's Node.js request and response helpers, reduced to what these functions use.
export type Req = { method?: string; headers: Record<string, string | string[] | undefined>; body?: unknown };
export type Res = {
  status(code: number): Res;
  json(body: unknown): void;
  setHeader(name: string, value: string): void;
  end(): void;
};

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export type Context = { user: User; db: SupabaseClient; body: Record<string, unknown> };

function admin() {
  const url = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new HttpError(503, 'The server is missing its Supabase settings.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Wraps a POST endpoint: CORS, sign-in check and error reporting. */
export function endpoint(run: (ctx: Context) => Promise<unknown>) {
  return async (req: Req, res: Res) => {
    // Requests are authorised by a bearer token, never cookies, so any origin may call.
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(204).end();

    try {
      if (req.method !== 'POST') throw new HttpError(405, 'Use POST.');
      const db = admin();
      const header = req.headers.authorization;
      const token = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : '';
      if (!token) throw new HttpError(401, 'Sign in first.');
      const { data, error } = await db.auth.getUser(token);
      if (error || !data.user) throw new HttpError(401, 'Your session has expired. Sign in again.');

      const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {};
      res.status(200).json((await run({ user: data.user, db, body })) ?? { ok: true });
    } catch (e) {
      if (e instanceof HttpError) return res.status(e.status).json({ error: e.message });
      // Log Plaid's error body or the message only: the full error object carries the request headers, which hold the Plaid secret.
      console.error((e as { response?: { data?: unknown } })?.response?.data ?? (e instanceof Error ? e.message : e));
      res.status(500).json({ error: plaidMessage(e) ?? 'Something went wrong. Try again.' });
    }
  };
}

/** Plaid errors arrive as axios errors carrying a readable message. */
function plaidMessage(e: unknown) {
  const data = (e as { response?: { data?: { error_message?: string; display_message?: string | null } } })?.response?.data;
  return data?.display_message ?? data?.error_message;
}

export function check<T>(result: { data: T; error: { message: string } | null }) {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}
