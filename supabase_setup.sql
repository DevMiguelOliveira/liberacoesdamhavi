-- Drop existing objects to allow re-run
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop function if exists public.update_expired_liberacoes();
drop table if exists public.liberacoes;
drop table if exists public.admins;
drop type if exists public.status_liberacao;
drop type if exists public.tipo_acesso;

-- Create Enums
create type public.status_liberacao as enum ('ativo', 'expirado');
create type public.tipo_acesso as enum ('visitante', 'prestador');

-- Create Admins Table
create table public.admins (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null default auth.uid (),
  nome text not null,
  login text not null,
  criado_em timestamp with time zone null default now(),
  constraint admins_pkey primary key (id),
  constraint admins_user_id_key unique (user_id),
  constraint admins_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade
) tablespace pg_default;

-- Create Liberacoes Table
create table public.liberacoes (
  id uuid not null default gen_random_uuid (),
  admin_id uuid null,
  nome_pessoa text not null,
  cpf text not null,
  tipo_acesso public.tipo_acesso not null,
  quadra text not null,
  lote text not null,
  data_inicio date not null,
  data_fim date not null,
  status public.status_liberacao not null default 'ativo'::status_liberacao,
  criado_em timestamp with time zone null default now(),
  constraint liberacoes_pkey primary key (id),
  constraint liberacoes_admin_id_fkey foreign key (admin_id) references admins (id) on delete set null
) tablespace pg_default;

-- Enable RLS
alter table public.admins enable row level security;
alter table public.liberacoes enable row level security;

-- Policies for Admins
create policy "Admins can view their own profile"
on public.admins
for select
to authenticated
using (auth.uid() = user_id);

create policy "Admins can update their own profile"
on public.admins
for update
to authenticated
using (auth.uid() = user_id);

-- Policies for Liberacoes
create policy "Admins can view all liberacoes"
on public.liberacoes
for select
to authenticated
using (true);

create policy "Admins can insert liberacoes"
on public.liberacoes
for insert
to authenticated
with check (true);

create policy "Admins can update liberacoes"
on public.liberacoes
for update
to authenticated
using (true);

create policy "Admins can delete liberacoes"
on public.liberacoes
for delete
to authenticated
using (true);

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  user_login text;
begin
  -- Extract login from metadata or part of email
  user_login := coalesce(new.raw_user_meta_data->>'login', split_part(new.email, '@', 1));
  
  insert into public.admins (user_id, login, nome)
  values (new.id, user_login, coalesce(new.raw_user_meta_data->>'full_name', user_login));
  return new;
end;
$$;

-- Trigger for new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to update expired liberacoes
create or replace function public.update_expired_liberacoes()
returns void
language plpgsql
security definer
as $$
begin
  update public.liberacoes
  set status = 'expirado'
  where data_fim < current_date and status = 'ativo';
end;
$$;

-- --- MANUAL ADMIN INSERTION (If User already exists in Auth) ---
-- User: admin@damhavi.com
-- UID: 00e64973-73db-4a4e-88e8-86ee31c94d07
-- Login para acessar: admin

INSERT INTO public.admins (user_id, login, nome)
VALUES ('00e64973-73db-4a4e-88e8-86ee31c94d07', 'admin', 'Administrador Global')
ON CONFLICT (user_id) DO UPDATE
SET login = 'admin', nome = 'Administrador Global';

-- --- INSTRUCTIONS FOR NEW ADMIN CREATION ---
-- To create a new admin manually via Supabase Dashboard:
-- 1. Go to Authentication > Users > Add User
-- 2. Email: seu-login@damhavi.com (Ex: portaria@damhavi.com -> Login será 'portaria')
-- 3. Password: [sua senha]
-- 
-- The trigger above will automatically create the record in the 'admins' table.
-- ---------------------------------------------
