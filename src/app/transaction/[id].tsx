import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Screen } from '@/components/screen';
import { OptionList, Sheet, TextSheet } from '@/components/sheet';
import { TransactionRow } from '@/components/transaction-row';
import { Card, Divider, EmptyRow, IconBadge, PrimaryButton, Row } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useFinance } from '@/data/finance';
import { categories, categoryIds, IGNORE_LABELS, isInflow, type CategoryId, type Ignore, type Split, type Transaction } from '@/data/types';
import { dayShort, fullDate, money, monthShort, parseDate } from '@/lib/format';

type Open = null | 'category' | 'rename' | 'ignore' | 'tags' | 'note' | 'rule' | 'split';

const IGNORES = Object.keys(IGNORE_LABELS) as Ignore[];

export default function TransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { transactions, updateTransaction } = useFinance();
  const [open, setOpen] = useState<Open>(null);
  const [showHistory, setShowHistory] = useState(false);
  const t = transactions.find((x) => x.id === id);

  if (!t) {
    return (
      <Screen title="Transaction" variant="plain" back>
        <Card>
          <EmptyRow>This transaction is no longer available. The bank may have replaced it when it posted.</EmptyRow>
        </Card>
      </Screen>
    );
  }

  const date = parseDate(t.date);
  const category = categories[t.category];
  const inflow = isInflow(t);
  const history = transactions.filter((x) => x.id !== t.id && x.bankMerchant === t.bankMerchant);
  const close = () => setOpen(null);
  const toggle = (value: boolean, onChange: (v: boolean) => void) => (
    <Switch value={value} onValueChange={onChange} trackColor={{ true: '#4E9A64', false: Colors.track }} thumbColor={Colors.white} />
  );
  const value = (text: string) => (
    <View style={styles.value}>
      <Text style={styles.valueText} numberOfLines={1}>
        {text}
      </Text>
      <Ionicons name="chevron-down" size={16} color={Colors.ink} />
    </View>
  );

  return (
    <Screen title={`${dayShort(date)}, ${monthShort(date)} ${date.getDate()}`} variant="plain" back>
      <View style={[styles.hero, { backgroundColor: `${category.color}38` }]}>
        {t.pending ? (
          <View style={styles.pending}>
            <Text style={styles.pendingText}>Pending Transaction</Text>
          </View>
        ) : null}
        <Text style={styles.name}>{t.merchant}</Text>
        <Text style={[styles.amount, inflow && { color: Colors.positive }]}>
          {`${inflow ? '+' : ''}${money(Math.abs(t.amount), { cents: true })}`}
        </Text>
        <Text style={styles.descriptionLabel}>Statement Description</Text>
        <Text style={styles.description}>{t.description}</Text>
        <Pressable onPress={() => setOpen('category')} style={({ pressed }) => [styles.categoryPill, pressed && { opacity: 0.6 }]}>
          <Ionicons name={t.splits.length ? 'git-branch-outline' : category.icon} size={18} color={Colors.ink} />
          <Text style={styles.categoryText}>{t.splits.length ? 'Split' : category.name}</Text>
          <Ionicons name="chevron-down" size={16} color={Colors.ink} />
        </Pressable>
      </View>

      <Card style={styles.firstCard}>
        <Row left={<IconBadge name="pencil-outline" />} title="Rename" subtitle={t.merchant !== t.bankMerchant ? `Bank name: ${t.bankMerchant}` : undefined} onPress={() => setOpen('rename')} />
        <Divider />
        <Row left={<IconBadge name="time-outline" />} title="Is Recurring?" right={toggle(t.recurring, (recurring) => updateTransaction(t.id, { recurring }))} />
        <Divider />
        <Row left={<IconBadge name="ban-outline" />} title="Ignore" right={value(IGNORE_LABELS[t.ignore])} onPress={() => setOpen('ignore')} />
      </Card>

      <Card style={styles.card}>
        <Row
          left={<IconBadge name="pricetag-outline" />}
          title={t.tags.length ? 'Tags' : 'Add Tags'}
          subtitle={t.tags.length ? t.tags.map((tag) => `#${tag}`).join('  ') : undefined}
          onPress={() => setOpen('tags')}
        />
        <Divider />
        <Row left={<IconBadge name="document-text-outline" />} title={t.note ? 'Note' : 'Add Note'} subtitle={t.note || undefined} onPress={() => setOpen('note')} />
        <Divider />
        <Row left={<IconBadge name="flash-outline" />} title="Create Rule" onPress={() => setOpen('rule')} />
        <Divider />
        <Row
          left={<IconBadge name="git-branch-outline" />}
          title="Split"
          subtitle={t.splits.length ? t.splits.map((s) => `${categories[s.category].name} ${money(s.amount)}`).join(' · ') : undefined}
          onPress={() => setOpen('split')}
        />
        <Divider />
        <Row left={<IconBadge name="checkmark" />} title="Reviewed" right={toggle(t.reviewed, (reviewed) => updateTransaction(t.id, { reviewed }))} />
      </Card>

      <Pressable onPress={() => setShowHistory((s) => !s)} style={({ pressed }) => [styles.history, pressed && { opacity: 0.6 }]}>
        <Text style={styles.historyText}>
          {showHistory ? 'Hide History' : 'See History'} ({history.length})
        </Text>
      </Pressable>
      {showHistory ? (
        <Card>
          {history.length === 0 ? <EmptyRow>No other transactions from this merchant.</EmptyRow> : null}
          {history.map((h, i) => (
            <View key={h.id}>
              {i > 0 ? <Divider /> : null}
              <TransactionRow transaction={h} />
            </View>
          ))}
        </Card>
      ) : null}

      <View style={styles.footer}>
        <Text style={styles.footerLabel}>Account</Text>
        <Text style={styles.footerValue}>
          {t.institution || t.account}
          {t.accountMask ? ` | ··${t.accountMask}` : ''}
        </Text>
        <Text style={[styles.footerLabel, { marginTop: Spacing.lg }]}>Transacted Date</Text>
        <Text style={styles.footerValue}>{fullDate(t.date, new Date(0))}</Text>
      </View>

      <Sheet visible={open === 'category'} title="Category" onClose={close}>
        <OptionList
          options={categoryIds.map((c) => ({ value: c, label: categories[c].name, left: <IconBadge name={categories[c].icon} size={36} bg={`${categories[c].color}40`} /> }))}
          value={t.splits.length ? null : t.category}
          onChange={(c) => {
            updateTransaction(t.id, { category: c });
            close();
          }}
        />
      </Sheet>

      <Sheet visible={open === 'ignore'} title="Ignore" onClose={close}>
        <Text style={styles.sheetHint}>From budget keeps it in your spending but out of budgets. From everything leaves it out of every total.</Text>
        <OptionList
          options={IGNORES.map((i) => ({ value: i, label: IGNORE_LABELS[i] }))}
          value={t.ignore}
          onChange={(ignore) => {
            updateTransaction(t.id, { ignore });
            close();
          }}
        />
      </Sheet>

      <TextSheet
        visible={open === 'rename'}
        title="Rename"
        initial={t.merchant}
        placeholder={t.bankMerchant}
        hint={`Leave empty to go back to the bank's name, ${t.bankMerchant}.`}
        onClose={close}
        onSave={(name) => {
          updateTransaction(t.id, { name: name && name !== t.bankMerchant ? name : null });
          close();
        }}
      />

      <TextSheet
        visible={open === 'tags'}
        title="Tags"
        initial={t.tags.join(', ')}
        placeholder="vacation, reimbursable"
        hint="Separate tags with commas."
        onClose={close}
        onSave={(text) => {
          const tags = [...new Set(text.split(',').map((tag) => tag.trim().replace(/^#/, '').toLowerCase()).filter(Boolean))];
          updateTransaction(t.id, { tags });
          close();
        }}
      />

      <TextSheet
        visible={open === 'note'}
        title="Note"
        initial={t.note}
        placeholder="Anything you want to remember"
        multiline
        onClose={close}
        onSave={(note) => {
          updateTransaction(t.id, { note: note || null });
          close();
        }}
      />

      <Sheet visible={open === 'rule'} title="Create Rule" onClose={close}>
        {open === 'rule' ? <RuleForm transaction={t} onDone={close} /> : null}
      </Sheet>

      <Sheet visible={open === 'split'} title="Split Transaction" onClose={close}>
        {open === 'split' ? <SplitForm transaction={t} onDone={close} /> : null}
      </Sheet>
    </Screen>
  );
}

function RuleForm({ transaction: t, onDone }: { transaction: Transaction; onDone: () => void }) {
  const { addRule } = useFinance();
  const [match, setMatch] = useState(t.bankMerchant);
  const renamed = t.merchant !== t.bankMerchant;
  const [rename, setRename] = useState(renamed);
  const [category, setCategory] = useState(true);
  const [ignore, setIgnore] = useState(t.ignore !== 'none');
  const ready = match.trim().length > 0 && (rename || category || ignore);

  const option = (label: string, on: boolean, set: (v: boolean) => void) => (
    <Pressable onPress={() => set(!on)} style={styles.check}>
      <Ionicons name={on ? 'checkbox' : 'square-outline'} size={22} color={on ? Colors.ink : Colors.textMuted} />
      <Text style={styles.checkText}>{label}</Text>
    </Pressable>
  );

  return (
    <>
      <Text style={styles.fieldLabel}>When the name or statement description contains</Text>
      <TextInput value={match} onChangeText={setMatch} style={styles.input} autoCapitalize="none" placeholderTextColor={Colors.textMuted} />
      <Text style={[styles.fieldLabel, { marginTop: Spacing.lg }]}>Then</Text>
      {renamed ? option(`Rename to “${t.merchant}”`, rename, setRename) : null}
      {option(`Set category to ${categories[t.category].name}`, category, setCategory)}
      {t.ignore !== 'none' ? option(`Ignore ${IGNORE_LABELS[t.ignore].toLowerCase()}`, ignore, setIgnore) : null}
      <Text style={styles.sheetHint}>The rule applies to past and future transactions. Changes you make to a single transaction still win.</Text>
      <PrimaryButton
        label="Save rule"
        disabled={!ready}
        style={{ marginTop: Spacing.lg }}
        onPress={() => {
          addRule({
            match: match.trim(),
            rename: renamed && rename ? t.merchant : null,
            category: category ? t.category : null,
            ignore: ignore && t.ignore !== 'none' ? t.ignore : null,
          });
          onDone();
        }}
      />
    </>
  );
}

type Part = { category: CategoryId; amount: string };

function SplitForm({ transaction: t, onDone }: { transaction: Transaction; onDone: () => void }) {
  const { setSplits } = useFinance();
  const target = Math.round(Math.abs(t.amount) * 100) / 100;
  const [parts, setParts] = useState<Part[]>(() =>
    t.splits.length
      ? t.splits.map((s) => ({ category: s.category, amount: s.amount.toFixed(2) }))
      : [
          // Starts as an even split for the user to adjust.
          { category: t.category, amount: (Math.ceil((target / 2) * 100) / 100).toFixed(2) },
          { category: 'other', amount: (target - Math.ceil((target / 2) * 100) / 100).toFixed(2) },
        ],
  );
  const amounts = parts.map((p) => Number(p.amount.replace(/[^0-9.]/g, '')) || 0);
  const remaining = Math.round((target - amounts.reduce((a, b) => a + b, 0)) * 100) / 100;
  const valid = parts.length >= 2 && remaining === 0 && amounts.every((a) => a > 0);
  const update = (i: number, change: Partial<Part>) => setParts((list) => list.map((p, j) => (j === i ? { ...p, ...change } : p)));

  return (
    <>
      <Text style={styles.sheetHint}>Divide {money(target, { cents: true })} between categories. The parts must add up to the full amount.</Text>
      {parts.map((p, i) => (
        <View key={i} style={styles.part}>
          <View style={styles.partTop}>
            <Text style={styles.fieldLabel}>Part {i + 1}</Text>
            {parts.length > 2 ? (
              <Pressable hitSlop={8} onPress={() => setParts((list) => list.filter((_, j) => j !== i))}>
                <Text style={styles.remove}>Remove</Text>
              </Pressable>
            ) : null}
          </View>
          <TextInput
            value={p.amount}
            onChangeText={(amount) => update(i, { amount })}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={Colors.textMuted}
            style={styles.input}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {categoryIds.map((c) => (
              <Pressable key={c} onPress={() => update(i, { category: c })} style={[styles.chip, p.category === c && styles.chipActive]}>
                <Text style={[styles.chipText, p.category === c && styles.chipTextActive]}>{categories[c].name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ))}
      <Pressable onPress={() => setParts((list) => [...list, { category: 'other', amount: remaining > 0 ? remaining.toFixed(2) : '' }])} style={styles.addPart}>
        <Ionicons name="add-circle-outline" size={20} color={Colors.ink} />
        <Text style={styles.addPartText}>Add part</Text>
      </Pressable>
      <Text style={[styles.remaining, !valid && { color: Colors.accent }]}>
        {remaining > 0
          ? `${money(remaining, { cents: true })} left to assign`
          : remaining < 0
            ? `${money(-remaining, { cents: true })} too much`
            : valid
              ? 'Fully split'
              : 'Every part needs an amount'}
      </Text>
      <PrimaryButton
        label="Save split"
        disabled={!valid}
        style={{ marginTop: Spacing.lg }}
        onPress={() => {
          setSplits(t.id, parts.map((p, i): Split => ({ category: p.category, amount: amounts[i] })));
          onDone();
        }}
      />
      {t.splits.length ? (
        <Pressable
          onPress={() => {
            setSplits(t.id, []);
            onDone();
          }}
          style={styles.unsplit}>
          <Text style={styles.remove}>Remove split</Text>
        </Pressable>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: 64, marginTop: Spacing.sm },
  pending: { backgroundColor: Colors.white, borderRadius: Radius.pill, paddingHorizontal: Spacing.lg, paddingVertical: 7, marginBottom: Spacing.lg },
  pendingText: { fontSize: 14, color: Colors.ink, fontWeight: '500' },
  name: { fontSize: 18, color: Colors.ink, fontWeight: '500', textAlign: 'center' },
  amount: { fontSize: 40, color: Colors.ink, fontWeight: '700', marginTop: Spacing.xs, fontVariant: ['tabular-nums'] },
  descriptionLabel: { fontSize: 13, color: Colors.ink, fontWeight: '600', marginTop: Spacing.md },
  description: { fontSize: 15, color: Colors.textSecondary, marginTop: 2, fontFamily: process.env.EXPO_OS === 'ios' ? 'Menlo' : 'monospace', textAlign: 'center' },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.ink,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 10,
    marginTop: Spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  categoryText: { fontSize: 16, color: Colors.ink, fontWeight: '500' },
  firstCard: { marginTop: -44 },
  card: { marginTop: Spacing.lg },
  value: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: 170 },
  valueText: { fontSize: 15, color: Colors.ink },
  history: {
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.xl,
    borderWidth: 1.5,
    borderColor: Colors.ink,
    borderRadius: Radius.pill,
    paddingVertical: 15,
    alignItems: 'center',
  },
  historyText: { fontSize: 16, fontWeight: '500', color: Colors.ink },
  footer: { marginHorizontal: Spacing.xl + 4, marginTop: Spacing.md },
  footerLabel: { fontSize: 14, fontWeight: '600', color: Colors.ink },
  footerValue: { fontSize: 15, color: Colors.textSecondary, marginTop: 3 },
  sheetHint: { fontSize: 14, lineHeight: 20, color: Colors.textSecondary, marginVertical: Spacing.sm },
  fieldLabel: { fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  check: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  checkText: { flex: 1, fontSize: 15, color: Colors.text },
  part: { marginTop: Spacing.lg },
  partTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chips: { gap: Spacing.sm, paddingTop: Spacing.sm },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: Radius.pill, backgroundColor: Colors.chip },
  chipActive: { backgroundColor: Colors.ink },
  chipText: { fontSize: 13, color: Colors.text },
  chipTextActive: { color: Colors.white },
  addPart: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.lg },
  addPartText: { fontSize: 15, color: Colors.ink, fontWeight: '500' },
  remaining: { fontSize: 14, color: Colors.positive, marginTop: Spacing.md },
  remove: { fontSize: 14, color: Colors.accent, fontWeight: '600' },
  unsplit: { alignItems: 'center', marginTop: Spacing.lg },
});
