-- Preserve a recoverable copy before the first workspace change each UTC day.
-- Snapshots contain the same password-redacted state that is saved to workspaces.

create table public.workspace_backups (
  owner_id uuid not null references auth.users (id) on delete cascade,
  backup_date date not null,
  state jsonb not null,
  revision bigint not null check (revision >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  constraint workspace_backups_state_is_object check (jsonb_typeof(state) = 'object'),
  primary key (owner_id, backup_date)
);

comment on table public.workspace_backups is
  'MYWORK AZZURO keeps one private, password-redacted pre-change workspace snapshot per UTC day for 90 days.';

alter table public.workspace_backups enable row level security;

revoke all on table public.workspace_backups from anon;
grant select on table public.workspace_backups to authenticated;

create policy "Workspace owners can read their backups"
  on public.workspace_backups
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create or replace function public.archive_workspace_before_update()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  snapshot_day date := timezone('utc', now())::date;
begin
  if old.state is not distinct from new.state then
    return new;
  end if;

  insert into public.workspace_backups (owner_id, backup_date, state, revision)
  values (old.owner_id, snapshot_day, old.state, old.revision)
  on conflict (owner_id, backup_date) do nothing;

  delete from public.workspace_backups
   where owner_id = old.owner_id
     and backup_date < snapshot_day - 90;

  return new;
end;
$$;

create trigger archive_workspace_before_update
before update of state on public.workspaces
for each row
execute function public.archive_workspace_before_update();

-- Capture every existing workspace immediately, so the current production
-- state is protected before the next save or desktop release.
insert into public.workspace_backups (owner_id, backup_date, state, revision)
select
  owner_id,
  timezone('utc', now())::date,
  state,
  revision
from public.workspaces
on conflict (owner_id, backup_date) do nothing;
