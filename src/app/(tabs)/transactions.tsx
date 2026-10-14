import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Screen } from '@/components/screen';
import { OptionList, Sheet } from '@/components/sheet';
import { TransactionRow } from '@/components/transaction-row';
import { Card, Divider, PrimaryButton, SectionLabel } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useFinance } from '@/data/finance';
import { categories, categoryIds, spendOf, type CategoryId, type Transaction } from '@/data/types';
import { transactionsCsv } from '@/lib/csv';
import { isoDate, money, monthLong, parseDate } from '@/lib/format';
import { shareText } from '@/lib/share-file';

const STATUSES = ['all', 'pending', 'unreviewed', 'ignored'] as const;
type Status = (typeof STATUSES)[number];
const STATUS_LABELS: Record<Status, string> = { all: 'Any status', pending: 'Pending', unreviewed: 'Not reviewed', ignored: 'Ignored' };

type Filters = { account: string; category: 'all' | CategoryId; tag: string; status: Status };
const NO_FILTERS: Filters = { account: 'all', category: 'all', tag: 'all', status: 'all' };

function matches(t: Transaction, query: string, f: Filters) {
  if (f.account !== 'all' && t.accountId !== f.account) return false;
  if (f.category !== 'all' && t.category !== f.category && !t.splits.some((s) => s.category === f.category)) return false;
  if (f.tag !== 'all' && !t.tags.includes(f.tag)) return false;
  if (f.status === 'pending' && !t.pending) return false;
  if (f.status === 'unreviewed' && t.reviewed) return false;
  if (f.status === 'ignored' && t.ignore === 'none') return false;
  if (!query) return true;
  const text = `${t.merchant}\n${t.description}\n${t.note}\n${t.tags.join(' ')}\n${categories[t.category].name}`.toLowerCase();
  return text.includes(query);
}

export default function Transactions() {
  const { accounts, tags, transactions } = useFinance();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [filtering, setFiltering] = useState(false);
  const filtered = Object.values(filters).some((v) => v !== 'all');

  const visible = transactions.filter((t) => matches(t, query.trim().toLowerCase(), filters));
  const months: { key: string; label: string; items: Transaction[] }[] = [];
  const thisYear = new Date().getFullYear();
  for (const t of visible) {
    const key = t.date.slice(0, 7);
    if (months[months.length - 1]?.key !== key) {
      const d = parseDate(t.date);
      months.push({ key, label: d.getFullYear() === thisYear ? monthLong(d) : `${monthLong(d)} ${d.getFullYear()}`, items: [] });
    }
    months[months.length - 1].items.push(t);
  }

  return (
    <Screen
      title="Transactions"
      overlap={0}
      rightIcon="download-outline"
      onRight={() => shareText(`transactions-${isoDate(new Date())}.csv`, transactionsCsv(visible))}
      header={
        <View style={styles.header}>
          <View style={styles.search}>
            <Ionicons name="search" size={18} color={Colors.textSecondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search my transactions"
              placeholderTextColor={Colors.textMuted}
              style={styles.input}
            />
            <Pressable hitSlop={10} onPress={() => setFiltering(true)} accessibilityLabel="Filter transactions">
              <Ionicons name="options-outline" size={22} color={filtered ? Colors.accent : Colors.ink} />
              {filtered ? <View style={styles.filterDot} /> : null}
            </Pressable>
          </View>
        </View>
      }>
      {months.length === 0 ? <Text style={styles.empty}>No transactions match.</Text> : null}
      {months.map((m, index) => (
        <View key={m.key} style={index === 0 && { marginTop: -Spacing.lg }}>
          <View style={styles.monthRow}>
            <Text style={styles.month}>{m.label}</Text>
            <Text style={styles.monthTotal}>{money(m.items.reduce((t, x) => t + spendOf(x), 0), { cents: true })} total spend</Text>
          </View>
          <Card>
            {m.items.map((t, i) => (
              <View key={t.id}>
                {i > 0 ? <Divider /> : null}
                <TransactionRow transaction={t} />
              </View>
            ))}
          </Card>
        </View>
      ))}

      <Sheet visible={filtering} title="Filter" onClose={() => setFiltering(false)}>
        <SectionLabel>Status</SectionLabel>
        <OptionList
          options={STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
          value={filters.status}
          onChange={(status) => setFilters((f) => ({ ...f, status }))}
        />
        <SectionLabel>Account</SectionLabel>
        <OptionList
          options={[
            { value: 'all', label: 'All accounts' },
            ...accounts.map((a) => ({ value: a.id, label: `${a.institution} · ${a.name}${a.mask ? ` ··${a.mask}` : ''}` })),
          ]}
          value={filters.account}
          onChange={(account) => setFilters((f) => ({ ...f, account }))}
        />
        <SectionLabel>Category</SectionLabel>
        <OptionList
          options={[{ value: 'all' as const, label: 'All categories' }, ...categoryIds.map((id) => ({ value: id, label: categories[id].name }))]}
          value={filters.category}
          onChange={(category) => setFilters((f) => ({ ...f, category }))}
        />
        {tags.length ? (
          <>
            <SectionLabel>Tag</SectionLabel>
            <OptionList
              options={[{ value: 'all', label: 'Any tag' }, ...tags.map((tag) => ({ value: tag, label: `#${tag}` }))]}
              value={filters.tag}
              onChange={(tag) => setFilters((f) => ({ ...f, tag }))}
            />
          </>
        ) : null}
        <View style={styles.sheetActions}>
          <PrimaryButton label="Show results" onPress={() => setFiltering(false)} />
          {filtered ? (
            <Pressable onPress={() => setFilters(NO_FILTERS)} hitSlop={8}>
              <Text style={styles.clear}>Clear filters</Text>
            </Pressable>
          ) : null}
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingBottom: Spacing.lg },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    height: 46,
  },
  input: { flex: 1, fontSize: 15, color: Colors.text, paddingVertical: 0 },
  filterDot: { position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent },
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: Spacing.xl + 4,
    marginTop: Spacing.xxl,
    marginBottom: Spacing.md,
  },
  month: { fontSize: 15, fontWeight: '600', color: Colors.ink },
  monthTotal: { fontSize: 14, color: Colors.textSecondary, fontVariant: ['tabular-nums'] },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: Spacing.xxl, fontSize: 15 },
  sheetActions: { marginTop: Spacing.xl, gap: Spacing.lg, alignItems: 'stretch' },
  clear: { textAlign: 'center', fontSize: 15, color: Colors.ink, fontWeight: '600', textDecorationLine: 'underline' },
});
