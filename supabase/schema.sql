create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text, role text default 'admin', created_at timestamptz default now()
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null, key text unique not null, name text not null, short text not null,
  icon text default '🗂️', description text default '', intro text default '',
  seo_title text, seo_description text, og_image text,
  published boolean default true, sort_order int default 0,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists bases (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null, name text not null, category text not null,
  sub_category text default 'general', image text default '', clash_link text default '',
  description text default '', strategy_notes text[] default '{}', tags text[] default '{}',
  featured boolean default false, published boolean default false,
  date_added date default current_date, updated_at timestamptz default now(),
  views int default 0,
  seo_title text, seo_description text, canonical text, og_image text
);
create index if not exists bases_category_idx on bases(category);
create index if not exists bases_published_idx on bases(published);

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null, category text not null, clash_link text, image_url text,
  description text, username text,
  status text default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz default now(), reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);

create table if not exists settings (
  id int primary key default 1, data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now(), constraint settings_single_row check (id = 1)
);
insert into settings (id, data) values (1, '{}'::jsonb) on conflict (id) do nothing;

alter table profiles enable row level security;
alter table categories enable row level security;
alter table bases enable row level security;
alter table submissions enable row level security;
alter table settings enable row level security;

create or replace function is_admin()
returns boolean language sql security definer stable as $$
  select exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin');
$$;

drop policy if exists "public read published bases" on bases;
create policy "public read published bases" on bases for select using (published = true);

drop policy if exists "public read published categories" on categories;
create policy "public read published categories" on categories for select using (published = true);

drop policy if exists "public read settings" on settings;
create policy "public read settings" on settings for select using (true);

drop policy if exists "public can submit" on submissions;
create policy "public can submit" on submissions for insert with check (
  status = 'pending' and length(name) between 2 and 120 and length(description) between 20 and 4000
);

drop policy if exists "admin full bases" on bases;
create policy "admin full bases" on bases for all using (is_admin()) with check (is_admin());

drop policy if exists "admin full categories" on categories;
create policy "admin full categories" on categories for all using (is_admin()) with check (is_admin());

drop policy if exists "admin full submissions" on submissions;
create policy "admin full submissions" on submissions for all using (is_admin()) with check (is_admin());

drop policy if exists "admin full settings" on settings;
create policy "admin full settings" on settings for all using (is_admin()) with check (is_admin());

drop policy if exists "admin read profiles" on profiles;
create policy "admin read profiles" on profiles for select using (is_admin() or id = auth.uid());

insert into categories (slug, key, name, short, icon, description, intro, sort_order) values
  ('war-bases','war','TH18 War Bases','War','⚔️','TH18 war layouts for Clan Wars','Browse TH18 war layouts built for defensive use in Clan Wars.',1),
  ('cwl-bases','cwl','TH18 CWL Bases','CWL','🏆','TH18 layouts for Clan War Leagues','Clan War Leagues rewards consistency. These TH18 CWL layouts focus on repeatable defence.',2),
  ('farming-bases','farming','TH18 Farming Bases','Farming','🌾','Protect resources while you upgrade','Farming bases trade war performance for resource protection.',3),
  ('trophy-bases','trophy','TH18 Trophy Bases','Trophy','📈','Layouts for pushing trophies','Trophy pushing is about denying stars, not resources.',4),
  ('hybrid-bases','hybrid','TH18 Hybrid Bases','Hybrid','⚖️','Balanced war and farming layouts','Hybrid bases compromise between war and farming.',5),
  ('anti-3-star-bases','anti-3-star','TH18 Anti-3-Star Bases','Anti-3-Star','🛡️','Layouts designed to deny three stars','An anti-3-star base accepts two stars but makes the third very expensive.',6),
  ('legend-league-bases','legend-league','TH18 Legend League Bases','Legend League','👑','Layouts for Legend League defence','Legend League defence is a numbers game.',7),
  ('anti-air-bases','anti-air','TH18 Anti-Air Bases','Anti-Air','🎯','Defence against air attacks','Air attacks remain a common way to break a TH18 base.',8)
on conflict (slug) do nothing;
