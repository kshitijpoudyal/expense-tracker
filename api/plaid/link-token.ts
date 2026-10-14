import { CountryCode, Products } from 'plaid';

import { check, endpoint, HttpError } from '../_lib/http';
import { plaid } from '../_lib/plaid';

/**
 * Creates the short-lived token the app needs to open Plaid Link. With an `itemId` it opens Link in update
 * mode instead, so the user can sign in to a bank again without unlinking it.
 */
export default endpoint(async ({ user, db, body }) => {
  const android = body.platform === 'android';
  let accessToken: string | undefined;
  if (body.itemId !== undefined) {
    if (typeof body.itemId !== 'string') throw new HttpError(400, 'Invalid itemId.');
    const item = check(
      await db.from('plaid_items').select('access_token').eq('user_id', user.id).eq('item_id', body.itemId).maybeSingle(),
    ) as { access_token: string } | null;
    if (!item) throw new HttpError(404, 'That institution is not linked to your account.');
    accessToken = item.access_token;
  }

  const { data } = await plaid().linkTokenCreate({
    user: { client_user_id: user.id },
    client_name: 'Kay Money',
    // Update mode takes the existing access token and no product list.
    ...(accessToken ? { access_token: accessToken } : { products: [Products.Transactions], transactions: { days_requested: 365 } }),
    country_codes: [CountryCode.Us],
    language: 'en',
    webhook: process.env.PLAID_WEBHOOK_URL || undefined,
    android_package_name: android ? (process.env.PLAID_ANDROID_PACKAGE_NAME ?? 'com.kay.money') : undefined,
    // Only needed for banks that sign in through OAuth; must match a redirect URI allowed in the Plaid dashboard.
    redirect_uri: android ? undefined : process.env.PLAID_REDIRECT_URI || undefined,
  });
  return { linkToken: data.link_token };
});
