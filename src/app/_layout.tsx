import { Stack } from 'expo-router/stack';
import { View } from 'react-native';

import { Colors } from '@/constants/theme';
import { FinanceProvider } from '@/data/finance';
import { AuthProvider, useAuth } from '@/lib/auth';

export default function RootLayout() {
  return (
    <AuthProvider>
      <FinanceProvider>
        <Navigator />
      </FinanceProvider>
    </AuthProvider>
  );
}

function Navigator() {
  const { enabled, loading, session } = useAuth();
  // Hold a blank screen while the stored session is read, so signed-in users never see the sign-in form flash.
  if (loading) return <View style={{ flex: 1, backgroundColor: Colors.background }} />;
  // Without a backend configured there is nothing to sign in to; the app shows sample data.
  const signedIn = !enabled || session !== null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="budget" />
        <Stack.Screen name="category/[id]" />
        <Stack.Screen name="net-worth" />
        <Stack.Screen name="rules" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="transaction/[id]" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}
