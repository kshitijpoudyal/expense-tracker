import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';
import { categories, isInflow, type Transaction } from '@/data/types';
import { fullDate, money } from '@/lib/format';

/** The merchant's logo when the bank provides one, otherwise the category icon. Recurring ones get a badge. */
export function TransactionIcon({ transaction: t, size = 44 }: { transaction: Transaction; size?: number }) {
  const category = categories[t.splits.length ? 'other' : t.category];
  return (
    <View style={{ width: size, height: size }}>
      {t.logoUrl ? (
        <Image source={t.logoUrl} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" />
      ) : (
        <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: `${category.color}33` }]}>
          <Ionicons name={t.splits.length ? 'git-branch-outline' : category.icon} size={size * 0.48} color={Colors.ink} />
        </View>
      )}
      {t.recurring ? (
        <View style={styles.badge}>
          <Ionicons name="sync" size={11} color={Colors.white} />
        </View>
      ) : null}
    </View>
  );
}

/** One transaction in a list. Tapping it opens the transaction. */
export function TransactionRow({ transaction: t, subtitle }: { transaction: Transaction; subtitle?: string }) {
  const router = useRouter();
  const inflow = isInflow(t);
  const ignored = t.ignore !== 'none';
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: t.id } })}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
      <TransactionIcon transaction={t} />
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {t.merchant}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle ?? `${fullDate(t.date)}${t.pending ? ' | Pending' : ''}`}
        </Text>
      </View>
      <View style={styles.right}>
        {ignored ? <Ionicons name="ban-outline" size={18} color={Colors.textMuted} /> : null}
        <Text style={[styles.amount, inflow && styles.inflow, ignored && styles.ignored]}>
          {`${inflow ? '+' : ''}${money(Math.abs(t.amount), { cents: true })}`}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, paddingHorizontal: Spacing.lg, paddingVertical: 14 },
  circle: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.ink,
    borderWidth: 1.5,
    borderColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1 },
  title: { fontSize: 16, color: Colors.text, fontWeight: '500' },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 3 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  amount: { fontSize: 16, color: Colors.text, fontWeight: '600', fontVariant: ['tabular-nums'] },
  inflow: { color: Colors.positive },
  ignored: { color: Colors.textMuted },
});
