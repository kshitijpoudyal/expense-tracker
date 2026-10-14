import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Card, Divider, EmptyRow, IconBadge, Row } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useFinance } from '@/data/finance';
import { categories, IGNORE_LABELS, type Rule } from '@/data/types';

function describe(rule: Rule) {
  const actions = [
    rule.rename ? `rename to “${rule.rename}”` : null,
    rule.category ? `file under ${categories[rule.category].name}` : null,
    rule.ignore && rule.ignore !== 'none' ? `ignore ${IGNORE_LABELS[rule.ignore].toLowerCase()}` : null,
  ].filter(Boolean);
  return actions.join(', ') || 'no changes';
}

export default function Rules() {
  const { rules, deleteRule, transactions } = useFinance();
  // Deleting takes a second tap to confirm.
  const [confirming, setConfirming] = useState<string | null>(null);

  return (
    <Screen title="Rules" variant="plain" back>
      <Text style={styles.intro}>
        Rules rename, categorize or ignore transactions whose name or statement description contains some text. Create one from any
        transaction. Changes you make to a single transaction always win over a rule.
      </Text>
      <Card>
        {rules.length === 0 ? <EmptyRow>No rules yet.</EmptyRow> : null}
        {rules.map((rule, i) => {
          const match = rule.match.toLowerCase();
          const count = transactions.filter((t) => `${t.bankMerchant}\n${t.description}`.toLowerCase().includes(match)).length;
          return (
            <View key={rule.id}>
              {i > 0 ? <Divider /> : null}
              <Row
                left={<IconBadge name="flash-outline" />}
                title={`Contains “${rule.match}”`}
                subtitle={`${describe(rule)} · ${count} ${count === 1 ? 'match' : 'matches'}`}
                right={
                  <Pressable
                    hitSlop={8}
                    onPress={() => {
                      if (confirming !== rule.id) return setConfirming(rule.id);
                      setConfirming(null);
                      deleteRule(rule.id);
                    }}>
                    <Text style={styles.delete}>{confirming === rule.id ? 'Tap again' : 'Delete'}</Text>
                  </Pressable>
                }
              />
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 14, lineHeight: 20, color: Colors.textSecondary, marginHorizontal: Spacing.xl + 4, marginVertical: Spacing.lg },
  delete: { fontSize: 14, fontWeight: '600', color: Colors.accent },
});
