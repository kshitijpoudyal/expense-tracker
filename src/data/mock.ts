// All data in this file is sample data. It is shown when the app runs without a backend configured;
// signed-in users see their own bank data instead (see finance.tsx). It is built in the same shape as the
// Supabase tables, with dates relative to today, so it goes through the same code as real data.

import { addDays, isoDate } from '@/lib/format';

import type { Account, CategoryId, Rows } from './types';

export const user = { firstName: 'Kay', fullName: 'Kay Sample', email: 'kay@example.com' };

const accounts: Account[] = [
  { id: 'a1', name: 'Everyday Checking', institution: 'Harbor Bank', mask: '4821', kind: 'checking', balance: 3482.17 },
  { id: 'a2', name: 'High-Yield Savings', institution: 'Harbor Bank', mask: '9034', kind: 'savings', balance: 12640.0 },
  { id: 'a3', name: 'Cashback Card', institution: 'Summit Card', mask: '1177', kind: 'credit', balance: 842.3 },
  { id: 'a4', name: 'Travel Rewards', institution: 'Northwind', mask: '6650', kind: 'credit', balance: 362.25 },
  { id: 'a5', name: 'Index Portfolio', institution: 'Fernleaf Invest', mask: '2209', kind: 'investment', balance: 48310.22 },
  { id: 'a6', name: 'Auto Loan', institution: 'Harbor Bank', mask: '7745', kind: 'loan', balance: 9870.0 },
];

/** One month of activity. Earlier months repeat it with small changes in amount. */
const month: { merchant: string; description: string; amount: number; daysAgo: number; category: CategoryId; account: string; pending?: boolean }[] = [
  { merchant: 'Blue Bottle Coffee', description: 'BLUE BOTTLE COFFEE #0412', amount: 6.75, daysAgo: 0, category: 'dining', account: 'a3', pending: true },
  { merchant: 'Trader Joe’s', description: 'TRADER JOE S #552 QPS', amount: 84.12, daysAgo: 0, category: 'groceries', account: 'a3' },
  { merchant: 'Lyft', description: 'LYFT *RIDE TUE 8PM', amount: 18.4, daysAgo: 1, category: 'auto', account: 'a4' },
  { merchant: 'Sweetgreen', description: 'SWEETGREEN MISSION', amount: 15.9, daysAgo: 1, category: 'dining', account: 'a3' },
  { merchant: 'Acme Corp Payroll', description: 'ACME CORP PAYROLL PPD ID: 9921', amount: 2400, daysAgo: 2, category: 'income', account: 'a1' },
  { merchant: 'Amazon', description: 'AMAZON MKTPLACE PMTS', amount: 62.48, daysAgo: 2, category: 'shopping', account: 'a3' },
  { merchant: 'Shell', description: 'SHELL OIL 57444', amount: 48.2, daysAgo: 3, category: 'auto', account: 'a3' },
  { merchant: 'Netflix', description: 'NETFLIX.COM', amount: 17.99, daysAgo: 4, category: 'entertainment', account: 'a3' },
  { merchant: 'Whole Foods', description: 'WHOLEFDS MKT 10233', amount: 112.67, daysAgo: 5, category: 'groceries', account: 'a3' },
  { merchant: 'Chipotle', description: 'CHIPOTLE 2291', amount: 13.25, daysAgo: 5, category: 'dining', account: 'a3' },
  { merchant: 'CVS Pharmacy', description: 'CVS/PHARMACY #10432', amount: 27.6, daysAgo: 6, category: 'health', account: 'a1' },
  { merchant: 'Verizon', description: 'VZWRLSS*APOCC VISB', amount: 85, daysAgo: 7, category: 'bills', account: 'a1' },
  { merchant: 'AMC Theatres', description: 'AMC 1234 ONLINE', amount: 31.5, daysAgo: 8, category: 'entertainment', account: 'a4' },
  { merchant: 'Target', description: 'TARGET 00027821', amount: 96.34, daysAgo: 9, category: 'shopping', account: 'a3' },
  { merchant: 'Xfinity', description: 'COMCAST XFINITY', amount: 79.99, daysAgo: 10, category: 'bills', account: 'a1' },
  { merchant: 'Delta Air Lines', description: 'DELTA AIR 0062341', amount: 286, daysAgo: 11, category: 'travel', account: 'a4' },
  { merchant: 'Trader Joe’s', description: 'TRADER JOE S #552 QPS', amount: 71.03, daysAgo: 12, category: 'groceries', account: 'a3' },
  { merchant: 'Geico', description: 'GEICO *AUTO', amount: 132.4, daysAgo: 13, category: 'auto', account: 'a1' },
  { merchant: 'The Local Taproom', description: 'SQ *THE LOCAL TAPROOM', amount: 42.8, daysAgo: 14, category: 'dining', account: 'a3' },
  { merchant: 'Acme Corp Payroll', description: 'ACME CORP PAYROLL PPD ID: 9921', amount: 2400, daysAgo: 16, category: 'income', account: 'a1' },
  { merchant: 'Peloton', description: 'PELOTON* MEMBERSHIP', amount: 44, daysAgo: 17, category: 'health', account: 'a3' },
  { merchant: 'Uniqlo', description: 'UNIQLO USA LLC', amount: 74.9, daysAgo: 18, category: 'shopping', account: 'a3' },
  { merchant: 'Safeway', description: 'SAFEWAY #1711', amount: 58.21, daysAgo: 20, category: 'groceries', account: 'a3' },
  { merchant: 'Ramen House', description: 'TST* RAMEN HOUSE', amount: 36.4, daysAgo: 21, category: 'dining', account: 'a4' },
  { merchant: 'Rent', description: 'ZELLE PAYMENT TO OAK PROPERTY MGMT', amount: 2400, daysAgo: 24, category: 'bills', account: 'a1' },
  { merchant: 'Arcadia Power', description: 'ARCADIA POWER INC', amount: 61.18, daysAgo: 26, category: 'bills', account: 'a1' },
  { merchant: 'Spotify', description: 'SPOTIFY USA', amount: 11.99, daysAgo: 27, category: 'entertainment', account: 'a3' },
  { merchant: 'Card payment', description: 'PAYMENT THANK YOU-MOBILE', amount: -950, daysAgo: 8, category: 'transfer', account: 'a3' },
];

