import { createPlaidLinkSession } from 'react-native-plaid-link-sdk';

export type LinkResult = { publicToken: string; institution: { id: string; name: string } | null };

/** Opens Plaid Link. Resolves to null when the user closes it without linking. */
export function openPlaidLink(token: string): Promise<LinkResult | null> {
  return new Promise((resolve, reject) => {
    createPlaidLinkSession({
      token,
      onSuccess: (success) => {
        const institution = success.metadata.institution;
        resolve({ publicToken: success.publicToken, institution: institution ? { id: institution.id, name: institution.name } : null });
      },
      onEvent: () => {},
      onExit: (exit) => (exit.error?.displayMessage ? reject(new Error(exit.error.displayMessage)) : resolve(null)),
    })
      .then((session) => session.open())
      .catch(reject);
  });
}
