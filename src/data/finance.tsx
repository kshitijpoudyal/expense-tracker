import { createContext, use, useEffect, useRef, useState, type ReactNode } from 'react';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { addDays, addMonths, isoDate, monthShort, parseDate } from '@/lib/format';
import { openPlaidLink } from '@/lib/plaid-link';
import { supabase } from '@/lib/supabase';

import * as mock from './mock';
import {
  categories,
  categoryIds,
  isSpending,
  partsOf,
  signFor,
  type Account,
  type Budget,
  type Category,
  type CategoryId,
  type Recurring,
  type Rows,
  type Rule,
  type Split,
  type Transaction,
  type TransactionPatch,
} from './types';

export const PERIODS = ['Week', 'Month', 'Quarter', 'Year'] as const;
export type Period = (typeof PERIODS)[number];
export const RANGES = ['1M', '3M', '6M', '1Y', 'All'] as const;
export type Range = (typeof RANGES)[number];

export type Bucket = {
  label: string;
  /** First day of the period, and the day after its last, as YYYY-MM-DD. */
  start: string;
  end: string;
  income: number;
  spend: number;
  /** The Bills & Utilities part of `spend`. */
  bills: number;
  byCategory: { category: Category; amount: number }[];
  byTag: { tag: string; amount: number }[];
};

export type Institution = { itemId: string; name: string; accounts: number; loginRequired: boolean };

export type Totals = {
  checking: number;
  savings: number;
  credit: number;
  investments: number;
  assets: number;
  debt: number;
  netWorth: number;
};

/** Everything the screens read. Built from sample data or from the signed-in user's bank data. */
export type Finance = {
  user: { firstName: string; fullName: string; email: string };
  accounts: Account[];
  totals: Totals;
  /** Newest first, with your edits and rules applied. */
  transactions: Transaction[];
  /** Bills and subscriptions, soonest first. */
  recurring: Recurring[];
  /** Days until the next expected paycheck, or null when no regular income is known. */
  nextPayday: number | null;
  currentIncome: number;
  currentSpend: number;
  expectedIncome: number;
  /** Income and spending per period, oldest first. */
  periods: Record<Period, Bucket[]>;
  lastMonthCumulative: number[];
  thisMonthCumulative: number[];
  netWorthRange: (range: Range) => number[];
  netWorthMonthChange: number;
  budgets: Budget[];
  rules: Rule[];
  /** Every tag in use, alphabetically. */
  tags: string[];
  /** Budget spending for a category in a month (0 is this month, -1 last month). */
  spentInMonth: (category: CategoryId, monthOffset: number) => number;
  institutions: Institution[];
  /** When the bank data was last refreshed, as an ISO timestamp. */
  lastSynced: string | null;
};

type FinanceState = Finance & {
  /** `sample` means no backend is configured. `empty` means signed in with nothing linked yet. */
  status: 'sample' | 'loading' | 'empty' | 'ready';
  busy: boolean;
  error: string | null;
  connectBank: () => Promise<void>;
  /** Opens Plaid Link for a bank that wants you to sign in again. */
  reconnect: (itemId: string) => Promise<void>;
  removeInstitution: (itemId: string) => Promise<void>;
  refresh: () => Promise<void>;
  updateTransaction: (id: string, patch: TransactionPatch) => Promise<void>;
  /** Replaces a transaction's split. An empty list removes it. */
  setSplits: (id: string, splits: Split[]) => Promise<void>;
  addRule: (rule: Omit<Rule, 'id'>) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;
  /** Sets a category's monthly budget. Null removes it. */
  setBudget: (category: CategoryId, limit: number | null) => Promise<void>;
};

// ---------------------------------------------------------------------------------------------
// Turning stored rows into what the screens show

