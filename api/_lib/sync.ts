import type { SupabaseClient } from '@supabase/supabase-js';
import type { AccountBase, PlaidApi, Transaction, TransactionStream } from 'plaid';

import { check } from './http';

export type Item = { item_id: string; access_token: string; institution_name: string | null; cursor: string | null; webhook: string | null };

export const ITEM_COLUMNS = 'item_id, access_token, institution_name, cursor, webhook';

type Category = { primary: string; detailed: string } | null | undefined;

/** Maps Plaid's personal finance categories onto the app's own. */
function categoryOf(pfc: Category, amount: number) {
  const primary = pfc?.primary ?? '';
  const detailed = pfc?.detailed ?? '';
  if (primary === 'TRANSFER_IN' || primary === 'TRANSFER_OUT' || detailed === 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT') return 'transfer';
  if (primary === 'INCOME') return 'income';
  if (primary === 'FOOD_AND_DRINK') return detailed === 'FOOD_AND_DRINK_GROCERIES' ? 'groceries' : 'dining';
  if (primary === 'GENERAL_MERCHANDISE' || primary === 'HOME_IMPROVEMENT') return 'shopping';
  if (primary === 'TRANSPORTATION') return 'auto';
  if (primary === 'TRAVEL') return 'travel';
  if (primary === 'ENTERTAINMENT') return 'entertainment';
  if (primary === 'MEDICAL' || primary === 'PERSONAL_CARE') return 'health';
  if (primary === 'RENT_AND_UTILITIES' || primary === 'LOAN_PAYMENTS' || detailed === 'GENERAL_SERVICES_INSURANCE') return 'bills';
  // Uncategorised money coming in is treated as income rather than negative spending.
  return amount < 0 && !primary ? 'income' : 'other';
}

function kindOf(account: AccountBase) {
  if (account.type === 'credit') return 'credit';
  if (account.type === 'loan') return 'loan';
  if (account.type === 'investment') return 'investment';
  return account.subtype === 'checking' ? 'checking' : 'savings';
}

function transactionRow(userId: string, t: Transaction) {
  const category = categoryOf(t.personal_finance_category, t.amount);
  return {
    id: t.transaction_id,
    user_id: userId,
    account_id: t.account_id,
    merchant: t.merchant_name ?? t.name,
    // The text as it appears on the bank statement, e.g. "AMAZON MKTPLACE PMTS".
    original_name: t.original_description ?? t.name,
    logo_url: t.logo_url ?? t.counterparties?.find((c) => c.logo_url)?.logo_url ?? null,
    category_detailed: t.personal_finance_category?.detailed ?? null,
    // Plaid reports money leaving the account as positive. Income is stored as a positive amount.
    amount: category === 'income' ? Math.abs(t.amount) : t.amount,
    date: t.date,
    category,
    pending: t.pending,
  };
}

function streamRow(userId: string, itemId: string, s: TransactionStream, inflow: boolean) {
  const category = inflow ? 'income' : categoryOf(s.personal_finance_category, 1);
  const last = Math.abs(s.last_amount.amount ?? 0);
  const average = Math.abs(s.average_amount.amount ?? 0);
  return {
    id: s.stream_id,
    user_id: userId,
    item_id: itemId,
    name: s.merchant_name || s.description,
    amount: last || average,
    next_date: s.predicted_next_date ?? s.last_date,
    frequency: s.frequency,
    kind: inflow ? 'income' : category === 'bills' ? 'bill' : 'subscription',
    category: inflow ? 'income' : category === 'transfer' || category === 'income' ? 'other' : category,
    approximate: Math.abs(last - average) > Math.max(0.01 * average, 0.01),
    transaction_ids: s.transaction_ids,
  };
}

/** Pulls every page of changes since the stored cursor. Restarts once if Plaid's data changes mid-way. */
async function pullTransactions(plaid: PlaidApi, item: Item, retry = true): Promise<{
  added: Transaction[];
  modified: Transaction[];
  removed: string[];
  cursor: string | null;
}> {
  const added: Transaction[] = [];
  const modified: Transaction[] = [];
  const removed: string[] = [];
  let cursor = item.cursor;
  try {
    for (;;) {
      const { data } = await plaid.transactionsSync({
        access_token: item.access_token,
        cursor: cursor ?? undefined,
        count: 500,
        options: { include_original_description: true },
      });
      added.push(...data.added);
      modified.push(...data.modified);
      removed.push(...data.removed.map((r) => r.transaction_id));
      cursor = data.next_cursor;
      if (!data.has_more) break;
    }
  } catch (e) {
    if (retry && plaidErrorCode(e) === 'TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION') return pullTransactions(plaid, item, false);
    throw e;
  }
  return { added, modified, removed, cursor };
}

async function chunked<T>(rows: T[], write: (batch: T[]) => PromiseLike<{ data: unknown; error: { message: string } | null }>) {
  for (let i = 0; i < rows.length; i += 500) check(await write(rows.slice(i, i + 500)));
}

export function plaidErrorCode(e: unknown) {
  return (e as { response?: { data?: { error_code?: string } } })?.response?.data?.error_code;
}

/** Errors that mean the bank wants the user to sign in again through Plaid Link. */
export const RECONNECT_CODES = ['ITEM_LOGIN_REQUIRED', 'PENDING_EXPIRATION', 'PENDING_DISCONNECT', 'INVALID_UPDATED_USERNAME'];

/** Refreshes one linked institution: balances, new and changed transactions, recurring charges. */
export async function syncItem(db: SupabaseClient, plaid: PlaidApi, userId: string, item: Item) {
  // Items linked before webhooks were configured are pointed at the current webhook address.
  const webhook = process.env.PLAID_WEBHOOK_URL || null;
  if (webhook && item.webhook !== webhook) {
    await plaid.itemWebhookUpdate({ access_token: item.access_token, webhook });
    check(await db.from('plaid_items').update({ webhook }).eq('item_id', item.item_id));
  }

  const { data: balances } = await plaid.accountsGet({ access_token: item.access_token });
  const now = new Date().toISOString();
  check(
    await db.from('accounts').upsert(
      balances.accounts.map((a) => ({
        id: a.account_id,
        user_id: userId,
        item_id: item.item_id,
        name: a.name,
        institution: item.institution_name ?? 'Bank',
        mask: a.mask ?? '',
        kind: kindOf(a),
        balance: a.balances.current ?? 0,
        updated_at: now,
      })),
    ),
  );

  const changes = await pullTransactions(plaid, item);
  await chunked(
    [...changes.added, ...changes.modified].map((t) => transactionRow(userId, t)),
    (batch) => db.from('transactions').upsert(batch),
  );
  // A pending transaction is replaced by a new one when it posts. Carry the user's edits and splits over
  // before the pending row (and everything that cascades from it) is deleted.
  const postedFrom = new Map(changes.added.filter((t) => t.pending_transaction_id).map((t) => [t.pending_transaction_id!, t.transaction_id]));
  if (postedFrom.size) {
    for (const table of ['transaction_edits', 'transaction_splits']) {
      const touched = new Set<string>();
      await chunked([...postedFrom.keys()], async (batch) => {
        const result = await db.from(table).select('transaction_id').eq('user_id', userId).in('transaction_id', batch);
        for (const row of (result.data ?? []) as { transaction_id: string }[]) touched.add(row.transaction_id);
        return result;
      });
      for (const pendingId of touched) {
        check(await db.from(table).update({ transaction_id: postedFrom.get(pendingId) }).eq('user_id', userId).eq('transaction_id', pendingId));
      }
    }
  }
  await chunked(changes.removed, (batch) => db.from('transactions').delete().eq('user_id', userId).in('id', batch));
  check(await db.from('plaid_items').update({ cursor: changes.cursor, login_required: false, last_synced_at: now }).eq('item_id', item.item_id));

  // Recurring detection needs some history, so a new item can fail here. That is not an error for the sync.
  try {
    const { data } = await plaid.transactionsRecurringGet({ access_token: item.access_token });
    const rows = [
      ...data.outflow_streams.filter((s) => s.is_active).map((s) => streamRow(userId, item.item_id, s, false)),
      ...data.inflow_streams.filter((s) => s.is_active && s.personal_finance_category?.primary === 'INCOME').map((s) => streamRow(userId, item.item_id, s, true)),
    ];
    check(await db.from('recurring').delete().eq('item_id', item.item_id));
    if (rows.length) check(await db.from('recurring').upsert(rows));
  } catch (e) {
    console.warn('recurring skipped', (e as { response?: { data?: unknown } })?.response?.data ?? e);
  }

  return changes.added.length + changes.modified.length;
}

/** Records today's net worth from the stored balances. */
export async function recordNetWorth(db: SupabaseClient, userId: string) {
  const accounts = check(await db.from('accounts').select('kind, balance').eq('user_id', userId)) as { kind: string; balance: number }[];
  if (!accounts.length) return;
  const value = accounts.reduce((t, a) => t + (a.kind === 'credit' || a.kind === 'loan' ? -a.balance : Number(a.balance)), 0);
  check(await db.from('net_worth_snapshots').upsert({ user_id: userId, day: new Date().toISOString().slice(0, 10), value }));
}

/**
 * Syncs all of a user's institutions side by side and records today's net worth. A bank that needs the user
 * to sign in again is flagged for reconnection and does not stop the others.
 */
export async function syncUser(db: SupabaseClient, plaid: PlaidApi, userId: string) {
  const items = check(await db.from('plaid_items').select(ITEM_COLUMNS).eq('user_id', userId)) as Item[];
  const results = await Promise.allSettled(items.map((item) => syncItem(db, plaid, userId, item)));

  let changed = 0;
  let failure: unknown = null;
  const reconnect: string[] = [];
  for (const [i, result] of results.entries()) {
    if (result.status === 'fulfilled') {
      changed += result.value;
    } else if (RECONNECT_CODES.includes(plaidErrorCode(result.reason) ?? '')) {
      reconnect.push(items[i].item_id);
    } else {
      failure ??= result.reason;
    }
  }
  if (reconnect.length) check(await db.from('plaid_items').update({ login_required: true }).in('item_id', reconnect));

  await recordNetWorth(db, userId);
  if (failure) throw failure;
  return { items: items.length, changed, reconnect: reconnect.length };
}
