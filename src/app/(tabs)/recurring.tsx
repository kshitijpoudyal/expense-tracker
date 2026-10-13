import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Amount, Avatar, Card, EmptyRow, Row, SectionLabel } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useFinance } from '@/data/finance';
import type { Recurring } from '@/data/mock';
import { addDays, dayNames, money, relativeDue } from '@/lib/format';

const TABS = ['Upcoming', 'All'] as const;

export default function RecurringScreen() {
  const router = useRouter();
  const { recurring } = useFinance();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Upcoming');
  const soon = recurring.filter((r) => r.dueIn <= 7);
  const later = recurring.filter((r) => r.dueIn > 7);
  const soonTotal = soon.reduce((t, r) => t + r.amount, 0);
  const subscriptions = recurring.filter((r) => r.kind === 'subscription');
  const bills = recurring.filter((r) => r.kind === 'bill');
  const monthly = (list: Recurring[]) => money(list.reduce((t, r) => t + r.amount, 0), { cents: false });

  return (
    <Screen title="Recurring" rightIcon="add-circle-outline" tabs={TABS} activeTab={tab} onTab={setTab}>
      {tab === 'Upcoming' ? (
        <>
          <Card style={styles.pad}>
            <Text style={styles.heading}>Coming up</Text>
            <Text style={styles.summary}>
              You have {soon.length} recurring charges{' '}
              <Text style={styles.bold}>coming up within the next 7 days for {money(soonTotal, { cents: false })}.</Text>
            </Text>
            <Calendar dueDays={recurring.map((r) => r.dueIn)} />
          </Card>
          <SectionLabel>Coming up</SectionLabel>
          <List items={soon} />
          <SectionLabel>Coming later</SectionLabel>
          <List items={later} />
        </>
      ) : (
        <>
          <Card style={[styles.pad, styles.totals]}>
            <Total label="Subscriptions" value={monthly(subscriptions)} count={subscriptions.length} />
            <View style={styles.totalDivider} />
            <Total label="Bills" value={monthly(bills)} count={bills.length} />
          </Card>
          <SectionLabel action="Cancel one" onAction={() => router.push('/cancel')}>
            Subscriptions
          </SectionLabel>
          <List items={subscriptions} />
          <SectionLabel action="Lower bills" onAction={() => router.push('/lower-bills')}>
            Bills & utilities
          </SectionLabel>
          <List items={bills} />
        </>
      )}
    </Screen>
  );
}

function List({ items }: { items: Recurring[] }) {
  if (items.length === 0) {
    return (
      <Card>
        <EmptyRow>Nothing here yet.</EmptyRow>
      </Card>
    );
  }
  return (
    <View style={{ gap: Spacing.sm + 2 }}>
      {items.map((r) => (
        <Card key={r.id}>
          <Row
            left={<Avatar label={r.name} color={r.color} />}
            title={r.name}
            subtitle={relativeDue(r.dueIn)}
            right={
              <View style={styles.right}>
                <Amount>{`${r.approximate ? '~' : ''}${money(r.amount)}`}</Amount>
                <Ionicons name="ellipsis-vertical" size={18} color={Colors.ink} />
              </View>
            }
          />
        </Card>
      ))}
    </View>
  );
}

function Total({ label, value, count }: { label: string; value: string; count: number }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.totalLabel}>{label}</Text>
      <Text style={styles.totalValue}>
        {value}
        <Text style={styles.totalUnit}>/mo</Text>
      </Text>
      <Text style={styles.totalLabel}>{count} active</Text>
    </View>
  );
}

/** Two weeks starting from the Sunday of the current week. */
function Calendar({ dueDays }: { dueDays: number[] }) {
  const today = new Date();
  const start = addDays(today, -today.getDay());
  const days = Array.from({ length: 14 }, (_, i) => {
    const offset = i - today.getDay();
    return { date: addDays(start, i).getDate(), offset, due: offset > 0 && dueDays.includes(offset) };
  });

  return (
    <View style={styles.calendar}>
      <View style={styles.week}>
        {dayNames.map((d) => (
          <Text key={d} style={styles.dayName}>
            {d}
          </Text>
        ))}
      </View>
      {[days.slice(0, 7), days.slice(7)].map((week, w) => (
        <View key={w} style={styles.week}>
          {week.map((d) => (
            <View key={d.offset} style={styles.cell}>
              <View style={[styles.day, d.due && styles.dayDue, d.offset === 0 && styles.dayToday]}>
                <Text style={[styles.dayText, d.offset < 0 && styles.dayPast, d.offset === 0 && styles.dayTodayText]}>{d.date}</Text>
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { padding: Spacing.xl },
  heading: { fontSize: 26, fontWeight: '600', color: Colors.ink },
  summary: { fontSize: 16, lineHeight: 24, color: Colors.text, marginTop: Spacing.xs },
  bold: { fontWeight: '700' },
  right: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  calendar: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.sm, paddingVertical: Spacing.md, marginTop: Spacing.lg },
  week: { flexDirection: 'row', paddingHorizontal: Spacing.xs },
  dayName: { flex: 1, textAlign: 'center', fontSize: 11, color: Colors.textSecondary, marginBottom: Spacing.xs },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  day: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dayDue: { backgroundColor: Colors.chip },
  dayToday: { backgroundColor: Colors.ink },
  dayText: { fontSize: 15, color: Colors.text },
  dayPast: { color: Colors.textMuted },
  dayTodayText: { color: Colors.white, fontWeight: '700' },
  totals: { flexDirection: 'row' },
  totalDivider: { width: StyleSheet.hairlineWidth, backgroundColor: Colors.border, marginHorizontal: Spacing.lg },
  totalLabel: { fontSize: 13, color: Colors.textSecondary },
  totalValue: { fontSize: 26, fontWeight: '600', color: Colors.ink, marginVertical: 2 },
  totalUnit: { fontSize: 14, fontWeight: '400', color: Colors.textSecondary },
});
