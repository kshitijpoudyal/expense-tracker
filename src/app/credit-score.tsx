import { StyleSheet, Text, View } from 'react-native';

import { Gauge } from '@/components/charts';
import { Screen } from '@/components/screen';
import { Card, Divider, Row, SectionLabel, TrendPill } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useFinance } from '@/data/finance';

const TONE: Record<string, string> = { Excellent: Colors.positive, Good: Colors.positive, Fair: Colors.warning };

export default function CreditScore() {
  const { creditScore } = useFinance();
  if (!creditScore) {
    return (
      <Screen title="Credit score" back>
        <Card style={styles.card}>
          <Text style={styles.rating}>Not available</Text>
          <Text style={styles.note}>Linked bank accounts do not include a credit score, so there is nothing to show here yet.</Text>
        </Card>
      </Screen>
    );
  }
  return (
    <Screen title="Credit score" back>
      <Card style={styles.card}>
        <Gauge value={creditScore.score} min={300} max={850}>
          <Text style={styles.score}>{creditScore.score}</Text>
          <Text style={styles.rating}>{creditScore.rating}</Text>
        </Gauge>
        <View style={styles.range}>
          <Text style={styles.small}>300</Text>
          <TrendPill value={`${creditScore.change} pts this month`} />
          <Text style={styles.small}>850</Text>
        </View>
      </Card>

      <SectionLabel>Score factors</SectionLabel>
      <Card>
        {creditScore.factors.map((f, i) => (
          <View key={f.label}>
            {i > 0 ? <Divider /> : null}
            <Row
              title={f.label}
              subtitle={f.value}
              right={<Text style={[styles.status, { color: TONE[f.status] ?? Colors.text }]}>{f.status}</Text>}
            />
          </View>
        ))}
      </Card>
      <Text style={styles.note}>Sample score. No credit bureau is queried.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.xl, paddingTop: Spacing.xxl, alignItems: 'center' },
  score: { fontSize: 52, fontWeight: '600', color: Colors.ink, lineHeight: 56 },
  rating: { fontSize: 15, color: Colors.textSecondary, marginBottom: Spacing.xs },
  range: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch', marginTop: Spacing.md },
  small: { fontSize: 13, color: Colors.textSecondary },
  status: { fontSize: 15, fontWeight: '600' },
  note: { textAlign: 'center', fontSize: 13, color: Colors.textMuted, marginTop: Spacing.lg },
});
