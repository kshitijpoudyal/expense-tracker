# Kay Money

A personal finance app built with Expo (SDK 57) and Expo Router. It reads your bank transactions through Plaid and keeps them in Supabase. Without Supabase keys it runs on sample data from `src/data/mock.ts`, with no sign-in.

## Run

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go on an Android phone, or press `w` for the web preview.

## Connect real data

1. Copy `.env.example` to `.env.local` and fill it in. The same names go into Vercel, which hosts the `/api` functions.
2. In the Supabase SQL Editor, run `supabase/schema.sql`, then every file in `supabase/migrations/` in name order.
3. Optional: set `PLAID_WEBHOOK_URL` so new transactions arrive without opening the app.

## Layout

- `src/app/(tabs)/`: Dashboard, Recurring, Spending, Transactions, More
- `src/app/transaction/[id].tsx`: one transaction: rename, category, recurring, ignore, tags, note, rules, split, reviewed
- `src/app/category/[id].tsx`: month-by-month totals for a category, all spending or a tag, with CSV export
- `src/app/`: Budget, Net worth, Rules, Settings, Sign in
- `src/components/`: screen shell, cards and rows, bottom sheets, SVG charts
- `src/data/finance.tsx`: loads bank data, applies your edits and rules, and works out every total
- `src/data/types.ts`: shared types and categories
- `api/`: Vercel functions for Plaid: link, exchange, sync, webhook, remove
- `supabase/`: database schema and migrations
