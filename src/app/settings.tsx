import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Avatar, Card, Divider, IconBadge, Row, SectionLabel } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { accounts, user } from '@/data/mock';

const ALERTS = ['Upcoming charges', 'Low balance', 'Large transactions', 'Price increases'] as const;

export default function Settings() {
  const [alerts, setAlerts] = useState<Record<string, boolean>>({
    'Upcoming charges': true,
    'Low balance': true,
    'Large transactions': false,
    'Price increases': true,
  });
  const institutions = [...new Set(accounts.map((a) => a.institution))];

  return (
    <Screen title="Settings" variant="plain" back>
      <Card style={styles.profile}>
        <Avatar label={user.fullName} color={Colors.accent} size={56} />
        <View>
          <Text style={styles.name}>{user.fullName}</Text>
          <Text style={styles.email}>{user.email}</Text>
        </View>
      </Card>

      <SectionLabel action="Link account">Linked institutions</SectionLabel>
      <Card>
        {institutions.map((name, i) => (
          <View key={name}>
            {i > 0 ? <Divider /> : null}
            <Row
              left={<IconBadge name="business-outline" />}
              title={name}
              subtitle={`${accounts.filter((a) => a.institution === name).length} accounts · Sample data`}
              right={<Ionicons name="checkmark-circle" size={20} color={Colors.positive} />}
            />
          </View>
        ))}
      </Card>

      <SectionLabel>Notifications</SectionLabel>
      <Card>
        {ALERTS.map((label, i) => (
          <View key={label}>
            {i > 0 ? <Divider /> : null}
            <Row
              title={label}
              right={
                <Switch
                  value={alerts[label]}
                  onValueChange={(v) => setAlerts((a) => ({ ...a, [label]: v }))}
                  trackColor={{ true: '#4E9A64', false: Colors.track }}
                  thumbColor={Colors.white}
                />
              }
            />
          </View>
        ))}
      </Card>
      <Text style={styles.version}>Kay Money 1.0.0 · sample data build</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, padding: Spacing.xl, marginTop: Spacing.md },
  name: { fontSize: 19, fontWeight: '600', color: Colors.ink },
  email: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  version: { textAlign: 'center', fontSize: 13, color: Colors.textMuted, marginTop: Spacing.xxl },
});
