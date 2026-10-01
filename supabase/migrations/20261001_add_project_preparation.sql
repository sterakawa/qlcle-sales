alter table projects
  add column if not exists equipment_check_url text;

create table if not exists project_staff (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  role text,
  meet_time time,
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_project_staff_project_id
  on project_staff(project_id);

alter table project_staff enable row level security;

drop policy if exists "Authenticated users can manage project_staff" on project_staff;

create policy "Authenticated users can manage project_staff"
  on project_staff
  for all
  to authenticated
  using (true)
  with check (true);