const RANGE_DAYS: Record<Range, number> = { '1M': 30, '3M': 90, '6M': 180, '1Y': 365, All: Infinity };
const BUCKETS: Record<Period, number> = { Week: 8, Month: 12, Quarter: 4, Year: 2 };
const AVATAR_COLORS = ['#1E8E6E', '#2F7BE5', '#E0393E', '#6A3FD1', '#2452A6', '#B81D24', '#7A2E9E', '#C2551B', '#111111'];
const DAY = 86_400_000;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const daysBetween = (from: Date, to: Date) => Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY);
const asCategory = (id: string | null | undefined): CategoryId | null => (id && id in categories ? (id as CategoryId) : null);
const total = (list: { amount: number }[]) => list.reduce((t, x) => t + x.amount, 0);

function periodLabel(period: Period, stepsBack: number, now: Date) {
  if (period === 'Week') {
    const d = addDays(now, -7 * stepsBack - now.getDay());
    return `${monthShort(d)} ${d.getDate()}`;
  }
  if (period === 'Month') return monthShort(addMonths(now, -stepsBack));
  if (period === 'Quarter') {
    const d = addMonths(now, -3 * stepsBack);
    return `Q${Math.floor(d.getMonth() / 3) + 1}`;
  }
  return String(now.getFullYear() - stepsBack);
}

function periodStart(period: Period, stepsBack: number, now: Date) {
  if (period === 'Week') return addDays(startOfDay(now), -now.getDay() - 7 * stepsBack);
  if (period === 'Month') return addMonths(now, -stepsBack);
  if (period === 'Quarter') return addMonths(new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1), -3 * stepsBack);
  return new Date(now.getFullYear() - stepsBack, 0, 1);
}

/** Rolls a predicted charge date forward until it is today or later. */
function nextDue(iso: string | null, frequency: string, today: Date) {
  if (!iso) return null;
  let date = parseDate(iso);
  for (let i = 0; date < today && i < 400; i++) {
    if (frequency === 'WEEKLY') date = addDays(date, 7);
    else if (frequency === 'BIWEEKLY') date = addDays(date, 14);
    else if (frequency === 'SEMI_MONTHLY') date = addDays(date, 15);
    else date = new Date(date.getFullYear(), date.getMonth() + (frequency === 'ANNUALLY' ? 12 : 1), date.getDate());
  }
  return daysBetween(today, date);
}