const recurring: { name: string; amount: number; dueIn: number; kind: 'subscription' | 'bill'; category: CategoryId; approximate?: boolean }[] = [
  { name: 'Arcadia Power', amount: 59.03, dueIn: 0, kind: 'bill', category: 'bills', approximate: true },
  { name: 'Spotify', amount: 11.99, dueIn: 2, kind: 'subscription', category: 'entertainment' },
  { name: 'Rent', amount: 2400, dueIn: 6, kind: 'bill', category: 'bills' },
  { name: 'Dropbox', amount: 12.98, dueIn: 8, kind: 'subscription', category: 'shopping' },
  { name: 'Peloton', amount: 44, dueIn: 10, kind: 'subscription', category: 'health' },
  { name: 'Netflix', amount: 17.99, dueIn: 12, kind: 'subscription', category: 'entertainment' },
  { name: 'Verizon', amount: 85, dueIn: 14, kind: 'bill', category: 'bills' },
  { name: 'Xfinity', amount: 79.99, dueIn: 17, kind: 'bill', category: 'bills' },
  { name: 'Geico', amount: 132.4, dueIn: 19, kind: 'bill', category: 'auto' },
  { name: 'Hulu', amount: 9.99, dueIn: 21, kind: 'subscription', category: 'entertainment' },
  { name: 'Planet Fitness', amount: 24.99, dueIn: 23, kind: 'subscription', category: 'health' },
  { name: 'iCloud+', amount: 2.99, dueIn: 25, kind: 'subscription', category: 'shopping' },
  { name: 'The Daily Ledger', amount: 17, dueIn: 27, kind: 'subscription', category: 'entertainment' },
];

const MONTHS_OF_HISTORY = 6;

/** Twelve monthly net worth readings, oldest first, ending just before today's value. */
const NET_WORTH = [46210, 46980, 47350, 48120, 49400, 50150, 50890, 50420, 50380, 51240, 52460];

export function sampleRows(today = new Date()): Rows {
  const day = (offset: number) => isoDate(addDays(today, offset));
  const syncedAt = new Date(today.getTime() - 11 * 60_000).toISOString();

  const transactions: Rows['transactions'] = [];
  for (let m = 0; m < MONTHS_OF_HISTORY; m++) {
    month.forEach((t, i) => {
      // A steady, repeatable wobble so earlier months differ a little without randomness.
      const wobble = m === 0 || t.category === 'income' || t.category === 'bills' ? 1 : 1 + (((i * 7 + m * 3) % 11) - 5) / 40;
      transactions.push({
        id: `t${i + 1}-${m}`,
        account_id: t.account,
        merchant: t.merchant,
        original_name: t.description,
        logo_url: null,
        amount: Math.round(t.amount * wobble * 100) / 100,
        date: day(-t.daysAgo - 30 * m),
        category: t.category,
        pending: m === 0 && !!t.pending,
      });
    });
  }
  transactions.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const idsFor = (name: string) => transactions.filter((t) => t.merchant === name).map((t) => t.id);
  const institutions = [...new Set(accounts.map((a) => a.institution))];
  const itemOf = (institution: string) => `item-${institutions.indexOf(institution) + 1}`;
  const netWorth = accounts.reduce((t, a) => t + (a.kind === 'credit' || a.kind === 'loan' ? -a.balance : a.balance), 0);

  return {
    accounts: accounts.map((a) => ({ ...a, item_id: itemOf(a.institution), updated_at: syncedAt })),
    transactions,
    recurring: [
      ...recurring.map((r, i) => ({
        id: `r${i + 1}`,
        name: r.name,
        amount: r.amount,
        next_date: day(r.dueIn),
        frequency: 'MONTHLY',
        kind: r.kind,
        category: r.category,
        approximate: !!r.approximate,
        transaction_ids: idsFor(r.name),
      })),
      {
        id: 'r-pay',
        name: 'Acme Corp Payroll',
        amount: 2400,
        next_date: day(12),
        frequency: 'BIWEEKLY',
        kind: 'income' as const,
        category: 'income',
        approximate: false,
        transaction_ids: idsFor('Acme Corp Payroll'),
      },
    ],
    snapshots: [...NET_WORTH.map((value, i) => ({ day: day(-30 * (NET_WORTH.length - i)), value })), { day: day(0), value: Math.round(netWorth) }],
    items: institutions.map((name) => ({ item_id: itemOf(name), institution_name: name, login_required: false, last_synced_at: syncedAt })),
    edits: [],
    splits: [],
    rules: [],
    budgets: [
      { category: 'groceries', amount: 450 },
      { category: 'dining', amount: 200 },
      { category: 'shopping', amount: 250 },
      { category: 'auto', amount: 260 },
      { category: 'entertainment', amount: 90 },
      { category: 'health', amount: 120 },
    ],
  };
}
