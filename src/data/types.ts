import type Ionicons from '@expo/vector-icons/Ionicons';

export type IconName = keyof typeof Ionicons.glyphMap;

export type CategoryId =
  | 'bills'
  | 'dining'
  | 'groceries'
  | 'shopping'
  | 'auto'
  | 'entertainment'
  | 'health'
  | 'travel'
  | 'other'
  | 'transfer'
  | 'income';

export type Category = { id: CategoryId; name: string; color: string; icon: IconName };

export const categories: Record<CategoryId, Category> = {
  bills: { id: 'bills', name: 'Bills & Utilities', color: '#7FA3D1', icon: 'receipt-outline' },
  dining: { id: 'dining', name: 'Dining & Drinks', color: '#E8A0B4', icon: 'restaurant-outline' },
  groceries: { id: 'groceries', name: 'Groceries', color: '#8FC6A4', icon: 'cart-outline' },
  shopping: { id: 'shopping', name: 'Shopping', color: '#F0C987', icon: 'bag-outline' },
  auto: { id: 'auto', name: 'Auto & Transport', color: '#7BC4CF', icon: 'car-outline' },
  entertainment: { id: 'entertainment', name: 'Entertainment', color: '#B49AE0', icon: 'film-outline' },
  health: { id: 'health', name: 'Health & Wellness', color: '#F29E7A', icon: 'fitness-outline' },
  travel: { id: 'travel', name: 'Travel', color: '#6C8CE8', icon: 'airplane-outline' },
  other: { id: 'other', name: 'Everything else', color: '#A9ABB3', icon: 'ellipsis-horizontal-circle-outline' },
  transfer: { id: 'transfer', name: 'Transfers', color: '#C8CAD0', icon: 'swap-horizontal-outline' },
  income: { id: 'income', name: 'Income', color: '#2E7D4F', icon: 'cash-outline' },
};

export const categoryIds = Object.keys(categories) as CategoryId[];

/** Income and transfers move money around; everything else counts as spending. */
export const isSpending = (category: CategoryId) => category !== 'income' && category !== 'transfer';

export type Account = {
  id: string;
  name: string;
  institution: string;
  mask: string;
  kind: 'checking' | 'savings' | 'credit' | 'investment' | 'loan';
  balance: number;
};

export type Recurring = {
  id: string;
  name: string;
  amount: number;
  /** Days from today until the next charge. */
  dueIn: number;
  kind: 'subscription' | 'bill';
  category: CategoryId;
  color: string;
  approximate?: boolean;
};

/** `budget` leaves a transaction out of budgets only; `all` leaves it out of every total. */
export type Ignore = 'none' | 'budget' | 'all';

export const IGNORE_LABELS: Record<Ignore, string> = {
  none: "Don't ignore",
  budget: 'From budget',
  all: 'From everything',
};

export type Split = { category: CategoryId; amount: number };

export type Transaction = {
  id: string;
  /** The name shown in the app: your rename, a rule's rename, or the bank's merchant name. */
  merchant: string;
  /** The merchant name as the bank reported it, before any rename. */
  bankMerchant: string;
  /** The raw text from the bank statement, e.g. "AMAZON MKTPLACE PMTS". */
  description: string;
  logoUrl: string | null;
  /** Spending is positive and refunds negative. Income is positive money coming in. */
  amount: number;
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  daysAgo: number;
  category: CategoryId;
  accountId: string;
  account: string;
  accountMask: string;
  institution: string;
  pending: boolean;
  note: string;
  tags: string[];
  ignore: Ignore;
  recurring: boolean;
  reviewed: boolean;
  /** Empty unless the transaction is split; the parts then replace it in every total. */
  splits: Split[];
};

/** Money coming in shows as positive. */
export const isInflow = (t: Pick<Transaction, 'category' | 'amount'>) => t.category === 'income' || t.amount < 0;

/**
 * Income is stored as a positive amount coming in; every other category as a positive amount going out.
 * Moving an amount across that line (say, a deposit filed under Income) flips its sign.
 */
export const signFor = (from: CategoryId, to: CategoryId, amount: number) => ((from === 'income') === (to === 'income') ? amount : -amount);

/**
 * What a transaction adds to each category: the whole amount, or one entry per part of a split.
 * Fully ignored transactions add nothing.
 */
export function partsOf(t: Transaction): Split[] {
  if (t.ignore === 'all') return [];
  if (!t.splits.length) return [{ category: t.category, amount: t.amount }];
  // Parts are stored as positive amounts and take the transaction's direction.
  const sign = Math.sign(t.amount) || 1;
  return t.splits.map((s) => ({ category: s.category, amount: signFor(t.category, s.category, sign * s.amount) }));
}

/** How much a transaction adds to spending, after splits and ignores. Refunds count as negative. */
export const spendOf = (t: Transaction) => partsOf(t).reduce((sum, p) => sum + (isSpending(p.category) ? p.amount : 0), 0);

export type Rule = { id: string; match: string; rename: string | null; category: CategoryId | null; ignore: Ignore | null };

export type Budget = { category: CategoryId; limit: number };

/** A change to a transaction. `null` clears your earlier change and goes back to the bank's value. */
export type TransactionPatch = Partial<{
  name: string | null;
  category: CategoryId | null;
  note: string | null;
  tags: string[];
  ignore: Ignore | null;
  recurring: boolean | null;
  reviewed: boolean;
}>;

/** Rows as stored in Supabase. Sample mode builds the same shape, so both run through one code path. */
export type Rows = {
  accounts: { id: string; item_id: string; name: string; institution: string; mask: string; kind: Account['kind']; balance: number; updated_at: string }[];
  transactions: {
    id: string;
    account_id: string;
    merchant: string;
    original_name: string | null;
    logo_url: string | null;
    amount: number;
    date: string;
    category: string;
    pending: boolean;
  }[];
  recurring: {
    id: string;
    name: string;
    amount: number;
    next_date: string | null;
    frequency: string;
    kind: Recurring['kind'] | 'income';
    category: string;
    approximate: boolean;
    transaction_ids: string[];
  }[];
  snapshots: { day: string; value: number }[];
  items: { item_id: string; institution_name: string | null; login_required: boolean; last_synced_at: string | null }[];
  edits: {
    transaction_id: string;
    name: string | null;
    category: string | null;
    note: string | null;
    tags: string[];
    ignore: Ignore | null;
    recurring: boolean | null;
    reviewed: boolean;
  }[];
  splits: { id: string; transaction_id: string; category: string; amount: number }[];
  rules: { id: string; match: string; rename: string | null; category: string | null; ignore: Ignore | null }[];
  budgets: { category: string; amount: number }[];
};
