import type Ionicons from '@expo/vector-icons/Ionicons';

// All data in this file is sample data. It is shown when the app runs without a backend configured;
// signed-in users see their own bank data instead (see finance.tsx).

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

export const user = { firstName: 'Kay', fullName: 'Kay Sample', email: 'kay@example.com' };

export type Account = {
  id: string;
  name: string;
  institution: string;
  mask: string;
  kind: 'checking' | 'savings' | 'credit' | 'investment' | 'loan';
  balance: number;
};

export const accounts: Account[] = [
  { id: 'a1', name: 'Everyday Checking', institution: 'Harbor Bank', mask: '4821', kind: 'checking', balance: 3482.17 },
  { id: 'a2', name: 'High-Yield Savings', institution: 'Harbor Bank', mask: '9034', kind: 'savings', balance: 12640.0 },
  { id: 'a3', name: 'Cashback Card', institution: 'Summit Card', mask: '1177', kind: 'credit', balance: 842.3 },
  { id: 'a4', name: 'Travel Rewards', institution: 'Northwind', mask: '6650', kind: 'credit', balance: 362.25 },
  { id: 'a5', name: 'Index Portfolio', institution: 'Fernleaf Invest', mask: '2209', kind: 'investment', balance: 48310.22 },
  { id: 'a6', name: 'Auto Loan', institution: 'Harbor Bank', mask: '7745', kind: 'loan', balance: 9870.0 },
];

const sum = (kinds: Account['kind'][]) =>
  accounts.filter((a) => kinds.includes(a.kind)).reduce((t, a) => t + a.balance, 0);

export const totals = {
  checking: sum(['checking']),
  savings: sum(['savings']),
  credit: sum(['credit']),
  investments: sum(['investment']),
  assets: sum(['checking', 'savings', 'investment']),
  debt: sum(['credit', 'loan']),
  netWorth: sum(['checking', 'savings', 'investment']) - sum(['credit', 'loan']),
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
  negotiable?: boolean;
};

export const recurring: Recurring[] = [
  { id: 'r1', name: 'Arcadia Power', amount: 59.03, dueIn: 0, kind: 'bill', category: 'bills', color: '#1E8E6E', approximate: true },
  { id: 'r2', name: 'Spotify', amount: 11.99, dueIn: 2, kind: 'subscription', category: 'entertainment', color: '#1DB954' },
  { id: 'r3', name: 'Rent', amount: 2400, dueIn: 6, kind: 'bill', category: 'bills', color: '#111111' },
  { id: 'r4', name: 'Dropbox', amount: 12.98, dueIn: 8, kind: 'subscription', category: 'shopping', color: '#2F7BE5' },
  { id: 'r5', name: 'Peloton', amount: 44, dueIn: 10, kind: 'subscription', category: 'health', color: '#E0393E' },
  { id: 'r6', name: 'Netflix', amount: 17.99, dueIn: 12, kind: 'subscription', category: 'entertainment', color: '#B81D24' },
  { id: 'r7', name: 'Verizon', amount: 85, dueIn: 14, kind: 'bill', category: 'bills', color: '#1A1A1A', negotiable: true },
  { id: 'r8', name: 'Xfinity', amount: 79.99, dueIn: 17, kind: 'bill', category: 'bills', color: '#6A3FD1', negotiable: true },
  { id: 'r9', name: 'Geico', amount: 132.4, dueIn: 19, kind: 'bill', category: 'auto', color: '#2452A6', negotiable: true },
  { id: 'r10', name: 'Hulu', amount: 9.99, dueIn: 21, kind: 'subscription', category: 'entertainment', color: '#1CB26B' },
  { id: 'r11', name: 'Planet Fitness', amount: 24.99, dueIn: 23, kind: 'subscription', category: 'health', color: '#7A2E9E' },
  { id: 'r12', name: 'iCloud+', amount: 2.99, dueIn: 25, kind: 'subscription', category: 'shopping', color: '#4B9BEA' },
  { id: 'r13', name: 'The Daily Ledger', amount: 17, dueIn: 27, kind: 'subscription', category: 'entertainment', color: '#333333' },
];

export type Transaction = {
  id: string;
  merchant: string;
  /** Positive amounts are spending; income uses the `income` category. */
  amount: number;
  daysAgo: number;
  category: CategoryId;
  account: string;
  pending?: boolean;
};

