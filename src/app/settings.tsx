import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Avatar, Card, Divider, EmptyRow, IconBadge, PrimaryButton, Row, SectionLabel } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useFinance } from '@/data/finance';
import { useAuth } from '@/lib/auth';

const ALERTS = ['Upcoming charges', 'Low balance', 'Large transactions', 'Price increases'] as const;

export default function Settings() {
  const [alerts, setAlerts] = useState<Record<string, boolean>>({
    'Upcoming charges': true,
    'Low balance': true,
    'Large transactions': false,
    'Price increases': true,
  });
  const { accounts, busy, connectBank, error, institutions, refresh, removeInstitution, status, user } = useFinance();
  const { signOut } = useAuth();
  // Removing an institution deletes its data, so it takes a second tap to confirm.
  const [confirming, setConfirming] = useState<string | null>(null);
  const sample = status === 'sample';
  const sampleInstitutions = [...new Set(accounts.map((a) => a.institution))];

  return (
    <Screen title="Settings" variant="plain" back>
      <Card style={styles.profile}>
        <Avatar label={user.fullName} color={Colors.accent} size={56} />
        <View>
          <Text style={styles.name}>{user.fullName}</Text>
          <Text style={styles.email}>{user.email}</Text>
        </View>
      </Card>

      {sample ? (
        <>
          <SectionLabel>Linked institutions</SectionLabel>
          <Card>
            {sampleInstitutions.map((name, i) => (
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
        </>
      ) : (
        <>
          <SectionLabel action={busy ? 'Working…' : 'Link account'} onAction={busy ? undefined : connectBank}>
            Linked institutions
          </SectionLabel>
          <Card>
            {institutions.length === 0 ? <EmptyRow>No bank linked yet. Choose Link account to connect one.</EmptyRow> : null}
            {institutions.map((item, i) => (
              <View key={item.itemId}>
                {i > 0 ? <Divider /> : null}
                <Row
                  left={<IconBadge name="business-outline" />}
                  title={item.name}
                  subtitle={`${item.accounts} ${item.accounts === 1 ? 'account' : 'accounts'}`}
                  right={
                    <Pressable
                      hitSlop={8}
                      disabled={busy}
                      onPress={() => {
                        if (confirming !== item.itemId) return setConfirming(item.itemId);
                        setConfirming(null);
                        removeInstitution(item.itemId);
                      }}>
                      <Text style={styles.remove}>{confirming === item.itemId ? 'Tap again to remove' : 'Remove'}</Text>
                    </Pressable>
                  }
                />
              </View>
            ))}
          </Card>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {institutions.length > 0 ? (
            <PrimaryButton label={busy ? 'Refreshing…' : 'Refresh balances and transactions'} onPress={refresh} disabled={busy} style={styles.action} />
          ) : null}
        </>
      )}

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
      {sample ? null : (
        <Pressable onPress={signOut} style={({ pressed }) => [styles.signOut, pressed && { opacity: 0.6 }]}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      )}
      <Text style={styles.version}>Kay Money 1.0.0{sample ? ' · sample data build' : ''}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, padding: Spacing.xl, marginTop: Spacing.md },
  name: { fontSize: 19, fontWeight: '600', color: Colors.ink },
  email: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  remove: { fontSize: 14, fontWeight: '600', color: Colors.accent },
  error: { fontSize: 14, color: Colors.accent, marginHorizontal: Spacing.xl + 4, marginTop: Spacing.md },
  action: { marginHorizontal: Spacing.lg, marginTop: Spacing.lg },
  signOut: { alignItems: 'center', paddingVertical: Spacing.lg, marginTop: Spacing.xl },
  signOutText: { fontSize: 16, fontWeight: '600', color: Colors.accent },
  version: { textAlign: 'center', fontSize: 13, color: Colors.textMuted, marginTop: Spacing.md },
});