function compute(rows: Rows, user: Finance['user']): Finance {
  const now = new Date();
  const today = startOfDay(now);
  const accountsById = new Map(rows.accounts.map((a) => [a.id, a]));
  const edits = new Map(rows.edits.map((e) => [e.transaction_id, e]));
  const splitsOf = new Map<string, Split[]>();
  for (const s of rows.splits) {
    splitsOf.set(s.transaction_id, [...(splitsOf.get(s.transaction_id) ?? []), { category: asCategory(s.category) ?? 'other', amount: Number(s.amount) }]);
  }
  const inStream = new Set(rows.recurring.flatMap((r) => r.transaction_ids ?? []));
  const rules: Rule[] = rows.rules.map((r) => ({ ...r, category: asCategory(r.category) }));

  const transactions = rows.transactions.map((r): Transaction => {
    const stored = asCategory(r.category) ?? 'other';
    const text = `${r.merchant}\n${r.original_name ?? ''}`.toLowerCase();
    // Newer rules come first, so they win when several rules match.
    const matching = rules.filter((rule) => text.includes(rule.match.trim().toLowerCase()));
    const ruled = <K extends 'rename' | 'category' | 'ignore'>(key: K) => matching.find((rule) => rule[key] !== null)?.[key] ?? null;
    const edit = edits.get(r.id);
    const category = asCategory(edit?.category) ?? ruled('category') ?? stored;
    const account = accountsById.get(r.account_id);
    return {
      id: r.id,
      merchant: edit?.name || ruled('rename') || r.merchant,
      bankMerchant: r.merchant,
      description: r.original_name || r.merchant,
      logoUrl: r.logo_url,
      amount: signFor(stored, category, Number(r.amount)),
      date: r.date,
      daysAgo: Math.max(daysBetween(parseDate(r.date), today), 0),
      category,
      accountId: r.account_id,
      account: account?.name ?? '',
      accountMask: account?.mask ?? '',
      institution: account?.institution ?? '',
      pending: r.pending,
      note: edit?.note ?? '',
      tags: edit?.tags ?? [],
      ignore: edit?.ignore ?? ruled('ignore') ?? 'none',
      recurring: edit?.recurring ?? inStream.has(r.id),
      reviewed: edit?.reviewed ?? false,
      splits: splitsOf.get(r.id) ?? [],
    };
  });

  // What the totals add up: one entry per transaction, or one per part of a split. Fully ignored ones are left out.
  const entries = transactions.flatMap((t) => {
    const date = parseDate(t.date);
    return partsOf(t).map((p) => ({ ...p, date, tags: t.tags, budget: t.ignore === 'none' }));
  });
  const between = (start: Date, end: Date) => entries.filter((e) => e.date >= start && e.date < end);

  const bucket = (label: string, start: Date, end: Date): Bucket => {
    const inPeriod = between(start, end);
    const spending = inPeriod.filter((e) => isSpending(e.category));
    const tagTotals = new Map<string, number>();
    for (const e of spending) for (const tag of e.tags) tagTotals.set(tag, (tagTotals.get(tag) ?? 0) + e.amount);
    return {
      label,
      start: isoDate(start),
      end: isoDate(end),
      income: total(inPeriod.filter((e) => e.category === 'income')),
      spend: total(spending),
      bills: total(spending.filter((e) => e.category === 'bills')),
      byCategory: categoryIds
        .map((id) => ({ category: categories[id], amount: total(spending.filter((e) => e.category === id)) }))
        .filter((c) => c.amount > 0)
        .sort((a, b) => b.amount - a.amount),
      byTag: [...tagTotals]
        .map(([tag, amount]) => ({ tag, amount }))
        .filter((t) => t.amount > 0)
        .sort((a, b) => b.amount - a.amount),
    };
  };
  const periods = Object.fromEntries(
    PERIODS.map((period) => [
      period,
      Array.from({ length: BUCKETS[period] }, (_, i) => {
        const back = BUCKETS[period] - 1 - i;
        const end = back === 0 ? addDays(today, 1) : periodStart(period, back - 1, now);
        return bucket(periodLabel(period, back, now), periodStart(period, back, now), end);
      }),
    ]),
  ) as Record<Period, Bucket[]>;
  const months = periods.Month;
  const thisMonth = months[months.length - 1];

  const cumulative = (monthStart: Date, days: number) => {
    const daily = new Array<number>(days).fill(0);
    for (const e of between(monthStart, addMonths(monthStart, 1))) {
      const day = e.date.getDate() - 1;
      if (isSpending(e.category) && day < days) daily[day] += e.amount;
    }
    let running = 0;
    return daily.map((v) => (running += v));
  };
  const thisMonthCumulative = cumulative(addMonths(now, 0), now.getDate());
  const lastMonthCumulative = cumulative(addMonths(now, -1), new Date(now.getFullYear(), now.getMonth(), 0).getDate());
  // Keeps "this point last month" defined on the 31st after a 30-day month.
  while (lastMonthCumulative.length < thisMonthCumulative.length) lastMonthCumulative.push(lastMonthCumulative[lastMonthCumulative.length - 1] ?? 0);

  const earlierIncome = months.slice(0, -1).map((m) => m.income).filter((v) => v > 0);
  const averageIncome = earlierIncome.reduce((t, v) => t + v, 0) / (earlierIncome.length || 1);

  const sum = (kinds: Account['kind'][]) => rows.accounts.filter((a) => kinds.includes(a.kind)).reduce((t, a) => t + Number(a.balance), 0);
  const assets = sum(['checking', 'savings', 'investment']);
  const debt = sum(['credit', 'loan']);

  const snapshots = rows.snapshots.map((s) => ({ date: parseDate(s.day), value: Number(s.value) }));
  const netWorthRange = (range: Range) => {
    const values = snapshots.filter((s) => daysBetween(s.date, today) <= RANGE_DAYS[range]).map((s) => s.value);
    if (values.length === 0) values.push(assets - debt);
    // A line needs two points; a single reading is drawn flat.
    return values.length === 1 ? [values[0], values[0]] : values;
  };
  const monthAgo = netWorthRange('1M');

  // Bills and subscriptions: Plaid's recurring streams, minus any you switched off, plus any you marked yourself.
  const byId = new Map(transactions.map((t) => [t.id, t]));
  const latestOf = (ids: string[]) =>
    ids
      .map((id) => byId.get(id))
      .filter((t) => t !== undefined)
      .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const streams = rows.recurring
    .filter((r) => r.kind !== 'income')
    .filter((r) => {
      const latest = latestOf(r.transaction_ids ?? []);
      return !latest || edits.get(latest.id)?.recurring !== false;
    })
    .map((r) => ({ id: r.id, name: r.name, amount: Number(r.amount), dueIn: nextDue(r.next_date, r.frequency, today), kind: r.kind as Recurring['kind'], category: asCategory(r.category) ?? 'other', approximate: r.approximate }));
  const marked = new Map<string, Transaction>();
  for (const t of transactions) {
    if (edits.get(t.id)?.recurring !== true || inStream.has(t.id)) continue;
    const seen = marked.get(t.merchant);
    if (!seen || seen.date < t.date) marked.set(t.merchant, t);
  }
  const yours = [...marked.values()].map((t) => ({
    id: `marked-${t.id}`,
    name: t.merchant,
    amount: Math.abs(t.amount),
    dueIn: nextDue(t.date, 'MONTHLY', today),
    kind: (t.category === 'bills' ? 'bill' : 'subscription') as Recurring['kind'],
    category: t.category,
    approximate: false,
  }));
  const recurring = [...streams, ...yours]
    .filter((r) => r.dueIn !== null)
    .map((r, i): Recurring => ({ ...r, dueIn: r.dueIn!, color: AVATAR_COLORS[i % AVATAR_COLORS.length] }))
    .sort((a, b) => a.dueIn - b.dueIn);

  const paydays = rows.recurring
    .filter((r) => r.kind === 'income')
    .map((r) => nextDue(r.next_date, r.frequency, today))
    .filter((d) => d !== null);

  const synced = [...rows.items.map((i) => i.last_synced_at), ...rows.accounts.map((a) => a.updated_at)].filter((d) => d !== null).sort();

  return {
    user,
    accounts: rows.accounts.map((a) => ({ id: a.id, name: a.name, institution: a.institution, mask: a.mask, kind: a.kind, balance: Number(a.balance) })),
    totals: {
      checking: sum(['checking']),
      savings: sum(['savings']),
      credit: sum(['credit']),
      investments: sum(['investment']),
      assets,
      debt,
      netWorth: assets - debt,
    },
    transactions,
    recurring,
    nextPayday: paydays.length ? Math.min(...paydays) : null,
    currentIncome: thisMonth.income,
    currentSpend: thisMonth.spend,
    expectedIncome: Math.max(averageIncome, thisMonth.income, 1),
    periods,
    lastMonthCumulative,
    thisMonthCumulative,
    netWorthRange,
    netWorthMonthChange: monthAgo[monthAgo.length - 1] - monthAgo[0],
    budgets: rows.budgets
      .map((b) => ({ category: asCategory(b.category), limit: Number(b.amount) }))
      .filter((b): b is Budget => b.category !== null)
      .sort((a, b) => categoryIds.indexOf(a.category) - categoryIds.indexOf(b.category)),
    rules,
    tags: [...new Set(rows.edits.flatMap((e) => e.tags ?? []))].sort((a, b) => a.localeCompare(b)),
    spentInMonth: (category, monthOffset) => {
      const start = addMonths(now, monthOffset);
      return total(between(start, addMonths(start, 1)).filter((e) => e.budget && e.category === category));
    },
    institutions: rows.items.map((item) => ({
      itemId: item.item_id,
      name: item.institution_name ?? rows.accounts.find((a) => a.item_id === item.item_id)?.institution ?? 'Bank',
      accounts: rows.accounts.filter((a) => a.item_id === item.item_id).length,
      loginRequired: item.login_required,
    })),
    lastSynced: synced[synced.length - 1] ?? null,
  };
}

