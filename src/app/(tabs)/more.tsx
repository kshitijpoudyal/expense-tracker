import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, type Href } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Card, Divider, IconBadge, Row, SectionLabel } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { user, type IconName } from '@/data/mock';

const TOOLS: { title: string; subtitle: string; icon: IconName; href: Href }[] = [
  { title: 'Budget', subtitle: 'Plan the month by category', icon: 'wallet-outline', href: '/budget' },
  { title: 'Net worth', subtitle: 'Assets and debt over time', icon: 'stats-chart-outline', href: '/net-worth' },
  { title: 'Credit score', subtitle: 'Score and the factors behind it', icon: 'speedometer-outline', href: '/credit-score' },
];

const SERVICES: typeof TOOLS = [
  { title: 'Cancel subscriptions', subtitle: 'Have a subscription cancelled for you', icon: 'close-circle-outline', href: '/cancel' },
  { title: 'Lower your bills', subtitle: 'Request a better rate on a bill', icon: 'cut-outline', href: '/lower-bills' },
];

export default function More() {
  const router = useRouter();
  const chevron = <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />;
  const list = (items: typeof TOOLS) => (
    <Card>
      {items.map((item, i) => (
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
  );

  return (
    <Screen title="More" overlap={60} header={<Text style={styles.name}>{user.fullName}</Text>}>
      <Card style={styles.premium}>
        <Text style={styles.premiumTitle}>Kay Money Premium</Text>
        <Text style={styles.premiumBody}>Unlimited budgets, net worth tracking and concierge requests. Sample banner only.</Text>
      </Card>
      <SectionLabel>Tools</SectionLabel>
      {list(TOOLS)}
      <SectionLabel>Services</SectionLabel>
      {list(SERVICES)}
      <SectionLabel>Account</SectionLabel>
      <Card>
        <Row left={<IconBadge name="settings-outline" />} title="Settings" subtitle={user.email} right={chevron} onPress={() => router.push('/settings')} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { color: Colors.white, fontSize: 24, fontWeight: '600', paddingHorizontal: Spacing.xl + 4, marginTop: Spacing.md },
  premium: { padding: Spacing.xl, backgroundColor: Colors.ink },
  premiumTitle: { color: Colors.white, fontSize: 18, fontWeight: '600' },
  premiumBody: { color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 20, marginTop: Spacing.xs },
});
