import { createContext, use, useEffect, useRef, useState, type ReactNode } from 'react';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { addDays, addMonths, monthShort } from '@/lib/format';
import { openPlaidLink } from '@/lib/plaid-link';
import { supabase } from '@/lib/supabase';

import * as mock from './mock';
import { categories, type Account, type Category, type CategoryId, type Recurring, type Transaction } from './mock';

export const PERIODS = ['Week', 'Month', 'Quarter', 'Year'] as const;
export type Period = (typeof PERIODS)[number];
export const RANGES = ['1M', '3M', '6M', '1Y', 'All'] as const;
export type Range = (typeof RANGES)[number];

export type Bucket = { label: string; income: number; spend: number; byCategory: { category: Category; amount: number }[] };

/** Everything the screens read. Built from sample data or from the signed-in user's bank data. */
export type Finance = {
  user: { firstName: string; fullName: string; email: string };
  accounts: Account[];
  totals: typeof mock.totals;
  /** Newest first. */
  transactions: Transaction[];
  /** Only the current month, for budgets. */
  monthTransactions: Transaction[];
  recurring: Recurring[];
  currentIncome: number;
  currentSpend: number;
  expectedIncome: number;
  /** Income and spending per period, oldest first. */
  periods: Record<Period, Bucket[]>;
  lastMonthCumulative: number[];
  thisMonthCumulative: number[];
  netWorthRange: (range: Range) => number[];
  netWorthMonthChange: number;
  budgets: typeof mock.budgets;
  spentInMonth: (category: CategoryId, monthOffset: number) => number;
  /** Null for bank data: Plaid does not provide a credit score. */
  creditScore: typeof mock.creditScore | null;
};

export type Institution = { itemId: string; name: string; accounts: number };

type FinanceState = Finance & {
  /** `sample` means no backend is configured. `empty` means signed in with nothing linked yet. */
  status: 'sample' | 'loading' | 'empty' | 'ready';
  institutions: Institution[];
  busy: boolean;
  error: string | null;
  connectBank: () => Promise<void>;
  removeInstitution: (itemId: string) => Promise<void>;
  refresh: () => Promise<void>;
};

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

// ---------------------------------------------------------------------------------------------
// Sample data

const SAMPLE_SCALE: Record<Period, number> = { Week: 0.23, Month: 1, Quarter: 3, Year: 12 };
const SAMPLE_POINTS: Record<Range, number> = { '1M': 2, '3M': 4, '6M': 7, '1Y': 12, All: 12 };

function sampleFinance(): Finance {
  const now = new Date();
  const mixTotal = mock.spendByCategory.reduce((t, c) => t + c.amount, 0);
  // Earlier periods reuse the current category mix, scaled to that period's total.
  const periods = Object.fromEntries(
    PERIODS.map((period) => [
      period,
      mock.history.map((h, i) => {
        const spend = h.spend * SAMPLE_SCALE[period];
        return {
          label: periodLabel(period, mock.history.length - 1 - i, now),
          income: h.income * SAMPLE_SCALE[period],
          spend,
          byCategory: mock.spendByCategory.map((c) => ({ ...c, amount: (c.amount / mixTotal) * spend })),
        };
      }),
    ]),
  ) as Record<Period, Bucket[]>;
  const history = mock.netWorthHistory;

  return {
    user: mock.user,
    accounts: mock.accounts,
    totals: mock.totals,
    transactions: mock.transactions,
    monthTransactions: mock.transactions,
    recurring: mock.recurring,
    currentIncome: mock.currentIncome,
    currentSpend: mock.currentSpend,
    expectedIncome: 4800,
    periods,
    lastMonthCumulative: mock.lastMonthCumulative,
    thisMonthCumulative: mock.thisMonthCumulative,
    netWorthRange: (range) => history.slice(-SAMPLE_POINTS[range]),
    netWorthMonthChange: history[history.length - 1] - history[history.length - 2],
    budgets: mock.budgets,
    // Past months are sample data too: the same spending, slightly varied.
    spentInMonth: (category, monthOffset) =>
      mock.transactions.filter((t) => t.category === category).reduce((t, x) => t + x.amount, 0) * (1 + monthOffset * 0.04),
    creditScore: mock.creditScore,
  };
}

// ---------------------------------------------------------------------------------------------
// Bank data

type Rows = {
  accounts: { id: string; item_id: string; name: string; institution: string; mask: string; kind: Account['kind']; balance: number }[];
  transactions: { id: string; account_id: string; merchant: string; amount: number; date: string; category: string; pending: boolean }[];
  recurring: {
    id: string;
    name: string;
    amount: number;
    next_date: string | null;
    frequency: string;
    kind: Recurring['kind'];
    category: string;
    approximate: boolean;
  }[];
  snapshots: { day: string; value: number }[];
};

