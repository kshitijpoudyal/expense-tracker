import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { OptionList, Sheet } from '@/components/sheet';
import { TransactionRow } from '@/components/transaction-row';
import { Card, Divider, EmptyRow } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useFinance } from '@/data/finance';
import { categories, isSpending, partsOf, type IconName, type Split, type Transaction } from '@/data/types';
import { transactionsCsv } from '@/lib/csv';
import { addMonths, isoDate, money, monthLong, monthShort } from '@/lib/format';
import { shareText } from '@/lib/share-file';

const MONTHS = 6;
const SORTS = ['Newest', 'Oldest', 'Largest', 'Smallest'] as const;
type Sort = (typeof SORTS)[number];

/**
 * Month-by-month totals for one slice of your money, with the transactions behind them.
 * `id` is a category, `spending` (all spending except bills) or `tag` (with a `name` parameter).
 */
export default function CategoryScreen() {
  const { id, name, month } = useLocalSearchParams<{ id: string; name?: string; month?: string }>();
  const { transactions } = useFinance();
  const [selected, setSelected] = useState(() => Math.min(Math.max(Number(month ?? MONTHS - 1) || 0, 0), MONTHS - 1));
  const [sort, setSort] = useState<Sort>('Newest');
  const [sorting, setSorting] = useState(false);

  const view = describe(id, name);
  const contribution = (t: Transaction) => partsOf(t).reduce((sum, p) => sum + (view.counts(p, t) ? p.amount : 0), 0);
  const relevant = (t: Transaction) => partsOf(t).some((p) => view.counts(p, t)) || (t.ignore === 'all' && view.counts(t, t));

  const now = new Date();
  const months = Array.from({ length: MONTHS }, (_, i) => {
    const start = addMonths(now, i - (MONTHS - 1));
    const from = isoDate(start);
    const to = isoDate(addMonths(start, 1));
    const items = transactions.filter((t) => t.date >= from && t.date < to && relevant(t));
    return { start, items, total: items.reduce((sum, t) => sum + contribution(t), 0) };
  });
  const peak = Math.max(1, ...months.map((m) => Math.abs(m.total)));
  const current = months[selected];
  const sorted = [...current.items].sort((a, b) => {
    if (sort === 'Oldest') return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
    if (sort === 'Largest') return Math.abs(contribution(b)) - Math.abs(contribution(a));
    if (sort === 'Smallest') return Math.abs(contribution(a)) - Math.abs(contribution(b));
    return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
  });
  const monthsBack = MONTHS - 1 - selected;
  const heading = monthsBack === 0 ? 'This Month' : monthsBack === 1 ? 'Last Month' : `${monthLong(current.start)} ${current.start.getFullYear()}`;

  return (
    <Screen
      title={view.title}
      variant="plain"
      back
      rightIcon="download-outline"
      onRight={() => shareText(`${view.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${isoDate(current.start).slice(0, 7)}.csv`, transactionsCsv(sorted))}>
      <View style={styles.titleRow}>
        <Ionicons name={view.icon} size={22} color={Colors.ink} />
        <Text style={styles.heading}>{heading}</Text>
      </View>
      <View style={styles.chart}>
        {months.map((m, i) => {
          const active = i === selected;
          return (
            <Pressable key={i} onPress={() => setSelected(i)} style={styles.column}>
              <Text style={styles.barValue} numberOfLines={1}>
                {money(m.total, { cents: false })}
              </Text>
              <View style={[styles.bar, { height: Math.max(3, (Math.abs(m.total) / peak) * 120) }, !active && styles.barIdle]} />
              <View style={[styles.label, active && styles.labelActive]}>
                <Text style={[styles.labelText, active && styles.labelTextActive]}>
                  {monthShort(m.start)} {String(m.start.getFullYear()).slice(2)}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>TRANSACTIONS</Text>
        <Pressable onPress={() => setSorting(true)} style={styles.sort}>
          <Text style={styles.sortText}>{sort}</Text>
          <Ionicons name="chevron-down" size={16} color={Colors.ink} />
        </Pressable>
      </View>
      <Card>
        {sorted.length === 0 ? <EmptyRow>Nothing here this month.</EmptyRow> : null}
        {sorted.map((t, i) => (
          <View key={t.id}>
            {i > 0 ? <Divider /> : null}
            <TransactionRow transaction={t} subtitle={t.splits.length ? `Part of a split · ${money(Math.abs(contribution(t)), { cents: true })}` : undefined} />
          </View>
        ))}
        <Divider />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total of Transactions</Text>
          <Text style={styles.totalValue}>{money(current.total, { cents: true })}</Text>
        </View>
      </Card>

      <Sheet visible={sorting} title="Sort by" onClose={() => setSorting(false)}>
        <OptionList
          options={SORTS.map((s) => ({ value: s, label: s }))}
          value={sort}
          onChange={(s) => {
            setSort(s);
            setSorting(false);
          }}
        />
      </Sheet>
    </Screen>
  );
}

function describe(id: string, name?: string): { title: string; icon: IconName; counts: (part: Split, t: Transaction) => boolean } {
  if (id === 'spending') {
    return { title: 'Spending', icon: 'wallet-outline', counts: (p) => isSpending(p.category) && p.category !== 'bills' };
  }
  if (id === 'tag' && name) {
    return { title: `#${name}`, icon: 'pricetag-outline', counts: (p, t) => isSpending(p.category) && t.tags.includes(name) };
  }
  const category = id in categories ? categories[id as keyof typeof categories] : categories.other;
  return { title: category.name, icon: category.icon, counts: (p) => p.category === category.id };
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginHorizontal: Spacing.xl + 4, marginTop: Spacing.lg },
  heading: { fontSize: 24, fontWeight: '600', color: Colors.ink },
  chart: { flexDirection: 'row', alignItems: 'flex-end', marginHorizontal: Spacing.md, marginTop: Spacing.xl, height: 200 },
  column: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barValue: { fontSize: 12, color: Colors.text, marginBottom: 4, fontVariant: ['tabular-nums'] },
  bar: { width: '64%', borderRadius: 6, backgroundColor: Colors.blue },
  barIdle: { opacity: 0.55 },
  label: { marginTop: Spacing.sm, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.pill },
  labelActive: { backgroundColor: Colors.ink },
  labelText: { fontSize: 12, color: Colors.textSecondary },
  labelTextActive: { color: Colors.white, fontWeight: '600' },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: Spacing.xl + 4,
    marginTop: Spacing.xxl,
    marginBottom: Spacing.md,
  },
  listTitle: { fontSize: 12, letterSpacing: 1.2, color: Colors.text, fontWeight: '500' },
  sort: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.chip, borderRadius: Radius.pill, paddingHorizontal: Spacing.lg, paddingVertical: 8 },
  sortText: { fontSize: 14, color: Colors.ink, fontWeight: '500' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg },
  totalLabel: { fontSize: 15, color: Colors.textSecondary },
  totalValue: { fontSize: 18, fontWeight: '600', color: Colors.ink, fontVariant: ['tabular-nums'] },
});
