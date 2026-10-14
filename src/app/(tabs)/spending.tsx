import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Donut } from '@/components/charts';
import { Screen } from '@/components/screen';
import { Amount, Card, Divider, EmptyRow, IconBadge, ProgressBar, Row, SectionLabel, Segmented } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { PERIODS, useFinance, type Period } from '@/data/finance';
import { categories } from '@/data/types';
import { addMonths, money, monthLong } from '@/lib/format';

const BREAKDOWNS = ['Categories', 'Tags'] as const;
/** The category screen shows the last six months. */
const CATEGORY_MONTHS = 6;

export default function Spending() {
  const router = useRouter();
  const { budgets, periods, spentInMonth } = useFinance();
  const [period, setPeriod] = useState<Period>('Month');
  // Null selects the most recent bar, so switching period never leaves a stale index.
  const [picked, setPicked] = useState<number | null>(null);
  const [includeBills, setIncludeBills] = useState(true);
  const [spendOpen, setSpendOpen] = useState(false);
  const barsRef = useRef<ScrollView>(null);
  const [breakdownTab, setBreakdownTab] = useState<(typeof BREAKDOWNS)[number]>('Categories');

  const series = periods[period];
  const selected = picked !== null && picked < series.length ? picked : series.length - 1;
  const peak = Math.max(1, ...series.flatMap((s) => [s.income, s.spend]));
  const current = series[selected];

  const breakdown = current.byCategory.filter((c) => includeBills || c.category.id !== 'bills');
  const breakdownTotal = breakdown.reduce((t, c) => t + c.amount, 0);
  const tagTotal = current.byTag.reduce((t, c) => t + c.amount, 0);
  const net = current.income - current.spend;
  const verdict =
    current.income <= 0
      ? null
      : net < 0
        ? `You spent ${Math.round((-net / current.income) * 100)}% more than you earned.`
        : `You saved ${Math.round((net / current.income) * 100)}% of what you earned.`;

  // The budget follows the selected month; other periods show this month's budget.
  const monthsBack = period === 'Month' ? series.length - 1 - selected : 0;
  const budgetMonth = addMonths(new Date(), -monthsBack);
  const budgetRows = budgets.map((b) => ({ ...b, spent: spentInMonth(b.category, -monthsBack) }));
  const budgeted = budgetRows.reduce((t, b) => t + b.limit, 0);
  const budgetLeft = budgeted - budgetRows.reduce((t, b) => t + b.spent, 0);

  /** Opens the month-by-month view, starting at the selected month when it is one of the last six. */
  const open = (id: string, name?: string) => {
    const month = monthsBack < CATEGORY_MONTHS ? String(CATEGORY_MONTHS - 1 - monthsBack) : undefined;
    router.push({ pathname: '/category/[id]', params: { id, ...(name ? { name } : {}), ...(month ? { month } : {}) } });
  };
  const chevron = <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />;

  return (
    <Screen
      title="Spending"
      overlap={70}
      header={
        <View>
          <View style={styles.periods}>
            {PERIODS.map((p) => (
              <Pressable
                key={p}
                onPress={() => {
                  setPeriod(p);
                  setPicked(null);
                }}
                style={[styles.period, p === period && styles.periodActive]}>
                <Text style={[styles.periodText, p === period && styles.periodTextActive]}>{p}</Text>
              </Pressable>
            ))}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.bars}
            ref={barsRef}
            // Starts at the most recent periods, and again after switching between week, month and so on.
            onContentSizeChange={() => barsRef.current?.scrollToEnd({ animated: false })}>
            {series.map((s, i) => (
              <Pressable key={`${period}-${i}`} onPress={() => setPicked(i)} style={[styles.bar, i === selected && styles.barActive]}>
                <View style={styles.barPair}>
                  <View style={[styles.barIncome, { height: Math.max(6, (s.income / peak) * 54) }]} />
                  <View style={[styles.barSpend, { height: Math.max(6, (s.spend / peak) * 54) }]} />
                </View>
                <Text style={styles.barLabel}>{s.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.white }]} />
              <Text style={styles.legendText}>Income</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: 'rgba(255,255,255,0.45)' }]} />
              <Text style={styles.legendText}>Total Spend</Text>
            </View>
          </View>
        </View>
      }>
      <Card>
        <Row
          left={<IconBadge name="cash-outline" />}
          title="Income"
          right={
            <View style={styles.right}>
              <Amount>{money(current.income, { cents: false })}</Amount>
              {chevron}
            </View>
          }
          onPress={() => open('income')}
        />
        <Divider />
        <Row
          left={<IconBadge name="card-outline" />}
          title="Total Spend"
          right={
            <View style={styles.right}>
              <Amount>{money(current.spend, { cents: false })}</Amount>
              <Ionicons name={spendOpen ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textSecondary} />
            </View>
          }
          onPress={() => setSpendOpen((o) => !o)}
        />
        {spendOpen ? (
          <View style={styles.sub}>
            <Divider />
            <Row
              left={<IconBadge name="receipt-outline" bg="transparent" />}
              title="Bills & Utilities"
              right={
                <View style={styles.right}>
                  <Amount>{money(current.bills, { cents: false })}</Amount>
                  {chevron}
                </View>
              }
              onPress={() => open('bills')}
            />
            <Divider />
            <Row
              left={<IconBadge name="wallet-outline" bg="transparent" />}
              title="Spending"
              right={
                <View style={styles.right}>
                  <Amount>{money(current.spend - current.bills, { cents: false })}</Amount>
                  {chevron}
                </View>
              }
              onPress={() => open('spending')}
            />
          </View>
        ) : null}
        <Divider />
        <Row
          left={<IconBadge name="reorder-two-outline" />}
          title="Net Income"
          subtitle={verdict ?? undefined}
          subtitleLines={2}
          right={<Amount tone={net >= 0 ? 'positive' : undefined}>{money(net, { cents: false })}</Amount>}
        />
      </Card>

      <SectionLabel>Your budget</SectionLabel>
      <Card>
        <Row
          left={<IconBadge name="calculator-outline" />}
          title={`${monthLong(budgetMonth)} Budget`}
          right={chevron}
          onPress={() => router.push('/budget')}
        />
        <Divider />
        {budgetRows.length === 0 ? (
          <EmptyRow>No budgets yet. Open the budget to set a monthly limit per category.</EmptyRow>
        ) : (
          <View style={styles.budget}>
            <View style={{ flex: 1 }}>
              <Text style={styles.caption}>{budgetLeft >= 0 ? 'Left for spending' : 'Over spending budget'}</Text>
              <Text style={styles.budgetValue}>{money(Math.abs(budgetLeft), { cents: false })}</Text>
              <View style={{ marginTop: Spacing.md }}>
                <ProgressBar value={1 - budgetLeft / budgeted} color={budgetLeft >= 0 ? Colors.blue : Colors.accent} />
              </View>
            </View>
            <View style={styles.rings}>
              {budgetRows.slice(0, 6).map((b) => {
                const c = categories[b.category];
                const over = b.spent > b.limit;
                return (
                  <View key={b.category}>
                    <Donut
                      size={44}
                      stroke={4}
                      data={[
                        { value: Math.min(b.spent, b.limit), color: over ? Colors.accent : c.color },
                        { value: Math.max(b.limit - b.spent, 0.001), color: Colors.track },
                      ]}>
                      <Ionicons name={c.icon} size={17} color={Colors.ink} />
                    </Donut>
                    {over ? (
                      <View style={styles.alert}>
                        <Text style={styles.alertText}>!</Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </Card>

      <SectionLabel>Breakdown</SectionLabel>
      <View style={styles.tabs}>
        <Segmented options={BREAKDOWNS} value={breakdownTab} onChange={setBreakdownTab} />
      </View>
      {breakdownTab === 'Categories' ? (
        <Card>
          <View style={styles.toggle}>
            <Text style={styles.toggleText}>Include bills</Text>
            <Switch value={includeBills} onValueChange={setIncludeBills} trackColor={{ true: '#4E9A64', false: Colors.track }} thumbColor={Colors.white} />
          </View>
          <View style={styles.donut}>
            <Donut data={breakdown.map((c) => ({ value: c.amount, color: c.category.color }))} size={210}>
              <Text style={styles.donutCaption}>Total spend</Text>
              <Text style={styles.donutValue}>{money(breakdownTotal, { cents: false })}</Text>
            </Donut>
          </View>
          {breakdown.length === 0 ? <EmptyRow>No spending in this period.</EmptyRow> : null}
          {breakdown.map((c) => (
            <View key={c.category.id}>
              <Divider />
              <Row
                left={<IconBadge name={c.category.icon} bg={`${c.category.color}40`} />}
                title={c.category.name}
                subtitle={`${Math.round((c.amount / (breakdownTotal || 1)) * 100)}% of spend`}
                right={<Amount>{money(c.amount, { cents: false })}</Amount>}
                onPress={() => open(c.category.id)}
              />
            </View>
          ))}
        </Card>
      ) : (
        <Card>
          {current.byTag.length === 0 ? <EmptyRow>No tagged spending in this period. Add tags from a transaction.</EmptyRow> : null}
          {current.byTag.map((t, i) => (
            <View key={t.tag}>
              {i > 0 ? <Divider /> : null}
              <Row
                left={<IconBadge name="pricetag-outline" />}
                title={`#${t.tag}`}
                subtitle={`${Math.round((t.amount / (tagTotal || 1)) * 100)}% of tagged spend`}
                right={<Amount>{money(t.amount, { cents: false })}</Amount>}
                onPress={() => open('tag', t.tag)}
              />
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  periods: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm, marginTop: Spacing.md },
  period: { paddingHorizontal: Spacing.lg, paddingVertical: 9, borderRadius: Radius.pill, backgroundColor: 'rgba(255,255,255,0.22)' },
  periodActive: { backgroundColor: Colors.white },
  periodText: { color: Colors.white, fontSize: 15, fontWeight: '500' },
  periodTextActive: { color: Colors.ink },
  bars: { gap: Spacing.sm, paddingHorizontal: Spacing.lg, marginTop: Spacing.lg },
  bar: {
    width: 58,
    height: 104,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: Spacing.sm,
  },
  barActive: { borderWidth: 2, borderColor: Colors.white },
  barPair: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginBottom: Spacing.sm },
  barIncome: { width: 8, borderRadius: 4, backgroundColor: Colors.white },
  barSpend: { width: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.45)' },
  barLabel: { color: Colors.white, fontSize: 12, fontWeight: '600' },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.xl, marginTop: Spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: Colors.white, fontSize: 13 },
  right: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sub: { backgroundColor: Colors.background },
  caption: { fontSize: 14, color: Colors.textSecondary },
  budget: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, padding: Spacing.lg },
  budgetValue: { fontSize: 30, fontWeight: '600', color: Colors.ink, marginTop: 2, fontVariant: ['tabular-nums'] },
  rings: { flexDirection: 'row', flexWrap: 'wrap', width: 3 * 44 + 2 * Spacing.sm, gap: Spacing.sm },
  alert: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.warning,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertText: { color: Colors.white, fontSize: 12, fontWeight: '800' },
  tabs: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  toggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: Spacing.sm, padding: Spacing.lg, paddingBottom: 0 },
  toggleText: { fontSize: 14, color: Colors.textSecondary },
  donut: { alignItems: 'center', paddingVertical: Spacing.xl },
  donutCaption: { fontSize: 13, color: Colors.textSecondary },
  donutValue: { fontSize: 28, fontWeight: '600', color: Colors.ink, marginTop: 2 },
});
