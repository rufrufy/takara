-- Prepare mapping for an Auth Admin API migration. No accounts or passwords are changed here.
alter table public.app_users add column if not exists auth_user_id uuid references auth.users(id) on delete set null;
create unique index if not exists app_users_auth_user_id_idx on public.app_users(auth_user_id) where auth_user_id is not null;
