import { endpoint } from '../_lib/http';
import { plaid } from '../_lib/plaid';
import { syncUser } from '../_lib/sync';

export const config = { maxDuration: 60 };

/** Refreshes balances and transactions for everything the signed-in user has linked. */
export default endpoint(({ user, db }) => syncUser(db, plaid(), user.id));
