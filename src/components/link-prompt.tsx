import { StyleSheet, Text } from 'react-native';

import { Card, PrimaryButton } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useFinance } from '@/data/finance';

/** Shown on the dashboard until the signed-in user has linked a bank, and whenever a sync fails. */
export function LinkPrompt() {
  const { status, busy, error, connectBank } = useFinance();
  if (status === 'sample' || (status === 'ready' && !error)) return null;

  return (
    <Card style={styles.card}>
      {status === 'loading' ? <Text style={styles.body}>Loading your accounts…</Text> : null}
      {status === 'empty' ? (
        <>
          <Text style={styles.title}>Connect your bank</Text>
          <Text style={styles.body}>Link an account to see your real balances, spending and recurring charges.</Text>
          <PrimaryButton label={busy ? 'Connecting…' : 'Connect a bank'} onPress={connectBank} disabled={busy} style={styles.button} />
        </>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.xl, marginBottom: Spacing.md },
  title: { fontSize: 19, fontWeight: '600', color: Colors.ink },
  body: { fontSize: 14, lineHeight: 20, color: Colors.textSecondary, marginTop: Spacing.xs },
  button: { marginTop: Spacing.lg },
  error: { fontSize: 14, lineHeight: 20, color: Colors.accent, marginTop: Spacing.sm },
});
