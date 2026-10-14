const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function group(n: number) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function money(value: number, opts: { cents?: boolean } = {}) {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (opts.cents === false) return `${sign}$${group(Math.round(abs))}`;
  const [whole, frac] = abs.toFixed(2).split('.');
  if (opts.cents === undefined && frac === '00') return `${sign}$${group(Number(whole))}`;
  return `${sign}$${group(Number(whole))}.${frac}`;
}

export function compactMoney(value: number) {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(abs >= 10000 ? 1 : 2).replace(/\.?0+$/, '')}k`;
  return `${sign}$${Math.round(abs)}`;
}

export function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export const monthShort = (d: Date) => MONTHS[d.getMonth()];
export const monthLong = (d: Date) => MONTHS_LONG[d.getMonth()];
export const dayShort = (d: Date) => DAYS[d.getDay()];
export const dayNames = DAYS;

export function relativeDue(days: number) {
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `in ${days} days`;
}

export function dayHeading(daysAgo: number, today = new Date()) {
  if (daysAgo === 0) return 'Today';
  if (daysAgo === 1) return 'Yesterday';
  const d = addDays(today, -daysAgo);
  return `${dayShort(d)}, ${monthShort(d)} ${d.getDate()}`;
}

export function longDate(d: Date) {
  return `${monthLong(d)} ${d.getDate()}`;
}

/** A local calendar date as YYYY-MM-DD. */
export function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Parses YYYY-MM-DD as a local date, not UTC midnight. */
export function parseDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** "October 13", with the year added when it is not this year. */
export function fullDate(iso: string, today = new Date()) {
  const d = parseDate(iso);
  return d.getFullYear() === today.getFullYear() ? longDate(d) : `${longDate(d)}, ${d.getFullYear()}`;
}

export function timeAgo(iso: string, now = new Date()) {
  const minutes = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? 'day' : 'days'} ago`;
}
