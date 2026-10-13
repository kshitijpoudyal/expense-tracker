import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import type { IconName } from '@/data/mock';

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionLabel({ children, action, onAction }: { children: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionLabel}>{children.toUpperCase()}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function Avatar({ label, color, size = 44 }: { label: string; color: string; size?: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>{label.trim().charAt(0).toUpperCase()}</Text>
    </View>
  );
}

export function IconBadge({ name, size = 44, color = Colors.ink, bg = Colors.chip }: { name: IconName; size?: number; color?: string; bg?: string }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Ionicons name={name} size={size * 0.48} color={color} />
    </View>
  );
}

export function Row({
  left,
  title,
  subtitle,
  right,
  onPress,
}: {
  left?: ReactNode;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {left}
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.rowSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </Pressable>
  );
}

export function Amount({ children, tone }: { children: string; tone?: 'positive' | 'muted' }) {
  return (
    <Text style={[styles.amount, tone === 'positive' && { color: Colors.positive }, tone === 'muted' && { color: Colors.textSecondary }]}>
      {children}
    </Text>
  );
}

export function ProgressBar({ value, color = Colors.blue, height = 6 }: { value: number; color?: string; height?: number }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <View style={{ width: `${pct}%`, height, borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}

export function TrendPill({ value, tone = 'positive' }: { value: string; tone?: 'positive' | 'warning' }) {
  const fg = tone === 'positive' ? Colors.positive : Colors.warning;
  return (
    <View style={[styles.trend, { backgroundColor: tone === 'positive' ? Colors.positiveBg : Colors.warningBg }]}>
      <Ionicons name="arrow-up" size={13} color={fg} />
      <Text style={[styles.trendText, { color: fg }]}>{value}</Text>
    </View>
  );
}

export function PrimaryButton({ label, onPress, style }: { label: string; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.button, pressed && styles.pressed, style]}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => (
        <Pressable key={o} onPress={() => onChange(o)} style={[styles.segment, o === value && styles.segmentActive]}>
          <Text style={[styles.segmentText, o === value && styles.segmentTextActive]}>{o}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    marginHorizontal: Spacing.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.xl + 4,
    marginTop: Spacing.xxl,
    marginBottom: Spacing.md,
  },
  sectionLabel: { fontSize: 12, letterSpacing: 1.2, color: Colors.text, fontWeight: '500' },
  sectionAction: { fontSize: 14, color: Colors.ink, fontWeight: '600', textDecorationLine: 'underline' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: Colors.white, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, paddingHorizontal: Spacing.lg, paddingVertical: 14 },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 16, color: Colors.text, fontWeight: '500' },
  rowSubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 3 },
  amount: { fontSize: 16, color: Colors.text, fontWeight: '600', fontVariant: ['tabular-nums'] },
  pressed: { opacity: 0.6 },
  track: { backgroundColor: Colors.track, overflow: 'hidden' },
  trend: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.pill },
  trendText: { fontSize: 13, fontWeight: '600' },
  button: { backgroundColor: Colors.ink, borderRadius: Radius.pill, paddingVertical: 17, alignItems: 'center' },
  buttonText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
  segmented: { flexDirection: 'row', backgroundColor: Colors.chip, borderRadius: Radius.pill, padding: 4 },
  segment: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: Radius.pill },
  segmentActive: {
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  segmentTextActive: { color: Colors.ink },
});
