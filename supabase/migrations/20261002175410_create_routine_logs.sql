-- One row per day: the products used in that day's routine.
create table public.routine_logs (
  log_date date primary key,
  products text[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- Only the Flask backend talks to this table, using the service role key,
-- which bypasses RLS. With RLS on and no policies, the public anon key
-- can't read or write it.
alter table public.routine_logs enable row level security;
