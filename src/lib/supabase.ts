import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { sessionStorage } from '@/lib/session-storage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const canPersist = sessionStorage !== undefined;

/** Null when the Supabase keys are not set. The app then runs on sample data with no sign-in. */
export const supabase =
  url && key
    ? createClient(url, key, {
        auth: {
          storage: sessionStorage,
          autoRefreshToken: canPersist,
          persistSession: canPersist,
          detectSessionInUrl: false,
        },
      })
    : null;

if (supabase && process.env.EXPO_OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
