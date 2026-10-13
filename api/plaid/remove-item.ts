import { endpoint, check, HttpError } from '../_lib/http';
import { plaid } from '../_lib/plaid';

/** Disconnects an institution at Plaid and deletes everything stored for it. */
export default endpoint(async ({ user, db, body }) => {
  if (typeof body.itemId !== 'string') throw new HttpError(400, 'Missing itemId.');
  const item = check(
    await db.from('plaid_items').select('item_id, access_token').eq('user_id', user.id).eq('item_id', body.itemId).maybeSingle(),
  ) as { item_id: string; access_token: string } | null;
  if (!item) throw new HttpError(404, 'That institution is not linked to your account.');

  await plaid().itemRemove({ access_token: item.access_token });
  // Accounts, transactions and recurring charges go with it through cascading deletes.
  check(await db.from('plaid_items').delete().eq('item_id', item.item_id));
});
