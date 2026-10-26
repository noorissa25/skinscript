-- skinscript: accounts, saved data and community chat.
-- Privacy model: every personal table is locked to its owner with row-level
-- security (RLS). The only data other people can read is chat messages and
-- the display names attached to them. Email addresses are never exposed.

-- ---------- Profiles (public display name only) ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 30),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Display names are public" on public.profiles
  for select using (true);
create policy "People manage their own profile" on public.profiles
  for insert with check (id = auth.uid());
create policy "People update their own profile" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ---------- Saved checks ----------
create table public.saved_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  -- [{ name, text }] exactly as checked, so the check can be re-run later.
  products jsonb not null,
  -- Snapshot for the list view: { recognized, total, findings: [{ id, title, severity }] }.
  summary jsonb not null,
  created_at timestamptz not null default now()
);

create index saved_checks_user_created on public.saved_checks (user_id, created_at desc);
alter table public.saved_checks enable row level security;
create policy "Owner only" on public.saved_checks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- My routine (one per person) ----------
create table public.routines (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  products jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.routines enable row level security;
create policy "Owner only" on public.routines
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Ingredients to avoid ----------
create table public.avoid_ingredients (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- An ingredient id from data/ingredients.json, e.g. "fragrance".
  ingredient_id text not null check (char_length(ingredient_id) between 1 and 60),
  created_at timestamptz not null default now(),
  primary key (user_id, ingredient_id)
);

alter table public.avoid_ingredients enable row level security;
create policy "Owner only" on public.avoid_ingredients
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Community chat ----------
create table public.chat_messages (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  display_name text not null,
  body text not null check (char_length(btrim(body)) between 1 and 500),
  -- Optional card a person chose to share: { title, findings: [{ title, severity }] }. No ingredient text.
  shared_check jsonb,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create index chat_messages_created on public.chat_messages (created_at desc);
alter table public.chat_messages enable row level security;

create policy "Anyone can read visible messages" on public.chat_messages
  for select using (not hidden);
create policy "Signed-in people post as themselves" on public.chat_messages
  for insert to authenticated with check (user_id = auth.uid() and not hidden);
create policy "People delete their own messages" on public.chat_messages
  for delete using (user_id = auth.uid());

-- Stamp the poster's current display name and enforce a posting rate limit,
-- server-side so a modified client can't skip it.
create or replace function public.chat_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  recent int;
begin
  select display_name into new.display_name from public.profiles where id = auth.uid();
  if new.display_name is null then
    raise exception 'Set a display name before posting';
  end if;
  select count(*) into recent from public.chat_messages
    where user_id = auth.uid() and created_at > now() - interval '1 minute';
  if recent >= 5 then
    raise exception 'You are posting too fast. Try again in a minute.';
  end if;
  new.user_id := auth.uid();
  new.hidden := false;
  return new;
end $$;

create trigger chat_before_insert before insert on public.chat_messages
  for each row execute function public.chat_before_insert();

-- ---------- Reports: three reports from different people hide a message ----------
create table public.chat_reports (
  message_id bigint not null references public.chat_messages (id) on delete cascade,
  reporter_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (message_id, reporter_id)
);

alter table public.chat_reports enable row level security;
create policy "Signed-in people report as themselves" on public.chat_reports
  for insert to authenticated with check (reporter_id = auth.uid());

create or replace function public.chat_after_report() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.chat_messages set hidden = true
    where id = new.message_id
      and (select count(*) from public.chat_reports where message_id = new.message_id) >= 3;
  return new;
end $$;

create trigger chat_after_report after insert on public.chat_reports
  for each row execute function public.chat_after_report();

-- Live updates for the chat.
alter publication supabase_realtime add table public.chat_messages;

-- ---------- Self-service account deletion ----------
-- Deletes the caller's auth user; every table above cascades, so saved
-- checks, routine, avoid list, profile, messages and reports go with it.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
