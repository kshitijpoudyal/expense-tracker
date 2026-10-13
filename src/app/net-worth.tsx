import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { LineChart } from '@/components/charts';
import { Screen } from '@/components/screen';
import { Amount, Card, Divider, IconBadge, Row, SectionLabel, Segmented, TrendPill } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { accounts, netWorthHistory, totals, type Account, type IconName } from '@/data/mock';
import { compactMoney, money } from '@/lib/format';

const TABS = ['Summary', 'Assets', 'Debt'] as const;
const RANGES = ['1M', '3M', '6M', '1Y', 'All'] as const;
const POINTS: Record<(typeof RANGES)[number], number> = { '1M': 2, '3M': 4, '6M': 7, '1Y': 12, All: 12 };

const KIND_ICON: Record<Account['kind'], IconName> = {
  checking: 'wallet-outline',
  savings: 'cash-outline',
  investment: 'trending-up-outline',
  credit: 'card-outline',
  loan: 'car-outline',
};

export default function NetWorth() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Summary');
  const [range, setRange] = useState<(typeof RANGES)[number]>('6M');
  const values = netWorthHistory.slice(-POINTS[range]);
  const monthChange = netWorthHistory[netWorthHistory.length - 1] - netWorthHistory[netWorthHistory.length - 2];
  const pct = (n: number) => `${Math.round(n)}%`;
  const growth = ((values[values.length - 1] - values[0]) / values[0]) * 100;

  const assetAccounts = accounts.filter((a) => ['checking', 'savings', 'investment'].includes(a.kind));
  const debtAccounts = accounts.filter((a) => ['credit', 'loan'].includes(a.kind));

  return (
    <Screen title="Net worth" back tabs={TABS} activeTab={tab} onTab={setTab}>
      {tab === 'Summary' ? (
        <>
          <Card style={styles.pad}>
            <View style={styles.top}>
              <View>
                <Text style={styles.caption}>Net Worth</Text>
                <Text style={styles.hero}>{money(totals.netWorth, { cents: false })}</Text>
              </View>
              <View style={styles.change}>
                <Ionicons name={monthChange >= 0 ? 'arrow-up-circle-outline' : 'arrow-down-circle-outline'} size={26} color={Colors.positive} />
                <Text style={styles.changeText}>
                  {money(Math.abs(monthChange), { cents: false })} in the{'\n'}last month
                </Text>
              </View>
            </View>
            <View style={{ marginVertical: Spacing.lg }}>
              <LineChart height={130} yLabels={compactMoney} series={[{ values, color: Colors.blue, fill: Colors.blueSoft }]} />
            </View>
            <Segmented options={RANGES} value={range} onChange={setRange} />
          </Card>

          <SectionLabel>Summary</SectionLabel>
          <Card>
            <Row left={<IconBadge name="cash-outline" />} title="Assets" right={<Trail pill={<TrendPill value="3%" />} value={compactMoney(totals.assets)} />} />
            <Divider />
            <Row left={<IconBadge name="card-outline" />} title="Debt" right={<Trail pill={<TrendPill value="2%" tone="warning" />} value={compactMoney(totals.debt)} />} />
            <Divider />
            <Row
              left={<IconBadge name="wallet-outline" />}
              title="Net Worth"
              right={<Trail pill={<TrendPill value={pct(growth)} />} value={compactMoney(totals.netWorth)} positive />}
            />
          </Card>
        </>
      ) : (
        <AccountList
          heading={tab === 'Assets' ? 'Total assets' : 'Total debt'}
          total={tab === 'Assets' ? totals.assets : totals.debt}
          items={tab === 'Assets' ? assetAccounts : debtAccounts}
        />
      )}
    </Screen>
  );
}

function Trail({ pill, value, positive }: { pill: React.ReactNode; value: string; positive?: boolean }) {
  return (
    <View style={styles.trail}>
      {pill}
      <View style={styles.trailValue}>
        <Amount tone={positive ? 'positive' : undefined}>{value}</Amount>
      </View>
    </View>
  );
}

function AccountList({ heading, total, items }: { heading: string; total: number; items: Account[] }) {
  return (
    <>
      <Card style={styles.pad}>
        <Text style={styles.caption}>{heading}</Text>
        <Text style={styles.hero}>{money(total, { cents: false })}</Text>
        <Text style={styles.caption}>{items.length} linked accounts</Text>
      </Card>
      <SectionLabel>Accounts</SectionLabel>
      <Card>
        {items.map((a, i) => (
          <View key={a.id}>
            {i > 0 ? <Divider /> : null}
            <Row
              left={<IconBadge name={KIND_ICON[a.kind]} />}
              title={a.name}
              subtitle={`${a.institution} ··${a.mask}`}
              right={<Amount>{money(a.balance, { cents: true })}</Amount>}
            />
          </View>
        ))}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  pad: { padding: Spacing.xl },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  caption: { fontSize: 14, color: Colors.textSecondary },
  hero: { fontSize: 36, fontWeight: '600', color: Colors.ink, marginVertical: 2, fontVariant: ['tabular-nums'] },
  change: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  changeText: { fontSize: 14, lineHeight: 19, color: Colors.textSecondary },
  trail: { flexDirection: 'row', alignItems: 'center' },
  trailValue: { width: 84, alignItems: 'flex-end' },
});
