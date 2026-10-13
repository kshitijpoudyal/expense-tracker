import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';
import type { IconName } from '@/data/mock';

type Props<T extends string> = {
  title: string;
  /** `gradient` is used for the main tabs, `plain` for pushed detail screens. */
  variant?: 'gradient' | 'plain';
  back?: boolean;
  rightIcon?: IconName;
  onRight?: () => void;
  tabs?: readonly T[];
  activeTab?: T;
  onTab?: (tab: T) => void;
  /** Extra content rendered on the gradient, below the title and tabs. */
  header?: ReactNode;
  /** How far the gradient extends behind the first card. */
  overlap?: number;
  children: ReactNode;
};

export function Screen<T extends string>({
  title,
  variant = 'gradient',
  back,
  rightIcon,
  onRight,
  tabs,
  activeTab,
  onTab,
  header,
  overlap = 110,
  children,
}: Props<T>) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const focused = useIsFocused();
  const onGradient = variant === 'gradient';
  const fg = onGradient ? Colors.white : Colors.ink;

  const top = (
    <View style={{ paddingTop: insets.top + Spacing.sm }}>
      <View style={styles.titleRow}>
        <Pressable
          hitSlop={12}
          style={styles.iconButton}
          onPress={() => (back ? router.back() : router.push('/settings'))}>
          <Ionicons name={back ? 'arrow-back' : 'settings-outline'} size={24} color={fg} />
        </Pressable>
        <Text style={[styles.title, { color: fg }]}>{title}</Text>
        <Pressable hitSlop={12} style={styles.iconButton} onPress={onRight} disabled={!rightIcon}>
          {rightIcon ? <Ionicons name={rightIcon} size={26} color={fg} /> : null}
        </Pressable>
      </View>
      {tabs ? (
        <View style={styles.tabs}>
          {tabs.map((tab) => {
            const active = tab === activeTab;
            return (
              <Pressable key={tab} style={[styles.tab, active && { borderBottomColor: fg }]} onPress={() => onTab?.(tab)}>
                <Text style={[styles.tabText, { color: fg, opacity: active ? 1 : 0.85 }]}>{tab}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {header}
    </View>
  );

  return (
    <View style={styles.root}>
      {focused ? <StatusBar style={onGradient ? 'light' : 'dark'} /> : null}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xxl }}
        keyboardShouldPersistTaps="handled">
        {onGradient ? (
          <LinearGradient
            colors={Colors.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingBottom: overlap, marginBottom: -overlap + Spacing.lg }}>
            {top}
          </LinearGradient>
        ) : (
          top
        )}
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    height: 48,
  },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '600' },
  tabs: {
    flexDirection: 'row',
    marginTop: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.45)',
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2.5, borderBottomColor: 'transparent' },
  tabText: { fontSize: 15, fontWeight: '600' },
});
