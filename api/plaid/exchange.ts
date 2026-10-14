import { endpoint, check, HttpError } from '../_lib/http';
import { plaid } from '../_lib/plaid';
import { syncUser } from '../_lib/sync';

export const config = { maxDuration: 60 };

/** Trades Link's public token for a permanent access token, which stays on the server. */
export default endpoint(async ({ user, db, body }) => {
  if (typeof body.publicToken !== 'string') throw new HttpError(400, 'Missing publicToken.');
  const client = plaid();
  const { data } = await client.itemPublicTokenExchange({ public_token: body.publicToken });
  const institution = (body.institution ?? {}) as { id?: string; name?: string };
  check(
    await db.from('plaid_items').upsert(
      {
        user_id: user.id,
        item_id: data.item_id,
        access_token: data.access_token,
        institution_id: institution.id ?? null,
        institution_name: institution.name ?? null,
        // Link registers the webhook on new items, so later syncs need not update it.
        webhook: process.env.PLAID_WEBHOOK_URL || null,
      },
      { onConflict: 'item_id' },
    ),
  );
  return syncUser(db, client, user.id);
});