export const transactions: Transaction[] = [
  { id: 't1', merchant: 'Blue Bottle Coffee', amount: 6.75, daysAgo: 0, category: 'dining', account: 'Cashback Card', pending: true },
  { id: 't2', merchant: 'Trader Joe’s', amount: 84.12, daysAgo: 0, category: 'groceries', account: 'Cashback Card' },
  { id: 't3', merchant: 'Lyft', amount: 18.4, daysAgo: 1, category: 'auto', account: 'Travel Rewards' },
  { id: 't4', merchant: 'Sweetgreen', amount: 15.9, daysAgo: 1, category: 'dining', account: 'Cashback Card' },
  { id: 't5', merchant: 'Acme Corp Payroll', amount: 2400, daysAgo: 2, category: 'income', account: 'Everyday Checking' },
  { id: 't6', merchant: 'Amazon', amount: 62.48, daysAgo: 2, category: 'shopping', account: 'Cashback Card' },
  { id: 't7', merchant: 'Shell', amount: 48.2, daysAgo: 3, category: 'auto', account: 'Cashback Card' },
  { id: 't8', merchant: 'Netflix', amount: 17.99, daysAgo: 4, category: 'entertainment', account: 'Cashback Card' },
  { id: 't9', merchant: 'Whole Foods', amount: 112.67, daysAgo: 5, category: 'groceries', account: 'Cashback Card' },
  { id: 't10', merchant: 'Chipotle', amount: 13.25, daysAgo: 5, category: 'dining', account: 'Cashback Card' },
  { id: 't11', merchant: 'CVS Pharmacy', amount: 27.6, daysAgo: 6, category: 'health', account: 'Everyday Checking' },
  { id: 't12', merchant: 'Verizon', amount: 85, daysAgo: 7, category: 'bills', account: 'Everyday Checking' },
  { id: 't13', merchant: 'AMC Theatres', amount: 31.5, daysAgo: 8, category: 'entertainment', account: 'Travel Rewards' },
  { id: 't14', merchant: 'Target', amount: 96.34, daysAgo: 9, category: 'shopping', account: 'Cashback Card' },
  { id: 't15', merchant: 'Xfinity', amount: 79.99, daysAgo: 10, category: 'bills', account: 'Everyday Checking' },
  { id: 't16', merchant: 'Delta Air Lines', amount: 286, daysAgo: 11, category: 'travel', account: 'Travel Rewards' },
  { id: 't17', merchant: 'Trader Joe’s', amount: 71.03, daysAgo: 12, category: 'groceries', account: 'Cashback Card' },
  { id: 't18', merchant: 'Geico', amount: 132.4, daysAgo: 13, category: 'auto', account: 'Everyday Checking' },
  { id: 't19', merchant: 'The Local Taproom', amount: 42.8, daysAgo: 14, category: 'dining', account: 'Cashback Card' },
  { id: 't20', merchant: 'Acme Corp Payroll', amount: 2400, daysAgo: 16, category: 'income', account: 'Everyday Checking' },
  { id: 't21', merchant: 'Peloton', amount: 44, daysAgo: 17, category: 'health', account: 'Cashback Card' },
  { id: 't22', merchant: 'Uniqlo', amount: 74.9, daysAgo: 18, category: 'shopping', account: 'Cashback Card' },
  { id: 't23', merchant: 'Safeway', amount: 58.21, daysAgo: 20, category: 'groceries', account: 'Cashback Card' },
  { id: 't24', merchant: 'Ramen House', amount: 36.4, daysAgo: 21, category: 'dining', account: 'Travel Rewards' },
  { id: 't25', merchant: 'Rent', amount: 2400, daysAgo: 24, category: 'bills', account: 'Everyday Checking' },
  { id: 't26', merchant: 'Arcadia Power', amount: 61.18, daysAgo: 26, category: 'bills', account: 'Everyday Checking' },
  { id: 't27', merchant: 'Spotify', amount: 11.99, daysAgo: 27, category: 'entertainment', account: 'Cashback Card' },
];

const spendTx = transactions.filter((t) => t.category !== 'income');

export const currentIncome = transactions
  .filter((t) => t.category === 'income')
  .reduce((t, x) => t + x.amount, 0);
export const currentSpend = spendTx.reduce((t, x) => t + x.amount, 0);

export const spendByCategory = (Object.keys(categories) as CategoryId[])
  .filter((id) => id !== 'income')
  .map((id) => ({
    category: categories[id],
    amount: spendTx.filter((t) => t.category === id).reduce((t, x) => t + x.amount, 0),
  }))
  .filter((c) => c.amount > 0)
  .sort((a, b) => b.amount - a.amount);

/** Earlier periods, oldest first. The current period is appended from the transactions above. */
export const history = [
  { income: 4800, spend: 4310 },
  { income: 4800, spend: 4705 },
  { income: 5150, spend: 4120 },
  { income: 4800, spend: 4560 },
  { income: 4800, spend: 4388 },
  { income: currentIncome, spend: currentSpend },
];

/** Running spend by day of month, for the dashboard comparison chart. */
export const lastMonthCumulative = [
  2400, 2440, 2512, 2530, 2655, 2700, 2790, 2875, 2910, 3040, 3120, 3150, 3290, 3345, 3400, 3520, 3580, 3660, 3700,
  3815, 3890, 3930, 4010, 4090, 4150, 4230, 4290, 4340, 4388,
];

export const thisMonthCumulative = (() => {
  const days = 28;
  const out: number[] = [];
  let running = 0;
  for (let d = days - 1; d >= 0; d--) {
    running += spendTx.filter((t) => t.daysAgo === d).reduce((t, x) => t + x.amount, 0);
    out.push(running);
  }
  return out;
})();

/** Twelve monthly net worth readings ending at the current value. */
export const netWorthHistory = [
  46210, 46980, 47350, 48120, 49400, 50150, 50890, 50420, 50380, 51240, 52460,
  Math.round(totals.netWorth),
];

export const budgets: { category: CategoryId; limit: number }[] = [
  { category: 'groceries', limit: 450 },
  { category: 'dining', limit: 200 },
  { category: 'shopping', limit: 250 },
  { category: 'auto', limit: 260 },
  { category: 'entertainment', limit: 90 },
  { category: 'health', limit: 120 },
];

export const creditScore = {
  score: 742,
  change: 6,
  rating: 'Very good',
  factors: [
    { label: 'Payment history', value: '100%', status: 'Excellent' },
    { label: 'Credit usage', value: '9%', status: 'Excellent' },
    { label: 'Credit age', value: '5 yrs 2 mos', status: 'Fair' },
    { label: 'Total accounts', value: '7', status: 'Good' },
    { label: 'Hard inquiries', value: '1', status: 'Good' },
  ],
};
