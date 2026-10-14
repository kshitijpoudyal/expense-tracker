import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Donut } from '@/components/charts';
import { Screen } from '@/components/screen';
import { Sheet } from '@/components/sheet';
import { Card, EmptyRow, PrimaryButton, ProgressBar, SectionLabel } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useFinance } from '@/data/finance';
import { categories, categoryIds, isSpending, type CategoryId, type IconName } from '@/data/types';
import { addMonths, money, monthLong } from '@/lib/format';

export default function Budget() {
  const { budgets, currentIncome, expectedIncome, recurring, setBudget, spentInMonth } = useFinance();
  const [monthOffset, setMonthOffset] = useState(0);
  // The category being added or edited; `new` while choosing which category to add.
  const [editing, setEditing] = useState<CategoryId | 'new' | null>(null);
  const today = new Date();
  const month = addMonths(today, monthOffset);
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(daysInMonth - today.getDate() + 1, 1);

  const rows = budgets.map((b) => ({ ...b, spent: spentInMonth(b.category, monthOffset) }));
  const budgeted = rows.reduce((t, r) => t + r.limit, 0);
  const spent = rows.reduce((t, r) => t + r.spent, 0);
  const left = budgeted - spent;

  const billsTotal = recurring.filter((r) => r.kind === 'bill').reduce((t, r) => t + r.amount, 0);
  const billsPaid = spentInMonth('bills', 0);

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

      <SectionLabel action="Add Budget" onAction={() => setEditing('new')}>
        Category budgets
      </SectionLabel>
      <View style={{ gap: Spacing.sm + 2 }}>
        {rows.length === 0 ? (
          <Card>
            <EmptyRow>No budgets yet. Choose Add Budget to set a monthly limit for a category.</EmptyRow>
          </Card>
        ) : null}
        {rows.map((r) => {
          const c = categories[r.category];
          const remaining = r.limit - r.spent;
          return (
            <Pressable key={r.category} onPress={() => setEditing(r.category)} style={({ pressed }) => pressed && { opacity: 0.6 }}>
              <Card style={styles.category}>
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
            </Pressable>
          );
        })}
      </View>

      <Sheet visible={editing !== null} title={editing === 'new' ? 'Add Budget' : editing ? `${categories[editing].name} budget` : ''} onClose={() => setEditing(null)}>
        {editing === 'new' ? (
          <View>
            {categoryIds
              .filter((c) => isSpending(c) && !budgets.some((b) => b.category === c))
              .map((c) => (
                <Pressable key={c} onPress={() => setEditing(c)} style={styles.pick}>
                  <Ionicons name={categories[c].icon} size={22} color={Colors.ink} />
                  <Text style={styles.pickText}>{categories[c].name}</Text>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                </Pressable>
              ))}
          </View>
        ) : editing ? (
          <LimitForm
            initial={budgets.find((b) => b.category === editing)?.limit ?? null}
            spentLastMonth={spentInMonth(editing, -1)}
            onSave={(limit) => {
              setBudget(editing, limit);
              setEditing(null);
            }}
          />
        ) : null}
      </Sheet>
    </Screen>
  );
}

/** Sets a monthly limit. Saving with an existing limit offers removal too. */
function LimitForm({ initial, spentLastMonth, onSave }: { initial: number | null; spentLastMonth: number; onSave: (limit: number | null) => void }) {
  const [text, setText] = useState(initial ? String(initial) : '');
  const limit = Number(text.replace(/[^0-9.]/g, ''));
  return (
    <View>
      <Text style={styles.small}>Monthly limit</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        keyboardType="decimal-pad"
        autoFocus
        placeholder={spentLastMonth > 0 ? String(Math.ceil(spentLastMonth / 10) * 10) : '200'}
        placeholderTextColor={Colors.textMuted}
        style={styles.input}
      />
      {spentLastMonth > 0 ? <Text style={[styles.small, { marginTop: Spacing.sm }]}>You spent {money(spentLastMonth, { cents: false })} on this last month.</Text> : null}
      <PrimaryButton label="Save" disabled={!(limit > 0)} onPress={() => onSave(limit)} style={{ marginTop: Spacing.lg }} />
      {initial ? (
        <Pressable onPress={() => onSave(null)} style={styles.removeBudget} hitSlop={8}>
          <Text style={styles.removeText}>Remove budget</Text>
        </Pressable>
      ) : null}
    </View>
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
  pick: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 13 },
  pickText: { flex: 1, fontSize: 16, color: Colors.text },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 18,
    color: Colors.text,
    backgroundColor: Colors.background,
    marginTop: Spacing.sm,
  },
  removeBudget: { alignItems: 'center', marginTop: Spacing.lg },
  removeText: { fontSize: 15, color: Colors.accent, fontWeight: '600' },
});
