import { CountryCode, Products } from 'plaid';

import { endpoint } from '../_lib/http';
import { plaid } from '../_lib/plaid';

/** Creates the short-lived token the app needs to open Plaid Link. */
export default endpoint(async ({ user, body }) => {
  const android = body.platform === 'android';
  const { data } = await plaid().linkTokenCreate({
    user: { client_user_id: user.id },
    client_name: 'Kay Money',
    products: [Products.Transactions],
    transactions: { days_requested: 365 },
    country_codes: [CountryCode.Us],
    language: 'en',
    android_package_name: android ? (process.env.PLAID_ANDROID_PACKAGE_NAME ?? 'com.kay.money') : undefined,
    // Only needed for banks that sign in through OAuth; must match a redirect URI allowed in the Plaid dashboard.
    redirect_uri: android ? undefined : process.env.PLAID_REDIRECT_URI || undefined,
  });
  return { linkToken: data.link_token };
});
