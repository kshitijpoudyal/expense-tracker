import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { LineChart } from '@/components/charts';
import { LinkPrompt } from '@/components/link-prompt';
import { Screen } from '@/components/screen';
import { TransactionRow } from '@/components/transaction-row';
import { Amount, Avatar, Card, Divider, EmptyRow, IconBadge, ProgressBar, Row, SectionLabel } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useFinance } from '@/data/finance';
import type { Account, IconName } from '@/data/types';
import { compactMoney, money, relativeDue, timeAgo } from '@/lib/format';

export default function Dashboard() {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string[]>([]);
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const {
    accounts,
    budgets,
    busy,
    connectBank,
    currentSpend,
    lastMonthCumulative,
    lastSynced,
    netWorthMonthChange,
    netWorthRange,
    nextPayday,
    recurring,
    refresh,
    spentInMonth,
    status,
    thisMonthCumulative,
    totals,
    transactions,
    user,
  } = useFinance();
  const lastMonthSoFar = lastMonthCumulative[thisMonthCumulative.length - 1] ?? 0;
  const diff = currentSpend - lastMonthSoFar;
  const upcoming = recurring.filter((r) => r.dueIn <= 7);
  const budgetTotal = budgets.reduce((t, b) => t + b.limit, 0);
  const budgetSpent = budgets.reduce((t, b) => t + spentInMonth(b.category, 0), 0);
  const netWorthYear = netWorthRange('1Y');
  const sample = status === 'sample';

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
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={32}
        onScroll={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}>
        <View style={{ width }}>
          <Card>
            <View style={styles.pad}>
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
            </View>
            <Divider />
            <Row
              left={<IconBadge name="cash-outline" color={Colors.positive} bg={Colors.positiveBg} />}
              title={nextPayday === null ? 'Payday not known yet' : nextPayday === 0 ? 'Payday is today' : `Payday in ${nextPayday} ${nextPayday === 1 ? 'day' : 'days'}`}
              subtitle={nextPayday === null ? 'Shows once regular paychecks appear in your accounts' : undefined}
            />
          </Card>
        </View>
        <View style={{ width }}>
          <Card>
            <View style={styles.pad}>
              <View style={styles.netTop}>
                <View>
                  <Text style={styles.caption}>Net Worth</Text>
                  <Text style={styles.hero}>{money(totals.netWorth, { cents: false })}</Text>
                </View>
                <View style={styles.netChange}>
                  <Ionicons
                    name={netWorthMonthChange >= 0 ? 'arrow-up-circle-outline' : 'arrow-down-circle-outline'}
                    size={22}
                    color={netWorthMonthChange >= 0 ? Colors.positive : Colors.warning}
                  />
                  <Text style={styles.netChangeText}>
                    {money(Math.abs(netWorthMonthChange), { cents: false })} in the{'\n'}last month
                  </Text>
                </View>
              </View>
              <View style={{ marginTop: Spacing.lg }}>
                <LineChart height={110} yLabels={compactMoney} series={[{ values: netWorthYear, color: Colors.blue, fill: Colors.blueSoft }]} />
              </View>
            </View>
            <Divider />
            <Row
              left={<IconBadge name="stats-chart-outline" />}
              title="View Net Worth"
              right={<Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />}
              onPress={() => router.push('/net-worth')}
            />
          </Card>
        </View>
      </ScrollView>
      <View style={styles.dots}>
        {[0, 1].map((i) => (
          <View key={i} style={[styles.pageDot, i === page && styles.pageDotActive]} />
        ))}
      </View>

      <SectionLabel action={busy ? 'Working…' : 'Add account'} onAction={busy ? undefined : sample ? () => router.push('/settings') : connectBank}>
        Accounts
      </SectionLabel>
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

      {lastSynced ? (
        <View style={styles.sync}>
          <Ionicons name="sync-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.syncText}>{busy ? 'Syncing…' : `Synced ${timeAgo(lastSynced)}`}</Text>
          {!sample && !busy ? (
            <>
              <Text style={styles.syncText}>|</Text>
              <Pressable hitSlop={8} onPress={refresh}>
                <Text style={styles.syncNow}>Sync now</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      ) : null}

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
        <Tile
          icon="wallet-outline"
          label="Budget"
          value={budgetTotal ? `${money(budgetTotal - budgetSpent, { cents: false })} ${budgetSpent > budgetTotal ? 'over' : 'left'}` : 'Not set up'}
          onPress={() => router.push('/budget')}>
          {budgetTotal ? <ProgressBar value={budgetSpent / budgetTotal} color={budgetSpent > budgetTotal ? Colors.accent : Colors.blue} /> : null}
        </Tile>
        <Tile icon="stats-chart-outline" label="Net worth" value={compactMoney(totals.netWorth)} onPress={() => router.push('/net-worth')} />
      </View>

      <SectionLabel action="See all" onAction={() => router.push('/transactions')}>
        Recent transactions
      </SectionLabel>
      <Card>
        {transactions.length === 0 ? <EmptyRow>No transactions yet.</EmptyRow> : null}
        {transactions.slice(0, 5).map((t, i) => (
          <View key={t.id}>
            {i > 0 ? <Divider /> : null}
            <TransactionRow transaction={t} />
          </View>
        ))}
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
  netTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  netChange: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  netChangeText: { fontSize: 13, lineHeight: 18, color: Colors.textSecondary },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm, marginTop: Spacing.md },
  pageDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.track },
  pageDotActive: { backgroundColor: Colors.ink },
  sync: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: Spacing.lg },
  syncText: { fontSize: 14, color: Colors.textSecondary },
  syncNow: { fontSize: 14, color: Colors.ink, fontWeight: '600', textDecorationLine: 'underline' },
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
