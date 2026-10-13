import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

import { HttpError } from './http';

export function plaid() {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  const env = process.env.PLAID_ENV ?? 'sandbox';
  if (!clientId || !secret) throw new HttpError(503, 'The server is missing its Plaid keys.');
  if (!PlaidEnvironments[env]) throw new HttpError(503, `Unknown PLAID_ENV "${env}".`);
  return new PlaidApi(
    new Configuration({
      basePath: PlaidEnvironments[env],
      baseOptions: { headers: { 'PLAID-CLIENT-ID': clientId, 'PLAID-SECRET': secret } },
    }),
  );
}
