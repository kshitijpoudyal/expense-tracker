import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Donut } from '@/components/charts';
import { Screen } from '@/components/screen';
import { Card, ProgressBar, SectionLabel } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { budgets, categories, currentIncome, recurring, transactions, type IconName } from '@/data/mock';
import { addMonths, money, monthLong } from '@/lib/format';

const spentIn = (id: string) => transactions.filter((t) => t.category === id).reduce((t, x) => t + x.amount, 0);

export default function Budget() {
  const [monthOffset, setMonthOffset] = useState(0);
  const today = new Date();
  const month = addMonths(today, monthOffset);
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(daysInMonth - today.getDate() + 1, 1);

  // Past months are sample data too: the same budget, slightly varied spending.
  const vary = 1 + monthOffset * 0.04;
  const rows = budgets.map((b) => ({ ...b, spent: spentIn(b.category) * vary }));
  const budgeted = rows.reduce((t, r) => t + r.limit, 0);
  const spent = rows.reduce((t, r) => t + r.spent, 0);
  const left = budgeted - spent;

  const billsTotal = recurring.filter((r) => r.kind === 'bill').reduce((t, r) => t + r.amount, 0);
  const billsPaid = spentIn('bills');
  const expectedIncome = 4800;

  return (
    <Screen title="Budget" variant="plain" back rightIcon="ellipsis-horizontal">
      <View style={styles.monthRow}>
        <View style={styles.month}>
          <Ionicons name="calendar-outline" size={22} color={Colors.ink} />
          <Text style={styles.monthText}>
            {monthLong(month)} {month.getFullYear()}
          </Text>
        </View>
        <View style={styles.arrows}>
          <Pressable hitSlop={10} onPress={() => setMonthOffset((m) => m - 1)}>
            <Ionicons name="chevron-back" size={20} color={Colors.ink} />
          </Pressable>
          <Pressable hitSlop={10} onPress={() => setMonthOffset((m) => Math.min(m + 1, 0))} disabled={monthOffset === 0}>
            <Ionicons name="chevron-forward" size={20} color={monthOffset === 0 ? Colors.textMuted : Colors.ink} />
          </Pressable>
        </View>
      </View>

      <Card style={styles.pad}>
        <View style={styles.cardTop}>
          <Ionicons name="wallet-outline" size={26} color={Colors.ink} />
          {monthOffset === 0 && left > 0 ? (
            <View style={styles.perDay}>
              <Text style={styles.perDayText}>
                {money(left / daysLeft, { cents: false })}/day for {daysLeft}d
              </Text>
              <Ionicons name="information-circle-outline" size={18} color={Colors.positive} />
            </View>
          ) : null}
        </View>
        <Text style={styles.caption}>Spending</Text>
        <Text style={styles.headline}>
          {left >= 0 ? `${money(left, { cents: false })} left to spend` : `${money(-left, { cents: false })} over budget`}
        </Text>
        <View style={{ marginVertical: Spacing.md }}>
          <ProgressBar value={spent / budgeted} color={left >= 0 ? Colors.blue : Colors.accent} />
        </View>
        <View style={styles.between}>
          <Text style={styles.small}>{money(spent, { cents: false })} spent</Text>
          <Text style={styles.small}>{money(budgeted, { cents: false })} budgeted</Text>
        </View>
      </Card>

      <View style={styles.pair}>
        <Mini
          icon="receipt-outline"
          label="Bills & Utilities"
          headline={`${money(Math.max(billsTotal - billsPaid, 0), { cents: false })} left to pay`}
          progress={billsPaid / billsTotal}
          foot={`${money(billsPaid, { cents: false })} paid`}
        />
        <Mini
          icon="cash-outline"
          label="Earnings"
          headline={`${money(Math.max(expectedIncome - currentIncome, 0), { cents: false })} to earn`}
          progress={currentIncome / expectedIncome}
          foot={`${money(currentIncome, { cents: false })} earned`}
        />
      </View>

      <SectionLabel action="Add Budget">Category budgets</SectionLabel>
      <View style={{ gap: Spacing.sm + 2 }}>
        {rows.map((r) => {
          const c = categories[r.category];
          const remaining = r.limit - r.spent;
          return (
            <Card key={r.category} style={styles.category}>
              <Donut
                size={52}
                stroke={5}
                data={[
                  { value: Math.min(r.spent, r.limit), color: remaining >= 0 ? c.color : Colors.accent },
                  { value: Math.max(remaining, 0.001), color: Colors.track },
                ]}>
                <Ionicons name={c.icon} size={20} color={Colors.ink} />
              </Donut>
              <View style={{ flex: 1 }}>
                <Text style={styles.categoryName}>{c.name}</Text>
                <Text style={[styles.small, remaining < 0 && { color: Colors.accent }]}>
                  {remaining >= 0 ? `${money(remaining, { cents: false })} left to spend` : `${money(-remaining, { cents: false })} over`}
                </Text>
              </View>
              <Text style={styles.categoryLimit}>{money(r.limit, { cents: false })}</Text>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

function Mini({ icon, label, headline, progress, foot }: { icon: IconName; label: string; headline: string; progress: number; foot: string }) {
  return (
    <View style={styles.mini}>
      <Ionicons name={icon} size={24} color={Colors.ink} />
      <Text style={[styles.caption, { marginTop: Spacing.md }]}>{label}</Text>
      <Text style={styles.miniHeadline}>{headline}</Text>
      <View style={{ marginVertical: Spacing.md }}>
        <ProgressBar value={progress} />
      </View>
      <Text style={styles.small}>{foot}</Text>
    </View>
  );
}

const shadow = {
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;

const styles = StyleSheet.create({
  monthRow: { flexDirection: 'row', gap: 3, marginHorizontal: Spacing.lg, marginVertical: Spacing.lg },
  month: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.chip,
    padding: Spacing.lg,
    borderTopLeftRadius: Radius.md,
    borderBottomLeftRadius: Radius.md,
  },
  monthText: { fontSize: 17, color: Colors.ink, fontWeight: '500' },
  arrows: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
    backgroundColor: Colors.chip,
    paddingHorizontal: Spacing.xl,
    borderTopRightRadius: Radius.md,
    borderBottomRightRadius: Radius.md,
  },
  pad: { padding: Spacing.xl },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm, minHeight: 34 },
  perDay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.positiveBg,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
  },
  perDayText: { fontSize: 14, color: Colors.ink, fontWeight: '500' },
  caption: { fontSize: 14, color: Colors.textSecondary },
  headline: { fontSize: 20, fontWeight: '600', color: Colors.ink, marginTop: 3 },
  between: { flexDirection: 'row', justifyContent: 'space-between' },
  small: { fontSize: 13, color: Colors.textSecondary },
  pair: { flexDirection: 'row', gap: Spacing.md, marginHorizontal: Spacing.lg, marginTop: Spacing.md },
  mini: { flex: 1, backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Spacing.lg, ...shadow },
  miniHeadline: { fontSize: 16, fontWeight: '600', color: Colors.ink, marginTop: 3 },
  category: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, padding: Spacing.lg },
  categoryName: { fontSize: 16, fontWeight: '500', color: Colors.text, marginBottom: 3 },
  categoryLimit: { fontSize: 17, fontWeight: '600', color: Colors.ink },
});
