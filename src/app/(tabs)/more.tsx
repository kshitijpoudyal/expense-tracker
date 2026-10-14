import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, type Href } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Card, Divider, IconBadge, Row, SectionLabel } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useFinance } from '@/data/finance';
import type { IconName } from '@/data/types';

const TOOLS: { title: string; subtitle: string; icon: IconName; href: Href }[] = [
  { title: 'Budget', subtitle: 'Plan the month by category', icon: 'wallet-outline', href: '/budget' },
  { title: 'Net worth', subtitle: 'Assets and debt over time', icon: 'stats-chart-outline', href: '/net-worth' },
  { title: 'Rules', subtitle: 'Automatic names, categories and ignores', icon: 'flash-outline', href: '/rules' },
];

export default function More() {
  const router = useRouter();
  const { user } = useFinance();
  const chevron = <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />;

  return (
    <Screen title="More" overlap={60} header={<Text style={styles.name}>{user.fullName}</Text>}>
      <Card>
        {TOOLS.map((item, i) => (
          <View key={item.title}>
            {i > 0 ? <Divider /> : null}
            <Row
              left={<IconBadge name={item.icon} />}
              title={item.title}
              subtitle={item.subtitle}
              right={chevron}
              onPress={() => router.push(item.href)}
            />
          </View>
        ))}
      </Card>
      <SectionLabel>Account</SectionLabel>
      <Card>
        <Row left={<IconBadge name="settings-outline" />} title="Settings" subtitle={user.email} right={chevron} onPress={() => router.push('/settings')} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { color: Colors.white, fontSize: 24, fontWeight: '600', paddingHorizontal: Spacing.xl + 4, marginTop: Spacing.md },
});
