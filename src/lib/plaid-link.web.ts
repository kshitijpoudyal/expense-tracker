import type { LinkResult } from './plaid-link';

type PlaidWeb = {
  create(config: {
    token: string;
    onSuccess: (publicToken: string, metadata: { institution: { institution_id: string; name: string } | null }) => void;
    onExit: (error: { display_message?: string | null; error_message?: string } | null) => void;
  }): { open(): void };
};

let loading: Promise<PlaidWeb> | null = null;

function loadPlaid() {
  loading ??= new Promise<PlaidWeb>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
    script.onload = () => resolve((window as unknown as { Plaid: PlaidWeb }).Plaid);
    script.onerror = () => {
      loading = null;
      reject(new Error('Could not load Plaid. Check your connection and try again.'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/** Opens Plaid Link. Resolves to null when the user closes it without linking. */
export async function openPlaidLink(token: string): Promise<LinkResult | null> {
  const plaid = await loadPlaid();
  return new Promise((resolve, reject) => {
    plaid
      .create({
        token,
        onSuccess: (publicToken, metadata) =>
          resolve({
            publicToken,
            institution: metadata.institution ? { id: metadata.institution.institution_id, name: metadata.institution.name } : null,
          }),
        onExit: (error) => (error ? reject(new Error(error.display_message ?? error.error_message ?? 'Linking failed.')) : resolve(null)),
      })
      .open();
  });
}
