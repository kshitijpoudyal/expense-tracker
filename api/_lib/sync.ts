import type { SupabaseClient } from '@supabase/supabase-js';
import type { AccountBase, PlaidApi, Transaction, TransactionStream } from 'plaid';

import { check } from './http';

export type Item = { item_id: string; access_token: string; institution_name: string | null; cursor: string | null };

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
    // Plaid reports money leaving the account as positive. Income is stored as a positive amount.
    amount: category === 'income' ? Math.abs(t.amount) : t.amount,
    date: t.date,
    category,
    pending: t.pending,
  };
}

function streamRow(userId: string, itemId: string, s: TransactionStream) {
  const category = categoryOf(s.personal_finance_category, 1);
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
    kind: category === 'bills' ? 'bill' : 'subscription',
    category: category === 'transfer' || category === 'income' ? 'other' : category,
    approximate: Math.abs(last - average) > Math.max(0.01 * average, 0.01),
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
      const { data } = await plaid.transactionsSync({ access_token: item.access_token, cursor: cursor ?? undefined, count: 500 });
      added.push(...data.added);
      modified.push(...data.modified);
      removed.push(...data.removed.map((r) => r.transaction_id));
      cursor = data.next_cursor;
      if (!data.has_more) break;
    }
  } catch (e) {
    const code = (e as { response?: { data?: { error_code?: string } } })?.response?.data?.error_code;
    if (retry && code === 'TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION') return pullTransactions(plaid, item, false);
    throw e;
  }
  return { added, modified, removed, cursor };
}

async function chunked<T>(rows: T[], write: (batch: T[]) => PromiseLike<{ data: unknown; error: { message: string } | null }>) {
  for (let i = 0; i < rows.length; i += 500) check(await write(rows.slice(i, i + 500)));
}

/** Refreshes one linked institution: balances, new and changed transactions, recurring charges. */
export async function syncItem(db: SupabaseClient, plaid: PlaidApi, userId: string, item: Item) {
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
  await chunked(changes.removed, (batch) => db.from('transactions').delete().eq('user_id', userId).in('id', batch));
  check(await db.from('plaid_items').update({ cursor: changes.cursor }).eq('item_id', item.item_id));

  // Recurring detection needs some history, so a new item can fail here. That is not an error for the sync.
  try {
    const { data } = await plaid.transactionsRecurringGet({ access_token: item.access_token });
    const rows = data.outflow_streams.filter((s) => s.is_active).map((s) => streamRow(userId, item.item_id, s));
    check(await db.from('recurring').delete().eq('item_id', item.item_id));
    if (rows.length) check(await db.from('recurring').upsert(rows));
  } catch (e) {
    console.warn('recurring skipped', (e as { response?: { data?: unknown } })?.response?.data ?? e);
  }

  return changes.added.length + changes.modified.length;
}

/** Syncs all of a user's institutions and records today's net worth. */
export async function syncUser(db: SupabaseClient, plaid: PlaidApi, userId: string) {
  const items = check(await db.from('plaid_items').select('item_id, access_token, institution_name, cursor').eq('user_id', userId)) as Item[];
  let changed = 0;
  for (const item of items) changed += await syncItem(db, plaid, userId, item);

  const accounts = check(await db.from('accounts').select('kind, balance').eq('user_id', userId)) as { kind: string; balance: number }[];
  if (accounts.length) {
    const value = accounts.reduce((t, a) => t + (a.kind === 'credit' || a.kind === 'loan' ? -a.balance : Number(a.balance)), 0);
    check(await db.from('net_worth_snapshots').upsert({ user_id: userId, day: new Date().toISOString().slice(0, 10), value }));
  }
  return { items: items.length, changed };
}
