import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Avatar, Card, PrimaryButton, Row } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import type { IconName, Recurring } from '@/data/mock';
import { addDays, longDate } from '@/lib/format';

type Props = {
  title: string;
  heading: string;
  body: string;
  icon: IconName;
  badgeIcon: IconName;
  tint: string;
  badgeColor: string;
  /** When set, the list is hidden behind an intro screen with this button. */
  startLabel?: string;
  actionLabel: string;
  items: Recurring[];
};

/** Shared layout for the "cancel a subscription" and "lower a bill" request screens. */
export function RequestFlow({ title, heading, body, icon, badgeIcon, tint, badgeColor, startLabel, actionLabel, items }: Props) {
  const [started, setStarted] = useState(!startLabel);
  const [requested, setRequested] = useState<string[]>([]);
  const today = new Date();

  return (
    <Screen title={title} variant="plain" back>
      <View style={styles.hero}>
        <View style={[styles.art, { backgroundColor: tint }]}>
          <Ionicons name={icon} size={84} color={Colors.ink} />
          <View style={[styles.badge, { backgroundColor: badgeColor }]}>
            <Ionicons name={badgeIcon} size={34} color={Colors.ink} />
          </View>
        </View>
        <Text style={styles.heading}>{heading}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>

      {!started ? (
        <PrimaryButton label={startLabel ?? ''} onPress={() => setStarted(true)} style={styles.button} />
      ) : (
        <View style={{ gap: Spacing.sm + 2 }}>
          {items.map((item) => {
            const done = requested.includes(item.id);
            return (
              <Card key={item.id}>
                <Row
                  left={<Avatar label={item.name} color={item.color} />}
                  title={item.name}
                  subtitle={longDate(addDays(today, item.dueIn))}
                  right={
                    <Pressable
                      hitSlop={10}
                      style={styles.action}
                      onPress={() => setRequested((r) => (done ? r.filter((id) => id !== item.id) : [...r, item.id]))}>
                      <Text style={[styles.actionText, done && { color: Colors.positive }]}>{done ? 'Requested' : actionLabel}</Text>
                      <Ionicons name={done ? 'checkmark' : 'chevron-forward'} size={18} color={done ? Colors.positive : Colors.ink} />
                    </Pressable>
                  }
                />
              </Card>
            );
          })}
          <Text style={styles.note}>Sample flow. Requests are not sent anywhere.</Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingHorizontal: Spacing.xxl, paddingTop: Spacing.xxl, paddingBottom: Spacing.xl },
  art: { width: 190, height: 190, borderRadius: 44, borderWidth: 8, borderColor: Colors.white, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -26, right: -30, width: 74, height: 74, borderRadius: 37, alignItems: 'center', justifyContent: 'center' },
  heading: { fontSize: 30, lineHeight: 36, fontWeight: '600', color: Colors.ink, textAlign: 'center', marginTop: Spacing.xxl },
  body: { fontSize: 16, lineHeight: 23, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm },
  button: { marginHorizontal: Spacing.xxl + Spacing.lg, marginTop: Spacing.sm },
  action: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  actionText: { fontSize: 15, fontWeight: '600', color: Colors.ink },
  note: { textAlign: 'center', fontSize: 13, color: Colors.textMuted, marginTop: Spacing.md },
});
