-- Kay Money schema. Run once in the Supabase SQL Editor.
--
-- plaid_items holds bank access tokens and is readable only by the server (secret key).
-- Every other table is read-only for the signed-in user and limited to their own rows.
-- All writes go through the server functions in /api.

create table public.plaid_items (
  item_id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  access_token text not null,
  institution_id text,
  institution_name text,
  cursor text,
  created_at timestamptz not null default now()
);

create table public.accounts (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null references public.plaid_items (item_id) on delete cascade,
  name text not null,
  institution text not null,
  mask text not null default '',
  kind text not null check (kind in ('checking', 'savings', 'credit', 'investment', 'loan')),
  balance numeric not null default 0,
  updated_at timestamptz not null default now()
);

create table public.transactions (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id text not null references public.accounts (id) on delete cascade,
  merchant text not null,
  amount numeric not null,
  date date not null,
  category text not null,
  pending boolean not null default false
);
create index transactions_user_date on public.transactions (user_id, date desc);

create table public.recurring (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null references public.plaid_items (item_id) on delete cascade,
  name text not null,
  amount numeric not null,
  next_date date,
  frequency text not null,
  kind text not null check (kind in ('subscription', 'bill')),
  category text not null,
  approximate boolean not null default false
);

create table public.net_worth_snapshots (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  value numeric not null,
  primary key (user_id, day)
);

alter table public.plaid_items enable row level security;
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.recurring enable row level security;
alter table public.net_worth_snapshots enable row level security;

-- No policy and no grant on plaid_items: the app can never read access tokens.
revoke all on public.plaid_items from anon, authenticated;

revoke all on public.accounts, public.transactions, public.recurring, public.net_worth_snapshots from anon, authenticated;
grant select on public.accounts, public.transactions, public.recurring, public.net_worth_snapshots to authenticated;
grant all on public.plaid_items, public.accounts, public.transactions, public.recurring, public.net_worth_snapshots to service_role;

create policy "Own accounts" on public.accounts for select to authenticated using ((select auth.uid()) = user_id);
create policy "Own transactions" on public.transactions for select to authenticated using ((select auth.uid()) = user_id);
create policy "Own recurring" on public.recurring for select to authenticated using ((select auth.uid()) = user_id);
create policy "Own net worth" on public.net_worth_snapshots for select to authenticated using ((select auth.uid()) = user_id);
