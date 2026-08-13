-- MYWORK AZZURO is a desktop-only application. Each authenticated account owns
-- exactly one JSON workspace so the existing domain model can be preserved
-- without placing saved link passwords in Postgres.

create table public.workspaces (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  revision bigint not null default 0 check (revision >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint workspaces_state_is_object check (jsonb_typeof(state) = 'object')
);

comment on table public.workspaces is
  'One private MYWORK AZZURO workspace per Supabase Auth account. Saved link passwords never belong in this table.';

alter table public.workspaces enable row level security;

revoke all on table public.workspaces from anon;
grant select, insert, update, delete on table public.workspaces to authenticated;

create policy "Workspace owners can read their workspace"
  on public.workspaces
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Workspace owners can create their workspace"
  on public.workspaces
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Workspace owners can update their workspace"
  on public.workspaces
  for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Workspace owners can delete their workspace"
  on public.workspaces
  for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

create or replace function public.save_workspace(
  next_state jsonb,
  expected_revision bigint default null
)
returns public.workspaces
language plpgsql
security invoker
set search_path = public
as $$
declare
  existing_workspace public.workspaces;
  saved_workspace public.workspaces;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to save a workspace.' using errcode = '28000';
  end if;

  if jsonb_typeof(next_state) <> 'object' then
    raise exception 'Workspace state must be a JSON object.' using errcode = '22023';
  end if;

  select *
    into existing_workspace
    from public.workspaces
   where owner_id = auth.uid()
   for update;

  if found then
    if expected_revision is not null and existing_workspace.revision <> expected_revision then
      raise exception 'This workspace changed elsewhere. Reload before saving again.' using errcode = '40001';
    end if;

    update public.workspaces
       set state = next_state,
           revision = existing_workspace.revision + 1,
           updated_at = timezone('utc', now())
     where owner_id = auth.uid()
     returning * into saved_workspace;

    return saved_workspace;
  end if;

  if expected_revision is not null and expected_revision <> 0 then
    raise exception 'This workspace has not been created yet.' using errcode = '40001';
  end if;

  insert into public.workspaces (owner_id, state)
  values (auth.uid(), next_state)
  returning * into saved_workspace;

  return saved_workspace;
end;
$$;

revoke all on function public.save_workspace(jsonb, bigint) from public;
grant execute on function public.save_workspace(jsonb, bigint) to authenticated;
