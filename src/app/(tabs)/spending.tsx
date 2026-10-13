import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Donut } from '@/components/charts';
import { Screen } from '@/components/screen';
import { Amount, Card, Divider, EmptyRow, IconBadge, Row, SectionLabel } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { PERIODS, useFinance, type Period } from '@/data/finance';
import { money } from '@/lib/format';

export default function Spending() {
  const { periods } = useFinance();
  const [period, setPeriod] = useState<Period>('Month');
  // Null selects the most recent bar, so switching period never leaves a stale index.
  const [picked, setPicked] = useState<number | null>(null);
  const [includeBills, setIncludeBills] = useState(true);

  const series = periods[period];
  const selected = picked !== null && picked < series.length ? picked : series.length - 1;
  const peak = Math.max(1, ...series.flatMap((s) => [s.income, s.spend]));
  const current = series[selected];

  const breakdown = current.byCategory.filter((c) => includeBills || c.category.id !== 'bills');
  const breakdownTotal = breakdown.reduce((t, c) => t + c.amount, 0);
  const net = current.income - current.spend;

  return (
    <Screen
      title="Spending"
      overlap={70}
      header={
        <View>
          <View style={styles.periods}>
            {PERIODS.map((p) => (
              <Pressable key={p} onPress={() => {
                  setPeriod(p);
                  setPicked(null);
                }} style={[styles.period, p === period && styles.periodActive]}>
                <Text style={[styles.periodText, p === period && styles.periodTextActive]}>{p}</Text>
              </Pressable>
            ))}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bars}>
            {series.map((s, i) => (
              <Pressable key={i} onPress={() => setPicked(i)} style={[styles.bar, i === selected && styles.barActive]}>
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
              <Text style={styles.legendText}>Spending</Text>
            </View>
          </View>
        </View>
      }>
      <Card>
        <Row left={<IconBadge name="cash-outline" />} title="Income" right={<Amount>{money(current.income, { cents: false })}</Amount>} />
        <Divider />
        <Row left={<IconBadge name="card-outline" />} title="Total Spend" right={<Amount>{money(current.spend, { cents: false })}</Amount>} />
        <Divider />
        <Row
          left={<IconBadge name="reorder-two-outline" />}
          title="Net Income"
          right={<Amount tone={net >= 0 ? 'positive' : undefined}>{money(net, { cents: false })}</Amount>}
        />
      </Card>

      <SectionLabel>Breakdown</SectionLabel>
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
            />
          </View>
        ))}
      </Card>
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
  toggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: Spacing.sm, padding: Spacing.lg, paddingBottom: 0 },
  toggleText: { fontSize: 14, color: Colors.textSecondary },
  donut: { alignItems: 'center', paddingVertical: Spacing.xl },
  donutCaption: { fontSize: 13, color: Colors.textSecondary },
  donutValue: { fontSize: 28, fontWeight: '600', color: Colors.ink, marginTop: 2 },
});