// ---------------------------------------------------------------------------------------------
// Loading and saving

const NO_ROWS: Rows = { accounts: [], transactions: [], recurring: [], snapshots: [], items: [], edits: [], splits: [], rules: [], budgets: [] };

async function fetchRows(): Promise<Rows> {
  const db = supabase!;
  /** Reads a whole table. The API returns at most 1,000 rows per request. */
  const all = async <T,>(table: string, columns: string, order: [string, boolean][]) => {
    const out: T[] = [];
    for (let from = 0; from < 50_000; from += 1000) {
      let query = db.from(table).select(columns);
      for (const [column, ascending] of order) query = query.order(column, { ascending });
      const { data, error } = await query.range(from, from + 999);
      if (error) throw new Error(error.message);
      out.push(...(data as T[]));
      if (data.length < 1000) break;
    }
    return out;
  };
  type R = Rows;
  const [accounts, transactions, recurring, snapshots, items, edits, splits, rules, budgets] = await Promise.all([
    all<R['accounts'][number]>('accounts', 'id, item_id, name, institution, mask, kind, balance, updated_at', [['name', true], ['id', true]]),
    all<R['transactions'][number]>('transactions', 'id, account_id, merchant, original_name, logo_url, amount, date, category, pending', [['date', false], ['id', true]]),
    all<R['recurring'][number]>('recurring', 'id, name, amount, next_date, frequency, kind, category, approximate, transaction_ids', [['name', true], ['id', true]]),
    all<R['snapshots'][number]>('net_worth_snapshots', 'day, value', [['day', true]]),
    all<R['items'][number]>('plaid_items', 'item_id, institution_name, login_required, last_synced_at', [['item_id', true]]),
    all<R['edits'][number]>('transaction_edits', 'transaction_id, name, category, note, tags, ignore, recurring, reviewed', [['transaction_id', true]]),
    all<R['splits'][number]>('transaction_splits', 'id, transaction_id, category, amount', [['id', true]]),
    all<R['rules'][number]>('rules', 'id, match, rename, category, ignore', [['created_at', false], ['id', true]]),
    all<R['budgets'][number]>('budgets', 'category, amount', [['category', true]]),
  ]);
  return { accounts, transactions, recurring, snapshots, items, edits, splits, rules, budgets };
}

