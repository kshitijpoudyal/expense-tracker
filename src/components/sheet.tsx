import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';

/** A panel that slides up from the bottom of the screen. Tapping outside it closes it. */
export function Sheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined} style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.panel, { paddingBottom: insets.bottom + Spacing.lg }]}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable hitSlop={12} onPress={onClose} accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={Colors.ink} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** A list of choices with a check mark on the current one. */
export function OptionList<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; left?: ReactNode }[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <View>
      {options.map((o) => (
        <Pressable key={o.value} onPress={() => onChange(o.value)} style={({ pressed }) => [styles.option, pressed && { opacity: 0.6 }]}>
          {o.left}
          <Text style={styles.optionText}>{o.label}</Text>
          {o.value === value ? <Ionicons name="checkmark" size={22} color={Colors.positive} /> : null}
        </Pressable>
      ))}
    </View>
  );
}

/** A sheet with one text field and a Save button. Saving an empty field passes an empty string. */
export function TextSheet({
  visible,
  title,
  initial,
  placeholder,
  multiline,
  keyboardType,
  hint,
  onClose,
  onSave,
}: {
  visible: boolean;
  title: string;
  initial: string;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'decimal-pad';
  hint?: string;
  onClose: () => void;
  onSave: (value: string) => void;
}) {
  return (
    <Sheet visible={visible} title={title} onClose={onClose}>
      {/* Remounting on open resets the field to the current value. */}
      {visible ? (
        <TextForm initial={initial} placeholder={placeholder} multiline={multiline} keyboardType={keyboardType} hint={hint} onSave={onSave} />
      ) : null}
    </Sheet>
  );
}

function TextForm({
  initial,
  placeholder,
  multiline,
  keyboardType,
  hint,
  onSave,
}: {
  initial: string;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'decimal-pad';
  hint?: string;
  onSave: (value: string) => void;
}) {
  const [text, setText] = useState(initial);
  return (
    <>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        autoFocus
        multiline={multiline}
        keyboardType={keyboardType}
        style={[styles.input, multiline && styles.multiline]}
        onSubmitEditing={multiline ? undefined : () => onSave(text.trim())}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <PrimaryButton label="Save" onPress={() => onSave(text.trim())} style={{ marginTop: Spacing.lg }} />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.35)' },
  panel: { backgroundColor: Colors.card, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg, maxHeight: '85%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.xl, paddingBottom: Spacing.md },
  title: { fontSize: 18, fontWeight: '600', color: Colors.ink },
  body: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md },
  option: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 13 },
  optionText: { flex: 1, fontSize: 16, color: Colors.text },
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
  multiline: { minHeight: 110, textAlignVertical: 'top' },
  hint: { fontSize: 13, color: Colors.textSecondary, marginTop: Spacing.sm, lineHeight: 18 },
});