const NO_ROWS: Rows = { accounts: [], transactions: [], recurring: [], snapshots: [] };
const RANGE_DAYS: Record<Range, number> = { '1M': 30, '3M': 90, '6M': 180, '1Y': 365, All: Infinity };
const BUCKETS: Record<Period, number> = { Week: 6, Month: 6, Quarter: 4, Year: 2 };
const AVATAR_COLORS = ['#1E8E6E', '#2F7BE5', '#E0393E', '#6A3FD1', '#2452A6', '#B81D24', '#7A2E9E', '#C2551B', '#111111'];
const DAY = 86_400_000;

const localDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const daysBetween = (from: Date, to: Date) => Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY);
const asCategory = (id: string): CategoryId => (id in categories ? (id as CategoryId) : 'other');

function periodStart(period: Period, stepsBack: number, now: Date) {
  if (period === 'Week') return addDays(startOfDay(now), -now.getDay() - 7 * stepsBack);
  if (period === 'Month') return addMonths(now, -stepsBack);
  if (period === 'Quarter') return addMonths(new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1), -3 * stepsBack);
  return new Date(now.getFullYear() - stepsBack, 0, 1);
}

/** Rolls a predicted charge date forward until it is today or later. */
function nextDue(iso: string | null, frequency: string, today: Date) {
  if (!iso) return null;
  let date = localDate(iso);
  for (let i = 0; date < today && i < 400; i++) {
    if (frequency === 'WEEKLY') date = addDays(date, 7);
    else if (frequency === 'BIWEEKLY') date = addDays(date, 14);
    else if (frequency === 'SEMI_MONTHLY') date = addDays(date, 15);
    else date = new Date(date.getFullYear(), date.getMonth() + (frequency === 'ANNUALLY' ? 12 : 1), date.getDate());
  }
  return daysBetween(today, date);
}

function bankFinance(rows: Rows, user: Finance['user']): Finance {
  const now = new Date();
  const today = startOfDay(now);
  const sum = (kinds: Account['kind'][]) =>
    rows.accounts.filter((a) => kinds.includes(a.kind)).reduce((t, a) => t + Number(a.balance), 0);
  const assets = sum(['checking', 'savings', 'investment']);
  const debt = sum(['credit', 'loan']);
  const accountName = new Map(rows.accounts.map((a) => [a.id, a.name]));

  const dated = rows.transactions.map((t) => ({
    date: localDate(t.date),
    tx: {
      id: t.id,
      merchant: t.merchant,
      amount: Number(t.amount),
      daysAgo: Math.max(daysBetween(localDate(t.date), today), 0),
      category: asCategory(t.category),
      account: accountName.get(t.account_id) ?? '',
      pending: t.pending,
    } satisfies Transaction,
  }));
  const isSpend = (t: Transaction) => t.category !== 'income' && t.category !== 'transfer';
  const between = (start: Date, end: Date) => dated.filter((d) => d.date >= start && d.date < end).map((d) => d.tx);

  const bucket = (label: string, start: Date, end: Date): Bucket => {
    const txs = between(start, end);
    const spending = txs.filter(isSpend);
    return {
      label,
      income: txs.filter((t) => t.category === 'income').reduce((t, x) => t + x.amount, 0),
      spend: spending.reduce((t, x) => t + x.amount, 0),
      byCategory: (Object.keys(categories) as CategoryId[])
        .map((id) => ({ category: categories[id], amount: spending.filter((t) => t.category === id).reduce((t, x) => t + x.amount, 0) }))
        .filter((c) => c.amount > 0)
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
    const spending = between(monthStart, addMonths(monthStart, 1))
      .filter(isSpend)
      .map((t) => ({ day: addDays(today, -t.daysAgo).getDate(), amount: t.amount }));
    let running = 0;
    return Array.from({ length: days }, (_, i) => (running += spending.filter((s) => s.day === i + 1).reduce((t, s) => t + s.amount, 0)));
  };
  const monthStart = addMonths(now, 0);
  const thisMonthCumulative = cumulative(monthStart, now.getDate());
  const lastMonthDays = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  const lastMonthCumulative = cumulative(addMonths(now, -1), lastMonthDays);
  // Keeps "this point last month" defined on the 31st after a 30-day month.
  while (lastMonthCumulative.length < thisMonthCumulative.length) lastMonthCumulative.push(lastMonthCumulative[lastMonthCumulative.length - 1] ?? 0);

  const earlierIncome = months.slice(0, -1).map((m) => m.income).filter((v) => v > 0);
  const averageIncome = earlierIncome.reduce((t, v) => t + v, 0) / (earlierIncome.length || 1);

  const snapshots = rows.snapshots.map((s) => ({ date: localDate(s.day), value: Number(s.value) }));
  const netWorthRange = (range: Range) => {
    const values = snapshots.filter((s) => daysBetween(s.date, today) <= RANGE_DAYS[range]).map((s) => s.value);
    if (values.length === 0) values.push(assets - debt);
    // A line needs two points; a single reading is drawn flat.
    return values.length === 1 ? [values[0], values[0]] : values;
  };
  const monthAgo = netWorthRange('1M');

  const recurring = rows.recurring
    .map((r, i): Recurring | null => {
      const dueIn = nextDue(r.next_date, r.frequency, today);
      if (dueIn === null) return null;
      return {
        id: r.id,
        name: r.name,
        amount: Number(r.amount),
        dueIn,
        kind: r.kind,
        category: asCategory(r.category),
        color: AVATAR_COLORS[i % AVATAR_COLORS.length],
        approximate: r.approximate,
        negotiable: r.kind === 'bill',
      };
    })
    .filter((r) => r !== null)
    .sort((a, b) => a.dueIn - b.dueIn);

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
    transactions: dated.map((d) => d.tx),
    monthTransactions: between(monthStart, addDays(today, 1)),
    recurring,
    currentIncome: thisMonth.income,
    currentSpend: thisMonth.spend,
    expectedIncome: Math.max(averageIncome, thisMonth.income, 1),
    periods,
    lastMonthCumulative,
    thisMonthCumulative,
    netWorthRange,
    netWorthMonthChange: monthAgo[monthAgo.length - 1] - monthAgo[0],
    budgets: mock.budgets,
    spentInMonth: (category, monthOffset) => {
      const start = addMonths(now, monthOffset);
      return between(start, addMonths(start, 1))
        .filter((t) => t.category === category)
        .reduce((t, x) => t + x.amount, 0);
    },
    creditScore: null,
  };
}

