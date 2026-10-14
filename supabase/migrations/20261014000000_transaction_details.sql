-- Transaction details, your own edits, rules, splits, budgets and bank connection status.
-- Run once in the Supabase SQL Editor after schema.sql. Safe to run on a database that already holds data.

-- ---------------------------------------------------------------------------------------------
-- More detail from Plaid on each transaction. Filled in by the next sync (see the cursor reset below).

alter table public.transactions
  add column if not exists original_name text,
  add column if not exists logo_url text,
  add column if not exists category_detailed text;

-- Recurring streams remember which transactions belong to them, and paychecks are kept as 'income'
-- streams so the app can show when the next payday is.
alter table public.recurring add column if not exists transaction_ids text[] not null default '{}';
alter table public.recurring drop constraint if exists recurring_kind_check;
alter table public.recurring add constraint recurring_kind_check check (kind in ('subscription', 'bill', 'income'));

-- ---------------------------------------------------------------------------------------------
-- Bank connection status. The app may read these columns of its own rows, never the access token.

alter table public.plaid_items
  add column if not exists login_required boolean not null default false,
  add column if not exists last_synced_at timestamptz,
  add column if not exists webhook text;

grant select (item_id, user_id, institution_name, login_required, last_synced_at) on public.plaid_items to authenticated;
drop policy if exists "Own items" on public.plaid_items;
create policy "Own items" on public.plaid_items for select to authenticated using ((select auth.uid()) = user_id);

-- Re-download every transaction on the next sync so existing rows get the new columns. Rows are
-- updated in place; nothing is deleted.
update public.plaid_items set cursor = null;

-- ---------------------------------------------------------------------------------------------
-- Things you change in the app. Bank data stays untouched; these rows are layered on top.
-- Unlike the bank tables, the signed-in user writes these directly, limited to their own rows.

-- One row per edited transaction. A null column means "not changed".
create table if not exists public.transaction_edits (
  transaction_id text primary key references public.transactions (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text,
  category text,
  note text,
  tags text[] not null default '{}',
  ignore text check (ignore in ('none', 'budget', 'all')),
  recurring boolean,
  reviewed boolean not null default false,
  updated_at timestamptz not null default now()
);

-- A transaction split across several categories. The parts add up to the transaction's amount.
create table if not exists public.transaction_splits (
  id uuid primary key default gen_random_uuid(),
  transaction_id text not null references public.transactions (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category text not null,
  amount numeric not null check (amount > 0)
);
create index if not exists transaction_splits_transaction on public.transaction_splits (transaction_id);

-- "When the bank description contains <match>, use this name / category / ignore setting."
create table if not exists public.rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  match text not null check (length(trim(match)) > 0),
  rename text,
  category text,
  ignore text check (ignore in ('none', 'budget', 'all')),
  created_at timestamptz not null default now()
);

-- Monthly limit per category.
create table if not exists public.budgets (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category text not null,
  amount numeric not null check (amount > 0),
  primary key (user_id, category)
);

alter table public.transaction_edits enable row level security;
alter table public.transaction_splits enable row level security;
alter table public.rules enable row level security;
alter table public.budgets enable row level security;

revoke all on public.transaction_edits, public.transaction_splits, public.rules, public.budgets from anon;
grant select, insert, update, delete on public.transaction_edits, public.transaction_splits, public.rules, public.budgets to authenticated;
grant all on public.transaction_edits, public.transaction_splits, public.rules, public.budgets to service_role;

-- Edits and splits may only point at the user's own transactions.
drop policy if exists "Own edits" on public.transaction_edits;
create policy "Own edits" on public.transaction_edits for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.transactions t where t.id = transaction_id and t.user_id = (select auth.uid()))
  );

drop policy if exists "Own splits" on public.transaction_splits;
create policy "Own splits" on public.transaction_splits for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.transactions t where t.id = transaction_id and t.user_id = (select auth.uid()))
  );

drop policy if exists "Own rules" on public.rules;
create policy "Own rules" on public.rules for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Own budgets" on public.budgets;
create policy "Own budgets" on public.budgets for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
