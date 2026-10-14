import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LineChart } from '@/components/charts';
import { LinkPrompt } from '@/components/link-prompt';
import { Screen } from '@/components/screen';
import { Amount, Avatar, Card, Divider, EmptyRow, IconBadge, ProgressBar, Row, SectionLabel } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useFinance } from '@/data/finance';
import { categories, type Account, type IconName } from '@/data/mock';
import { compactMoney, dayHeading, money, relativeDue } from '@/lib/format';

export default function Dashboard() {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string[]>([]);
  const { accounts, budgets, creditScore, currentSpend, lastMonthCumulative, monthTransactions, recurring, thisMonthCumulative, totals, transactions, user } =
    useFinance();
  const lastMonthSoFar = lastMonthCumulative[thisMonthCumulative.length - 1];
  const diff = currentSpend - lastMonthSoFar;
  const upcoming = recurring.filter((r) => r.dueIn <= 7);
  const budgetTotal = budgets.reduce((t, b) => t + b.limit, 0);
  const budgetSpent = budgets.reduce(
    (t, b) => t + monthTransactions.filter((x) => x.category === b.category).reduce((s, x) => s + x.amount, 0),
    0,
  );

  const accountRows: { label: string; icon: IconName; value: number; kind?: Account['kind'] }[] = [
    { label: 'Card balance', icon: 'card-outline', value: -totals.credit || 0, kind: 'credit' },
    { label: 'Checking', icon: 'wallet-outline', value: totals.checking, kind: 'checking' },
    { label: 'Savings', icon: 'cash-outline', value: totals.savings, kind: 'savings' },
    { label: 'Investments', icon: 'trending-up-outline', value: totals.investments, kind: 'investment' },
    { label: 'Net cash', icon: 'swap-vertical-outline', value: totals.checking + totals.savings + totals.investments - totals.credit },
  ];
  const toggle = (label: string) => setExpanded((open) => (open.includes(label) ? open.filter((l) => l !== label) : [...open, label]));

  return (
    <Screen
      title="Dashboard"
      rightIcon="notifications-outline"
      header={<Text style={styles.greeting}>Good to see you, {user.firstName}</Text>}>
      <LinkPrompt />
      <Card style={styles.pad}>
        <Text style={styles.caption}>Current spend this month</Text>
        <Text style={styles.hero}>{money(currentSpend, { cents: false })}</Text>
        <View style={styles.compare}>
          <Ionicons name={diff > 0 ? 'arrow-up-circle-outline' : 'arrow-down-circle-outline'} size={18} color={diff > 0 ? Colors.warning : Colors.positive} />
          <Text style={styles.compareText}>
            {money(Math.abs(diff), { cents: false })} {diff > 0 ? 'more' : 'less'} than this point last month
          </Text>
        </View>
        <View style={{ marginTop: Spacing.lg }}>
          <LineChart
            height={110}
            series={[
              { values: lastMonthCumulative, color: Colors.textMuted, dashed: true },
              { values: thisMonthCumulative, color: Colors.blue, fill: Colors.blueSoft },
            ]}
          />
        </View>
        <View style={styles.legend}>
          <LegendDot color={Colors.blue} label="This month" />
          <LegendDot color={Colors.textMuted} label="Last month" />
        </View>
      </Card>

      <SectionLabel>Accounts</SectionLabel>
      <Card>
        {accountRows.map((a, i) => {
          const members = a.kind ? accounts.filter((x) => x.kind === a.kind) : [];
          const expandable = members.length > 1;
          const open = expandable && expanded.includes(a.label);
          return (
            <View key={a.label}>
              {i > 0 ? <Divider /> : null}
              <Row
                left={<IconBadge name={a.icon} />}
                title={a.label}
                subtitle={expandable ? `${members.length} accounts` : undefined}
                right={
                  <View style={styles.accountRight}>
                    <Amount>{money(a.value, { cents: false })}</Amount>
                    {expandable ? <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textMuted} /> : null}
                  </View>
                }
                onPress={expandable ? () => toggle(a.label) : undefined}
              />
              {open
                ? members.map((m) => (
                    <View key={m.id} style={styles.subAccount}>
                      <View style={styles.subAccountText}>
                        <Text style={styles.subAccountName} numberOfLines={1}>
                          {m.name}
                        </Text>
                        <Text style={styles.subAccountMeta} numberOfLines={1}>
                          {m.institution}
                          {m.mask ? ` ·· ${m.mask}` : ''}
                        </Text>
                      </View>
                      <Amount>{money(a.kind === 'credit' ? -m.balance || 0 : m.balance, { cents: false })}</Amount>
                    </View>
                  ))
                : null}
            </View>
          );
        })}
      </Card>

      <SectionLabel action="See all" onAction={() => router.push('/recurring')}>
        Upcoming charges
      </SectionLabel>
      <Card>
        {upcoming.length === 0 ? <EmptyRow>Nothing due in the next 7 days.</EmptyRow> : null}
        {upcoming.map((r, i) => (
          <View key={r.id}>
            {i > 0 ? <Divider /> : null}
            <Row
              left={<Avatar label={r.name} color={r.color} />}
              title={r.name}
              subtitle={relativeDue(r.dueIn)}
              right={<Amount>{`${r.approximate ? '~' : ''}${money(r.amount)}`}</Amount>}
            />
          </View>
        ))}
      </Card>

      <View style={styles.tiles}>
        <Tile icon="wallet-outline" label="Budget" value={`${money(budgetTotal - budgetSpent, { cents: false })} left`} onPress={() => router.push('/budget')}>
          <ProgressBar value={budgetSpent / budgetTotal} />
        </Tile>
        <Tile icon="stats-chart-outline" label="Net worth" value={compactMoney(totals.netWorth)} onPress={() => router.push('/net-worth')} />
      </View>
      <View style={styles.tiles}>
        <Tile icon="speedometer-outline" label="Credit score" value={creditScore ? `${creditScore.score} · ${creditScore.rating}` : 'Not available'} onPress={() => router.push('/credit-score')} />
        <Tile icon="cut-outline" label="Lower bills" value={`${recurring.filter((r) => r.negotiable).length} bills eligible`} onPress={() => router.push('/lower-bills')} />
      </View>

      <SectionLabel action="See all" onAction={() => router.push('/transactions')}>
        Recent transactions
      </SectionLabel>
      <Card>
        {transactions.length === 0 ? <EmptyRow>No transactions yet.</EmptyRow> : null}
        {transactions.slice(0, 5).map((t, i) => {
          const income = t.category === 'income' || t.amount < 0;
          return (
            <View key={t.id}>
              {i > 0 ? <Divider /> : null}
              <Row
                left={<IconBadge name={categories[t.category].icon} bg={`${categories[t.category].color}33`} />}
                title={t.merchant}
                subtitle={`${dayHeading(t.daysAgo)}${t.pending ? ' · Pending' : ''}`}
                right={<Amount tone={income ? 'positive' : undefined}>{`${income ? '+' : ''}${money(Math.abs(t.amount), { cents: true })}`}</Amount>}
              />
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function Tile({
  icon,
  label,
  value,
  onPress,
  children,
}: {
  icon: IconName;
  label: string;
  value: string;
  onPress: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tile, pressed && { opacity: 0.6 }]}>
      <Ionicons name={icon} size={24} color={Colors.ink} />
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>{value}</Text>
      {children ? <View style={{ marginTop: Spacing.md }}>{children}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  greeting: { color: Colors.white, fontSize: 24, fontWeight: '600', paddingHorizontal: Spacing.xl + 4, marginTop: Spacing.md },
  pad: { padding: Spacing.xl },
  caption: { fontSize: 14, color: Colors.textSecondary },
  hero: { fontSize: 38, fontWeight: '600', color: Colors.ink, marginTop: 2, fontVariant: ['tabular-nums'] },
  compare: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.xs },
  compareText: { fontSize: 14, color: Colors.textSecondary, flex: 1 },
  legend: { flexDirection: 'row', gap: Spacing.xl, marginTop: Spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 13, color: Colors.textSecondary },
  accountRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  subAccount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    paddingRight: Spacing.lg,
    paddingLeft: Spacing.lg * 2 + 44,
    backgroundColor: Colors.background,
  },
  subAccountText: { flex: 1 },
  subAccountName: { fontSize: 15, color: Colors.ink },
  subAccountMeta: { fontSize: 13, color: Colors.textSecondary, marginTop: 1 },
  tiles: { flexDirection: 'row', gap: Spacing.md, marginHorizontal: Spacing.lg, marginTop: Spacing.md },
  tile: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  tileLabel: { fontSize: 14, color: Colors.textSecondary, marginTop: Spacing.md },
  tileValue: { fontSize: 17, fontWeight: '600', color: Colors.ink, marginTop: 3 },
});