async function fetchRows(): Promise<Rows> {
  const db = supabase!;
  const all = async <T,>(table: string, columns: string, order: string, ascending: boolean) => {
    const out: T[] = [];
    // The API returns at most 1,000 rows per request.
    for (let from = 0; from < 20_000; from += 1000) {
      const { data, error } = await db.from(table).select(columns).order(order, { ascending }).order('id').range(from, from + 999);
      if (error) throw new Error(error.message);
      out.push(...(data as T[]));
      if (data.length < 1000) break;
    }
    return out;
  };
  const [accounts, transactions, recurring, snapshots] = await Promise.all([
    all<Rows['accounts'][number]>('accounts', 'id, item_id, name, institution, mask, kind, balance', 'name', true),
    all<Rows['transactions'][number]>('transactions', 'id, account_id, merchant, amount, date, category, pending', 'date', false),
    all<Rows['recurring'][number]>('recurring', 'id, name, amount, next_date, frequency, kind, category, approximate', 'name', true),
    db.from('net_worth_snapshots').select('day, value').order('day').then(({ data, error }) => {
      if (error) throw new Error(error.message);
      return data as Rows['snapshots'];
    }),
  ]);
  return { accounts, transactions, recurring, snapshots };
}

// ---------------------------------------------------------------------------------------------

const FinanceContext = createContext<FinanceState | null>(null);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const message = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong.');

export function FinanceProvider({ children }: { children: ReactNode }) {
  const { enabled, session } = useAuth();
  const userId = session?.user.id ?? null;
  // Rows are tagged with their owner so one user's data is never shown after another signs in.
  const [loaded, setLoaded] = useState<{ userId: string; rows: Rows } | null>(null);
  const rows = userId && loaded?.userId === userId ? loaded.rows : null;
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
  const finance = enabled ? bankFinance(rows ?? NO_ROWS, { firstName: fullName.split(' ')[0], fullName, email }) : sampleFinance();

  const byItem = new Map<string, Institution>();
  for (const a of rows?.accounts ?? []) {
    const entry = byItem.get(a.item_id) ?? { itemId: a.item_id, name: a.institution, accounts: 0 };
    entry.accounts += 1;
    byItem.set(a.item_id, entry);
  }

  const value: FinanceState = {
    ...finance,
    status: !enabled ? 'sample' : rows === null ? 'loading' : rows.accounts.length ? 'ready' : 'empty',
    institutions: [...byItem.values()],
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
    removeInstitution: (itemId) =>
      run(async () => {
        await api('plaid/remove-item', { itemId });
        await load();
      }),
    refresh: () =>
      run(async () => {
        await syncAndLoad();
      }),
  };

  return <FinanceContext value={value}>{children}</FinanceContext>;
}

export function useFinance() {
  const finance = use(FinanceContext);
  if (!finance) throw new Error('useFinance must be used inside FinanceProvider');
  return finance;
}
