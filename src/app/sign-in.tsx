import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, PrimaryButton } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

export default function SignIn() {
  const insets = useSafeAreaInsets();
  const { signIn, signUp } = useAuth();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const ready = email.includes('@') && password.length >= 6 && (!creating || name.trim().length > 0);

  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    if (creating) {
      const result = await signUp(name.trim(), email.trim(), password);
      setError(result.error);
      if (result.needsConfirmation) {
        setNotice('Check your email for a confirmation link, then sign in.');
        setCreating(false);
      }
    } else {
      setError(await signIn(email.trim(), password));
    }
    setBusy(false);
  };

  return (
    <LinearGradient colors={Colors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.root}>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined} style={styles.root}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.xxl * 2, paddingBottom: insets.bottom + Spacing.xxl }]}>
          <Text style={styles.brand}>Kay Money</Text>
          <Text style={styles.tagline}>{creating ? 'Create your account' : 'Sign in to see your money'}</Text>
          <Card style={styles.card}>
            {creating ? (
              <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={Colors.textMuted} autoComplete="name" style={styles.input} />
            ) : null}
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              style={styles.input}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password (6 or more characters)"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              autoComplete={creating ? 'new-password' : 'current-password'}
              secureTextEntry
              onSubmitEditing={submit}
              style={styles.input}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {notice ? <Text style={styles.notice}>{notice}</Text> : null}
            <PrimaryButton
              label={busy ? 'One moment…' : creating ? 'Create account' : 'Sign in'}
              onPress={submit}
              disabled={!ready || busy}
              style={styles.button}
            />
          </Card>
          <Pressable
            hitSlop={10}
            onPress={() => {
              setCreating((c) => !c);
              setError(null);
            }}>
            <Text style={styles.toggle}>{creating ? 'Already have an account? Sign in' : 'New here? Create an account'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1, width: '100%', maxWidth: 480, alignSelf: 'center' },
  brand: { color: Colors.white, fontSize: 34, fontWeight: '700', paddingHorizontal: Spacing.xl + 4 },
  tagline: { color: 'rgba(255,255,255,0.85)', fontSize: 16, paddingHorizontal: Spacing.xl + 4, marginTop: Spacing.xs, marginBottom: Spacing.xxl },
  card: { padding: Spacing.xl, gap: Spacing.md },
  input: {
    backgroundColor: Colors.chip,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
  },
  button: { marginTop: Spacing.xs },
  error: { fontSize: 14, color: Colors.accent },
  notice: { fontSize: 14, color: Colors.positive },
  toggle: { color: Colors.white, fontSize: 15, fontWeight: '600', textAlign: 'center', marginTop: Spacing.xl },
});
