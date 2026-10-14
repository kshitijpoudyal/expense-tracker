import { categories, IGNORE_LABELS, type Transaction } from '@/data/types';

const cell = (value: string | number) => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** Transactions as a CSV file that opens in any spreadsheet app. Money in is positive, money out negative. */
export function transactionsCsv(list: Transaction[]) {
  const header = ['Date', 'Name', 'Statement description', 'Category', 'Amount', 'Account', 'Pending', 'Tags', 'Note', 'Ignored'];
  const rows = list.map((t) => [
    t.date,
    t.merchant,
    t.description,
    t.splits.length ? 'Split' : categories[t.category].name,
    (t.category === 'income' ? t.amount : -t.amount).toFixed(2),
    t.accountMask ? `${t.account} ${t.accountMask}` : t.account,
    t.pending ? 'Yes' : 'No',
    t.tags.join('; '),
    t.note,
    t.ignore === 'none' ? '' : IGNORE_LABELS[t.ignore],
  ]);
  return [header, ...rows].map((r) => r.map(cell).join(',')).join('\n');
}