/** Random version 4 UUID, so new rows can be shown before the database confirms them. */
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

type Write = () => PromiseLike<{ error: { message: string } | null }>;

const FinanceContext = createContext<FinanceState | null>(null);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const message = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong.');

export function FinanceProvider({ children }: { children: ReactNode }) {
  const { enabled, session } = useAuth();
  const userId = session?.user.id ?? null;
  // Rows are tagged with their owner so one user's data is never shown after another signs in.
  const [loaded, setLoaded] = useState<{ userId: string; rows: Rows } | null>(null);
  // Without a backend, edits change the sample data in memory only.
  const [sample, setSample] = useState<Rows>(() => mock.sampleRows());
  const rows = !enabled ? sample : userId && loaded?.userId === userId ? loaded.rows : null;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const syncedFor = useRef<string | null>(null);

  const load = async () => {
    const next = await fetchRows();
    if (userId) setLoaded({ userId, rows: next });
    return next;
  };

  /** Runs an action with the busy flag set, turning a failure into a visible message. */
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };

  /** Shows a change straight away, then saves it. If saving fails, the stored data is loaded back. */
  const save = async (change: (rows: Rows) => Rows, write: Write) => {
    if (!enabled) return setSample(change);
    if (!userId) return;
    setLoaded((current) => (current?.userId === userId ? { userId, rows: change(current.rows) } : current));
    const { error: failed } = await write();
    if (failed) {
      setError(failed.message);
      await load().catch(() => {});
    }
  };

  const syncAndLoad = async () => {
    await api('plaid/sync');
    return load();
  };

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const first = await fetchRows();
        if (cancelled) return;
        setLoaded({ userId, rows: first });
        setError(null);
        // Stored data shows straight away; one sync per sign-in then brings it up to date.
        if (first.accounts.length && syncedFor.current !== userId) {
          syncedFor.current = userId;
          await api('plaid/sync');
          const fresh = await fetchRows();
          if (!cancelled) setLoaded({ userId, rows: fresh });
        }
      } catch (e) {
        if (!cancelled) {
          setLoaded((current) => (current?.userId === userId ? current : { userId, rows: NO_ROWS }));
          setError(message(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const metadata = session?.user.user_metadata as { full_name?: string } | undefined;
  const email = session?.user.email ?? '';
  const fullName = metadata?.full_name?.trim() || email.split('@')[0] || 'You';
  const finance = enabled ? compute(rows ?? NO_ROWS, { firstName: fullName.split(' ')[0], fullName, email }) : compute(sample, mock.user);
  const db = supabase!;

  const value: FinanceState = {
    ...finance,
    status: !enabled ? 'sample' : rows === null ? 'loading' : rows.accounts.length ? 'ready' : 'empty',
    busy,
    error,
    connectBank: () =>
      run(async () => {
        const { linkToken } = await api<{ linkToken: string }>('plaid/link-token', { platform: process.env.EXPO_OS });
        const linked = await openPlaidLink(linkToken);
        if (!linked) return;
        await api('plaid/exchange', linked);
        let next = await load();
        // A new connection's transactions can take a few seconds to become available.
        for (let i = 0; i < 5 && next.transactions.length === 0; i++) {
          await wait(4000);
          next = await syncAndLoad();
        }
      }),
    reconnect: (itemId) =>
      run(async () => {
        const { linkToken } = await api<{ linkToken: string }>('plaid/link-token', { platform: process.env.EXPO_OS, itemId });
        // Update mode keeps the same access token, so there is nothing to exchange afterwards.
        if (await openPlaidLink(linkToken)) await syncAndLoad();
      }),
    removeInstitution: (itemId) =>
      run(async () => {
        await api('plaid/remove-item', { itemId });
        await load();
      }),
    refresh: () =>
      run(async () => {
        await syncAndLoad();
      }),
    updateTransaction: (id, patch) => {
      const current = rows?.edits.find((e) => e.transaction_id === id) ?? {
        transaction_id: id,
        name: null,
        category: null,
        note: null,
        tags: [],
        ignore: null,
        recurring: null,
        reviewed: false,
      };
      const next = { ...current, ...patch };
      return save(
        (r) => ({ ...r, edits: [...r.edits.filter((e) => e.transaction_id !== id), next] }),
        () => db.from('transaction_edits').upsert({ ...next, updated_at: new Date().toISOString() }),
      );
    },
    setSplits: (id, splits) => {
      const parts = splits.map((s) => ({ id: uuid(), transaction_id: id, category: s.category, amount: s.amount }));
      return save(
        (r) => ({ ...r, splits: [...r.splits.filter((s) => s.transaction_id !== id), ...parts] }),
        async () => {
          const removed = await db.from('transaction_splits').delete().eq('transaction_id', id);
          if (removed.error || !parts.length) return removed;
          return db.from('transaction_splits').insert(parts);
        },
      );
    },
    addRule: (rule) => {
      const row = { id: uuid(), ...rule };
      return save(
        (r) => ({ ...r, rules: [row, ...r.rules] }),
        () => db.from('rules').insert(row),
      );
    },
    deleteRule: (id) =>
      save(
        (r) => ({ ...r, rules: r.rules.filter((rule) => rule.id !== id) }),
        () => db.from('rules').delete().eq('id', id),
      ),
    setBudget: (category, limit) =>
      save(
        (r) => ({
          ...r,
          budgets: [...r.budgets.filter((b) => b.category !== category), ...(limit === null ? [] : [{ category, amount: limit }])],
        }),
        () => (limit === null ? db.from('budgets').delete().eq('category', category) : db.from('budgets').upsert({ category, amount: limit })),
      ),
  };

  return <FinanceContext value={value}>{children}</FinanceContext>;
}

export function useFinance() {
  const finance = use(FinanceContext);
  if (!finance) throw new Error('useFinance must be used inside FinanceProvider');
  return finance;
}
