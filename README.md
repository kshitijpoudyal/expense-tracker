# Kay Money

A personal finance app UI built with Expo (SDK 57) and Expo Router, modelled on the layout of subscription and budgeting apps. Every number comes from sample data in `src/data/mock.ts`; nothing connects to a bank.

## Run

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go on an Android phone, or press `w` for the web preview.

## Layout

- `src/app/(tabs)/`: Dashboard, Recurring, Spending, Transactions, More
- `src/app/`: Net worth, Budget, Credit score, Cancel subscriptions, Lower bills, Settings
- `src/components/`: screen shell, cards and rows, SVG charts
- `src/data/mock.ts`: all sample data
- `src/constants/theme.ts`: colours and spacing
