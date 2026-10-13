import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Amount, Card, Divider, IconBadge, Row, SectionLabel } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useFinance } from '@/data/finance';
import { categories, type CategoryId } from '@/data/mock';
import { dayHeading, money } from '@/lib/format';

const FILTERS: ('all' | CategoryId)[] = ['all', 'income', 'bills', 'groceries', 'dining', 'shopping', 'auto', 'entertainment', 'health', 'travel', 'other', 'transfer'];

export default function Transactions() {
  const { transactions } = useFinance();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');

  const visible = transactions.filter(
    (t) => (filter === 'all' || t.category === filter) && t.merchant.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const days = [...new Set(visible.map((t) => t.daysAgo))];

  return (
    <Screen
      title="Transactions"
      overlap={0}
      rightIcon="download-outline"
      header={
        <View style={styles.header}>
          <View style={styles.search}>
            <Ionicons name="search" size={18} color={Colors.textSecondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search transactions"
              placeholderTextColor={Colors.textMuted}
              style={styles.input}
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            {FILTERS.map((f) => (
              <Pressable key={f} onPress={() => setFilter(f)} style={[styles.filter, f === filter && styles.filterActive]}>
                <Text style={[styles.filterText, f === filter && styles.filterTextActive]}>{f === 'all' ? 'All' : categories[f].name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      }>
      {days.length === 0 ? <Text style={styles.empty}>No transactions match.</Text> : null}
      {days.map((day, index) => (
        <View key={day} style={index === 0 && { marginTop: -Spacing.lg }}>
          <SectionLabel>{dayHeading(day)}</SectionLabel>
          <Card>
            {visible
              .filter((t) => t.daysAgo === day)
              .map((t, i) => {
                const income = t.category === 'income' || t.amount < 0;
                return (
                  <View key={t.id}>
                    {i > 0 ? <Divider /> : null}
                    <Row
                      left={<IconBadge name={categories[t.category].icon} bg={`${categories[t.category].color}33`} />}
                      title={t.merchant}
                      subtitle={`${categories[t.category].name} · ${t.account}${t.pending ? ' · Pending' : ''}`}
                      right={<Amount tone={income ? 'positive' : undefined}>{`${income ? '+' : ''}${money(Math.abs(t.amount), { cents: true })}`}</Amount>}
                    />
                  </View>
                );
              })}
          </Card>
        </View>
      ))}
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
  filters: { gap: Spacing.sm, paddingHorizontal: Spacing.lg, marginTop: Spacing.md },
  filter: { paddingHorizontal: Spacing.lg, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: 'rgba(255,255,255,0.22)' },
  filterActive: { backgroundColor: Colors.white },
  filterText: { color: Colors.white, fontSize: 14, fontWeight: '500' },
  filterTextActive: { color: Colors.ink },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: Spacing.xxl, fontSize: 15 },
});
