import { admin, check, type Req, type Res } from '../_lib/http';
import { plaid } from '../_lib/plaid';
import { ITEM_COLUMNS, RECONNECT_CODES, recordNetWorth, syncItem, type Item } from '../_lib/sync';

export const config = { maxDuration: 60 };

type Hook = { webhook_type?: string; webhook_code?: string; item_id?: string; error?: { error_code?: string } | null };

const TRANSACTION_CODES = ['SYNC_UPDATES_AVAILABLE', 'RECURRING_TRANSACTIONS_UPDATE', 'DEFAULT_UPDATE', 'INITIAL_UPDATE', 'HISTORICAL_UPDATE'];

/**
 * Plaid calls this when a linked bank has new transactions or needs the user to sign in again.
 * PLAID_WEBHOOK_URL carries a secret query parameter; requests without it are refused.
 */
export default async function webhook(req: Req, res: Res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });

  const configured = process.env.PLAID_WEBHOOK_URL;
  const secret = configured ? new URL(configured).searchParams.get('secret') : null;
  if (!secret || req.query?.secret !== secret) return res.status(401).json({ error: 'Not allowed.' });

  const hook = (req.body && typeof req.body === 'object' ? req.body : {}) as Hook;
  try {
    const db = admin();
    const found = hook.item_id
      ? (check(await db.from('plaid_items').select(`user_id, ${ITEM_COLUMNS}`).eq('item_id', hook.item_id).maybeSingle()) as (Item & { user_id: string }) | null)
      : null;
    // Plaid also sends hooks for items that have since been removed; there is nothing to do for those.
    if (!found) return res.status(200).json({ ok: true });

    if (hook.webhook_type === 'TRANSACTIONS' && TRANSACTION_CODES.includes(hook.webhook_code ?? '')) {
      await syncItem(db, plaid(), found.user_id, found);
      await recordNetWorth(db, found.user_id);
    } else if (hook.webhook_type === 'ITEM') {
      const code = hook.webhook_code === 'ERROR' ? hook.error?.error_code : hook.webhook_code;
      if (RECONNECT_CODES.includes(code ?? '')) {
        check(await db.from('plaid_items').update({ login_required: true }).eq('item_id', found.item_id));
      } else if (code === 'LOGIN_REPAIRED') {
        check(await db.from('plaid_items').update({ login_required: false }).eq('item_id', found.item_id));
      }
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    // Only Plaid's error body or the message: the full error object carries the Plaid secret in its headers.
    console.error((e as { response?: { data?: unknown } })?.response?.data ?? (e instanceof Error ? e.message : e));
    // A failure status makes Plaid retry the hook later.
    res.status(500).json({ error: 'Sync failed.' });
  }
}
